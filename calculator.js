/**
 * 青安 3.0 calculator core.
 *
 * Amounts supplied to public functions are in New Taiwan Dollars unless a
 * function explicitly says otherwise. All calculations are estimates: a bank
 * will still determine the approved amount, rate, term, and repayment method.
 */

export const POLICY = Object.freeze({
  effectiveDate: "2026-08-01",
  applicationEndDate: "2029-07-31",
  minAge: 20,
  maxAgeExclusive: 50,
  maxAgePlusTerm: 80,
  maxIncome: 2_000_000,
  maxLtv: 0.8,
  maxTermYears: 40,
  maxGraceYears: 5,
  standardLoanCap: 10_000_000,
  newlywedLoanCap: 12_000_000,
  childLoanCap: 15_000_000,
  propertyPriceCaps: Object.freeze({
    taipei: 35_000_000,
    newTaipeiOrHsinchu: 25_000_000,
    other: 20_000_000,
  }),
  // One 碼 is 0.125 percentage points. 2 碼 = 0.5 percentage points.
  subsidyByMonth: Object.freeze([
    { throughMonth: 36, percentagePoints: 0.5 },
    { throughMonth: 48, percentagePoints: 0.375 },
    { throughMonth: 60, percentagePoints: 0.25 },
    { throughMonth: 72, percentagePoints: 0.125 },
    { throughMonth: Infinity, percentagePoints: 0 },
  ]),
});

// Hard sanity bounds applied to every raw input before any calculation. They
// stop absurd values (1e308, 10,000,000 years, NaN) from freezing the tab or
// printing NaN/Infinity amounts. They are far above any real-world value.
export const INPUT_BOUNDS = Object.freeze({
  propertyPrice: 1e11,
  requestedLoan: 1e11,
  annualIncome: 1e11,
  age: 150,
  termYears: 100,
  graceYears: 100,
  baseRatePercent: 100,
});

export function sanitizeInput(input) {
  const clamped = [];
  const out = { ...input };
  for (const [key, max] of Object.entries(INPUT_BOUNDS)) {
    const raw = Number(input[key]);
    let value = Number.isNaN(raw) ? 0 : raw; // +/-Infinity are clamped below
    value = Math.min(Math.max(value, 0), max);
    if (value !== raw && !(raw === 0 || input[key] === "" || input[key] == null)) clamped.push(key);
    out[key] = value;
  }
  return { input: out, clamped };
}

export const LOCATION_LABELS = Object.freeze({
  taipei: "臺北市",
  newTaipeiOrHsinchu: "新北市、新竹縣市",
  other: "其他縣市",
});

export function subsidyForMonth(month) {
  return POLICY.subsidyByMonth.find((item) => month <= item.throughMonth)
    .percentagePoints;
}

export function rateForMonth(baseRatePercent, month) {
  return Math.max(0, Number(baseRatePercent) - subsidyForMonth(month));
}

export function loanCapForHousehold({ newlywed, hasMinorChild }) {
  if (hasMinorChild) return POLICY.childLoanCap;
  if (newlywed) return POLICY.newlywedLoanCap;
  return POLICY.standardLoanCap;
}

export function evaluateEligibility(input) {
  const propertyCap = POLICY.propertyPriceCaps[input.location];
  const checks = [
    {
      id: "home",
      label: "本人、配偶及未成年子女名下均無自有住宅",
      pass: !input.householdHasHome,
      note: "青安貸款以無自有住宅家庭為對象。",
    },
    {
      id: "selfUse",
      label: "購屋用途為自住",
      pass: input.selfUse,
      note: "申貸時須切結自住，違規可能被追回補貼利息。",
    },
    {
      id: "onceOnly",
      label: "未曾使用青安／農安優惠貸款",
      pass: !input.usedPolicyLoan,
      note: "優惠貸款限貸一次。",
    },
    {
      id: "age",
      label: "申貸時年滿 20 歲且未滿 50 歲",
      pass: Number(input.age) >= POLICY.minAge && Number(input.age) < POLICY.maxAgeExclusive,
      note: "未滿 20 歲或 50 歲（含）以上，原則上不符合青安 3.0 年齡條件。",
    },
    {
      id: "term",
      label: "年齡加核貸年限不超過 80",
      pass: Number(input.age) + Number(input.termYears) <= POLICY.maxAgePlusTerm,
      note: `目前合計 ${Number(input.age) + Number(input.termYears)}；核貸年限仍以銀行決定為準。`,
    },
    {
      id: "income",
      label: "借款人本人年所得不超過 200 萬元",
      pass: Number(input.annualIncome) <= POLICY.maxIncome,
      note: "此項為借款人本人所得，不是家庭合併所得。",
    },
    {
      id: "price",
      label: `${LOCATION_LABELS[input.location]}房屋總價不超過 ${formatWan(propertyCap)} 萬元`,
      pass: Number(input.propertyPrice) <= propertyCap,
      note: "鑑價與買賣總價都須在該區上限內。",
    },
    {
      id: "termLimit",
      label: "貸款年限不超過 40 年、寬限期不超過 5 年",
      pass:
        Number(input.termYears) <= POLICY.maxTermYears &&
        Number(input.graceYears) <= POLICY.maxGraceYears &&
        Number(input.graceYears) < Number(input.termYears),
      note: "寬限期不可等於或超過貸款年限。",
    },
  ];

  const failed = checks.filter((check) => !check.pass);
  return {
    checks,
    eligible: failed.length === 0,
    failed,
    propertyCap,
  };
}

/**
 * Calculates the highest policy-loan amount before a bank's own credit review.
 */
export function calculateLoanLimits(input) {
  const householdCap = loanCapForHousehold(input);
  const ltvCap = Math.max(0, Number(input.propertyPrice) * POLICY.maxLtv);
  const programCap = Math.min(householdCap, ltvCap);
  return {
    householdCap,
    ltvCap,
    programCap,
    minimumDownPayment: Math.max(0, Number(input.propertyPrice) - programCap),
  };
}

function annuityPayment(balance, monthlyRate, remainingMonths) {
  if (remainingMonths <= 0 || balance <= 0) return 0;
  if (monthlyRate === 0) return balance / remainingMonths;
  const factor = (1 + monthlyRate) ** remainingMonths;
  return (balance * monthlyRate * factor) / (factor - 1);
}

/**
 * Simulates a variable-rate mortgage. It re-amortizes the remaining balance
 * each month so the schedule always pays off on the selected final month.
 */
export function buildSchedule({ principal, termYears, graceYears, baseRatePercent, subsidized = true }) {
  const MAX_MONTHS = INPUT_BOUNDS.termYears * 12;
  const safeMonths = (years) => {
    const months = Math.round(Number(years) * 12);
    return Number.isFinite(months) ? Math.min(Math.max(months, 0), MAX_MONTHS) : 0;
  };
  const totalMonths = safeMonths(termYears);
  const graceMonths = safeMonths(graceYears);
  const safeRate = Number.isFinite(Number(baseRatePercent)) ? Number(baseRatePercent) : 0;
  baseRatePercent = Math.min(Math.max(safeRate, 0), INPUT_BOUNDS.baseRatePercent);
  let balance = Number.isFinite(Number(principal)) ? Math.max(0, Number(principal)) : 0;
  principal = balance;
  let totalInterest = 0;
  const months = [];

  for (let month = 1; month <= totalMonths; month += 1) {
    const annualRatePercent = subsidized
      ? rateForMonth(baseRatePercent, month)
      : Number(baseRatePercent);
    const monthlyRate = annualRatePercent / 100 / 12;
    const interest = balance * monthlyRate;
    let principalPayment = 0;
    let payment = interest;

    if (month > graceMonths) {
      const scheduledPayment = annuityPayment(balance, monthlyRate, totalMonths - month + 1);
      principalPayment = Math.min(Math.max(0, scheduledPayment - interest), balance);
      payment = interest + principalPayment;
    }

    balance = Math.max(0, balance - principalPayment);
    totalInterest += interest;
    months.push({
      month,
      annualRatePercent,
      subsidyPercentagePoints: subsidized ? subsidyForMonth(month) : 0,
      payment,
      interest,
      principalPayment,
      balance,
      isGracePeriod: month <= graceMonths,
    });
  }

  return {
    totalMonths,
    totalPayment: Number(principal) + totalInterest,
    totalInterest,
    finalBalance: balance,
    months,
  };
}

export function summarizeSchedule(schedule) {
  const years = [];
  for (let year = 1; year <= Math.ceil(schedule.totalMonths / 12); year += 1) {
    const period = schedule.months.slice((year - 1) * 12, year * 12);
    if (!period.length) break;
    years.push({
      year,
      ratePercent: period[0].annualRatePercent,
      subsidyPercentagePoints: period[0].subsidyPercentagePoints,
      firstMonthPayment: period[0].payment,
      averageMonthlyPayment: period.reduce((sum, item) => sum + item.payment, 0) / period.length,
      annualInterest: period.reduce((sum, item) => sum + item.interest, 0),
      endingBalance: period.at(-1).balance,
    });
  }
  return years;
}

export function calculateScenario(rawInput) {
  const { input, clamped } = sanitizeInput(rawInput);
  const eligibility = evaluateEligibility(input);
  const limits = calculateLoanLimits(input);
  const requestedLoan = Math.max(0, Number(input.requestedLoan));
  const approvedEstimate = Math.min(requestedLoan, limits.programCap);
  const schedule = buildSchedule({
    principal: approvedEstimate,
    termYears: input.termYears,
    graceYears: input.graceYears,
    baseRatePercent: input.baseRatePercent,
    subsidized: true,
  });
  const baseline = buildSchedule({
    principal: approvedEstimate,
    termYears: input.termYears,
    graceYears: input.graceYears,
    baseRatePercent: input.baseRatePercent,
    subsidized: false,
  });
  const years = summarizeSchedule(schedule);
  const subsidyMonths = 72;
  const interestSaving = baseline.months
    .slice(0, subsidyMonths)
    .reduce((sum, baselineMonth, index) => sum + baselineMonth.interest - schedule.months[index].interest, 0);

  return {
    clamped,
    input,
    eligibility,
    limits,
    requestedLoan,
    approvedEstimate,
    requestedLoanExceedsCap: requestedLoan > limits.programCap,
    schedule,
    baseline,
    years,
    interestSaving: Math.max(0, interestSaving),
    firstPayment: schedule.months[0]?.payment ?? 0,
    paymentAfterGrace: schedule.months[Math.min(schedule.totalMonths - 1, Math.round(input.graceYears * 12))]?.payment ?? 0,
    paymentYear4: schedule.months[36]?.payment ?? null,
  };
}

export function formatWan(amount) {
  return new Intl.NumberFormat("zh-TW", { maximumFractionDigits: 0 }).format(Number(amount) / 10_000);
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency: "TWD",
    maximumFractionDigits: 0,
  }).format(Math.round(Number(amount)));
}

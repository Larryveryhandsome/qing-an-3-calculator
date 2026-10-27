import {
  LOCATION_LABELS,
  POLICY,
  calculateScenario,
  formatCurrency,
  formatWan,
} from "./calculator.js";
import advisorConfig from "./advisor.config.js";
import { renderAdvisor } from "./advisor.js";

renderAdvisor(document.querySelector("#advisor"), advisorConfig);

const form = document.querySelector("#calculator-form");
const fields = {
  location: document.querySelector("#location"),
  propertyPrice: document.querySelector("#property-price"),
  age: document.querySelector("#age"),
  annualIncome: document.querySelector("#income"),
  newlywed: document.querySelector("#newlywed"),
  hasMinorChild: document.querySelector("#minor-child"),
  noHome: document.querySelector("#no-home"),
  selfUse: document.querySelector("#self-use"),
  neverUsed: document.querySelector("#never-used"),
  termYears: document.querySelector("#term-years"),
  graceYears: document.querySelector("#grace-years"),
  baseRatePercent: document.querySelector("#base-rate"),
  requestedLoan: document.querySelector("#requested-loan"),
};

const output = {
  status: document.querySelector("#result-status"),
  maxLoan: document.querySelector("#max-loan"),
  loanCapNote: document.querySelector("#loan-cap-note"),
  downPayment: document.querySelector("#down-payment"),
  firstPaymentLabel: document.querySelector("#first-payment-label"),
  firstPayment: document.querySelector("#first-payment"),
  firstPaymentNote: document.querySelector("#first-payment-note"),
  interestSaving: document.querySelector("#interest-saving"),
  checkCount: document.querySelector("#check-count"),
  checkList: document.querySelector("#check-list"),
  loanNote: document.querySelector("#loan-note"),
  scheduleBody: document.querySelector("#schedule-body"),
  inputMessage: document.querySelector("#input-message"),
};

const EXAMPLE = {
  location: "other",
  propertyPrice: 1500,
  age: 35,
  annualIncome: 150,
  newlywed: false,
  hasMinorChild: false,
  noHome: true,
  selfUse: true,
  neverUsed: true,
  termYears: 40,
  graceYears: 0,
  baseRatePercent: 2.275,
  requestedLoan: 1000,
};

function numberValue(element, fallback = 0) {
  const value = Number(element.value);
  return Number.isFinite(value) ? value : fallback;
}

function getInput() {
  return {
    location: fields.location.value,
    propertyPrice: numberValue(fields.propertyPrice) * 10_000,
    age: numberValue(fields.age),
    annualIncome: numberValue(fields.annualIncome) * 10_000,
    newlywed: fields.newlywed.checked,
    hasMinorChild: fields.hasMinorChild.checked,
    householdHasHome: !fields.noHome.checked,
    selfUse: fields.selfUse.checked,
    usedPolicyLoan: !fields.neverUsed.checked,
    termYears: numberValue(fields.termYears),
    graceYears: numberValue(fields.graceYears),
    baseRatePercent: numberValue(fields.baseRatePercent),
    requestedLoan: numberValue(fields.requestedLoan) * 10_000,
  };
}

function setFieldValidity() {
  let message = "";
  const term = numberValue(fields.termYears);
  const grace = numberValue(fields.graceYears);
  if (grace >= term) message = "寬限期需小於貸款年限。";
  if (term > POLICY.maxTermYears) message = "青安 3.0 最長貸款年限為 40 年。";
  if (grace > POLICY.maxGraceYears) message = "青安 3.0 寬限期最長為 5 年。";
  if (!(numberValue(fields.propertyPrice) > 0)) message = "請先輸入房屋總價，下方結果才有意義。";
  output.inputMessage.textContent = message;
}

function renderChecks(result) {
  const failures = result.eligibility.failed.length;
  output.checkCount.textContent = failures ? `有 ${failures} 項待確認` : "全部符合輸入條件";
  output.checkCount.className = failures ? "check-count attention" : "check-count pass";
  output.checkList.replaceChildren(
    ...result.eligibility.checks.map((check) => {
      const item = document.createElement("li");
      item.className = check.pass ? "pass" : "fail";
      const icon = document.createElement("span");
      icon.className = "check-icon";
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = check.pass ? "✓" : "!";
      const copy = document.createElement("div");
      const title = document.createElement("strong");
      title.textContent = check.label;
      const note = document.createElement("small");
      note.textContent = check.pass ? "符合輸入條件" : check.note;
      copy.append(title, note);
      item.append(icon, copy);
      return item;
    }),
  );
}

function renderSchedule(result) {
  const relevantYears = result.years.slice(0, 6);
  output.scheduleBody.replaceChildren(
    ...relevantYears.map((year) => {
      const row = document.createElement("tr");
      const subsidy = year.subsidyPercentagePoints;
      const values = [
        `第 ${year.year} 年`,
        `${year.ratePercent.toFixed(3)}%`,
        subsidy ? `${subsidy.toFixed(3)} 個百分點` : "補貼期滿",
        formatCurrency(year.averageMonthlyPayment),
        formatCurrency(year.annualInterest),
        formatCurrency(year.endingBalance),
      ];
      values.forEach((value, index) => {
        const cell = document.createElement(index === 0 ? "th" : "td");
        if (index === 0) cell.scope = "row";
        cell.textContent = value;
        row.append(cell);
      });
      return row;
    }),
  );
}

function renderResult(result, input) {
  const householdLabel = input.hasMinorChild
    ? "育有未成年子女上限"
    : input.newlywed
      ? "新婚家庭上限"
      : "一般家庭上限";
  const requestedCapLabel = result.requestedLoanExceedsCap
    ? `你輸入的額度高於政策上限，以下以 ${formatCurrency(result.approvedEstimate)} 試算。`
    : `以下依你輸入的 ${formatCurrency(result.approvedEstimate)} 試算。`;

  output.maxLoan.textContent = formatCurrency(result.limits.programCap);
  output.loanCapNote.textContent = `${householdLabel} ${formatCurrency(result.limits.householdCap)}；8 成 LTV ${formatCurrency(result.limits.ltvCap)}`;
  output.downPayment.textContent = formatCurrency(Math.max(0, result.input.propertyPrice - result.approvedEstimate));
  output.firstPaymentLabel.textContent = input.graceYears > 0 ? "寬限期首月月付" : "首期預估月付";
  output.firstPayment.textContent = formatCurrency(result.firstPayment);
  output.firstPaymentNote.textContent = input.graceYears > 0 ? "寬限期間僅繳利息" : `第 1–3 年利率 ${result.years[0]?.ratePercent.toFixed(3) ?? "—"}%`;
  output.interestSaving.textContent = formatCurrency(result.interestSaving);
  const noPrice = !(input.propertyPrice > 0);
  output.status.textContent = noPrice ? "請先輸入房屋總價" : result.eligibility.eligible ? "條件初步符合" : "有條件待確認";
  output.status.className = `result-status ${!noPrice && result.eligibility.eligible ? "status-pass" : "status-attention"}`;

  renderChecks(result);
  renderSchedule(result);

  output.loanNote.replaceChildren();
  const title = document.createElement("strong");
  title.textContent = result.eligibility.eligible ? "下一步建議" : "先處理這些條件";
  const body = document.createElement("p");
  body.textContent = result.eligibility.eligible
    ? `${requestedCapLabel} 實際可貸額度仍須以銀行鑑價、信用與還款能力為準。`
    : `目前有 ${result.eligibility.failed.length} 項輸入與青安 3.0 資格不符；即使調整後，也請由承辦銀行最終確認。`;
  output.loanNote.append(title, body);
}

function calculate() {
  setFieldValidity();
  const input = getInput();
  const result = calculateScenario(input);
  if (result.clamped.length) {
    output.inputMessage.textContent = "輸入數值超出合理範圍，已以上限／下限試算，請確認欄位。";
  }
  renderResult(result, input);
}

function restoreExample() {
  Object.entries(EXAMPLE).forEach(([name, value]) => {
    const field = fields[name];
    if (field.type === "checkbox") field.checked = value;
    else field.value = value;
  });
  calculate();
}

form.addEventListener("input", calculate);
form.addEventListener("change", calculate);
document.querySelector("#reset-button").addEventListener("click", restoreExample);
document.querySelector("#print-button").addEventListener("click", () => window.print());

calculate();

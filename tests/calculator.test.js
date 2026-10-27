import test from "node:test";
import assert from "node:assert/strict";
import {
  POLICY,
  buildSchedule,
  calculateLoanLimits,
  calculateScenario,
  rateForMonth,
  subsidyForMonth,
} from "../calculator.js";

const eligibleInput = {
  location: "other",
  propertyPrice: 15_000_000,
  age: 35,
  annualIncome: 1_500_000,
  newlywed: false,
  hasMinorChild: false,
  householdHasHome: false,
  usedPolicyLoan: false,
  selfUse: true,
  termYears: 40,
  graceYears: 0,
  baseRatePercent: 2.275,
  requestedLoan: 10_000_000,
};

test("3+3 subsidy steps down after 36 months", () => {
  assert.equal(subsidyForMonth(1), 0.5);
  assert.equal(subsidyForMonth(36), 0.5);
  assert.equal(subsidyForMonth(37), 0.375);
  assert.equal(subsidyForMonth(49), 0.25);
  assert.equal(subsidyForMonth(61), 0.125);
  assert.equal(subsidyForMonth(73), 0);
  assert.equal(rateForMonth(2.275, 1), 1.775);
  assert.equal(rateForMonth(2.275, 37), 1.9);
});

test("loan cap is the lower of household cap and 80% LTV", () => {
  const limits = calculateLoanLimits(eligibleInput);
  assert.equal(limits.householdCap, POLICY.standardLoanCap);
  assert.equal(limits.ltvCap, 12_000_000);
  assert.equal(limits.programCap, 10_000_000);
  assert.equal(limits.minimumDownPayment, 5_000_000);
});

test("an eligible scenario gets a valid schedule and a positive subsidy saving", () => {
  const result = calculateScenario(eligibleInput);
  assert.equal(result.eligibility.eligible, true);
  assert.equal(result.schedule.months.length, 480);
  assert.ok(result.schedule.finalBalance < 0.01);
  assert.ok(result.interestSaving > 0);
  assert.ok(result.schedule.totalInterest < result.baseline.totalInterest);
  const firstSixYearsBaselineInterest = result.baseline.months
    .slice(0, 72)
    .reduce((sum, month) => sum + month.interest, 0);
  assert.ok(result.interestSaving < firstSixYearsBaselineInterest);
});

test("interest-only grace months do not reduce principal", () => {
  const schedule = buildSchedule({
    principal: 10_000_000,
    termYears: 40,
    graceYears: 5,
    baseRatePercent: 2.275,
  });
  assert.equal(schedule.months[0].principalPayment, 0);
  assert.equal(schedule.months[59].balance, 10_000_000);
  assert.ok(schedule.months[60].principalPayment > 0);
});

test("age and property price failures are surfaced", () => {
  const result = calculateScenario({ ...eligibleInput, age: 50, propertyPrice: 21_000_000 });
  assert.equal(result.eligibility.eligible, false);
  assert.deepEqual(
    result.eligibility.failed.map((item) => item.id),
    ["age", "term", "price"],
  );
});

test("under-age applicants are flagged", () => {
  const result = calculateScenario({ ...eligibleInput, age: 15 });
  assert.equal(result.eligibility.checks.find((c) => c.id === "age").pass, false);
});

// ---- QA round 2: formula cross-check and hostile inputs ----
import { sanitizeInput, INPUT_BOUNDS } from "../calculator.js";

test("unsubsidized schedule matches the closed-form annuity payment", () => {
  for (const [P, years, rate] of [[10_000_000, 40, 2.275], [6_000_000, 30, 2.1], [3_000_000, 7, 3.5]]) {
    const s = buildSchedule({ principal: P, termYears: years, graceYears: 0, baseRatePercent: rate, subsidized: false });
    const r = rate / 100 / 12;
    const n = years * 12;
    const pmt = (P * r) / (1 - (1 + r) ** -n);
    for (const m of [1, 2, n >> 1, n]) assert.ok(Math.abs(s.months[m - 1].payment - pmt) < 1e-6);
    assert.ok(Math.abs(s.totalInterest - (pmt * n - P)) < 1e-3);
    assert.ok(s.finalBalance < 1e-6);
  }
});

test("grace period then closed-form annuity over the remaining months (unsubsidized)", () => {
  const P = 12_000_000, rate = 2.5, g = 5, years = 40;
  const s = buildSchedule({ principal: P, termYears: years, graceYears: g, baseRatePercent: rate, subsidized: false });
  const r = rate / 100 / 12, n = (years - g) * 12;
  const pmt = (P * r) / (1 - (1 + r) ** -n);
  assert.ok(Math.abs(s.months[0].payment - P * r) < 1e-6);
  assert.ok(Math.abs(s.months[g * 12].payment - pmt) < 1e-6);
  assert.ok(s.finalBalance < 1e-6);
});

test("subsidized schedule always pays off, for several terms", () => {
  for (const years of [1, 3, 6, 7, 20, 30, 40]) {
    const s = buildSchedule({ principal: 9_000_000, termYears: years, graceYears: 0, baseRatePercent: 2.275 });
    assert.ok(s.finalBalance < 1e-6, `term ${years}`);
    assert.equal(s.months.length, years * 12);
  }
});

test("hostile numeric input never produces NaN/Infinity or a huge loop", () => {
  const bad = [NaN, "", "abc", null, undefined, -5, 1e308, Infinity, -Infinity, 1e7];
  for (const v of bad) {
    const t = Date.now();
    const r = calculateScenario({ ...eligibleInput, termYears: v, graceYears: v, baseRatePercent: v, propertyPrice: v, requestedLoan: v, age: v, annualIncome: v });
    assert.ok(Date.now() - t < 2000, `slow for ${String(v)}`);
    for (const n of [r.firstPayment, r.interestSaving, r.limits.programCap, r.approvedEstimate, r.schedule.totalInterest, r.limits.minimumDownPayment]) {
      assert.ok(Number.isFinite(n), `non-finite for ${String(v)}`);
    }
    assert.ok(r.schedule.months.length <= INPUT_BOUNDS.termYears * 12);
  }
});

test("absurd term is clamped and flagged, and still fails the 40-year eligibility check", () => {
  const r = calculateScenario({ ...eligibleInput, termYears: 10_000_000 });
  assert.deepEqual(r.clamped, ["termYears"]);
  assert.equal(r.eligibility.checks.find((c) => c.id === "termLimit").pass, false);
  assert.deepEqual(sanitizeInput({ ...eligibleInput }).clamped, []);
});

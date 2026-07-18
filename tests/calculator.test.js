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

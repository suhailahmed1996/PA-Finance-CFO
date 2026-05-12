// Financial formulas library. Every calculation a CFO actually uses.
// Pure functions. No side effects. No network.

// ============================================================
// CORE METRICS
// ============================================================

export const savingsRate = (income, expense) => {
  if (income <= 0) return 0;
  return (income - expense) / income;
};

export const burnRate = (monthlyExpense) => monthlyExpense;

export const runway = (currentSavings, monthlyExpense) => {
  if (monthlyExpense <= 0) return Infinity;
  return currentSavings / monthlyExpense;
};

export const profitMargin = (revenue, costs) => {
  if (revenue <= 0) return 0;
  return (revenue - costs) / revenue;
};

export const grossMargin = (revenue, cogs) => {
  if (revenue <= 0) return 0;
  return (revenue - cogs) / revenue;
};

export const breakEvenUnits = (fixedCosts, pricePerUnit, variableCostPerUnit) => {
  const contributionMargin = pricePerUnit - variableCostPerUnit;
  if (contributionMargin <= 0) return Infinity;
  return Math.ceil(fixedCosts / contributionMargin);
};

export const breakEvenRevenue = (fixedCosts, contributionMarginPct) => {
  if (contributionMarginPct <= 0) return Infinity;
  return fixedCosts / contributionMarginPct;
};

// ============================================================
// COMPOUND INTEREST + INVESTING
// ============================================================

// Future value of a one-time investment compounded monthly
export const compoundFV = (principal, annualRate, years) => {
  const r = annualRate / 12;
  const n = years * 12;
  return principal * Math.pow(1 + r, n);
};

// Future value of a SIP (monthly investment)
export const sipFV = (monthlyContribution, annualRate, years) => {
  const r = annualRate / 12;
  const n = years * 12;
  if (r === 0) return monthlyContribution * n;
  return monthlyContribution * ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
};

// Real return after inflation
export const realReturn = (nominalRate, inflationRate) => {
  return (1 + nominalRate) / (1 + inflationRate) - 1;
};

// What monthly SIP do you need to reach a target?
export const sipRequired = (targetAmount, annualRate, years) => {
  const r = annualRate / 12;
  const n = years * 12;
  if (r === 0) return targetAmount / n;
  return targetAmount / (((Math.pow(1 + r, n) - 1) / r) * (1 + r));
};

// ============================================================
// EMI / LOANS
// ============================================================

export const calculateEMI = (principal, annualRate, years) => {
  const r = annualRate / 12;
  const n = years * 12;
  if (r === 0) return principal / n;
  return principal * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
};

export const totalInterestPaid = (principal, annualRate, years) => {
  const emi = calculateEMI(principal, annualRate, years);
  return emi * years * 12 - principal;
};

// Debt avalanche: order debts by interest rate descending (pay highest interest first)
export const debtAvalanche = (debts) => {
  return [...debts].sort((a, b) => b.rate - a.rate);
};

// Debt snowball: order debts by balance ascending (pay smallest first for psychology)
export const debtSnowball = (debts) => {
  return [...debts].sort((a, b) => a.balance - b.balance);
};

// ============================================================
// EMERGENCY FUND + RETIREMENT
// ============================================================

// Recommended emergency fund: 6x monthly essential expenses
export const emergencyFundTarget = (monthlyEssentialExpense, months = 6) => {
  return monthlyEssentialExpense * months;
};

// Months of emergency fund you currently have
export const emergencyFundMonths = (currentLiquidSavings, monthlyEssentialExpense) => {
  if (monthlyEssentialExpense <= 0) return Infinity;
  return currentLiquidSavings / monthlyEssentialExpense;
};

// Retirement corpus needed using 25x rule (4% safe withdrawal rate)
export const retirementCorpus = (currentMonthlyExpense, yearsToRetirement, inflationRate = 0.06, multiplier = 25) => {
  const futureMonthlyExpense = currentMonthlyExpense * Math.pow(1 + inflationRate, yearsToRetirement);
  return futureMonthlyExpense * 12 * multiplier;
};

// SIP needed to retire by age X
export const retirementSipRequired = (currentMonthlyExpense, currentAge, retirementAge, expectedReturn = 0.12, inflationRate = 0.06) => {
  const yearsToRetirement = retirementAge - currentAge;
  if (yearsToRetirement <= 0) return null;
  const corpus = retirementCorpus(currentMonthlyExpense, yearsToRetirement, inflationRate);
  return sipRequired(corpus, expectedReturn, yearsToRetirement);
};

// ============================================================
// INSURANCE SIZING
// ============================================================

// Term life insurance: 10-20x annual income
export const termInsuranceTarget = (annualIncome, multiplier = 15) => {
  return annualIncome * multiplier;
};

// Health insurance: minimum 5L individual, 10L family in metro India
export const healthInsuranceMinimum = (familySize, isMetro = true) => {
  const base = isMetro ? 1000000 : 500000;
  if (familySize > 2) return base + (familySize - 2) * 200000;
  return base;
};

// ============================================================
// BUSINESS METRICS
// ============================================================

// Customer Acquisition Cost
export const cac = (totalMarketingSpend, customersAcquired) => {
  if (customersAcquired <= 0) return 0;
  return totalMarketingSpend / customersAcquired;
};

// Lifetime Value (simple)
export const ltv = (avgRevenuePerCustomer, grossMarginPct, churnRate) => {
  if (churnRate <= 0) return Infinity;
  return (avgRevenuePerCustomer * grossMarginPct) / churnRate;
};

// LTV:CAC ratio (healthy is 3:1 or higher)
export const ltvToCac = (ltvValue, cacValue) => {
  if (cacValue <= 0) return Infinity;
  return ltvValue / cacValue;
};

// Months to recoup CAC
export const cacPayback = (cacValue, monthlyRevenue, grossMarginPct) => {
  const monthlyGrossProfit = monthlyRevenue * grossMarginPct;
  if (monthlyGrossProfit <= 0) return Infinity;
  return cacValue / monthlyGrossProfit;
};

// Quick ratio: (cash + receivables) / current liabilities
export const quickRatio = (cash, receivables, currentLiabilities) => {
  if (currentLiabilities <= 0) return Infinity;
  return (cash + receivables) / currentLiabilities;
};

// MRR growth rate
export const mrrGrowthRate = (mrrThis, mrrPrev) => {
  if (mrrPrev <= 0) return 0;
  return (mrrThis - mrrPrev) / mrrPrev;
};

// ============================================================
// INDIAN TAX (FY 2024-25 NEW REGIME, INDICATIVE)
// ============================================================

export const calculateTaxNewRegime = (annualIncome) => {
  // Standard deduction
  let income = Math.max(0, annualIncome - 75000);
  if (income <= 400000) return 0;

  const slabs = [
    { from: 0, to: 400000, rate: 0 },
    { from: 400000, to: 800000, rate: 0.05 },
    { from: 800000, to: 1200000, rate: 0.10 },
    { from: 1200000, to: 1600000, rate: 0.15 },
    { from: 1600000, to: 2000000, rate: 0.20 },
    { from: 2000000, to: 2400000, rate: 0.25 },
    { from: 2400000, to: Infinity, rate: 0.30 }
  ];

  let tax = 0;
  for (const slab of slabs) {
    if (income > slab.from) {
      const taxableInSlab = Math.min(income, slab.to) - slab.from;
      tax += taxableInSlab * slab.rate;
    }
  }
  // 87A rebate: if taxable income <= 12L, full rebate (effectively no tax up to ~12L)
  if (income <= 1200000) return 0;
  // Cess 4%
  return tax * 1.04;
};

// ============================================================
// HELPER UTILITIES
// ============================================================

// Format a percentage
export const pct = (n, decimals = 1) => `${(n * 100).toFixed(decimals)}%`;

// Format INR
export const inr = (n) => {
  if (n == null || isNaN(n)) return '₹0';
  const abs = Math.abs(n);
  if (abs >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
  if (abs >= 100000) return `₹${(n / 100000).toFixed(2)}L`;
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
};

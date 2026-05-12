// Rule-based CFO engine. No API. No network. No randomness.
// Every recommendation is a deterministic function of the user's actual numbers.

import * as F from './formulas.js';

// ============================================================
// DIAGNOSTIC RULES
// Each rule examines the user's financial state and returns
// either null (does not apply) or a finding object.
// ============================================================

const rules = [
  // SAVINGS RATE
  {
    id: 'savings_rate_critical',
    severity: 'critical',
    check: (s) => s.savingsRate < 0 && s.income > 0,
    say: (s) => ({
      headline: `You spent more than you earned this month.`,
      detail: `Income ₹${Math.round(s.income).toLocaleString('en-IN')}, expenses ₹${Math.round(s.expense).toLocaleString('en-IN')}. You burned ₹${Math.round(s.expense - s.income).toLocaleString('en-IN')} from savings.`,
      action: `Open your top 3 expense categories below. Cut at least one by 50% this week. The fastest cuts are eating out, subscriptions, and impulse shopping.`
    })
  },
  {
    id: 'savings_rate_danger',
    severity: 'critical',
    check: (s) => s.savingsRate >= 0 && s.savingsRate < 0.10 && s.income > 0,
    say: (s) => ({
      headline: `Savings rate is ${F.pct(s.savingsRate)}. That is fragile.`,
      detail: `Below 10% means one medical bill, one job loss, or one bad month can push you into debt. The Indian standard for financial security is 20%+ savings rate.`,
      action: `Find ₹${Math.round((0.15 - s.savingsRate) * s.income).toLocaleString('en-IN')} per month to cut or earn more. Look at your top category and ask: what is the smallest cut that doubles my savings rate?`
    })
  },
  {
    id: 'savings_rate_decent',
    severity: 'info',
    check: (s) => s.savingsRate >= 0.10 && s.savingsRate < 0.20 && s.income > 0,
    say: (s) => ({
      headline: `Savings rate ${F.pct(s.savingsRate)}. Adequate, not strong.`,
      detail: `You are safe but not building wealth. Going from 15% to 25% is where real net worth growth happens.`,
      action: `Pick one recurring expense to cut this week. Subscriptions are usually the easiest. Aim for ₹${Math.round(0.05 * s.income).toLocaleString('en-IN')} extra saved per month.`
    })
  },
  {
    id: 'savings_rate_good',
    severity: 'positive',
    check: (s) => s.savingsRate >= 0.20 && s.savingsRate < 0.30 && s.income > 0,
    say: (s) => ({
      headline: `Savings rate ${F.pct(s.savingsRate)}. Solid.`,
      detail: `You are saving like someone serious about money. Now make sure the savings are working: PPF, ELSS, index funds, not idle in savings account at 3%.`,
      action: `Check that at least 70% of your savings is in growth assets (equity mutual funds, index funds, NPS Tier 1). If most of it is in FD or savings, you are losing to inflation.`
    })
  },
  {
    id: 'savings_rate_excellent',
    severity: 'positive',
    check: (s) => s.savingsRate >= 0.30 && s.income > 0,
    say: (s) => ({
      headline: `Savings rate ${F.pct(s.savingsRate)}. Excellent.`,
      detail: `You are in the top 5% of Indian earners by savings discipline. The leverage now is income growth, not expense cutting. Cutting more saves rupees. Earning more compounds.`,
      action: `Spend 1 hour this week on a single income lever: rate hike to a client, side project pitch, or asking for promotion. Earning ₹10k more is worth more than saving ₹10k more.`
    })
  },

  // LIFESTYLE INFLATION
  {
    id: 'high_want_spending',
    severity: 'warning',
    check: (s) => {
      const wantPct = s.expense > 0 ? (s.want / s.expense) : 0;
      return wantPct > 0.40;
    },
    say: (s) => ({
      headline: `${F.pct(s.want / s.expense, 0)} of your spending is "wants" not "needs".`,
      detail: `Above 40% Want spending signals lifestyle inflation. This is the silent wealth killer. Each upgrade feels small, the cumulative drag is enormous.`,
      action: `For one week, write a single sentence in description before saving any "Want" transaction explaining why. Friction reveals impulse.`
    })
  },

  // HIGH SPEND CATEGORIES
  {
    id: 'eating_out_high',
    severity: 'warning',
    check: (s) => {
      const food = s.byCategory['Food'] || 0;
      return food > 0 && s.expense > 0 && (food / s.expense) > 0.25;
    },
    say: (s) => {
      const food = s.byCategory['Food'] || 0;
      return {
        headline: `Food is ${F.pct(food / s.expense, 0)} of your spending. ₹${Math.round(food).toLocaleString('en-IN')} this month.`,
        detail: `Most overspending here comes from delivery apps. Each order feels small, but ₹400 x 30 days = ₹12,000 a month, ₹1.4 lakh a year.`,
        action: `Delete Swiggy and Zomato. Reinstall when you genuinely need them. 90-second friction kills 70% of impulse orders.`
      };
    }
  },
  {
    id: 'subscriptions_creep',
    severity: 'warning',
    check: (s) => {
      const subs = s.byCategory['Subscriptions'] || 0;
      return subs > 2000;
    },
    say: (s) => {
      const subs = s.byCategory['Subscriptions'] || 0;
      return {
        headline: `Subscriptions are ₹${Math.round(subs).toLocaleString('en-IN')}/month. ₹${Math.round(subs * 12).toLocaleString('en-IN')}/year.`,
        detail: `Each subscription seems small. Total is rarely small. The average Indian urban household carries 6-8 subscriptions, half of which they barely use.`,
        action: `List every subscription on a piece of paper today. Cancel anything you have not used in the last 14 days. Most people cut 30-40% on first audit.`
      };
    }
  },
  {
    id: 'shopping_high',
    severity: 'warning',
    check: (s) => {
      const shop = s.byCategory['Shopping'] || 0;
      return shop > 0 && s.expense > 0 && (shop / s.expense) > 0.15;
    },
    say: (s) => {
      const shop = s.byCategory['Shopping'] || 0;
      return {
        headline: `Shopping is ${F.pct(shop / s.expense, 0)} of your spend.`,
        detail: `Amazon and Flipkart are designed to eliminate the decision pause that protects your money. Sale events compound the problem.`,
        action: `Add anything you want to buy to a wishlist. Wait 7 days. If you still want it, buy it. You will discover that 80% of "wants" expire on their own.`
      };
    }
  },
  {
    id: 'emi_burden_high',
    severity: 'critical',
    check: (s) => {
      const emi = s.byCategory['Debt/EMI'] || 0;
      return emi > 0 && s.income > 0 && (emi / s.income) > 0.40;
    },
    say: (s) => {
      const emi = s.byCategory['Debt/EMI'] || 0;
      return {
        headline: `EMIs are ${F.pct(emi / s.income, 0)} of income. Dangerous.`,
        detail: `Above 40% EMI-to-income ratio is what banks call distress. You are one missed payment from a credit score hit. No real wealth can be built while this is true.`,
        action: `List every loan: balance, interest rate, EMI. Attack the highest interest rate first. Consider prepaying personal loans and credit card debt with any spare cash, even if it delays SIPs.`
      };
    }
  },

  // BUSINESS HEALTH
  {
    id: 'business_margin_thin',
    severity: 'warning',
    check: (s) => s.businessIncome > 0 && (s.businessNet / s.businessIncome) < 0.15,
    say: (s) => ({
      headline: `Business margin is ${F.pct(s.businessNet / s.businessIncome, 0)}. Thin.`,
      detail: `Below 15% margin means little room for shocks. A bad client, a price cut, a new cost can wipe out the month.`,
      action: `Two levers: raise prices 10% on your next quote, or audit your top 3 business expenses for what you can stop. Most service businesses are underpriced by 20-30%.`
    })
  },
  {
    id: 'business_margin_negative',
    severity: 'critical',
    check: (s) => s.businessIncome > 0 && s.businessNet < 0,
    say: (s) => ({
      headline: `Business is losing money this month.`,
      detail: `Costs exceed revenue. Every additional unit of work makes the hole deeper, not smaller. This is not a hustle problem, this is a math problem.`,
      action: `Stop accepting new work for 48 hours. Sit down and price one service or product correctly. Then communicate the new price to one client this week.`
    })
  },
  {
    id: 'business_strong',
    severity: 'positive',
    check: (s) => s.businessIncome >= 50000 && (s.businessNet / s.businessIncome) >= 0.30,
    say: (s) => ({
      headline: `Business margin ${F.pct(s.businessNet / s.businessIncome, 0)}. Strong.`,
      detail: `You have profitable economics. The next question is volume. Can you double revenue without doubling cost?`,
      action: `Identify one thing in your business that scales sub-linearly with revenue (content, code, a system). Spend 4 hours this week building it.`
    })
  },

  // INCOME PATTERNS
  {
    id: 'single_income_source',
    severity: 'warning',
    check: (s) => s.incomeSourceCount === 1 && s.txnCount >= 10,
    say: (s) => ({
      headline: `All your income comes from one source.`,
      detail: `Single-income dependency is the biggest hidden risk for entrepreneurs and salaried alike. If that one source pauses, your runway is whatever is in your account.`,
      action: `Add one small income stream this quarter. Freelance one weekend a month. Rent out something idle. Anything that generates ₹5,000+ from a different source.`
    })
  },
  {
    id: 'no_income_logged',
    severity: 'info',
    check: (s) => s.income === 0 && s.expense > 0,
    say: () => ({
      headline: `You have logged expenses but no income this month.`,
      detail: `Either you have not logged it, or income is genuinely zero. Both are worth a note.`,
      action: `Log this month's income now. If there is none, the runway and savings rate metrics cannot help you. Income is the master variable.`
    })
  },

  // BUDGETS
  {
    id: 'budgets_broken_count',
    severity: 'warning',
    check: (s) => s.budgetsBroken >= 2,
    say: (s) => ({
      headline: `${s.budgetsBroken} category budgets are broken this month.`,
      detail: `Multiple broken budgets usually mean either the budgets were unrealistic or you have a system problem, not a willpower problem.`,
      action: `Pick the most broken budget. Decide: was it wrong, or did I lose control? If wrong, fix the number. If lost control, identify the trigger and add friction.`
    })
  },

  // POSITIVE FLAGS
  {
    id: 'consistent_logging',
    severity: 'positive',
    check: (s) => s.txnCount >= 15 && s.uniqueDays >= 10,
    say: (s) => ({
      headline: `${s.txnCount} transactions logged across ${s.uniqueDays} days this month.`,
      detail: `Most people who download a finance app quit by day 14. You did not. That habit alone is worth more than any single piece of advice.`,
      action: `Keep going. At 60 days of logging, the patterns become undeniable and decisions become easy.`
    })
  },

  // INVESTMENT NUDGES
  {
    id: 'investment_underweight',
    severity: 'info',
    check: (s) => {
      const inv = s.byCategory['Investment'] || s.byCategory['Investments'] || 0;
      return s.income > 50000 && s.net > 10000 && inv === 0;
    },
    say: (s) => ({
      headline: `You are saving but not investing.`,
      detail: `Money in a savings account earns 3% before tax. Inflation is 5-6%. Your real return is negative. You are slowly getting poorer in a "safe" way.`,
      action: `Start one monthly SIP of ₹${Math.max(1000, Math.round(s.net * 0.5 / 100) * 100).toLocaleString('en-IN')} in an index fund (Nifty 50 or Nifty Next 50) this week. Use Groww, Kuvera, or Zerodha Coin.`
    })
  }
];

// ============================================================
// CONTEXT BUILDER
// ============================================================

const buildState = (txns, month, budgets) => {
  const monthTxns = txns.filter(t => t.date.startsWith(month));
  const incomes = monthTxns.filter(t => t.type === 'income');
  const expenses = monthTxns.filter(t => t.type === 'expense');

  const income = incomes.reduce((s, t) => s + t.amount, 0);
  const expense = expenses.reduce((s, t) => s + t.amount, 0);

  const businessIncome = incomes.filter(t => t.scope === 'business').reduce((s, t) => s + t.amount, 0);
  const businessExpense = expenses.filter(t => t.scope === 'business').reduce((s, t) => s + t.amount, 0);
  const personalIncome = incomes.filter(t => t.scope === 'personal').reduce((s, t) => s + t.amount, 0);
  const personalExpense = expenses.filter(t => t.scope === 'personal').reduce((s, t) => s + t.amount, 0);

  const byCategory = {};
  expenses.forEach(t => { byCategory[t.category] = (byCategory[t.category] || 0) + t.amount; });

  const byClass = { need: 0, want: 0, waste: 0, investment: 0 };
  expenses.forEach(t => { byClass[t.classification] = (byClass[t.classification] || 0) + t.amount; });

  const incomeSourceCount = new Set(incomes.map(t => t.category)).size;

  let budgetsBroken = 0;
  Object.entries(budgets || {}).forEach(([cat, limit]) => {
    if (limit > 0 && (byCategory[cat] || 0) > limit) budgetsBroken++;
  });

  return {
    income, expense, net: income - expense,
    savingsRate: F.savingsRate(income, expense),
    businessIncome, businessExpense, businessNet: businessIncome - businessExpense,
    personalIncome, personalExpense, personalNet: personalIncome - personalExpense,
    byCategory, byClass,
    need: byClass.need, want: byClass.want, waste: byClass.waste, investment: byClass.investment,
    incomeSourceCount,
    txnCount: monthTxns.length,
    uniqueDays: new Set(monthTxns.map(t => t.date)).size,
    budgetsBroken,
    monthTxns
  };
};

// ============================================================
// PUBLIC API
// ============================================================

// Get all findings (rules that fired) for the current state
export const analyze = (txns, month, budgets) => {
  const state = buildState(txns, month, budgets);
  const findings = [];
  for (const rule of rules) {
    try {
      if (rule.check(state)) {
        const out = rule.say(state);
        findings.push({ id: rule.id, severity: rule.severity, ...out });
      }
    } catch (e) {
      // skip broken rule
    }
  }
  // Sort by severity
  const order = { critical: 0, warning: 1, info: 2, positive: 3 };
  findings.sort((a, b) => order[a.severity] - order[b.severity]);
  return { state, findings };
};

// Get a single most important "brief" for the home screen
export const brief = (txns, month, budgets) => {
  const { state, findings } = analyze(txns, month, budgets);
  if (state.txnCount === 0) {
    return {
      headline: 'No transactions logged yet.',
      detail: 'Numbers cannot lie if numbers do not exist.',
      action: 'Log your first transaction. Use the input above.'
    };
  }
  // Prefer critical, then warning, then info, then positive
  const critical = findings.find(f => f.severity === 'critical');
  if (critical) return critical;
  const warning = findings.find(f => f.severity === 'warning');
  if (warning) return warning;
  const info = findings.find(f => f.severity === 'info');
  if (info) return info;
  return findings[0] || {
    headline: 'Your finances look stable.',
    detail: 'Stable is the baseline. Now build.',
    action: 'Set a savings goal in the goals section. Without a target, savings drift into spending.'
  };
};

// ============================================================
// Q&A ENGINE
// Map user questions to specific analyzers using keyword matching.
// ============================================================

const QUESTIONS = [
  {
    keywords: ['leak', 'leaking', 'where is my money', 'where does my money go', 'top spend'],
    answer: (state) => {
      const top = Object.entries(state.byCategory).sort((a, b) => b[1] - a[1]).slice(0, 3);
      if (top.length === 0) return { headline: 'No expenses logged this month.', detail: '', action: 'Log a few transactions and ask again.' };
      const lines = top.map(([c, a]) => `${c}: ₹${Math.round(a).toLocaleString('en-IN')} (${F.pct(a / state.expense, 0)} of spend)`);
      return {
        headline: `Top 3 spend categories this month:`,
        detail: lines.join(' · '),
        action: `The largest one is your biggest single lever. Cut it by 20% next month: that is ₹${Math.round(top[0][1] * 0.2).toLocaleString('en-IN')} back in your pocket.`
      };
    }
  },
  {
    keywords: ['save more', 'how to save', 'increase savings', 'savings rate'],
    answer: (state) => {
      const targetRate = Math.max(0.30, state.savingsRate + 0.05);
      const targetSavings = state.income * targetRate;
      const gap = targetSavings - state.net;
      return {
        headline: `Your savings rate is ${F.pct(state.savingsRate)}.`,
        detail: `To hit ${F.pct(targetRate)}, you need to save ₹${Math.round(targetSavings).toLocaleString('en-IN')} per month. That is ₹${Math.round(Math.abs(gap)).toLocaleString('en-IN')} more than now.`,
        action: `Easiest path: cut subscriptions and eating out by 30% each. Hardest but biggest: raise income by 15% on your next client invoice or salary review.`
      };
    }
  },
  {
    keywords: ['grow income', 'earn more', 'increase income', 'double income', 'side hustle'],
    answer: (state) => {
      return {
        headline: `Income growth is the biggest lever you have.`,
        detail: `Cutting expenses has a floor at zero. Income has no ceiling. Even a 10% income increase on ₹${Math.round(state.income).toLocaleString('en-IN')} is ₹${Math.round(state.income * 0.10).toLocaleString('en-IN')} per month, ₹${Math.round(state.income * 1.2).toLocaleString('en-IN')} per year.`,
        action: `Pick one: (1) Raise your rate by 15% on your next quote or invoice. (2) Sell one productized service you already do for free. (3) Pitch one consulting client this week. Most people skip the ask. The ask is where money is.`
      };
    }
  },
  {
    keywords: ['grade', 'score', 'how am i doing', 'rate my'],
    answer: (state) => {
      let grade = 'F';
      let comment = '';
      if (state.income === 0) { grade = 'N/A'; comment = 'No income logged.'; }
      else if (state.savingsRate >= 0.30) { grade = 'A'; comment = 'Excellent discipline. Now focus on investing well and growing income.'; }
      else if (state.savingsRate >= 0.20) { grade = 'B'; comment = 'Solid. Push toward 30% by trimming wants.'; }
      else if (state.savingsRate >= 0.10) { grade = 'C'; comment = 'Adequate. One bad month away from trouble.'; }
      else if (state.savingsRate >= 0) { grade = 'D'; comment = 'Fragile. Something must change this month.'; }
      else { grade = 'F'; comment = 'Spending more than earning. Stop and audit today.'; }
      return {
        headline: `This month: ${grade}.`,
        detail: comment,
        action: `Open the Insights tab. Look at the first critical or warning finding. That is your single highest-impact action this week.`
      };
    }
  },
  {
    keywords: ['focus', 'priority', 'what should i', 'what now', 'today'],
    answer: (state) => brief(state.monthTxns, state.monthTxns[0]?.date.slice(0, 7) || new Date().toISOString().slice(0, 7), {})
  },
  {
    keywords: ['business', 'margin', 'profit'],
    answer: (state) => {
      if (state.businessIncome === 0) {
        return {
          headline: `No business income logged this month.`,
          detail: ``,
          action: `If you run a business, log revenue separately by setting scope to "business" when logging.`
        };
      }
      const margin = state.businessNet / state.businessIncome;
      return {
        headline: `Business: ₹${Math.round(state.businessIncome).toLocaleString('en-IN')} revenue, ₹${Math.round(state.businessNet).toLocaleString('en-IN')} profit. Margin: ${F.pct(margin, 0)}.`,
        detail: margin >= 0.30 ? 'Healthy margin. Focus on volume.' : margin >= 0.15 ? 'Thin margin. Raise prices or cut costs.' : 'Margin is dangerously low. Audit pricing this week.',
        action: margin < 0.20 ? 'On your next quote, increase price by 15%. Most clients accept. Those who do not were unprofitable anyway.' : 'Identify one revenue stream that does not consume your time. Build it.'
      };
    }
  },
  {
    keywords: ['emergency', 'fund', 'cushion'],
    answer: (state) => {
      const monthlyEssential = (state.byCategory['Housing'] || 0) + (state.byCategory['Utilities'] || 0) + (state.byCategory['Food'] || 0) + (state.byCategory['Debt/EMI'] || 0);
      const target = F.emergencyFundTarget(monthlyEssential || state.expense * 0.6);
      return {
        headline: `Emergency fund target: ₹${Math.round(target).toLocaleString('en-IN')}.`,
        detail: `This is 6 months of essentials (housing, utilities, food, EMIs). Keep this in a liquid fund or savings sweep, not in equity.`,
        action: `If you do not have this yet, prioritize it before SIPs in equity. Set a monthly recurring transfer to a separate liquid fund.`
      };
    }
  },
  {
    keywords: ['retire', 'retirement'],
    answer: (state) => {
      const annual = state.expense * 12;
      const corpus25 = annual * 25;
      return {
        headline: `Retirement corpus needed: ${F.inr(corpus25)}.`,
        detail: `This uses the 25x rule (4% safe withdrawal). Adjusted for inflation, you may need 2-3x this in nominal rupees if retirement is 20+ years away.`,
        action: `Open the Tools tab and use the retirement calculator with your specific age and target retirement year.`
      };
    }
  }
];

// Answer a free-text question
export const answer = (question, txns, month, budgets) => {
  const state = buildState(txns, month, budgets);
  state.monthTxns = state.monthTxns; // pass-through
  const lower = question.toLowerCase();

  for (const q of QUESTIONS) {
    if (q.keywords.some(kw => lower.includes(kw))) {
      return q.answer(state);
    }
  }

  // No match: return the brief
  return brief(txns, month, budgets);
};

export const getSuggestedQuestions = () => [
  'Where am I leaking money?',
  'How do I grow my income?',
  'How am I doing this month?',
  'What should I focus on today?',
  'Is my business profitable?',
  'How much emergency fund do I need?'
];

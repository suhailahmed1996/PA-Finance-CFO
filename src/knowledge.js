// Knowledge base. Indian personal finance principles, in plain language.
// Used by the Learn tab and referenced by the CFO when relevant.

export const KNOWLEDGE = [
  {
    id: 'savings_rate',
    topic: 'Savings Rate',
    short: 'The single most important personal finance number.',
    body: `Savings rate is (income - expenses) / income. It is more important than income, more important than investment returns, more important than your job title.

A 25-year-old saving 30% reaches financial independence faster than a 25-year-old earning twice as much but saving 10%. The math is brutal and the math is real.

Benchmarks for India:
- Below 10%: financially fragile. One emergency away from debt.
- 10-20%: surviving. Not building.
- 20-30%: solid. The middle-class wealth-builder zone.
- 30%+: aggressive. Where real net worth growth happens.
- 50%+: FIRE territory. Possible for high earners with low lifestyle inflation.

The way to increase savings rate is not willpower. It is automation. Auto-debit on payday before the money touches your spending account.`
  },
  {
    id: 'emergency_fund',
    topic: 'Emergency Fund',
    short: '6 months of essential expenses in a liquid fund. Build this first.',
    body: `Emergency fund is not optional. It is the foundation everything else rests on. Without it, every other financial decision is fragile.

Target: 6 months of essential expenses. Essentials means rent, utilities, food, EMIs, insurance premiums. Not Netflix, not eating out, not shopping.

Where to keep it:
- Savings account: 30% (instant access)
- Liquid mutual fund: 70% (1-day redemption, slightly higher returns)
- Never in equity. Markets crash exactly when you need the money.

Build order:
1. ₹1L starter emergency (covers most small shocks)
2. 3 months of essentials (next priority)
3. 6 months of essentials (full foundation)
4. Only then move to higher-yield investments

If you have credit card debt or personal loans above 15% interest, attack those first while keeping at least ₹1L emergency.`
  },
  {
    id: 'tax_regimes',
    topic: 'Old vs New Tax Regime (FY 2024-25)',
    short: 'New regime is better for most. Old regime only wins if you have heavy deductions.',
    body: `India has two tax regimes. The new regime (default from FY24-25) has lower rates but almost no deductions. The old regime allows 80C, 80D, HRA, home loan interest, etc.

New regime slabs (FY 2024-25):
- Up to ₹4L: 0%
- ₹4L-8L: 5%
- ₹8L-12L: 10%
- ₹12L-16L: 15%
- ₹16L-20L: 20%
- ₹20L-24L: 25%
- Above ₹24L: 30%
- Standard deduction: ₹75,000
- 87A rebate: full rebate up to ₹12L taxable income (effectively no tax)

Old regime: 0/5/20/30% slabs with allowed deductions like 80C (₹1.5L), 80D, HRA.

Quick rule: if your deductions exceed ₹3-4L, old regime usually wins. If you have minimal deductions, new regime wins. Run both calculations every March.`
  },
  {
    id: 'ppf',
    topic: 'PPF (Public Provident Fund)',
    short: 'Safe, tax-free, 15-year lock-in, 7-8% returns. Best for risk-averse.',
    body: `PPF is the safest long-term wealth tool in India. Backed by Government of India.

Mechanics:
- 15-year lock-in (can extend in 5-year blocks)
- Minimum ₹500/year, maximum ₹1.5L/year
- Current rate: 7.1% (revised quarterly)
- EEE status: contribution deductible (80C in old regime), interest tax-free, withdrawal tax-free
- Partial withdrawal allowed from year 7

When to use PPF:
- Old tax regime: yes, for the 80C deduction plus tax-free compounding
- New tax regime: only if you cannot stomach equity volatility for long-term goals
- For risk-averse retirement: a chunk of corpus here works
- If you are under 35: prefer equity (index funds) for higher growth. Allocate to PPF later.

Opening: any PSU or major private bank, takes 30 minutes.`
  },
  {
    id: 'mutual_funds',
    topic: 'Index Funds and Mutual Funds',
    short: 'For most Indians, an index fund SIP is the right answer.',
    body: `Mutual funds let small amounts of money buy diversified ownership. SIP (Systematic Investment Plan) means investing a fixed amount monthly.

Categories:
- Equity (high return, high risk): Nifty 50 index, Nifty Next 50, Flexi-cap
- Debt (low return, low risk): liquid funds, short-duration funds
- Hybrid (mixed): balanced advantage funds

Indian indices vs active funds: research shows 80%+ of active large-cap funds underperform the Nifty 50 over 10+ years. Index funds win by being boring and cheap.

For most people:
- Equity portion: Nifty 50 index fund (expense ratio under 0.20%)
- Or Nifty Next 50 for slightly more growth
- Debt portion: liquid fund for emergency, short-duration for goals 1-3 years away

Avoid:
- Funds with expense ratio above 2%
- Sectoral or thematic funds unless you really know what you are doing
- NFOs (new fund offers) sold as exciting opportunities

Platforms: Groww, Kuvera, Zerodha Coin. All free, direct plans.`
  },
  {
    id: 'nps',
    topic: 'NPS (National Pension System)',
    short: 'Tax-efficient retirement vehicle. Underrated for high earners.',
    body: `NPS is a government-backed retirement scheme. Has unique tax benefits not available elsewhere.

Tax benefits:
- 80C: up to ₹1.5L (counts in old regime overall limit)
- 80CCD(1B): additional ₹50,000 deduction (only in old regime), unique to NPS
- Employer contribution: up to 10% of basic + DA tax-free (both regimes)

Mechanics:
- Lock-in until retirement (60). Partial withdrawal after 3 years for specific reasons.
- Asset allocation between equity (max 75% if you choose), corporate bonds, government bonds.
- Auto choice rebalances allocation as you age, or active choice gives you control.
- At 60: 60% can be withdrawn lump sum (tax-free), 40% must buy annuity (taxable).

Best for:
- High earners maxing out other 80C
- Anyone wanting a disciplined retirement vehicle
- Especially good for self-employed who lack EPF

Open via NSDL or any major bank, fully online.`
  },
  {
    id: 'health_insurance',
    topic: 'Health Insurance',
    short: 'Minimum 10L family floater in metro. Non-negotiable.',
    body: `One serious illness can wipe out a decade of savings. Health insurance is the only barrier between you and that.

Sizing:
- Metro family: minimum ₹10L family floater
- Tier 2 city: minimum ₹5L family floater
- Add a super top-up of ₹50L-1Cr with ₹5-10L deductible. Premium is low because it only kicks in for large claims.

What to look for:
- No room rent capping
- No co-pay clause (or 0% co-pay)
- Pre-existing disease waiting period: shorter the better
- Network hospitals near you
- Claim settlement ratio above 90%

What NOT to do:
- Rely only on employer insurance. You lose it when you leave the job.
- Buy small ₹3L policies. They run out fast.
- Over-buy critical illness or hospital cash riders. Mostly noise.

Good options in India (no specific endorsement): HDFC Ergo Optima Secure, Niva Bupa ReAssure, Care Health Supreme, ICICI Lombard Elevate. Compare on PolicyBazaar or similar.`
  },
  {
    id: 'term_insurance',
    topic: 'Term Life Insurance',
    short: 'If anyone depends on your income, you need 15-20x annual income as term cover.',
    body: `Term insurance pays a lump sum if you die during the policy period. No payout if you survive. That is exactly the point: it is pure protection, cheap because most people will not die during the term.

Who needs it: anyone with financial dependents (spouse who does not work, kids, dependent parents, large loans).

Who does not need it: single people with no debt and no dependents.

Sizing: 15-20x your annual income, or enough to clear all debt + 25x annual expenses of dependents.

Example: if you earn ₹15L and have a spouse who depends on you, buy ₹2.5-3Cr cover.

Tenure: until you expect to be financially independent (usually age 60).

What to avoid:
- ULIPs and endowment plans dressed up as insurance. These are bad insurance and worse investments. Pure term only.
- Return of premium variants. You pay 2-3x premium to get money back. Bad math.
- Riders that look reassuring but add cost: accidental death, waiver of premium, etc. Usually skippable.

Buy directly online from insurer to keep premium low. HDFC Click 2 Protect, ICICI iProtect Smart, Max Life Smart Secure, TATA AIA Sampoorna Raksha.`
  },
  {
    id: '50_30_20',
    topic: '50/30/20 rule (and why it fails in India)',
    short: 'A starting framework, but Indian costs and ambitions usually need adjusting.',
    body: `The 50/30/20 rule: 50% on needs, 30% on wants, 20% on savings.

It is a useful starting point but rarely fits Indian reality:
- Tier 1 city rent eats 30-40% alone, leaving little for other "needs"
- High EMI burden (housing, education loans) pushes the needs portion to 60%+
- Aspirational consumption pushes wants up
- 20% savings rate is mediocre by Indian wealth-building standards

Adjusted Indian version:
- 40-50% needs (rent, utilities, food, EMIs, insurance)
- 20% wants (entertainment, dining, shopping)
- 30%+ savings/investments

If you cannot hit these numbers, the issue is usually rent (move) or transport (downsize) or EMIs (refinance). Adjust the big three, the small categories fix themselves.`
  },
  {
    id: 'debt_payoff',
    topic: 'Debt Payoff Order',
    short: 'Highest interest first. Always. Math wins over psychology.',
    body: `If you have multiple debts, the order to pay them off matters a lot.

Two methods:
- Avalanche: highest interest rate first. Mathematically optimal.
- Snowball: smallest balance first. Psychologically easier, financially worse.

Use avalanche unless you genuinely need the small wins to stay motivated.

Typical Indian debt interest rates:
- Credit card: 30-42% (kill this first, always)
- Personal loan: 12-24%
- Car loan: 8-12%
- Education loan: 8-11%
- Home loan: 8-9%

Anything above 12% should be attacked aggressively. Pause SIPs if needed to clear high-interest debt. Carrying 30% credit card debt while running a 12% equity SIP is mathematical surrender.

Negotiation works: call credit card companies and ask for an EMI conversion or balance transfer to lower rate. They will often agree because alternative is default.`
  },
  {
    id: 'business_pricing',
    topic: 'Pricing Your Service',
    short: 'Most Indian freelancers and consultants are underpriced by 20-50%.',
    body: `Pricing is the single biggest lever in a service business. A 15% price increase often beats months of marketing.

Why most underprice:
- Fear of losing clients (the wrong clients should leave)
- Anchoring to domestic competition (you compete on value, not on local rates)
- Imposter syndrome dressed as humility
- Not separating cost-plus from value-based pricing

Test: raise your price 15% on your next quote. Track what happens. Usually 80% accept. Of the 20% who do not, half were going to be unprofitable clients anyway.

Value-based pricing: what is the outcome worth to the client?
- A logo design that becomes a brand for 10 years: worth ₹50,000+ to a serious business, not ₹2,000
- A tax strategy that saves ₹5L: worth ₹50,000-1L, not a flat ₹5,000
- Software that automates 20 hours/week: worth a percentage of those hours

Charge based on impact, not your time.`
  },
  {
    id: 'real_return',
    topic: 'Real Return vs Nominal Return',
    short: 'Your savings account is losing you money even when balance goes up.',
    body: `Nominal return: the headline number. "My FD gives 7%."
Real return: nominal return minus inflation. The actual gain in purchasing power.

If your FD earns 7% and inflation is 6%, your real return is roughly 1%.

This matters enormously for long-term goals:
- Savings account: 3% nominal, 5-6% inflation = real return MINUS 2-3%
- FD: 7% nominal = real return 1%
- PPF: 7.1% nominal, tax-free = real return 1-2%
- Index fund (long-term avg): 12% nominal = real return 6%
- Real estate: highly variable, often 2-4% real return after costs

The "safe" choices (savings account, FD) are not safe for retirement. They quietly destroy purchasing power. For goals 10+ years out, equity is the only category that has historically beaten inflation meaningfully.

The trade-off: short-term volatility. Equity can fall 30-40% in a year. If you cannot stomach that, you cannot use equity. If you can, time fixes it.`
  }
];

export const findKnowledge = (query) => {
  const q = query.toLowerCase();
  return KNOWLEDGE.filter(k =>
    k.topic.toLowerCase().includes(q) ||
    k.short.toLowerCase().includes(q) ||
    k.body.toLowerCase().includes(q)
  );
};

# CFO Ledger (Offline)

A personal finance tracker with a built-in CFO. No API keys. No internet required after install. Everything runs in your browser.

## What's inside

- **Natural language transaction logging.** Type "spent 500 on lunch" and it parses, categorizes, and saves.
- **Rule-based CFO engine.** 20+ financial diagnostic rules that analyze your real numbers and give specific actions. No AI, no API.
- **Financial calculators.** SIP, EMI, retirement, tax (FY 2024-25 new regime).
- **Knowledge base.** 12 deep-dive articles on Indian personal finance: savings rate, emergency fund, PPF, NPS, mutual funds, debt payoff, business pricing, real return, and more.
- **Daily logging.** Streak counter, today/month views, edit anything, undo deletes.
- **Recurring transactions.** Rent, EMI, salary auto-log monthly when you open the app.
- **Budgets per category.** Soft warnings at 80%, alerts at 100%, surfaced on the home screen.
- **Search across all transactions.** By description, category, scope.
- **CSV export.** Your data, always portable.
- **Business vs personal split.** Tracks both separately. Margins, profit, runway.

## How to run

You need Node.js 18+ installed. Get it from https://nodejs.org.

```bash
cd cfo-ledger-offline
npm install
npm run dev
```

Opens at http://localhost:5173.

That's it. No API keys to configure. No `.env` file to create. Everything is in the code.

## How it works

The "CFO" is not AI. It is around 20 deterministic rules in `src/cfo.js` that examine your transactions and fire when conditions match. Each rule returns a headline, an explanation, and one specific action.

The transaction parser in `src/parser.js` uses pattern matching: extracting amounts with regex, mapping keywords to categories, detecting income vs expense from verbs. It is not as flexible as an AI parser, but it handles the 95% case and never costs you a paisa.

The formula library in `src/formulas.js` has every calculation a CFO actually uses: compound interest, SIP future value, EMI, retirement corpus, break-even, LTV/CAC, real return, Indian tax. All pure functions.

The knowledge base in `src/knowledge.js` is plain text articles on Indian personal finance. Read it like a book.

## What it cannot do

A rule-based CFO cannot have a free-form conversation. If you ask it something off-topic, it falls back to the most relevant brief. It also cannot detect novel patterns the rules don't cover. The trade-off is: it always works, never costs, never goes down, and never hallucinates a fact.

## File structure

```
cfo-ledger-offline/
├── package.json
├── vite.config.js
├── index.html
└── src/
    ├── main.jsx          React entry
    ├── App.jsx           All UI screens
    ├── parser.js         Natural language transaction parser
    ├── formulas.js       Financial formula library
    ├── cfo.js            Rule-based CFO engine
    ├── knowledge.js      Indian personal finance knowledge base
    └── storage.js        localStorage adapter
```

## Build for production

```bash
npm run build
```

Output goes to `dist/`. Serve from any static host. No backend needed, no API keys to protect.

## Customizing

**Add a new CFO rule:** edit `src/cfo.js`, add an object to the `rules` array. Each rule has `id`, `severity`, `check(state)`, and `say(state)`. The `state` object has all the metrics computed for you.

**Add a category:** edit the `*_EXPENSE_CATS` or `*_INCOME_CATS` arrays in `App.jsx`. Also add keywords to `CATEGORY_KEYWORDS` in `parser.js` if you want the parser to detect them.

**Add a knowledge article:** edit `src/knowledge.js`, append an entry with `id`, `topic`, `short`, `body`.

**Add a calculator:** edit the `Tools` component in `App.jsx`. Use the formulas from `src/formulas.js`.

## License

Yours. Use it. Modify it. Ship it.

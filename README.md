# CFO Ledger

A personal finance tracker with an AI CFO built in. Logs daily transactions, tracks business and personal money separately, alerts on budget overruns, and answers your money questions in plain English.

Single-file React app. Dark editorial design. Mobile-friendly.

## Features

- Natural language transaction logging ("spent 500 on lunch")
- AI CFO chat that reads your real numbers and gives sharp, contextual advice
- Daily streak counter
- Business vs personal split tracking
- Budget caps per category with 80% and 100% alerts on the home screen
- Recurring transactions (rent, EMI, salary auto-log)
- Search across all transactions
- Edit any transaction
- CSV export
- Undo for accidental deletes
- All data persists in browser localStorage

## Setup

You need Node.js 18+ installed. Get it from https://nodejs.org.

```bash
# Install dependencies
npm install

# Add your Anthropic API key
cp .env.example .env
# Edit .env and paste your key from https://console.anthropic.com/

# Run the dev server
npm run dev
```

Opens at http://localhost:5173.

## Security warning: API key in frontend

This setup puts your Anthropic API key directly in the browser bundle. Anyone who opens the deployed site can read the key from the source and use it to drain your account credits.

**This is fine for local development only.** Do not deploy this anywhere public without first routing the API calls through your own backend.

To deploy publicly:

1. Build a thin backend (Express, Hono, Cloudflare Worker, Vercel Serverless Function, etc) that holds the API key server-side
2. Expose two endpoints: `/api/parse-transaction` and `/api/cfo-chat`
3. Replace the `callClaude` function in `src/api.js` with calls to your endpoints
4. Remove `VITE_ANTHROPIC_API_KEY` and the `anthropic-dangerous-direct-browser-access` header

A minimal Cloudflare Worker proxy is about 30 lines of code.

## Data storage

All your data lives in browser `localStorage` under keys prefixed with `cfo-ledger:`.

Means:
- Data is per-browser and per-device. Clearing browser data wipes the app.
- No cloud sync. Export to CSV regularly if your data matters.
- No multi-user support. The browser session is the user.

If you want sync, migrate the `Storage` module in `src/storage.js` to call a backend (Supabase, Firebase, Neon, your own API) instead of localStorage.

## File structure

```
cfo-ledger/
├── package.json
├── vite.config.js
├── index.html
├── .env.example
├── .gitignore
└── src/
    ├── main.jsx        # React entry point
    ├── App.jsx         # The whole app
    ├── api.js          # Anthropic API client
    └── storage.js      # localStorage wrapper
```

The entire app is in `App.jsx`. About 800 lines. No external state management, no routing library, just useState and a switch statement.

## Build for production

```bash
npm run build
```

Output goes to `dist/`. Serve it with any static host (Vercel, Netlify, Cloudflare Pages, S3, your own nginx). Remember the API key warning above.

## Customizing

**Currency:** This app is hardcoded to INR. Search `₹` and `INR` in `App.jsx` to localize.

**Categories:** Edit the `PERSONAL_EXPENSE_CATS`, `BUSINESS_EXPENSE_CATS`, `PERSONAL_INCOME_CATS`, `BUSINESS_INCOME_CATS` constants at the top of `App.jsx`.

**CFO personality:** Edit the `buildCFOSystem` function. The prompt is short and the rules are explicit so you can tune it without breaking things.

**Colors:** All in the `C` object at the top of `App.jsx`. Light theme is left as an exercise.

## License

Yours. Do what you want with it.

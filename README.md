# Royal Iron Steel Supply Command Center

Private business ledger and AI command center for purchases, sales, inventory, payments, overdraft, expenses, financial reports, and decision support.

## Local Setup

1. Install dependencies.

```bash
npm install
```

2. Copy `.env.example` to `.env`.

3. Fill your private values in `.env`.

```env
DATABASE_URL="mysql://USER:PASSWORD@HOST:3306/DATABASE"
NEXTAUTH_SECRET="replace-with-a-long-random-secret"
NEXTAUTH_URL="http://localhost:3000"
GOOGLE_AI_API_KEY="your-real-google-ai-key"
GOOGLE_AI_MODELS="gemma-4-31b-it,gemma-4-26b-it,gemma-3-27b-it"
```

4. Push the database schema and run the app.

```bash
npx prisma db push
npm run dev
```

## AI Command Center

The Brain page calls `/api/brain` only when you click Ask AI or Run. The Google key is read only on the server from `GOOGLE_AI_API_KEY`, so it is not sent to the browser and should never be committed.

Model order is controlled by `GOOGLE_AI_MODELS`. The first model is treated as primary and the rest are fallbacks. If Google rejects or disables one model for your account, the route tries the next model automatically.

Default order:

```env
GOOGLE_AI_MODELS="gemma-4-31b-it,gemma-4-26b-it,gemma-3-27b-it"
```

## Vercel Environment Variables

In Vercel, add these under Project Settings, Environment Variables:

```env
DATABASE_URL
NEXTAUTH_SECRET
NEXTAUTH_URL
GOOGLE_AI_API_KEY
GOOGLE_AI_MODELS
```

Use the same model order for `GOOGLE_AI_MODELS`. Add the real API key only in Vercel, not in GitHub.

## Safe GitHub Push

`.env` is ignored by Git. `.env.example` is intentionally committed with placeholders so future setup is clear without exposing credentials.

Before pushing, you can check:

```bash
git status --short
git diff -- .env
```

The second command should show nothing because `.env` must stay untracked.

## Verification

```bash
npx tsc --noEmit
npx eslint
npm run build
```

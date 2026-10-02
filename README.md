# Allocation

Next.js App Router, TypeScript, Tailwind CSS, Supabase Auth/Postgres and brapi quotes. This application plans allocations; it never places trades.

## Run locally

```sh
npm ci
cp .env.example .env.local
npm run dev
```

No credentials are required for local portfolio editing and saving. Initial balances reflect the example portfolio; all values and weights are editable. Financial balances are manual, not connected to a broker. The sum of balances is the current portfolio value.

## Supabase

1. Create or select your Supabase project.
2. Execute `supabase/schema.sql` once in the SQL editor. The table has per-user row-level security and no anonymous access.
3. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Never use a service-role key in the browser.
4. Enable email/password authentication. Configure the Site URL and allowed redirect URLs for localhost and your Vercel domain.
5. Sign in, load the cloud plan, then save. Existing cloud data is never silently replaced by a local draft. Concurrent changes are detected using an update version.

The SQL is a standalone setup script, not a CLI-generated migration. No remote database has been modified by this repository.

## Quote API

Set `BRAPI_API_KEY` on the server for expanded ticker access. Without a key, the provider documents ITUB4, PETR4, VALE3 and MGLU3 as test symbols. Access to other securities depends on your provider plan. The server route uses `/api/v2/stocks/quote`, keeps the key private, validates tickers, times out requests and caches responses for five minutes. Quotes do not overwrite balances and are not guaranteed real-time.

## Allocation rules

- Targets are percentages of the complete portfolio and must total 100%.
- Target mode distributes new money directly using target weights.
- Rebalance mode computes `max(0, target * (current total + contribution) - current position)` and distributes proportionally to those deficits. It reduces imbalance without selling, but does not guarantee exact targets after a small contribution.
- Largest-remainder cent rounding preserves the exact contribution total.
- Scheduled monthly amounts override the recurring baseline. Scheduling does not increase balances or execute an investment.
- Unit prices, brokerage, taxes and reserve suitability are not part of the allocation algorithm.

## Vercel

Import this folder as a Next.js project (or use `portfolio-planner` as the root directory if importing its parent). Add the same three environment variables, deploy, then add the deployment domain to Supabase Auth settings. No Vercel-specific server configuration is required.

## Verify

```sh
npx tsx --test tests/portfolio.test.ts
npx tsc --noEmit
npm run lint
npm run build
```

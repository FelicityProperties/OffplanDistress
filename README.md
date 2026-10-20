# OffplanDistress

Dubai's marketplace for distressed off-plan units. Owners who can't keep up with a developer payment plan list
their unit; buyers take over the remaining plan below today's launch price. We verify the SPA and payment history,
broker the offer, and handle the developer NOC and DLD transfer. Fee: **2% + 5% VAT of the sale value, paid by the
buyer, only when the transfer completes**. Listing is free for sellers.

Goal: 30% of the Dubai distressed off-plan market in Q1 2027.

## What's in the app

| Area | Pages |
| --- | --- |
| Marketing | Home, How it works, Fees (with calculator), Contact |
| Marketplace | Browse deals (filters, sort, search, saved searches), deal page (payment plan, true-cost breakdown, offer, watchlist, viewing request) |
| Sellers | 5-step "Sell my unit" form with SPA / Oqood / statement / ID upload, listing management, offers received (accept / counter / decline) |
| Buyers | Watchlist with price-drop flags, offers sent (accept counter / withdraw), saved searches |
| Admin (`/admin`) | Verification queue (approve / reject with reason), deals pipeline, per-listing review with documents and both parties' contacts, all offers, inquiries, users (KYC, roles, password reset), remove sample data |

Buyers stay anonymous to sellers in the app — every negotiation goes through our team, so neither side can
bypass the platform.

Design (logo, favicon, colours, typography and page layouts) was generated in Lovable and ported to this
Next.js app. Brand name, contact details and fee terms live in `src/lib/config.ts`.

## Stack

- Next.js 16 (App Router, server actions) + Tailwind CSS 4 + shadcn/ui
- Neon Postgres via Drizzle ORM (`@neondatabase/serverless` HTTP driver on Vercel, `pg` for any other Postgres)
- Email + password auth with database sessions (httpOnly cookie, no extra secret needed)
- Documents and photos stored in Postgres (`files` table, 4 MB per file)

## Deploying on Vercel

1. In the Vercel project, connect the Neon database (Storage → Neon). That sets `DATABASE_URL` and
   `DATABASE_URL_UNPOOLED` for every environment.
2. Add `ADMIN_EMAILS` (comma-separated) under Settings → Environment Variables.
3. Deploy. `npm run build` first runs `scripts/migrate.mjs`, which creates/updates the tables and — on an empty
   database — adds 16 listings marked **Sample** so the marketplace isn't empty on day one. Remove them from
   `/admin` with one click once real listings arrive, or set `SEED_SAMPLE_DATA=false` before the first deploy.
4. Straight after the first deploy, sign up with your admin email — that account gets the Admin link.

Optional variables: see `.env.example` (site URL, contact email/phone/WhatsApp, RERA ORN shown in the footer).

## Local development

```bash
cp .env.example .env.local   # point DATABASE_URL at Neon or a local Postgres
npm install
npm run db:migrate           # create tables (+ sample data)
npm run dev
```

Change the schema in `src/db/schema.ts`, then `npm run db:generate` to create a new SQL migration in `drizzle/`.
Migrations apply automatically on the next deploy.

## Not built yet

- Email notifications (new offer, listing approved, saved-search alerts) — needs an email provider such as Resend.
- Self-service password reset — for now an admin resets it from `/admin/users` and shares a temporary password.
- Arabic / RTL — layouts use logical (start/end) spacing so this can be added without restyling.
- At scale, move documents from Postgres to object storage (e.g. Vercel Blob or S3).

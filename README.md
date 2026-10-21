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
| Buyers | Watchlist with price-drop flags, offers sent (accept counter / withdraw), saved searches with daily alerts |
| Everyone | Notification bell + notifications page, email notifications, self-service password reset, English / العربية (full right-to-left layout) |
| Admin (`/admin`) | Verification queue (approve / reject with reason), deals pipeline, per-listing review with documents and both parties' contacts, all offers, inquiries, users (KYC, roles, password reset), remove sample data |

Buyers stay anonymous to sellers in the app — every negotiation goes through our team, so neither side can
bypass the platform.

Design (logo, favicon, colours, typography and page layouts) was generated in Lovable and ported to this
Next.js app. Brand name, contact details and fee terms live in `src/lib/config.ts`.

### Notifications

| Event | Who hears about it |
| --- | --- |
| New listing submitted | Admins |
| Listing approved / rejected | Seller |
| New offer | Seller (buyer stays anonymous) + admins (with buyer contact) |
| Offer accepted / declined / countered | Buyer |
| Counter accepted / declined, offer withdrawn | Seller |
| Deal agreed | Admins — start the NOC |
| Viewing request / contact form | Admins |
| Price drop on a watched deal | Watchers |
| New deals matching a saved search (daily, 09:00 Dubai) | Search owner |

In-app notifications always work. Emails go out through [Resend](https://resend.com) once `RESEND_API_KEY` and
`EMAIL_FROM` are set; each user gets them in the language they last used on the site.

## Stack

- Next.js 16 (App Router, server actions) + Tailwind CSS 4 + shadcn/ui
- Neon Postgres via Drizzle ORM (`@neondatabase/serverless` HTTP driver on Vercel, `pg` for any other Postgres)
- Email + password auth with database sessions (httpOnly cookie, no extra secret needed)
- i18n: typed English/Arabic dictionaries per area in `src/i18n/messages/`, language from a cookie or the
  browser's `Accept-Language`
- Documents and photos stored in Postgres (`files` table, 4 MB per file)
- Vercel Cron for saved-search alerts (`vercel.json`)

## Deploying on Vercel

1. Neon is connected under Storage → Connect Project (tick Production; Preview too if you want working previews).
   It sets `DATABASE_URL` / `DATABASE_URL_UNPOOLED`; a custom variable prefix works too, since the app and the build
   find any `postgres://` connection string. The build log's `[migrate] Using …` line shows which one was used.
2. Settings → Environment Variables:
   - `ADMIN_PASSWORD` — **required**: the password for the owner login (`mouhannad@felicitypro.com`, or the
     emails in `ADMIN_EMAILS`). The repo is public, so owner emails can't be registered through the sign-up form;
     every production build creates or repairs the owner login from this variable instead (preview builds leave
     it alone). To change the owner password, change the variable and redeploy production.
   - `CRON_SECRET` — **required for alerts**: any long random string. The daily alert job refuses to run without it.
   - Optional: `RESEND_API_KEY` + `EMAIL_FROM` for email, `NEXT_PUBLIC_SITE_URL` (e.g. `https://offplandistress.com`;
     defaults to the Vercel production URL) for links in emails, and the
     `NEXT_PUBLIC_CONTACT_*` / `NEXT_PUBLIC_RERA_ORN` values shown on the site.
3. Deploy. `vercel.json` pins the Next.js framework preset, so it doesn't matter what Vercel detected when the
   project was created. `npm run build` first runs `scripts/migrate.mjs`: it applies database migrations (a
   production build fails if Vercel has no database URL for Production, so a broken deploy never goes live),
   sets up the owner login, and — on an empty database — adds 16 listings marked **Sample** so the marketplace
   isn't empty on day one. Remove them from `/admin` with one click once real listings arrive, or set `SEED_SAMPLE_DATA=false`
   before the first deploy.
4. Log in at `/login` with the owner email and `ADMIN_PASSWORD` — you land in `/admin`.

See `.env.example` for every variable.

## Local development

```bash
cp .env.example .env.local   # point DATABASE_URL at Neon or a local Postgres, set ADMIN_PASSWORD
npm install
npm run db:migrate           # create tables, owner login (+ sample data)
npm run dev
```

Change the schema in `src/db/schema.ts`, then `npm run db:generate` to create a new SQL migration in `drizzle/`.
Migrations apply automatically on the next deploy.

Adding copy: put it in the right namespace under `src/i18n/messages/` (English and Arabic side by side — the build
fails if a translation is missing) and read it with `getT("ns")` on the server or `useT("ns")` in client components.

## Later

- At scale, move documents from Postgres to object storage (e.g. Vercel Blob or S3).
- Email verification for new accounts (needs Resend configured).

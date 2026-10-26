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
| Market tools | Distress Index (`/market`: live stats on real listings — discounts, cash needed, developers, communities), seller exit calculator (`/exit-calculator`: keep paying vs stop paying vs sell here) |
| Legal | Terms of Use, Privacy Policy, Cookie Policy (`/terms`, `/privacy`, `/cookies`) |
| Marketplace | Browse deals (filters, sort, search, saved searches), deal page (payment plan, true-cost breakdown, offer, watchlist, viewing request) |
| Sellers | Free estimate without an account (`/sell`, from the exit calculator and the home page) that records a seller lead; 5-step "Sell my unit" form (type-to-search developer and community, "Other" keeps the typed name, phone photos resized in the browser) with SPA / Oqood / statement / ID upload, listing management, offers received (accept / counter / decline) |
| Buyers | Watchlist with price-drop flags, offers sent (accept counter / withdraw), saved searches with daily alerts |
| Everyone | Notification bell + notifications page, email notifications, self-service password reset, English / العربية (full right-to-left layout) |
| Admin (`/admin`) | Verification queue (approve / reject with reason), seller leads (`/admin/leads`: status, notes, call / WhatsApp, where each lead came from), deals pipeline, per-listing review with documents, permit details and both parties' contacts, all offers, inquiries, users (KYC, roles, password reset), remove sample data |

Buyers stay anonymous to sellers in the app — every negotiation goes through our team, so neither side can
bypass the platform.

Design (logo, favicon, colours, typography and page layouts) was generated in Lovable and ported to this
Next.js app. Brand name, contact details and fee terms live in `src/lib/config.ts`.

### Legal

`/terms`, `/privacy` and `/cookies` render the Terms of Use, Privacy Policy (UAE PDPL) and Cookie Policy in
English and Arabic from `src/content/legal/`; company name, email, phone, RERA ORN, licence number, address and
fee rates are pulled from `src/lib/config.ts`, so the texts follow the config. Consent is collected at three
points: a required "I agree to the Terms of Use and Privacy Policy" box at sign-up (stored as
`users.terms_accepted_at`), a required ownership / authority / genuine-documents confirmation on the last step
of the sell form (enforced in `createListing`), and a short notice under the offer button that offers aren't
binding until Form F / MOU is signed; the contact form links to the Privacy Policy. **The texts are templates
for a Dubai real-estate brokerage — have them reviewed by a UAE-qualified lawyer before relying on them.**

### Advertising compliance (RERA / DLD)

Every deal page shows who is advertising it — Felicity Properties L.L.C, RERA ORN 33951, broker Muhannad Al Nwilati
Al Masri, BRN 59244 — and the listing's DLD (Trakheesi) advertising permit number. A real listing can't go live
without that permit: enter it in the admin listing editor ("DLD advertising permit No."), then approve. Sample
listings carry no permit and say so, invite no viewings or calls, and are `noindex` and left out of
`sitemap.xml`, so search engines only see real adverts. On deploy, migration 0005 pauses (as "paused by our
team") any real listing that was already live without a permit; enter its permit in the admin editor and set it
live again. A seller who changes the asking price or description of a live listing sends it back to review, so
the advert never shows a price or text the permit and our team haven't seen; with an accepted offer those two
fields are fixed. The site-wide `RealEstateAgent` JSON-LD carries the ORN, trade licence and BRN, and each
real deal page adds a `RealEstateListing` with its price.

Each permit also has an expiry date, and optionally its DLD verification link (`https://…dubailand.gov.ae/…`),
shown on the deal page as "Verify this advert with DLD" with a QR code; Form A has an expiry date too. A listing
can only go live with a permit valid in the future (dates must fall between a year ago and three years ahead). An
advert whose permit or Form A has lapsed disappears from every public page at once (deals, home, Distress Index,
sitemap, share image); the daily `ops-daily` job then pauses live ones, tells the seller, and reminds admins 7
days and 1 day before expiry. Deals already under offer or in NOC keep their status; admins are told to renew.
Listings that were live before expiry dates existed keep running until a date is entered (admin banner).

### Offers

One accepted offer per unit, enforced in a single database statement, so a double click or two tabs can't accept
two. The other bidders keep their offers as backups and are told; if the deal falls through and the unit goes
live again, the accepted offer is declined and backups are told the unit is available. A unit that is withdrawn,
rejected or transferred closes its open offers; a seller who withdraws a unit under offer ends the deal (the buyer
and admins are told). `OFFERS.keepBackups` in `src/lib/config.ts` switches backups off.

### Seller leads and attribution

The free estimate on `/sell` (no account needed) shows what a buyer would take over and a likely range for the
seller, using the exit calculator's maths, then asks for a name and mobile / WhatsApp. Each lead lands in
`/admin/leads` and notifies admins (marked urgent when the seller has had a default notice or missed more than one
instalment). The link the visitor arrived on (utm tags, a partner's `ref` code, landing page, referring site) is
kept in session storage, not a cookie, and saved with the lead, sign-up, listing or viewing request. Signing up or
logging in from the thank-you link attaches the lead to the account and pre-fills the sell form. Leads with no
listing or account are deleted 24 months after the last update.

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
| Seller changes price or description of a live listing | Admins — update the permit and approve again |
| Price drop on a watched deal (once the new price is approved) | Watchers |
| Seller estimate submitted | Admins (urgent when a default notice was received) |
| Offer accepted on a unit you also bid on / deal fell through / unit sold or withdrawn | Other bidders, buyer |
| Permit or Form A expiring (7 days, 1 day) or lapsed on a deal | Admins |
| Listing paused because its permit or Form A expired | Seller |
| A scheduled job failed or `CRON_SECRET` is missing | Admins (at most once per 12 h per job) |
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
   - `CRON_SECRET` — **required for the daily jobs**: any long random string. Saved-search alerts and the
     `ops-daily` permit job refuse to run without it (admins get an in-app alert). Optional `HEARTBEAT_URL` /
     `OPS_HEARTBEAT_URL` receive a ping after each successful run, for an uptime monitor; `/api/health` answers 200
     when the app and database are up.
   - Previews: preview builds skip migrations and sample data (they may share the production database). Once
     each preview has its own Neon branch, set `PREVIEW_DB_ISOLATED=true` for Preview.
   - Optional: `RESEND_API_KEY` + `EMAIL_FROM` for email, `NEXT_PUBLIC_SITE_URL` (e.g. `https://offplandistress.com`;
     defaults to the Vercel production URL) for links in emails.
   - Company details (trade licence 1145910, RERA ORN 33951, broker BRN 59244, phone/WhatsApp +971 56 352 0611,
     office address in Bay Square) are built in (`BRAND` in `src/lib/config.ts`). Each can be overridden with its
     `NEXT_PUBLIC_*` variable (see `.env.example`); an empty variable keeps the built-in value.
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

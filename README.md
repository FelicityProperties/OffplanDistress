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
| Marketplace | Browse deals (filters incl. cash at transfer, sort, search by project, developer or community in English or Arabic, saved searches), deal page (cash needed on transfer day, arrears with the developer, dated cash timeline, payment plan, true-cost breakdown, offer, watchlist, viewing request) |
| Sellers | Free estimate without an account (`/sell`, from the exit calculator and the home page) that records a seller lead; "Prefer WhatsApp?" card; 5-step "Sell my unit" form (saved on the device between sittings, type-to-search developer and community, "Other" keeps the typed name, phone photos resized in the browser) with SPA / Oqood / statement / ID upload, listing management, offers received (accept / counter / decline), deal milestones |
| Buyers | Watchlist with price-drop flags, offers sent (accept counter / withdraw), saved searches with daily alerts |
| Everyone | Notification bell + notifications page, email notifications, self-service password reset, English / العربية (full right-to-left layout) |
| Admin (`/admin`) | Verification queue (approve / reject with reason), staff-created listings from WhatsApp with seller claim links, bulk import of a partner network's units (`/admin/listings/import`, owner set later, claim link or signed Form A), daily follow-ups, seller leads (`/admin/leads`: status, notes, call / WhatsApp, where each lead came from), deals pipeline with CSV export, per-listing review with documents, permit details, arrears, both parties' contacts, the deal file and its history, all offers, inquiries, users (KYC, roles, password reset, pending claims), visit statistics (`/admin/analytics`), remove sample data |

Buyers stay anonymous to sellers in the app — every negotiation goes through our team, so neither side can
bypass the platform. An offer's message to the seller can't hold a phone number, email address, link or handle (the
form says so and keeps the text to edit), and a buyer can send up to 10 offers or revisions an hour; re-sending an
unchanged offer doesn't notify anyone again. The buyer whose offer was accepted sees "Your offer was accepted" on the
deal page rather than an invitation to send a backup offer.

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

### Staff intake (WhatsApp)

Sellers who send their SPA and statement on WhatsApp don't have to fill in the form: Admin → Verification queue →
"New listing" (or "Create listing from this lead" on `/admin/leads`) takes the seller's name and mobile (with country
code) and/or email plus the unit figures, and creates the seller's account without a password if there isn't one;
upload the documents on the listing page. "Copy link for WhatsApp" opens a chat to the seller with a confirmation
link in their language ("Email claim link" when they have an email and email is on). The link works once, for 7
days, and a new one cancels the old. The seller opens it without logging in, ticks the same ownership / authority /
Terms confirmation as the sell form and chooses an email and password. Until then a staff-created listing can't be
approved (the Trakheesi permit is still required too); `/admin/users` → "Pending claim" lists those sellers. A link
never sets a password on an account that already has one. The admin listing page flags descriptions that seem to
contain a phone number, email, link or WhatsApp handle ("Contact details in text"); the text is never changed
automatically.

**Bulk import.** Units a partner network shared with the owners' written permission come as one or more JSON files we
prepare (`offplandistress-import/1`, documented in `src/lib/import-format.ts`: the source, then per unit its ref, link,
posting date, the sell form's listing fields, up to 6 photos of 1.5 MB as base64 and team-only notes). Admin →
"Import listings" (`/admin/listings/import`) checks every unit in the browser with the sell form's rules, shows a
preview (New / Already imported / Invalid with the reason, in the file's terms: a developer or community off our lists is
quoted, payment-plan rows are numbered, a unit's photo names must differ before the extension since photos are stored as
JPEG), then imports one unit per request and uploads its photos one by one; failed rows and photos can be retried, and
choosing the files again after a reload skips what is done (a unit is imported once per source + ref, enforced by a
unique index; a retry first asks which photos the listing already has, so none is stored twice). **Nothing goes public:** each listing is in
review, filed under one placeholder owner per source ("Owner to be added (…)", no password, never emailed or
nudged; sign-ups refuse `.invalid` addresses, so nobody can register it first), under "Imported — owner to add" on
`/admin`, its photos private. On its page, enter the owner in the Owner
card (same matching as "New listing"; changing it cancels any claim link), then confirm ownership with the claim link
or, for co-broker stock, upload the owner's signed Form A ("Form A (signed by the owner)") and tick "The owner's
signed Form A is uploaded and checked"; enter the Trakheesi permit, then approve.

### Cash at transfer

Cards, the deal page, the "Cash at transfer" filter (`minTransfer` / `maxTransfer`) and `sort=cash` show what the
buyer needs on transfer day: the asking price (equity to the seller) + our fee and VAT + the DLD fee + DLD
registration / trustee and NOC estimates + arrears with the developer. It is always marked "≈"; the one definition is
`analyzeDeal` in `src/lib/deal-math.ts`, mirrored in SQL by `cashToCloseSql`. Enter arrears from the developer's
statement under "Arrears with the developer" in `/admin/listings/{id}` (0 and 0 when the seller is up to date; empty
when not checked). The deal page also shows a dated cash timeline and warns when an instalment falls due within 45
days. `minCash` / `maxCash`, saved searches and the Distress Index keep their meaning: equity to the seller.

### Follow-ups and reminders

The daily `ops-daily` job (07:00 Dubai) sends each nudge once (table `reminders`), in the app and by email: sellers
who signed up to sell but listed nothing (24 h and 72 h), listings missing their SPA / Oqood or statement (48 h), live
listings with no offers after 21 days, offers the seller hasn't answered (48 h) and counter-offers the buyer hasn't
answered (48 h). Admins get one "Today's follow-ups" digest — those items plus new leads not called, listings waiting
for review, instalments due within 14 days and viewing requests not handled — and the same list, with call and
WhatsApp buttons, is under Follow-ups at the bottom of `/admin`. Samples, staff and sellers who haven't claimed a
staff-created listing are never nudged.

### Deal file and audit trail

Once an offer is accepted, the Deal file card on the admin listing page records Forms A, B, F and I, the deposit,
any co-broker, the NOC, the trustee office, the transfer and the invoice, with the agreed price as written in Form F
(sale value, our fee and the buyer's ≈ cash at transfer update as you type). Stage gates in "Manage listing": "NOC in
progress" needs Form F signed and both parties' KYC verified (Admin → Users); "Transferred" needs the NOC issue date,
the DLD transfer date and the agreed price. Deals that were already under offer get their deal file the first time
it is opened, a gate is checked or the CSV is exported. A deal set to under offer by hand (a buyer found off the
platform) links the buyer by their account email; without an account, enter their full name (and mobile) there and one
is created without a password (they set it with "Forgot password"; verify their KYC on Admin → Users). Correct "Paid
to the developer to date" in "Manage listing" from the statement of account and the deal's sale value follows. The
admin KPIs count our share of the fees (after any co-broker's) on the agreed sale value. Every admin action, a seller's claim and every
document (not photos) opened by someone other than its uploader is logged (actor, before → after, IP; never passwords or tokens)
in the listing's History panel. Pipeline → "Export all deals (CSV)" opens in Excel, Arabic included. Consent is
versioned: sign-ups, listings and offers store the Terms version (`LEGAL_UPDATED`) they accepted.

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
| Staff created a listing for you | Seller — confirmation (claim) link |
| Seller confirmed a staff-created listing | Admins — approve it |
| Nothing listed yet, documents missing, no offers after 21 days | Seller |
| Offer waiting for your answer (48 h) / counter-offer waiting (48 h) | Seller / buyer |
| Today's follow-ups (daily, 07:00 Dubai) | Admins |

In-app notifications always work. Emails go out through [Resend](https://resend.com) once `RESEND_API_KEY` and
`EMAIL_FROM` are set; each user gets them in the language they last used on the site. In production, sellers and
buyers only get emails when `EMAIL_FROM` is a sender on a domain verified in Resend (Resend's `onboarding@resend.dev`
reaches only the Resend account owner); until then only the owner logins get theirs and the admin console shows
"Email is off".

### Arabic addresses and SEO

Every public page has an Arabic address (`/ar`, `/ar/deals`, `/ar/deals/OD-…`), linked to the English one by
hreflang and listed in `/sitemap.xml`; `src/proxy.ts` serves them. Visitors who chose Arabic are sent from plain links
to the `/ar` address; the browser's language never redirects anyone (it only shows a "عرض بالعربية / View in English"
bar). `/dashboard` and `/admin` keep one address and follow the visitor's chosen language. Filtered `/deals` views,
login and sign-up are `noindex`; `robots.txt` names the sitemap and lets search engines see listing photos. With
`NEXT_PUBLIC_SITE_URL` set to the domain Vercel serves production on, production sends every other host name to it
(308); an address Vercel doesn't serve yet is never redirected to. After deploying, submit
`/sitemap.xml` in Google Search Console.

### Visit statistics

`/admin/analytics` shows visitors, visits, page views, time per visit, bounce rate, leads and conversion (today / 7 /
30 / 90 Dubai days), live visitors, top and entry pages, sources, campaigns and partner codes, countries, devices,
languages and each lead's journey. A small beacon records page views without cookies; IP addresses and user agents
are never stored (a daily-rotating anonymous id instead). Signed-in admins are never counted; "Ignore this device" on
the page covers a browser you use signed out. Page views are deleted after 13 months.

## Stack

- Next.js 16 (App Router, server actions) + Tailwind CSS 4 + shadcn/ui
- Neon Postgres via Drizzle ORM (`@neondatabase/serverless` HTTP driver on Vercel, `pg` for any other Postgres)
- Email + password auth with database sessions (httpOnly cookie, no extra secret needed)
- i18n: typed English/Arabic dictionaries per area in `src/i18n/messages/`; public pages take the language from
  the address (`/ar/…`), the dashboard and admin console from a cookie or the browser's `Accept-Language`
- Documents and photos stored in Postgres (`files` table, 4 MB per file)
- Vercel Cron for saved-search alerts and the daily ops job (`vercel.json`)

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
   - `RESEND_API_KEY` + `EMAIL_FROM` for email: `EMAIL_FROM` must be a sender on a domain you verified in Resend
     (e.g. `OffplanDistress <deals@felicitypro.com>`), or sellers and buyers get no emails in production.
   - Optional: `NEXT_PUBLIC_SITE_URL` (e.g. `https://offplandistress.com`; defaults to the Vercel production URL) for
     links in emails, canonical URLs and the redirect of other host names; `ANALYTICS_SALT` for the visit statistics.
   - Company details (trade licence 1145910, RERA ORN 33951, broker BRN 59244, phone/WhatsApp +971 56 352 0611,
     office address in Bay Square) are built in (`BRAND` in `src/lib/config.ts`). Each can be overridden with its
     `NEXT_PUBLIC_*` variable (see `.env.example`); an empty variable keeps the built-in value.
3. Deploy. `vercel.json` pins the Next.js framework preset, so it doesn't matter what Vercel detected when the
   project was created. `npm run build` first runs `scripts/migrate.mjs`: it applies database migrations (a
   production build fails if Vercel has no database URL for Production, so a broken deploy never goes live),
   sets up the owner login, and — on a brand-new database only — adds 16 listings marked **Sample** so the
   marketplace isn't empty on day one (set `SEED_SAMPLE_DATA=false` before the first deploy to skip them). Migration
   0009 removed them from the live site; once removed (there or with "Remove sample data" in `/admin`) they never come
   back. Locally, `SEED_SAMPLE_DATA=force npm run db:migrate` puts them back for testing.
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

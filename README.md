# OffplanDistress

Dubai off-plan resales below the original price. Owners who can't keep up with a developer payment plan list
their unit; buyers take over the remaining plan below today's launch price. We verify the SPA and payment history,
broker the offer, and handle the developer NOC and DLD transfer. Fee: **2% + 5% VAT of the sale value, paid by the
buyer, when the transfer completes**. Listing is free for sellers.

Goal: 30% of the Dubai distressed off-plan market in Q1 2027.

## What's in the app

| Area | Pages |
| --- | --- |
| Marketing | Home, How it works, Fees (with calculator), Contact |
| Market tools | Distress Index (`/market`: live stats on real listings — discounts, cash needed, developers, communities), seller exit calculator (`/exit-calculator`: keep paying vs stop paying vs sell here) |
| Legal | Terms of Use, Privacy Policy, Cookie Policy (`/terms`, `/privacy`, `/cookies`) |
| Marketplace | Browse deals (filters incl. cash at transfer, sort, search by project, developer or community in English or Arabic, saved searches), deal page (cash needed on transfer day, arrears with the developer, dated cash timeline, payment plan, true-cost breakdown, offer, watchlist, viewing request), project pages (`/projects` with a search box, `/projects/<slug>`: every project with an available resale unit, its units with those under offer listed apart, how buying a resale there works, an FAQ with the project's own figures; linked from each deal page) |
| Sellers | Free estimate without an account (`/sell`, from the exit calculator and the home page) that records a seller lead; "Prefer WhatsApp?" card; 5-step "Sell my unit" form (saved on the device between sittings, type-to-search developer and community, "Other" keeps the typed name, phone photos resized in the browser) with SPA / Oqood / statement / ID upload, listing management, offers received (accept / counter / decline), deal milestones |
| Buyers | Watchlist with price-drop flags, offers sent (accept counter / withdraw), saved searches with daily alerts (the same filters are saved once, keeping only what the deals page reads) |
| Everyone | Notification bell + notifications page, email notifications, self-service password reset, daily deals newsletter (`/newsletter`, no account needed, double opt-in, one-click unsubscribe), WhatsApp deals community "OffplanDistress Deals \| Dubai" (announcement-only; its join link on the home page, `/deals`, every deal page, after an enquiry, in the footer and in the newsletter, each tap counted under "Deals community" in `/admin/analytics`), English / العربية (full right-to-left layout) / 中文 |
| Admin (`/admin`) | Verification queue (approve / reject with reason), staff-created listings from WhatsApp with seller claim links, bulk import of a partner network's units (`/admin/listings/import`, owner set later, claim link or signed Form A), daily follow-ups, seller leads (`/admin/leads`: status, notes, call / WhatsApp, where each lead came from), deals pipeline with CSV export, per-listing review with documents, permit details, arrears, both parties' contacts, the deal file and its history, all offers, inquiries, users (KYC, roles, password reset, pending claims), visit statistics (`/admin/analytics`), newsletter subscribers and issues (`/admin/newsletter`, CSV export), remove sample data |

Buyers stay anonymous to sellers in the app — every negotiation goes through our team, so neither side can
bypass the platform. An offer's message to the seller can't hold a phone number, email address, link or handle (the
form says so and keeps the text to edit), and a buyer can send up to 10 offers or revisions an hour; re-sending an
unchanged offer doesn't notify anyone again. The buyer whose offer was accepted sees "Your offer was accepted" on the
deal page rather than an invitation to send a backup offer.

Design (logo, favicon, colours, typography and page layouts) was generated in Lovable and ported to this
Next.js app. Brand name, contact details and fee terms live in `src/lib/config.ts`.

### Legal

`/terms`, `/privacy` and `/cookies` render the Terms of Use, Privacy Policy (UAE PDPL) and Cookie Policy in
English, Arabic and Simplified Chinese from `src/content/legal/`; company name, email, phone, RERA ORN, licence number, address and
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
fields are fixed. Nor can an admin page opened before a change publish it unseen: Approve, or a save in "Manage
listing", from a page loaded before the listing last changed (the seller's new price or photo, a build's new photos,
another admin's save) is refused; Approve then shows the listing as it is now, and the editor keeps what was typed for
a reloaded page. The site-wide `RealEstateAgent` JSON-LD carries the ORN, trade licence and BRN, and each real deal page adds a
`RealEstateListing` with its price. The emails that list units carry the same details: each deal in the newsletter,
in a saved-search alert and in a price-drop notice to watchers has its permit line (the deal page's wording),
followed by our ORN and the broker's BRN.

Each permit also has an expiry date, and optionally its DLD verification link (`https://…dubailand.gov.ae/…`),
shown on the deal page as "Verify this advert with DLD" with a QR code; Form A has an expiry date too. A listing
can only go live with a permit valid in the future (dates must fall between a year ago and three years ahead). An
advert whose permit or Form A has lapsed disappears from every public page at once (deals, home, Distress Index,
sitemap, share image); the daily `ops-daily` job then pauses live ones, tells the seller, and reminds admins 7
days and 1 day before expiry. Deals already under offer or in NOC keep their status; admins are told to renew.
Listings that were live before expiry dates existed keep running until a date is entered (admin banner). A reminder
or renewal notice that couldn't be stored is sent again by the next run; it, or a seller's pause notice that couldn't
be stored (not retried: tell the seller), counts as a failed item of the run, so the admins get the job alert.

**Attestation (no permit number).** When Felicity holds a unit's Trakheesi permit and the owner's signed Form A
off-platform, the account owner can publish on their recorded statement instead of entering the number: tick "Felicity
Properties holds a valid Trakheesi permit for this advert (number not entered)" in the listing editor and approve, or
"Publish all N on Felicity's permits" on the Imported tab of `/admin`, which publishes a whole import at once (and
confirms ownership on the same statement; a unit with its permit number entered keeps the number as its record, is
left out of N and is approved from its own page once its owner is entered and confirmed). It is the actor's own
statement, recorded in the listing's History as `listing.permit_attested` with the time, IP and the statement's exact
text; the deal page then says the permit is held by Felicity Properties L.L.C (RERA ORN 33951), with no QR code;
nothing is paused (there is no expiry to track) and `/admin` lists these units under their own banner. Entering the
number later (in the editor or through `<key>-permits.json`) replaces the attestation and enables DLD verification and
expiry tracking.

### Staff intake (WhatsApp)

Sellers who send their SPA and statement on WhatsApp don't have to fill in the form: Admin → Verification queue →
"New listing" (or "Create listing from this lead" on `/admin/leads`) takes the seller's name and mobile (with country
code) and/or email plus the unit figures, and creates the seller's account without a password if there isn't one;
upload the documents on the listing page. A lead becomes one listing: opened again, the page links to it instead,
and a second submit (another tab) is refused. The staff forms (intake, Owner card, Form A, deal file) post to the
server even when sent before the page's scripts have loaded, never as a GET with the seller's details in the
address, and every admin control asks to sign in again once the session has ended, keeping what was typed.
"Copy link for WhatsApp" opens a chat to the seller with a confirmation
link in their language ("Email claim link" when they have an email and email is on); the dialog names the number the
chat opens with, the one on the seller's account. A mobile typed for a seller found by their email that differs from
the number on that account (an old one, or a stranger's who registered the seller's email first: neither is verified)
is refused until staff check with the seller which is theirs. The link works once, for 7
days, and a new one cancels the old. The seller opens it without logging in, ticks the same ownership / authority /
Terms confirmation as the sell form and chooses an email and password. Until then a staff-created listing can't be
approved (the Trakheesi permit is still required too); `/admin/users` → "Pending claim" lists those sellers. A listing
whose ownership our team confirmed without the seller (their signed Form A, or our record of their authority on an
import) still gets a link while its account has no password — an owner entered by mobile number has no other way in
— and its seller stays on "Pending claim" until they use it (the claim keeps the confirmation's date and notifies
nobody); a seller who can sign in doesn't need one. A link never sets a password on an account that already has one.
The claim link is the only way into an account our team entered for a seller: "Forgot password" on it emails nothing
(the address was typed by our team, and a typo can be a stranger's mailbox) and tells the admins, at most once an
hour, to send the seller their claim link on WhatsApp. Confirming ownership from the signed Form A for an account that
can already sign in asks staff to tick that account by name first, as the Owner card does.
The admin listing page flags descriptions that seem to contain a phone number, email, link or WhatsApp handle
("Contact details in text"); the text is never changed automatically.

**Bulk import.** Units a partner network shared with the owners' written permission come as one or more JSON files we
prepare (`offplandistress-import/1`, documented in `src/lib/import-format.ts`: the source, then per unit its ref, link,
posting date, the sell form's listing fields, up to 6 photos of 1.5 MB as base64 and team-only notes). Admin →
"Import listings" (`/admin/listings/import`) checks every unit in the browser with the sell form's rules, shows a
preview (New / Already imported / Invalid with the reason, in the file's terms: a developer or community off our lists is
quoted, payment-plan rows are numbered, a unit's photo names must differ before the extension since photos are stored as
JPEG), then imports one unit per request and uploads its photos one by one; failed rows and photos can be retried, and
choosing the files again after a reload skips what is done (a unit is imported once per source + ref, enforced by a
unique index; a retry first asks which photos the listing already has, so none is stored twice). Stock we prepare as
files in `scripts/partner-stock/` (the same format, with each photo's source URL instead of its bytes) is imported by
the production build itself (`scripts/import-partner-stock.mjs`, run from `scripts/migrate.mjs`): the same rules (a
source key of lowercase letters, digits and dashes, each unit's ref once per file, at most 6 photos whose names differ
before the extension — a file or unit that breaks one is refused, with the reason in the build log) and placeholder
owner, photos fetched and resized at build time and stored as JPEG, as the app's uploads are (the share image and
Outlook can't show WebP: a photo stored as WebP, by an earlier build or an import file, is converted once, in place, by
the next build; until then the share image converts it as it draws), run again on every
build (one build at a time: a second production build waits for the first, so no photo is stored twice), and an
in-app notice to admins when units arrive. Each build
also syncs the units already imported with the file, which is regenerated from the network: a synced field (prices,
paid, instalments, plan, handover, size, floor, view, description, and the arrears — `overdueAmount`, `overduePenalty`,
`arrearsCheckedAt` — only for a unit whose entry gives them, as `direct.json` does from a seller's statement of account,
and always the three together; set them to `null` to clear them, since an entry that drops the keys keeps the last
synced figures; elsewhere the arrears our team enters stand) takes the file's value unless our team edited it
since the last sync (the snapshot in `listings.source.synced` tells; their edit stands and is reported once as a
conflict), recorded in History as `listing.sync_update` (apart from our team's own edits); a price change on a live
advert updates the advertised price, and only a cut that makes the deal cheaper (the asking price plus the balance
still owed to the developer) tells the watchers and counts as a price drop in the newsletter; when the balance owed
changes, the watchers' saved prices move with it, so a corrected paid amount never shows as a drop; a unit marked `"removed": "YYYY-MM-DD"` (gone from the
network) is withdrawn as a seller's withdrawal is (open offers closed and their buyers told, `listing.sync_withdrawn` in
History) and put back when it is listed again (live if it was live and can still be published, else into review),
unless its status changed since (our team or its seller put it back on the market, even if they took it off again: it
stays as they left it); the buyers and watchers get these notices in the app and by email, as the app's own (in their language; the price drop
with the advert's permit line and our ORN / BRN); new photos are added only to a unit the sync may change: a unit
with a deal in progress is never touched, only reported, and one sold, rejected or withdrawn by our team is left
alone; a build that would
withdraw more than 3 and more than a quarter of a source's listed units withdraws none (the valve, unless the file's
`sync.allowMassRemoval` is true; the build log and the admins' notice name the units it kept); one `listing.synced` notice per build gives the admins the counts, the conflicts,
what was left alone and the refs of units that failed, in their language. Their DLD advertising permits can come the
same way:
`scripts/partner-stock/<key>-permits.json` (`offplandistress-permits/1`: ref, permit number, expiry, optional Form A
expiry and verification link) records each permit as the editor would, confirms ownership on our record of the owner's
written authority (the account owner's statement; the real owner is still entered afterwards from the Owner card) and
publishes the unit at its asking price — never without a current permit. **Nothing goes public:** each listing is in
review, filed under one placeholder owner per source ("Owner to be added (…)", shown in the admin's language and
never with its internal address — on the listing, `/admin/offers` and the deal file; no password, never emailed or
nudged; sign-ups refuse `.invalid` addresses, so nobody can register it first), under "Imported — owner to add" on
`/admin`, its photos private. On its page, enter the owner in the Owner
card (same matching as "New listing"; changing it cancels any claim link; the card stays until ownership is confirmed
and the owner can sign in, so a mistyped mobile or email can be corrected, and filing a confirmed listing under an
account that can already sign in — it has the listing, its offers and documents at once, and the choice is final —
first asks to confirm that account by name, ticked again for any other account, and changes nothing on the listing or
that account until then), then confirm ownership with the claim link
or, for co-broker stock, upload the owner's signed Form A ("Form A (signed by the owner)") and tick "The owner's
signed Form A is uploaded and checked"; enter the Trakheesi permit, then approve — or publish the whole import at once on
the account owner's attestation (see Advertising compliance); the tab then lists what is live without an owner yet.

**Daily DistressStock sync.** `scripts/partner-stock/distressstock.json` is regenerated every day from the partner
site by `scripts/partner-stock/sync-distressstock.mjs`, run by an agent following `.claude/skills/distressstock-sync`:
`fetch --raw <dir>` logs in (`DISTRESSSTOCK_PASSWORD`, never in the repo), saves and parses every unit page, saves each
payment-plan image with a PNG copy and writes a delta against the committed files; the agent reads each new or changed
plan image and writes its figures into `scripts/partner-stock/distressstock-plans.json` (`offplandistress-plans/1`, one
entry per ref with the image URL it was read from; the build checks that seller + remaining = unit price, the
instalments = remaining, the transfer rows = total, and that the page's selling price still matches); `build --raw <dir>`
then rewrites the manifest deterministically (units by ref, 1-space indent): a unit gone from the site keeps its entry
with `"removed": "YYYY-MM-DD"` for 90 days (the import withdraws it, and restores it if it comes back); bulk deals, shops
and units outside Dubai are never listed (one listed before keeps its previous entry until it leaves the site), and a
unit's area must be one we know to be in Dubai — on our communities list or in the script's `DUBAI_AREAS` (areas known
to be outside are in `NON_DUBAI`, each name matched as a whole word, not as a road's name such as "Al Ain Road", and
never in an area known to be in Dubai): one in an unknown area is skipped until someone adds the area to either list; a
ready unit ("READY…") takes the day it was posted as its handover date, so the site shows it as ready; a unit
whose plan is missing, illegible or inconsistent keeps its previous entry and is flagged (exit 2), as does one whose
page's size, prices or handover can no longer be read as before (the site's wording changed: fix the parser, never the
figures); a run that would mark more than a quarter of the listed units removed writes nothing (exit 3;
`--allow-mass-removal`, on the user's word, also sets the file's `sync.allowMassRemoval` for the import's own valve
whenever the file marks any unit removed — so a rebuild with it also lets through removals only the import's valve held
back, as it counts the units still listed in the database; the next build without it drops the key).
The site's first gallery image is usually a location map, so `scripts/partner-stock/distressstock-photos.json`
(`offplandistress-photos/1`: `photos: { "<ref>": [url, …] }`, the building first, at most 4) holds the photo order the
agent picks from `sheet --raw <dir>`'s contact sheets; the build lists those urls + the page's keyplan under stable file
names (a url the unit had keeps its name, a new one is `<ref>-<sha1 prefix>.webp`, so the import never fetches a photo
twice), and the import then puts the listing's gallery in that order — nothing deleted, other entries kept after them —
unless our team rearranged it, or put a photo of their own into it, since the last sync (left as they made it, reported
once, like a synced field).

**Direct sellers.** Units owners send us directly (WhatsApp intake) that should go out through the same build-time path
live in `scripts/partner-stock/direct.json` (source key `direct`, "Direct sellers"), written by hand in the same format:
the figures from the owner's documents (the plan rows as the developer's schedule lists them, the instalments already
due but not confirmed paid kept in the plan so the deal page shows them as "dated before today"), `motivation: "urgent"`
when the owner needs out now (the default /deals order puts urgent sellers first, then the furthest below the original price), the
photos as public URLs — developer renders, and a photo of our own hosted in the repository under
`scripts/partner-stock/direct-photos/` through its raw.githubusercontent.com address — and the owner's documents never
committed (they carry personal data; they go into the deal file on the listing's admin page). The import files them
under "Owner to be added (Direct sellers)" like a partner network's; the account owner publishes them from the Imported
tab and enters the real owner on each. A unit the owner wants kept private for now gets `"hold": "<why>"` in its entry: the next
deploy pauses it as our team's Pause does (off the site, its offers left open, nobody told; once, so our team can still
put it back by hand), and deleting the line puts it back where it was (live where Approve would publish it, else in
review), unless our team or its seller has changed its status since (then it stays as they left it).

### Cash at transfer

Cards, the deal page, the "Cash at transfer" filter (`minTransfer` / `maxTransfer`) and `sort=cash` show what the
buyer needs on transfer day: the asking price (equity to the seller) + our fee and VAT + the DLD fee + DLD
registration / trustee and NOC estimates + arrears with the developer. It is always marked "≈"; the one definition is
`analyzeDeal` in `src/lib/deal-math.ts`, mirrored in SQL by `cashToCloseSql`. Enter arrears from the developer's
statement under "Arrears with the developer" in `/admin/listings/{id}` (0 and 0 when the seller is up to date; empty
when not checked). The deal page also shows a dated cash timeline and warns when an instalment falls due within 45
days. `minCash` / `maxCash`, saved searches and the Distress Index keep their meaning: equity to the seller.

### Discount chips and seller labels

The main chip on a card, the deal page, the home hero, the newsletter row and the share image is the discount against
the original (SPA) price the seller signed — "20% below original price" (sale value = asking price + remaining plan;
`discountVsOriginal` in `analyzeDeal`, `belowOriginal` in SQL), known for every listing; "At original price" or "5%
above original price" when the unit isn't cheaper. The discount against the developer's launch price today ("28% below
launch price today") is a second, outlined chip, only on listings with a launch price. The deal page's `<title>` leads
with the same figure (the launch one only for a unit at or above its original price). Percentages are whole, rounded
half up (19.5% → "20% below"). The default sort ("Most below original price", urgent sellers first) and the
`minDiscount` filter ("Min. below original price"; the URL parameter is unchanged, so saved searches and their alerts
still work) use the original-price figure, the filter on the whole percentage, so "15%+" finds every unit whose chip
says 15% or more; the Distress Index keeps its launch-price discount. The "Min. % paid to developer" filter (`minPaid`)
likewise compares the whole percentage the deal page shows ("40% paid", `wholePct` in `src/lib/format.ts`), and 0 or
less in either filter is no filter. The seller chip is spelled out — "Urgent exit", "Motivated seller", "Flexible seller" — with
the hint as its tooltip; the filter chips keep the short labels. One component renders the chips everywhere:
`src/components/DiscountBadges.tsx`.

### Handover, cash timeline and photos

A unit whose handover date is today or past (Dubai dates), or that has no date but is fully paid with no plan rows (how
a partner network's ready units come), shows "Ready" (جاهز, 现房) instead of a quarter or "TBC" on its card, the deal
page and its description, the home hero and the share image (`isReady` in `src/lib/deal-math.ts`); "Handover by"
includes it and "Handover soonest" lists it first. With nothing left to pay the developer after transfer, the price
panel has no "then … per plan" line and the description offers no plan to take over. The cash timeline reads the plan's
milestone labels in English, Arabic or Chinese: "On handover" or "On completion" (عند التسليم / الإنجاز, 交房 / 竣工) is
the handover payment, even when dated after the listing's handover date (the step then shows that row's quarter);
"post / after handover or completion" (بعد…, …后) comes after it and "pre / before / until …" before it; a percentage
next to "completion" is a construction stage ("on 50% completion", "completion of 70%", "完工 50%"), one before "on
completion" or right after "on / post completion" (عند الإنجاز) the payment's share ("40% on completion" and "On
completion 40%" are the handover payment, "Post completion 10%" comes after it). The partner sync's placeholder developer
("Other" / "Not stated") reads "Developer not stated" in the visitor's language. The deal page's gallery reaches every
photo (previous / next and the arrow keys; the fourth thumbnail says how many more there are), and dates on the site
are Dubai calendar dates.

### Follow-ups and reminders

The daily `ops-daily` job (07:00 Dubai) sends each nudge once (table `reminders`), in the app and by email: sellers
who signed up to sell but listed nothing (24 h and 72 h), listings missing their SPA / Oqood or statement (48 h), live
listings with no offers after 21 days, offers the seller hasn't answered (48 h) and counter-offers the buyer hasn't
answered (48 h). Admins get one "Today's follow-ups" digest — those items plus new leads not called, listings waiting
for review, instalments due within 14 days and viewing requests not handled — and the same list, with call and
WhatsApp buttons, is under Follow-ups at the bottom of `/admin`. The digest also carries one "Inventory yesterday" line
(new adverts, price drops, units no longer available in the last 24 hours, and the confirmed newsletter subscribers).
Samples, staff and sellers who haven't claimed a staff-created listing are never nudged.

### Deal file and audit trail

Once an offer is accepted, the Deal file card on the admin listing page records Forms A, B, F and I, the deposit,
any co-broker, the NOC, the trustee office, the transfer and the invoice, with the agreed price as written in Form F
(sale value, our fee and the buyer's ≈ cash at transfer update as you type). Stage gates in "Manage listing": "NOC in
progress" needs Form F signed and both parties' KYC verified (on the deal file's party cards, or Admin → Users,
which also lists the sellers our team added and confirmed from their signed Form A, without a password);
"Transferred" needs the NOC issue date,
the DLD transfer date and the agreed price. A transferred unit stays sold: it can be taken down (Withdrawn, its deal
file kept) and shown as transferred again, never put back on the market or into an earlier stage. Deals that were already under offer get their deal file the first time
it is opened, a gate is checked or the CSV is exported. A deal set to under offer by hand (a buyer found off the
platform) links the buyer by their account email; without an account, enter their full name (and mobile) there and one
is created without a password (they set it with "Forgot password"; verify their KYC on Admin → Users). Correct "Paid
to the developer to date" in "Manage listing" from the statement of account and the deal's sale value follows. The
admin KPIs count our share of the fees (after any co-broker's) on the agreed sale value. Every admin action, a seller's claim and every
document (not photos) opened by someone other than its uploader is logged (actor, before → after, IP; never passwords or tokens)
in the listing's History panel. The pipeline shows each stage's newest 50 cards (withdrawn included), "Show all" for
the rest and a search by OD-ref or project. Pipeline → "Export all deals (CSV)" opens in Excel, Arabic included. Consent is
versioned: sign-ups, listings and offers store the Terms version (`LEGAL_UPDATED`) they accepted.

### Offers

One accepted offer per unit, enforced in a single database statement, so a double click or two tabs can't accept
two. The other bidders keep their offers as backups and are told; if the deal falls through and the unit goes
live again, the accepted offer is declined and backups are told the unit is available. A unit that is withdrawn,
rejected or transferred closes its open offers; a seller who withdraws a unit under offer ends the deal (the buyer
and admins are told; My listings warns as the listing's page does, and offers no Resume on a unit our team paused).
`OFFERS.keepBackups` in `src/lib/config.ts` switches backups off. Every answer is about the offer on the page: if the
buyer revised it after the page loaded (its amount, or only its financing or message), or the seller's counter changed,
Accept, Counter or Decline decides nothing and the page shows the offer as it now is. A counter has to be above the
buyer's offer; the counter box suggests 5% over it, capped at the asking price only while that is still above the offer.

### Seller leads and attribution

The free estimate on `/sell` (no account needed) shows what a buyer would take over and a likely range for the
seller, using the exit calculator's maths, then asks for a name and mobile / WhatsApp. Each lead lands in
`/admin/leads` and notifies admins (marked urgent when the seller has had a default notice or missed more than one
instalment). The link the visitor arrived on (utm tags, a partner's `ref` code, landing page, referring site) is
kept in session storage, not a cookie, and saved with the lead, sign-up, listing or viewing request. Signing up or
logging in from the thank-you link attaches the lead to the account and pre-fills the sell form with its numbers (an
unfinished form saved on the device for another unit isn't restored over them; it stays saved until the pre-filled
form is changed). The SEO pitch or a link in the project, or a link in the name, gets the bots' thank-you and nothing
is stored; the name isn't read for the pitch's words (Seo is a common Korean surname). Leads with no listing or account
are deleted 24 months after the last update.

### Contact form and spam protection

The contact form (`/contact`) and the viewing / info request on each deal page land in `/admin/inquiries` and notify
the admins; the free estimate's lead form shares the defences (`src/lib/spam.ts`). Every submission passes a honeypot
nobody sees, then a server-signed timing token the page was rendered with (no JavaScript needed; a post without one,
with a forged one or under three seconds after the page was served is a bot: the normal thank-you, nothing stored; a
token that ran out — the page open for over two hours — is a visitor: a clear "try again", the form keeps what was
typed and, with JavaScript, replaces its token by itself every hour, when the tab comes back into view and after a
refused submission), then the limits: 5 contact messages an hour per IP (10 for deal-page requests, 5 estimates), 3 a
day per address (10 for deal-page requests; 3 per phone for estimates). A message is then scored — SEO / "into Google's
index" wording in English or Arabic (full-width and look-alike letters folded first), links to other sites, a one-word
name (a Chinese, Japanese or Korean name, written without a space, is a full name), a fake address, a long off-topic
contact message — and at 3 points it is stored flagged: the sender sees the
thank-you, nobody is notified, and it sits on the **Spam** tab of `/admin/inquiries` with its reason (in the admin's
language); "Not spam" moves it to the inbox and sends the team the notice it skipped, once (none for a message that
reached the inbox when it arrived, or that the migration flagged: the team had that one's), "Spam" on an inbox row does
the opposite. Spam never counts:
not in the sidebar badge, the follow-ups, the daily digest or the analytics' leads line. Optional extra: Cloudflare
Turnstile (`NEXT_PUBLIC_TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY`) renders its widget on both forms and verifies
every submission (no answer from Cloudflare counts as a failed check: "please try again", nothing stored); without the
keys nothing changes. The migration adding the columns also flags the SEO pitches already stored.

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
| The newsletter's daily issue: new deals, price drops, units gone (daily, 09:00 Dubai, only on days the inventory changed) | Confirmed newsletter subscribers (email only) |
| Staff created a listing for you | Seller — confirmation (claim) link |
| Seller confirmed a staff-created listing | Admins — approve it |
| Nothing listed yet, documents missing, no offers after 21 days | Seller |
| Offer waiting for your answer (48 h) / counter-offer waiting (48 h) | Seller / buyer |
| Today's follow-ups (daily, 07:00 Dubai) | Admins |

Saved-search alerts list each new deal with its price to the seller and its permit line. Each search's window (since
its last alert) is claimed before it is alerted, so two runs at once (a cron call delivered twice, a manual run during
the 09:00 one) alert it once; an alert that couldn't be stored goes out with the next run, and a stored search whose
query Postgres refuses is skipped with a log line (`skipped` in the run's summary) rather than counted as a failed item.

In-app notifications always work. Emails go out through [Resend](https://resend.com) once `RESEND_API_KEY` and
`EMAIL_FROM` are set; each user gets them in the language they last used on the site. In production, sellers and
buyers only get emails when `EMAIL_FROM` is a sender on a domain verified in Resend (Resend's `onboarding@resend.dev`
reaches only the Resend account owner); until then only the owner logins get theirs and the admin console shows
"Email is off".

### Newsletter

Anyone can leave an email address for the daily deals newsletter, no account needed: the band under the featured
deals on the home page, the bar under the results on `/deals`, the footer of every page and `/newsletter` (with a
sample issue). Double opt-in: the address is `pending` until the link in the confirmation email is opened
(`/newsletter/confirm?t=…`, in the language it was left in); only confirmed addresses get issues. The
`saved-search-alerts` job sends the issue at 09:00 Dubai, only on days the inventory changed
(`src/lib/newsletter-issue.ts`): the adverts that went live, price drops with the old and new price, how many units are
no longer available, the RERA details every advert carries, and a one-click unsubscribe link: `List-Unsubscribe` /
`List-Unsubscribe-Post` headers (RFC 8058) naming `POST /api/newsletter/unsubscribe?t=…`, while the footer link opens
`/newsletter/unsubscribe?t=…`, which shows the masked address and asks first (a GET never unsubscribes). A day with
no new advert and no price drop sends nothing and doesn't close the window: the next issue that goes out also counts
the units that left the market on those days. A price drop is measured from the price advertised when the window
opened, so a unit raised and then cut by less isn't one. Consent is
recorded with the row: when, from which IP and where on the site; a signed-in subscriber is linked to their account
(the Privacy Policy's newsletter bullets — data, consent, retention, emails — describe exactly that record).
The forms say "check your inbox" whatever the address's state (only a non-address is refused), a filled honeypot is
ignored, and sign-ups are limited to 5 an hour per IP and 3 a day per address. `/admin/newsletter`: a preview of
today's issue in English, Arabic or Chinese (its counts and time window in the admin's own language), the counts,
the subscribers (search, status filter, 50 a page), the last 14 issues and "Export CSV"
(`/api/admin/export/newsletter.csv`, admins only, audited); confirmations count as leads on `/admin/analytics`. Needs
nothing beyond email (`RESEND_API_KEY`, `EMAIL_FROM`) and `CRON_SECRET`.

### Languages

The site is published in English, Arabic (`/ar`, right-to-left) and Simplified Chinese (`/zh`). The language a visitor
picks in the language menu is kept in the `od_locale` cookie (`en` / `ar` / `zh`): plain links then open the `/ar` or
`/zh` address, and the dashboard, the admin console and the emails follow it. Copy lives in three places, each string
with an `en`, `ar` and `zh` block: the UI dictionaries in `src/i18n/messages/*.ts` (`defineMessages` fails the build
when a language misses a key or has an extra one), the legal documents in `src/content/legal/*.ts` and the
notification / email templates in `src/lib/notification-templates.ts`. Every translated string keeps each
`{placeholder}` of the English one, and a Chinese string never holds Arabic letters or bidi isolate characters. Chinese
style for new copy: Latin for the brand and legal names, project, developer and community names and the DLD / RERA /
SPA / NOC / Oqood / KYC terms (a Chinese gloss in full-width parentheses on first use: 迪拜土地局（DLD）); one
half-width space between a Chinese character and an adjacent Latin word, number, % or `{placeholder}` (找到 {count}
套房源, 服务费 2% + 增值税) and none next to full-width punctuation; `……` in prose, a single `…` in short loading labels.

### Arabic and Chinese addresses and SEO

Every public page has an Arabic and a Chinese address (`/ar`, `/zh`, `/ar/deals`, `/zh/deals/OD-…`), linked to the
English one and to each other by hreflang and listed in `/sitemap.xml`; `src/proxy.ts` serves them. Visitors who chose
Arabic or Chinese are sent from plain links to the `/ar` or `/zh` address; the browser's language never redirects anyone
(it only shows a "عرض بالعربية / 查看中文版 / View in English" bar). `/dashboard` and `/admin` keep one address and follow the visitor's chosen language. Filtered `/deals` views,
login and sign-up are `noindex`; `robots.txt` names the sitemap and lets search engines see listing photos. `/llms.txt`
describes the site for AI assistants (buyers first, with every project page; read from the database like the sitemap). Production
sends every other host name (the `*.vercel.app` address) to the site's own domain (308): `NEXT_PUBLIC_SITE_URL` when
set, else the domain assigned to the project on Vercel; an address Vercel doesn't serve yet is never redirected to. After deploying, submit
`/sitemap.xml` in Google Search Console.

### Visit statistics

`/admin/analytics` shows visitors, visits, page views, time per visit, bounce rate, leads and conversion (today / 7 /
30 / 90 Dubai days), live visitors, top and entry pages, sources, campaigns and partner codes, countries, devices,
languages and each lead's journey. A small beacon records page views without cookies; IP addresses and user agents
are never stored (a daily-rotating anonymous id instead). A page view is one page shown: filtering `/deals`, clearing
the filters of a campaign link (its tags go too) or switching the page's language doesn't count another one (after a
switch the view is recorded in the language chosen); new campaign tags on the same page do. Signed-in admins are never
counted; "Ignore this device" on the page covers a browser you use signed out. Page views are deleted after 13 months.
A listing's own view count (the seller's "Listing views", the admin page, the 21-day no-offers nudge) counts a person
opening its deal page: not the same crawlers, link previews and scripts, a HEAD request, the page drawn again after
Watch or an offer, the listing's seller or our team.

### Installable app

Phones can add the site to their home screen and open it full screen, like an app. Each language has its own web app
manifest (`/manifest/en.webmanifest`, `ar`, `zh`, from `src/lib/pwa.ts`), linked from the pages in that language: the
app starts in the language it was added in (`/?utm_source=pwa`, so launches show as source "pwa" in
`/admin/analytics`), with shortcuts to Deals, Sell and the watchlist. Its `id` stays `/`: never change it, or
installed copies become a different app. The icons in `public/icons/` and `src/app/apple-icon.png` are drawn from
`src/app/icon.svg`: after changing the logo, run `node scripts/make-app-icons.mjs` and commit the PNGs.

On Android (Chrome) and in iOS Safari an install card appears on phones after some browsing (three pages and 45 seconds
in a visit), on the home page, `/deals`, the market and info pages and the dashboard; never on a deal page, a form or
in the admin console, never in the installed app, and twice at most, 30 days apart, if turned down. On iOS it explains
Share › Add to Home Screen. "Install the app" in the phone menu opens it at any time.

A small service worker (`public/sw.js`) shows `public/offline.html` (in the page's language, with the phone number)
when a page can't load for lack of a connection, and reloads the page once the connection is back; a notice under the
header says so while offline. It caches nothing else: no page, server action, API answer or Next file, so no one ever
sees a stale or another person's page. It is registered in production builds only, and not in automated browsers (set
`localStorage.od_force_sw = "1"` to test it there). Bump `VERSION` in `public/sw.js` when `offline.html` changes.
Kill switch, should the worker ever misbehave: copy `scripts/sw-kill.js` over `public/sw.js`, set `NEXT_PUBLIC_SW=off`
and deploy; browsers drop the worker on their next visit.

## Stack

- Next.js 16 (App Router, server actions) + Tailwind CSS 4 + shadcn/ui
- Neon Postgres via Drizzle ORM (`@neondatabase/serverless` HTTP driver on Vercel, `pg` for any other Postgres)
- Email + password auth with database sessions (httpOnly cookie, no extra secret needed)
- i18n: typed English / Arabic / Chinese dictionaries per area in `src/i18n/messages/`; public pages take the
  language from the address (`/ar/…`, `/zh/…`), the dashboard and admin console from a cookie or the browser's
  `Accept-Language`
- Documents and photos stored in Postgres (`files` table, 4 MB per file), each as the type its first bytes show (PDF,
  JPEG, PNG, WebP or HEIC / HEIF; photos JPEG, PNG or WebP), whatever its name or which of those types the browser gave
  it (one the browser couldn't name, a HEIC on some Windows and Android phones, is judged by its bytes alone); anything
  else is refused. The name is stored and served without invisible or direction-changing characters, with that type's
  extension (`src/lib/uploads.ts`; the import page recognises a photo it uploaded by that cleaned name)
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
   - `CRON_SECRET` — **required for the daily jobs**: any long random string. Saved-search alerts (the same 09:00
     Dubai run then sends the newsletter's daily issue) and the `ops-daily` permit job refuse to run without it
     (admins get an in-app alert). Optional `HEARTBEAT_URL` /
     `OPS_HEARTBEAT_URL` receive a ping after each successful run, for an uptime monitor; `/api/health` answers 200
     when the app and database are up.
   - Previews: preview builds skip migrations and sample data (they may share the production database). Once
     each preview has its own Neon branch, set `PREVIEW_DB_ISOLATED=true` for Preview.
   - `RESEND_API_KEY` + `EMAIL_FROM` for email: `EMAIL_FROM` must be a sender on a domain you verified in Resend
     (e.g. `OffplanDistress <deals@felicitypro.com>`), or sellers and buyers get no emails in production.
   - Optional: `NEXT_PUBLIC_SITE_URL` (e.g. `https://offplandistress.com`; defaults to the domain assigned to the project on Vercel) for
     links in emails, canonical URLs and the redirect of other host names; `ANALYTICS_SALT` for the visit statistics.
   - Optional: `NEXT_PUBLIC_TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY` (a Managed or Invisible Turnstile widget made
     in the Cloudflare dashboard for the site's domain) put Cloudflare's anti-bot check on the contact / viewing form
     and the free estimate; `FORM_SECRET` signs those forms' timing tokens (defaults to `CRON_SECRET`).
   - Optional: `ANTHROPIC_API_KEY` turns on the AI assistant, a chat button above the WhatsApp one on every public page
     (`src/lib/assistant.ts`, `src/app/api/assistant/route.ts`). It answers buyers and sellers in English, Arabic or
     Chinese and searches the advertised units with two tools (the /deals search and a deal's details); it never sees
     sellers' contact details or unadvertised units. `ASSISTANT_MODEL` picks the model (default `claude-opus-5-5`;
     `claude-haiku-5-5` costs far less per chat) and `ASSISTANT_DAILY_LIMIT` caps the chat messages a day across all
     visitors (default 300); each visitor also gets 15 messages per 10 minutes and 80 a day. Every answer logs one
     `{"assistant": …}` line with its token use in the Vercel logs.
   - Company details (trade licence 1145910, RERA ORN 33951, broker BRN 59244, phone/WhatsApp +971 56 352 0611,
     office address in Bay Square, the WhatsApp deals community's join link) are built in (`BRAND` in
     `src/lib/config.ts`). Each can be overridden with its `NEXT_PUBLIC_*` variable (see `.env.example`;
     `NEXT_PUBLIC_WHATSAPP_COMMUNITY` for the community's `https://chat.whatsapp.com/…` link); an empty variable keeps
     the built-in value.
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

Adding copy: put it in the right namespace under `src/i18n/messages/` (English, Arabic and Chinese side by side — the
build fails if a translation is missing) and read it with `getT("ns")` on the server or `useT("ns")` in client components.

## Later

- At scale, move documents from Postgres to object storage (e.g. Vercel Blob or S3).
- Email verification for new accounts (needs Resend configured).

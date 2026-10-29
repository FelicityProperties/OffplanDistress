---
name: distressstock-sync
description: 'Daily DistressStock sync: fetch the partner site, transcribe new payment-plan images, rebuild scripts/partner-stock/distressstock.json, ship it to production through a PR; use when the user says update / sync DistressStock, or from the scheduled daily task'
---

# Daily DistressStock sync

DistressStock (https://distressonly.deals, password gate) lists distressed off-plan units posted by brokers. Our
production build imports `scripts/partner-stock/distressstock.json` (format `offplandistress-import/1`): new units go
into review, units marked removed are withdrawn, changed figures are applied. This runbook keeps that file in step with
the site, once a day. Each unit's payment plan is an **image** on the site; you read it and write the figures into
`scripts/partner-stock/distressstock-plans.json` — that is the only part a script can't do.

Ground rules: the repo is public — never commit the password, `cookies.txt`, the saved HTML pages or the images.
`DISTRESSSTOCK_PASSWORD` comes from the environment's secrets (or the user); never write it into a file or the report.
Nothing you do here makes a unit public: the owner alone presses "Publish all N on Felicity's permits".

## 1. Fetch

```
RAW=<scratch dir>/dod-$(date +%F)
DISTRESSSTOCK_PASSWORD=… node scripts/partner-stock/sync-distressstock.mjs fetch --raw $RAW
```

Logs in, saves the index and every unit page under `$RAW`, parses them into `$RAW/units.json`, saves each payment-plan
image as `$RAW/plans/<ref>.webp` with a PNG copy `$RAW/plans/<ref>.png`, writes `$RAW/delta.json` and prints its summary
(new / removed / back / changed / need a plan read / excluded). About 170 polite requests, under a minute. It handles an
HTTPS proxy by itself. `node … diff --raw $RAW` prints the summary again; `node … delta --raw $RAW` recomputes it after
you edit the plans file (no network).

It stops with exit 1 and a plain message when the password is missing, the gate stays (wrong password or a changed
login), the index lists 0 units, or a page fails twice. Don't loop on it: report the message to the user.

## 2. Transcribe every `needsPlan` entry

For each entry in `delta.json`'s `needsPlan` (`reason`: `new` — a unit we don't list yet; `not transcribed` — a listed
unit whose plan is missing from the file; `image changed` — the site replaced the image, read it afresh; `inconsistent`
— the figures on file don't add up, `detail` says how), open its `pngPath` with your image reader (a plan split over
several images continues in `<ref>-2.png`, `<ref>-3.png`; `moreImages` lists them) and write the plan under
`plans["<ref>"]` in `scripts/partner-stock/distressstock-plans.json` (keep the refs sorted):

```json
"6tU9pf": {
 "image": "https://distressonly.deals/media/units/423/e76423cf4374.webp",
 "transcribedAt": "2026-10-29",
 "legible": true,
 "unitPrice": 4700000,
 "paymentToSeller": 2186173,
 "dldFee": 199240,
 "trusteeFee": 5250,
 "commission": 98700,
 "otherOnTransfer": [],
 "instalments": [
  { "label": "11-Mar-27", "dueDate": "2027-03-11", "amount": 223027 },
  { "label": "11-Jun-27", "dueDate": "2027-06-11", "amount": 398400 },
  { "label": "11-Sep-27", "dueDate": "2027-09-11", "amount": 398400 },
  { "label": "26-Nov-27", "dueDate": "2027-11-26", "amount": 1494000 }
 ],
 "totalOnTransfer": 2489363,
 "totalRemaining": 2513827,
 "totalCosts": 5003190,
 "notes": "All checks pass."
}
```

- `image`: exactly the `image` of the delta entry (the build matches the file to the page by it). `transcribedAt`: today.
- The rows: "UNIT PRICE" → `unitPrice`; "Payments on Transfer" → `paymentToSeller` (1. Payment to seller), `dldFee`
  (2. DLD Transfer fee), `trusteeFee` (3. Trustee / registration fee), `commission` (4. Buyer's agency commission),
  any other transfer row (e.g. "5. Title Deed Fee") → `otherOnTransfer: [{ "label", "amount" }]`; "Payment Plan" rows
  → `instalments` with the label as printed, `dueDate` as YYYY-MM-DD (DD-MMM-YY, DD.MM.YYYY and DD/MM/YYYY are all
  day first; "On Handover" or "60% Construction" without a date → `null`), whole dirhams; the three totals.
- The arithmetic that must hold (the build refuses the plan otherwise — re-read the digits, don't fudge them):
  `paymentToSeller + totalRemaining = unitPrice`; the instalments add up to `totalRemaining`;
  `paymentToSeller + dldFee + trusteeFee + commission + others = totalOnTransfer` and
  `totalOnTransfer + totalRemaining = totalCosts` (both within 2 AED — the source rounds VAT per line); the page's
  "Selling price" equals `unitPrice`. Put anything odd (a misprint, unusual labels, a printed handover date) in `notes`.
- Ready / fully paid unit (no "Payment Plan" section, payment to seller = unit price): `instalments: []`,
  `totalRemaining: 0`.
- Can't read it (blurred, cropped, not a plan): `"legible": false`, `"notes": "why"`, the figures `null`. The unit is
  then **skipped** — left out if new, the previous entry kept if listed — say so in the report so the user can ask the
  broker for the figures.
- Original (SPA) price, paid and asking are derived by the build: SPA price = (dldFee − 40) / 4% (the DLD line is 4% of
  the original price + 40), else the page's "Original Price + DLD 4%" ÷ 1.04; paid = SPA price − remaining; asking = payment
  to seller.

## 3. Build

```
node scripts/partner-stock/sync-distressstock.mjs build --raw $RAW
```

Rewrites `scripts/partner-stock/distressstock.json` from the pages, the plans file and the previous manifest and
prints the summary (listed, new, updated with the fields, removed, back, dropped, flagged, skipped, excluded); the
counts are also in `$RAW/build.json`. Exit codes: **0** done; **2** a unit still needs its plan (the file is written;
go back to step 2, then build again — repeat until 0); **3** the safety valve (below; nothing written); **1** a
problem with the inputs (message says). Units are excluded for good when they are bulk deals, shops or outside Dubai.

## 4. Review

`git diff --stat scripts/partner-stock/` — only `distressstock.json` and `distressstock-plans.json` may change, and
the diff should be about as big as the summary says (a new unit ≈ 100 lines; a removed one adds one `"removed"` line; a
unit back on the site loses it). `git status` must show nothing from `$RAW`. Spot-check one new unit against its page.

## 5. Ship

1. `git fetch origin && git switch -c sync/distressstock-$(date +%F) origin/main`, then `git add scripts/partner-stock/`
   and commit: `DistressStock sync YYYY-MM-DD: N new, M removed, K updated` (counts from the build summary).
2. Push the branch and open a PR to `main` with the GitHub tools (`mcp__github__create_pull_request`), the summary in
   the body (titles of the new / removed / updated units, what was skipped and why).
3. Wait for the Vercel check on the PR to succeed: schedule a wake-up (a `send_later` / scheduled task in 5–10
   minutes, not a sleep loop), then read the PR's checks (`mcp__github__pull_request_read` / `get_check_run`); repeat
   until the check passed. A failed check: read the logs, fix only if it's the sync's own files, else report.
4. Merge the PR (`mcp__github__merge_pull_request`, squash).
5. Report to the user in 5 lines: the counts (new / removed / updated / skipped); the new and removed units by title;
   when N > 0: "press Publish all N on Felicity's permits at https://offplandistress.vercel.app/admin?tab=imported";
   anything skipped (illegible plans, excluded units) and why; anything the valves stopped.

## 6. What the production build then does

`scripts/import-partner-stock.mjs` runs on the deploy: new units are imported in review under the placeholder owner
("Imported — owner to add" on `/admin`) with their photos; units marked `"removed"` are withdrawn (open offers closed)
and put back when they reappear; changed figures (asking / original price, paid, instalments, plan, handover, size,
floor, view, description) are applied unless our team edited that field since — then their edit stands and the conflict
is reported to the admins once; a unit with a deal in progress is never touched; the admins get one notice per build.
Publishing stays with the owner's "Publish all N on Felicity's permits" click.

## Safety valves — what to do when one trips

- **Mass removal (build exit 3).** More than 25% of the listed units (and more than 3) are not on the site today.
  Usually a half-fetched index or a changed site, not that many sales. Check the site by hand (does `/` still list the
  units, is `$RAW/index.html` complete?). Don't force it: tell the user which units it would mark removed and ask. Only
  when they confirm the units are really gone, run `build … --allow-mass-removal`; the file then carries
  `sync.allowMassRemoval` so the production import's own valve lets that build through (the next day's build drops it).
- **Production valve** (`VALVE TRIPPED` in the deploy log, or the admins' notice): same thing on the server side — the
  withdrawals were not applied; tell the user, and rebuild with `--allow-mass-removal` only on their word.
- **Fetch stops** (gate stays / 0 units / page failed twice): the site is down, changed, or the password changed. Report
  it; don't retry in a loop, don't guess passwords.
- **A plan that won't add up** after two careful readings: `legible: false` with a note, and say so in the report.
- **A unit in the previous manifest but now excluded** (e.g. re-posted as a bulk deal): the build leaves it out and
  says so; mention it in the report.
- Never edit `distressstock.json` by hand; the build regenerates it. Never commit anything from `$RAW`.

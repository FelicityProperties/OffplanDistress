// The account owner's attestation (listings.permit_attested_at / _by): Felicity Properties holds the Trakheesi
// advertising permit for an advert off-platform — and, when a whole import is published at once, the owner's signed
// Form A too — and the advert goes live without the number being entered. The audit trail keeps the statement's exact
// English text and this version with the actor, time and IP (listing.permit_attested), so a later change of wording
// never rewrites what was attested to. Entering the number later replaces the attestation (the number is then the
// record, with DLD verification and expiry tracking). Nothing about it is shown publicly.

export const ATTESTATION_VERSION = "2026-10-28";

/** The per-listing statement: the checkbox in "Manage listing" (src/components/admin/AdminControls.tsx). */
export const PERMIT_ATTESTATION = "Felicity Properties holds a valid Trakheesi permit for this advert (number not entered)";

/** The statement for one unit: the Publish dialog on its own admin page (src/components/admin/PublishAttested.tsx). */
export const LISTING_ATTESTATION =
  "I confirm that Felicity Properties L.L.C holds a valid Trakheesi advertising permit and the owner's signed Form A for this unit, and that it is still available at the stated price.";

/** The bulk statement: the Publish dialog on the Imported tab (src/components/admin/PublishAttested.tsx). */
export const BULK_ATTESTATION =
  "I confirm that Felicity Properties L.L.C holds a valid Trakheesi advertising permit and the owner's signed Form A for each of these units, and that each unit is still available at the stated price.";

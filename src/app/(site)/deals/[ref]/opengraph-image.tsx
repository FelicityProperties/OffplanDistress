import { translator } from "@/i18n/translator";
import { BRAND, UNIT_TYPES } from "@/lib/config";
import { analyzeDeal } from "@/lib/deal-math";
import { formatAEDCompact, formatQuarter, parseRefCode, refCode } from "@/lib/format";
import { getListingByRef } from "@/lib/listings";
import { hasArabic, OG, OG_SIZE, OgWordmark, photoDataUrl, renderOg } from "@/lib/og";
import { isAdvertised } from "@/lib/permits";
import { communityName, developerName } from "@/lib/place-names";

export const alt = `Distressed off-plan deal on ${BRAND.name}`;
export const size = OG_SIZE;
export const contentType = "image/png";

/** Height of the regulatory strip along the bottom of a real listing's card. */
const STRIP_H = 64;

/** The preview card shown when a deal link is shared: photo, project, price to the seller and the saving. */
export default async function Image({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const refNo = parseRefCode(ref);
  const row = refNo ? await getListingByRef(refNo) : null;
  // The card is the advert itself when forwarded: none for a private listing or one whose permit / Form A ran out.
  const l = row && isAdvertised(row.listing) ? row.listing : null;
  if (!l) return fallback();

  const a = analyzeDeal(l);
  const pct = a.discountVsLaunch != null && a.discountVsLaunch > 0 ? Math.round(a.discountVsLaunch * 100) : null;
  const saving = a.savingVsLaunch != null && a.savingVsLaunch > 0 ? a.savingVsLaunch : null;
  const photo = await photoDataUrl(l.images[0]);
  const unit = UNIT_TYPES[l.unitType as keyof typeof UNIT_TYPES] ?? l.unitType;
  // The card is English, in a Latin font. Listed developer and community names are Latin; a name the seller typed
  // for "Other" may not be, and neither may the project name, which is then described instead.
  const tc = translator("common", "en");
  const typedCommunity = communityName(tc, l.community, l.communityOther);
  const typedDeveloper = developerName(tc, l.developer, l.developerOther);
  const community = hasArabic(typedCommunity) ? "Dubai" : typedCommunity;
  const developer = hasArabic(typedDeveloper) ? "" : typedDeveloper;
  const name = hasArabic(l.projectName) ? `${unit} in ${community}` : l.projectName;
  // Forwarded on WhatsApp, this card is the advert itself, so RERA's details go on it: the DLD permit, our office
  // ORN and the broker's BRN. Samples aren't adverts and keep the full-height card. Without a number, an advert on the
  // account owner's attestation (src/lib/attestation.ts) says the broker holds the permit.
  const permit =
    l.dldPermit && !hasArabic(l.dldPermit) ? `DLD permit ${l.dldPermit}` : !l.dldPermit && l.permitAttestedAt ? `DLD permit held by ${BRAND.company}` : null;
  const strip = l.isSample ? null : [permit, `RERA ORN ${BRAND.orn}`, `BRN ${BRAND.broker.brn}`].filter(Boolean).join(" · ");
  const bodyH = strip ? OG_SIZE.height - STRIP_H : OG_SIZE.height;

  return renderOg(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: OG.ink, color: OG.cream }}>
        <div style={{ display: "flex", height: bodyH }}>
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 640, padding: 56 }}>
            <OgWordmark size={30} />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
                {pct != null && (
                  <div style={{ display: "flex", padding: "8px 16px", borderRadius: 999, background: OG.success, fontSize: 22, fontWeight: 700 }}>
                    −{pct}% vs launch
                  </div>
                )}
                {l.isSample && (
                  <div style={{ display: "flex", padding: "8px 16px", borderRadius: 999, background: "rgba(250,248,243,0.14)", fontSize: 22 }}>
                    SAMPLE LISTING
                  </div>
                )}
              </div>
              <div style={{ display: "flex", fontSize: 22, letterSpacing: 3, color: OG.muted, textTransform: "uppercase" }}>{developer}</div>
              <div style={{ display: "flex", marginTop: 6, fontSize: 52, fontWeight: 700, lineHeight: 1.08, letterSpacing: -1 }}>
                {name.length > 42 ? `${name.slice(0, 40)}…` : name}
              </div>
              <div style={{ display: "flex", marginTop: 10, fontSize: 26, color: OG.muted }}>
                {community} · {unit} · Handover {formatQuarter(l.handoverDate)}
              </div>
            </div>
            <div style={{ display: "flex", gap: 40 }}>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", fontSize: 20, color: OG.muted, textTransform: "uppercase", letterSpacing: 2 }}>Pay seller now</div>
                <div style={{ display: "flex", fontSize: 48, fontWeight: 700, color: OG.gold }}>{formatAEDCompact(l.askingPrice)}</div>
              </div>
              {saving != null && (
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", fontSize: 20, color: OG.muted, textTransform: "uppercase", letterSpacing: 2 }}>Save vs new</div>
                  <div style={{ display: "flex", fontSize: 48, fontWeight: 700 }}>{formatAEDCompact(saving)}</div>
                </div>
              )}
            </div>
          </div>
          <div style={{ display: "flex", position: "relative", width: 560, height: "100%", background: OG.inkSoft }}>
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo} alt="" width={560} height={bodyH} style={{ width: 560, height: bodyH, objectFit: "cover" }} />
            ) : (
              <div style={{ display: "flex", width: "100%", height: "100%", alignItems: "center", justifyContent: "center", fontSize: 140, color: "rgba(250,248,243,0.12)" }}>
                {refCode(l.refNo)}
              </div>
            )}
            <div style={{ position: "absolute", left: 0, top: 0, width: 120, height: bodyH, background: `linear-gradient(90deg, ${OG.ink}, rgba(20,28,51,0))` }} />
          </div>
        </div>
        {strip && (
          // A long permit number (up to 40 characters) would wrap out of the strip at full size; it gets a smaller font.
          <div style={{ display: "flex", alignItems: "center", height: STRIP_H, padding: "0 56px", background: OG.cream, color: OG.ink, fontSize: strip.length > 60 ? 20 : 26, fontWeight: 700, letterSpacing: 0.5 }}>
            {strip}
          </div>
        )}
      </div>
    ),
    fallbackCard,
    3600, // prices change; messaging apps cache previews themselves anyway
  );
}

function fallbackCard() {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: OG.ink }}>
      <OgWordmark size={56} />
    </div>
  );
}

function fallback() {
  return renderOg(fallbackCard(), fallbackCard, 600);
}

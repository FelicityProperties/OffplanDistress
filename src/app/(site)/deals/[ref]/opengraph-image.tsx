import { BRAND, PUBLIC_STATUSES, UNIT_TYPES } from "@/lib/config";
import { analyzeDeal } from "@/lib/deal-math";
import { formatAEDCompact, formatQuarter, parseRefCode, refCode } from "@/lib/format";
import { getListingByRef } from "@/lib/listings";
import { hasArabic, OG, OG_SIZE, OgWordmark, photoDataUrl, renderOg } from "@/lib/og";

export const alt = `Distressed off-plan deal on ${BRAND.name}`;
export const size = OG_SIZE;
export const contentType = "image/png";

/** The preview card shown when a deal link is shared: photo, project, price to the seller and the saving. */
export default async function Image({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const refNo = parseRefCode(ref);
  const row = refNo ? await getListingByRef(refNo) : null;
  const l = row && PUBLIC_STATUSES.includes(row.listing.status) ? row.listing : null;
  if (!l) return fallback();

  const a = analyzeDeal(l);
  const pct = a.discountVsLaunch != null && a.discountVsLaunch > 0 ? Math.round(a.discountVsLaunch * 100) : null;
  const saving = a.savingVsLaunch != null && a.savingVsLaunch > 0 ? a.savingVsLaunch : null;
  const photo = await photoDataUrl(l.images[0]);
  const unit = UNIT_TYPES[l.unitType as keyof typeof UNIT_TYPES] ?? l.unitType;
  // Developer and community names are always Latin; an Arabic project name is described instead.
  const name = hasArabic(l.projectName) ? `${unit} in ${l.community}` : l.projectName;

  return renderOg(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: OG.ink, color: OG.cream }}>
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
            <div style={{ display: "flex", fontSize: 22, letterSpacing: 3, color: OG.muted, textTransform: "uppercase" }}>{l.developer}</div>
            <div style={{ display: "flex", marginTop: 6, fontSize: 52, fontWeight: 700, lineHeight: 1.08, letterSpacing: -1 }}>
              {name.length > 42 ? `${name.slice(0, 40)}…` : name}
            </div>
            <div style={{ display: "flex", marginTop: 10, fontSize: 26, color: OG.muted }}>
              {l.community} · {unit} · Handover {formatQuarter(l.handoverDate)}
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
            <img src={photo} alt="" width={560} height={630} style={{ width: 560, height: 630, objectFit: "cover" }} />
          ) : (
            <div style={{ display: "flex", width: "100%", height: "100%", alignItems: "center", justifyContent: "center", fontSize: 140, color: "rgba(250,248,243,0.12)" }}>
              {refCode(l.refNo)}
            </div>
          )}
          <div style={{ position: "absolute", left: 0, top: 0, width: 120, height: 630, background: `linear-gradient(90deg, ${OG.ink}, rgba(20,28,51,0))` }} />
        </div>
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

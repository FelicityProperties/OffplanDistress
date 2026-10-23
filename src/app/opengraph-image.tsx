import { ImageResponse } from "next/og";
import { BRAND } from "@/lib/config";
import { OG, OG_SIZE, OgWordmark } from "@/lib/og";

export const alt = `${BRAND.name} — ${BRAND.tagline}`;
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  const points = ["Verified SPAs", "NOC & DLD transfer handled", "2% + VAT, only on success"];
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: `linear-gradient(135deg, ${OG.ink} 0%, ${OG.inkSoft} 100%)`,
          color: OG.cream,
          position: "relative",
        }}
      >
        <div style={{ position: "absolute", right: -180, top: -180, width: 620, height: 620, borderRadius: 620, background: "rgba(224,180,90,0.08)" }} />
        <div style={{ position: "absolute", right: -60, top: -60, width: 380, height: 380, borderRadius: 380, background: "rgba(224,180,90,0.1)" }} />
        <OgWordmark size={40} />
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 76, fontWeight: 700, lineHeight: 1.05, letterSpacing: -2 }}>
            Buy Dubai off-plan
          </div>
          <div style={{ display: "flex", fontSize: 76, fontWeight: 700, lineHeight: 1.05, letterSpacing: -2, color: OG.gold }}>
            below launch price.
          </div>
          <div style={{ display: "flex", marginTop: 28, fontSize: 30, color: OG.muted, maxWidth: 900 }}>
            Take over verified payment plans from owners who need out.
          </div>
        </div>
        <div style={{ display: "flex", gap: 16 }}>
          {points.map((p) => (
            <div
              key={p}
              style={{
                display: "flex",
                padding: "12px 22px",
                borderRadius: 999,
                border: "1px solid rgba(250,248,243,0.18)",
                background: "rgba(250,248,243,0.06)",
                fontSize: 24,
              }}
            >
              {p}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}

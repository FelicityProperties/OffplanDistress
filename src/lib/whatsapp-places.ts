/**
 * The public site's WhatsApp buttons, by where they are: each link carries data-wa="<place>", and a tap is recorded
 * under it (src/components/analytics/PageViewTracker.tsx → /api/a → whatsapp_clicks → /admin/analytics). A link
 * without the attribute counts as "other". Shared by the browser and the server, so nothing server-only here.
 */
export const WHATSAPP_PLACES = [
  "floating",
  "footer",
  "contact",
  "sell",
  "estimate",
  "exit",
  "deal",
  "claim",
  "assistant",
  // A join link of the WhatsApp deals community (src/components/WhatsAppCommunity.tsx), on whichever page.
  "community",
  "other",
] as const;
export type WhatsAppPlace = (typeof WHATSAPP_PLACES)[number];
export const isWhatsAppPlace = (v: unknown): v is WhatsAppPlace => typeof v === "string" && (WHATSAPP_PLACES as readonly string[]).includes(v);
/** A link that opens WhatsApp: a chat (wa.me, api.whatsapp.com, whatsapp:) or a group or community invite (chat.whatsapp.com). */
export const WHATSAPP_LINK = /^(https:\/\/(wa\.me|api\.whatsapp\.com|chat\.whatsapp\.com)\/|whatsapp:)/i;

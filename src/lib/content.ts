// Marketing content shared by several pages. Copy lives in the "home" i18n namespace; this file keeps
// image URLs, the order of the FAQ and steps, and each step's icon id.

export const HERO_IMAGE = "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=2000&q=75";
export const AUTH_IMAGE = "https://images.unsplash.com/photo-1518684079-3c830dcef090?auto=format&fit=crop&w=1400&q=75";

/** FAQ entries, in display order. Question/answer copy: home `faq.<id>.q` / `faq.<id>.a`. */
export const FAQS = ["distressed", "pricing", "transfer", "cost", "protection", "resale", "mortgage"] as const;

/** Step copy: home `step.<id>.title` / `step.<id>.desc`. */
export const SELLER_STEPS = [
  { icon: "upload", id: "seller.verify" },
  { icon: "badge", id: "seller.list" },
  { icon: "handshake", id: "seller.match" },
  { icon: "key", id: "seller.transfer" },
] as const;

export const BUYER_STEPS = [
  { icon: "search", id: "buyer.discover" },
  { icon: "file", id: "buyer.review" },
  { icon: "sign", id: "buyer.offer" },
  { icon: "key", id: "buyer.takeOver" },
] as const;

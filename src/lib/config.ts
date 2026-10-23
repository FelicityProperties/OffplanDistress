// Single place for brand and commercial terms. Change here, it changes everywhere.

export const BRAND = {
  name: "OffplanDistress",
  tagline: "Dubai's marketplace for distressed off-plan units",
  description:
    "Buy Dubai off-plan below launch price. Owners who need out list their units; we verify the paperwork, match buyers and handle the developer NOC and DLD transfer.",
  company: "Felicity Properties LLC",
  location: "Dubai, United Arab Emirates",
  // Shown in the footer and contact page; phone/WhatsApp/ORN only when filled in.
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "mouhannad@felicitypro.com",
  phone: process.env.NEXT_PUBLIC_CONTACT_PHONE ?? "",
  /** Digits only, e.g. 9715XXXXXXXX */
  whatsapp: (process.env.NEXT_PUBLIC_WHATSAPP ?? "").replace(/\D/g, ""),
  /** RERA office registration number */
  orn: process.env.NEXT_PUBLIC_RERA_ORN ?? "",
  /** Commercial (trade) licence number; the legal pages mention it only when filled in. */
  licence: process.env.NEXT_PUBLIC_TRADE_LICENCE ?? "",
  /** Registered office address shown on the legal pages (omitted when set to an empty string). */
  address: process.env.NEXT_PUBLIC_ADDRESS ?? "Dubai, United Arab Emirates",
};

/**
 * Owner accounts. These emails can't be registered through the public sign-up form (the repo is public,
 * so anyone could otherwise claim them). The build creates the login from ADMIN_PASSWORD instead — see
 * scripts/migrate.mjs. Extra admins can be promoted from /admin/users.
 */
export const OWNER_EMAILS = (process.env.ADMIN_EMAILS || "mouhannad@felicitypro.com")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export const FEES = {
  /** Brokerage commission on the sale value, charged only when the transfer completes. */
  commissionRate: 0.02,
  /** UAE VAT applied on the commission. */
  vatRate: 0.05,
  /** Who pays the 2% + VAT. Sellers list for free. */
  payer: "buyer" as "buyer" | "seller",
  /** Dubai Land Department transfer fee on the sale value (estimate, confirmed by DLD). */
  dldRate: 0.04,
  /** DLD registration + trustee office fees (estimate). */
  dldAdminEstimate: 4_200,
  /** Developer NOC / assignment admin fee (estimate, varies by developer). */
  nocEstimate: 5_000,
};

export const DEVELOPERS = [
  "Emaar",
  "DAMAC",
  "Sobha",
  "Nakheel",
  "Meraas",
  "Binghatti",
  "Ellington",
  "Danube",
  "Azizi",
  "Omniyat",
  "Aldar",
  "Select Group",
  "Samana",
  "Imtiaz",
  "Other",
];

export const COMMUNITIES = [
  "Business Bay",
  "Damac Lagoons",
  "Downtown Dubai",
  "Dubai Creek Harbour",
  "Dubai Hills Estate",
  "Dubai Marina",
  "Dubai South",
  "Emaar Beachfront",
  "Jumeirah Village Circle",
  "Meydan",
  "Mohammed Bin Rashid City",
  "Palm Jumeirah",
  "The Valley",
  "Other",
];

export const UNIT_TYPES = {
  studio: "Studio",
  "1br": "1 Bedroom",
  "2br": "2 Bedrooms",
  "3br": "3 Bedrooms",
  "4br": "4 Bedrooms",
  "5br": "5+ Bedrooms",
  townhouse: "Townhouse",
  villa: "Villa",
  penthouse: "Penthouse",
} as const;

export type UnitTypeKey = keyof typeof UNIT_TYPES;

export const MOTIVATION = {
  urgent: { label: "Urgent", hint: "Must exit within weeks" },
  motivated: { label: "Motivated", hint: "Open to serious offers" },
  flexible: { label: "Flexible", hint: "Will wait for the right price" },
} as const;

export const LISTING_STATUS = {
  pending_review: { label: "Under review", tone: "warning" },
  live: { label: "Live", tone: "success" },
  under_offer: { label: "Offer accepted", tone: "accent" },
  noc_in_progress: { label: "NOC in progress", tone: "accent" },
  transferred: { label: "Transferred", tone: "muted" },
  paused: { label: "Paused", tone: "muted" },
  rejected: { label: "Rejected", tone: "danger" },
  withdrawn: { label: "Withdrawn", tone: "muted" },
} as const;

export type ListingStatusKey = keyof typeof LISTING_STATUS;

/** Order shown in the seller's status pipeline. */
export const PIPELINE: ListingStatusKey[] = [
  "pending_review",
  "live",
  "under_offer",
  "noc_in_progress",
  "transferred",
];

/** Statuses a buyer can see on the marketplace. */
export const PUBLIC_STATUSES: ListingStatusKey[] = ["live", "under_offer", "noc_in_progress"];

export const OFFER_STATUS = {
  pending: { label: "Pending", tone: "warning" },
  accepted: { label: "Accepted", tone: "success" },
  declined: { label: "Declined", tone: "danger" },
  countered: { label: "Countered", tone: "accent" },
  withdrawn: { label: "Withdrawn", tone: "muted" },
} as const;

export const FILE_KINDS = {
  spa: "Sales & Purchase Agreement (SPA)",
  oqood: "Oqood certificate",
  soa: "Statement of account",
  id: "Passport / Emirates ID",
  photo: "Photo / render",
  other: "Other document",
} as const;

export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

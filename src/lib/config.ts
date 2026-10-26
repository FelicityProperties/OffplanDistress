// Single place for brand and commercial terms. Change here, it changes everywhere.

// An address override, ignoring the placeholder the old .env.example shipped ("Dubai, United Arab Emirates"), which
// would otherwise hide the office address everywhere if it was copied into Vercel.
const addressOverride = (process.env.NEXT_PUBLIC_ADDRESS ?? "").trim().replace(/^Dubai, United Arab Emirates$/i, "");

export const BRAND = {
  name: "OffplanDistress",
  tagline: "Dubai's marketplace for distressed off-plan units",
  description:
    "Buy Dubai off-plan below launch price. Owners who need out list their units; we verify the paperwork, match buyers and handle the developer NOC and DLD transfer.",
  // Licensed operator. Values come from the trade licence, the RERA office registration and the broker card;
  // each can be overridden with the NEXT_PUBLIC_* variable next to it (an empty variable keeps the default).
  company: "Felicity Properties L.L.C",
  companyAr: "فيليسيتي للعقارات ش.ذ.م.م",
  location: "Dubai, United Arab Emirates",
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL || "mouhannad@felicitypro.com",
  phone: process.env.NEXT_PUBLIC_CONTACT_PHONE || "+971 56 352 0611",
  /** Digits only, e.g. 9715XXXXXXXX */
  whatsapp: (process.env.NEXT_PUBLIC_WHATSAPP || "971563520611").replace(/\D/g, ""),
  /** RERA office registration number (ORN) */
  orn: process.env.NEXT_PUBLIC_RERA_ORN || "33951",
  /** Commercial licence number, issued by the Dubai Department of Economy and Tourism */
  licence: process.env.NEXT_PUBLIC_TRADE_LICENCE || "1145910",
  licenceAuthority: "Dubai Department of Economy and Tourism",
  licenceAuthorityAr: "دائرة الاقتصاد والسياحة في دبي",
  address: addressOverride || "Office 705, Building 12, Bay Square, Marasi Drive, Business Bay, Dubai, UAE",
  // A custom English address without an Arabic one is still shown on Arabic pages (better than the old office).
  addressAr:
    process.env.NEXT_PUBLIC_ADDRESS_AR ||
    addressOverride ||
    "مكتب 705، المبنى 12، باي سكوير، شارع مراسي، الخليج التجاري، دبي، الإمارات العربية المتحدة",
  mapsUrl: "https://www.google.com/maps/search/?api=1&query=Bay%20Square%20Building%2012%2C%20Marasi%20Drive%2C%20Business%20Bay%2C%20Dubai",
  /** The registered broker on every listing (RERA requires the BRN on property adverts). */
  broker: {
    name: process.env.NEXT_PUBLIC_BROKER_NAME || "Muhannad Al Nwilati Al Masri",
    nameAr: process.env.NEXT_PUBLIC_BROKER_NAME_AR || process.env.NEXT_PUBLIC_BROKER_NAME || "مهند النويلاتي المصري",
    brn: process.env.NEXT_PUBLIC_BROKER_BRN || "59244",
  },
};

/** UAE dirham is pegged to the US dollar (Central Bank of the UAE): 1 USD = 3.6725 AED. */
export const AED_PER_USD = 3.6725;

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
  /**
   * Share of the SPA price paid below which we warn that the developer may refuse a resale NOC. Most developers
   * ask for 30–50% and the rule depends on the developer, so we warn at the upper-middle of that range.
   * Used by the sell form and the exit calculator.
   */
  nocMinPaidPct: 0.4,
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
  "Object 1",
  "Tiger",
  "Reportage",
  "Leos",
  "Nshama",
  "Dubai Properties",
  "Arada",
  "Majid Al Futtaim",
  "Deyaar",
  "Taraf",
  "Prestige One",
  "Beyond",
  "Wasl",
  "Meydan",
  "Al Habtoor",
  // Keep "Other" last. Every name needs a `developer.<name>` entry (EN + AR) in src/i18n/messages/common.ts.
  "Other",
];

export const COMMUNITIES = [
  "Al Furjan",
  "Al Jaddaf",
  "Arjan",
  "Business Bay",
  "DAMAC Hills",
  "DAMAC Hills 2",
  "Damac Lagoons",
  "Downtown Dubai",
  "Dubai Creek Harbour",
  "Dubai Hills Estate",
  "Dubai Investment Park",
  "Dubai Islands",
  "Dubai Land Residence Complex",
  "Dubai Marina",
  "Dubai Maritime City",
  "Dubai Production City",
  "Dubai South",
  "Dubai Sports City",
  "Dubailand",
  "Emaar Beachfront",
  "Expo City",
  "Jumeirah Lake Towers",
  "Jumeirah Village Circle",
  "Jumeirah Village Triangle",
  "Majan",
  "Meydan",
  "Mohammed Bin Rashid City",
  "Motor City",
  "Palm Jumeirah",
  "Sobha Hartland",
  "The Oasis",
  "The Valley",
  "Town Square",
  // Keep "Other" last. Every name needs a `community.<name>` entry (EN + AR) in src/i18n/messages/common.ts.
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

export const OFFERS = {
  /**
   * When a seller accepts one offer, the unit's other open offers either stay on file as backups (true: they can't be
   * accepted while that deal runs, and become active again if the unit returns to the market) or are closed (false).
   * Either way those buyers are told. Offers still open when the unit is transferred are always closed.
   */
  keepBackups: true,
};

export const FILE_KINDS = {
  spa: "Sales & Purchase Agreement (SPA)",
  oqood: "Oqood certificate",
  soa: "Statement of account",
  id: "Passport / Emirates ID",
  photo: "Photo / render",
  other: "Other document",
} as const;

export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

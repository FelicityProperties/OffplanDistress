import { sql } from "drizzle-orm";
import {
  bigserial,
  boolean,
  customType,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

const bytea = customType<{ data: Buffer; driverData: Uint8Array | string }>({
  dataType() {
    return "bytea";
  },
  // hex literal works the same for node-postgres and the Neon HTTP driver
  toDriver(value) {
    return `\\x${value.toString("hex")}`;
  },
  fromDriver(value) {
    if (value instanceof Uint8Array) return Buffer.from(value);
    // neon-http returns bytea as a "\x..." hex string
    const hex = value.startsWith("\\x") ? value.slice(2) : value;
    return Buffer.from(hex, "hex");
  },
});

export const userRole = pgEnum("user_role", ["user", "admin"]);
export const userIntent = pgEnum("user_intent", ["buy", "sell", "both"]);
export const kycStatus = pgEnum("kyc_status", ["not_started", "pending", "verified"]);

export const listingStatus = pgEnum("listing_status", [
  "pending_review",
  "live",
  "under_offer",
  "noc_in_progress",
  "transferred",
  "paused",
  "rejected",
  "withdrawn",
]);

export const unitType = pgEnum("unit_type", [
  "studio",
  "1br",
  "2br",
  "3br",
  "4br",
  "5br",
  "townhouse",
  "villa",
  "penthouse",
]);

export const motivation = pgEnum("motivation", ["urgent", "motivated", "flexible"]);

export const offerStatus = pgEnum("offer_status", [
  "pending",
  "accepted",
  "declined",
  "countered",
  "withdrawn",
]);

export const financing = pgEnum("financing", ["cash", "mortgage"]);

export const fileKind = pgEnum("file_kind", ["spa", "oqood", "soa", "id", "photo", "other"]);

export const inquiryType = pgEnum("inquiry_type", ["info", "viewing", "contact"]);

export const leadMissed = pgEnum("lead_missed", ["none", "one", "more"]);
export const leadStatus = pgEnum("lead_status", ["new", "contacted", "converted", "lost"]);

/**
 * First-touch attribution from the visitor's browser session (src/lib/attribution.ts): campaign tags, a partner's
 * ?ref= code, the first page they landed on and the referring site's host. Kept in sessionStorage, not a cookie.
 */
export type Source = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  ref?: string;
  landing?: string;
  referrer_host?: string;
  /** The tab's anonymous analytics session (page_views.session_id), so /admin/analytics can show the pages viewed first. */
  sid?: string;
};

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    passwordHash: text("password_hash"),
    fullName: text("full_name").notNull(),
    phone: text("phone"),
    role: userRole("role").notNull().default("user"),
    intent: userIntent("intent").notNull().default("both"),
    kycStatus: kycStatus("kyc_status").notNull().default("not_started"),
    locale: text("locale").notNull().default("en"),
    /** When the user ticked "I agree to the Terms of Use and Privacy Policy" at sign-up; null for older accounts. */
    termsAcceptedAt: timestamp("terms_accepted_at", { withTimezone: true }),
    /**
     * The version of the Terms of Use (LEGAL_UPDATED in src/content/legal/brand.ts, e.g. "2026-10-26") the account last
     * agreed to: at sign-up, or when the seller confirms a listing our team entered. Null = agreed before consent was
     * versioned (terms_accepted_at still says when).
     */
    termsVersion: text("terms_version"),
    /** The admin who last set KYC to verified, and when (src/app/actions/admin.ts setKycStatus); null before 2026-10-26. */
    kycVerifiedBy: uuid("kyc_verified_by").references((): AnyPgColumn => users.id, { onDelete: "set null" }),
    kycVerifiedAt: timestamp("kyc_verified_at", { withTimezone: true }),
    /** How the visitor found us when they signed up; null for older accounts. */
    source: jsonb("source").$type<Source>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("users_email_idx").on(sql`lower(${t.email})`)],
);

export const sessions = pgTable(
  "sessions",
  {
    // sha256 of the cookie token; the raw token never touches the database
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export type PlanInstalment = { label: string; dueDate: string | null; amount: number };

export const listings = pgTable(
  "listings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    refNo: serial("ref_no").notNull(),
    sellerId: uuid("seller_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: listingStatus("status").notNull().default("pending_review"),
    verified: boolean("verified").notNull().default(false),
    nocEligible: boolean("noc_eligible").notNull().default(false),
    projectName: text("project_name").notNull(),
    developer: text("developer").notNull(),
    community: text("community").notNull(),
    /** The name the seller typed when they picked "Other" (developer / community stay "Other" until our team maps it). */
    developerOther: text("developer_other"),
    communityOther: text("community_other"),
    unitType: unitType("unit_type").notNull(),
    sizeSqft: integer("size_sqft").notNull(),
    floor: text("floor"),
    view: text("view"),
    // all money in whole AED
    originalPrice: integer("original_price").notNull(),
    amountPaid: integer("amount_paid").notNull(),
    askingPrice: integer("asking_price").notNull(),
    launchPrice: integer("launch_price"),
    handoverDate: date("handover_date"),
    nextInstalmentDate: date("next_instalment_date"),
    nextInstalmentAmount: integer("next_instalment_amount"),
    paymentPlan: jsonb("payment_plan").$type<PlanInstalment[]>().notNull().default([]),
    /**
     * Arrears on the developer's statement of account (whole AED): instalments past their due date and still unpaid —
     * part of the remaining balance — and the late fees charged on them. Developers want both cleared before the NOC,
     * so the buyer's cash on transfer day includes them (analyzeDeal / cashToCloseSql). Null = not known, 0 = none.
     * The seller may give the overdue amount in the sell form; our team enters both from the statement.
     */
    overdueAmount: integer("overdue_amount"),
    overduePenalty: integer("overdue_penalty"),
    /** Dubai date our team last checked the arrears with the developer; null = never (a seller's figure at most). */
    arrearsCheckedAt: date("arrears_checked_at"),
    motivation: motivation("motivation").notNull().default("motivated"),
    description: text("description"),
    images: text("images").array().notNull().default(sql`'{}'::text[]`),
    adminNotes: text("admin_notes"),
    /** DLD advertising permit (Trakheesi). RERA requires it on every property advert; set by our team. */
    dldPermit: text("dld_permit"),
    /** Last day the permit is valid (a Dubai date). The daily ops cron pauses a public listing once it has passed. */
    dldPermitExpiresAt: date("dld_permit_expires_at"),
    /** The permit's verification page on dubailand.gov.ae (what the Trakheesi QR code opens); shown with a QR code. */
    dldPermitUrl: text("dld_permit_url"),
    /** Last day of the seller's RERA Form A (listing agreement); the advert comes down with it, like the permit. */
    formAExpiresAt: date("form_a_expires_at"),
    /**
     * Permit / Form A notices the daily ops cron already sent the admins for the current expiry dates, e.g.
     * "permit:2026-11-02:week" (src/lib/permits.ts), so a repeated or missed run neither duplicates nor skips one.
     */
    expiryNotices: text("expiry_notices").array().notNull().default(sql`'{}'::text[]`),
    /** Asking price as last approved for the public advert; price-drop alerts compare against it on re-approval. */
    publicPrice: integer("public_price"),
    rejectionReason: text("rejection_reason"),
    isSample: boolean("is_sample").notNull().default(false),
    // set when our team pauses a listing, so the seller can't simply resume it
    pausedByAdmin: boolean("paused_by_admin").notNull().default(false),
    views: integer("views").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    /** Attribution of the session the listing was submitted in. */
    source: jsonb("source").$type<Source>(),
    /**
     * Entered by our team from documents the seller sent (WhatsApp intake, /admin/listings/new) rather than through the
     * sell form. Such a listing can't be approved until the seller confirms ownership through their claim link.
     */
    createdByStaff: boolean("created_by_staff").notNull().default(false),
    /**
     * When the seller confirmed they own the unit or are authorised to sell it, the documents are genuine and they agree
     * to the Terms: the sell form's last step, or the claim link for a listing our team created. Older rows: created_at.
     */
    ownershipConfirmedAt: timestamp("ownership_confirmed_at", { withTimezone: true }),
    /** The seller lead (free estimate) our team created this listing from, if any. */
    leadId: uuid("lead_id").references((): AnyPgColumn => sellerLeads.id, { onDelete: "set null" }),
    /** The Terms version (LEGAL_UPDATED) the seller agreed to when confirming ownership; null for older listings. */
    termsVersion: text("terms_version"),
  },
  (t) => [
    uniqueIndex("listings_ref_idx").on(t.refNo),
    index("listings_status_idx").on(t.status),
    index("listings_seller_idx").on(t.sellerId),
  ],
);

export const watchlist = pgTable(
  "watchlist",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    // asking price when the deal was saved, to surface price drops
    savedPrice: integer("saved_price").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.listingId] }), index("watchlist_listing_idx").on(t.listingId)],
);

export const offers = pgTable(
  "offers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    buyerId: uuid("buyer_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    amount: integer("amount").notNull(),
    financing: financing("financing").notNull().default("cash"),
    message: text("message"),
    status: offerStatus("status").notNull().default("pending"),
    counterAmount: integer("counter_amount"),
    /** When the buyer sent (or last revised) the offer, agreeing to the Terms, and which version (LEGAL_UPDATED). */
    termsAcceptedAt: timestamp("terms_accepted_at", { withTimezone: true }),
    termsVersion: text("terms_version"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("offers_listing_idx").on(t.listingId), index("offers_buyer_idx").on(t.buyerId)],
);

export const files = pgTable(
  "files",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    listingId: uuid("listing_id").references(() => listings.id, { onDelete: "cascade" }),
    uploaderId: uuid("uploader_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: fileKind("kind").notNull(),
    filename: text("filename").notNull(),
    mimeType: text("mime_type").notNull(),
    size: integer("size").notNull(),
    data: bytea("data").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("files_listing_idx").on(t.listingId)],
);

export const inquiries = pgTable(
  "inquiries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    listingId: uuid("listing_id").references(() => listings.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    type: inquiryType("type").notNull().default("info"),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    message: text("message"),
    handled: boolean("handled").notNull().default(false),
    source: jsonb("source").$type<Source>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("inquiries_listing_idx").on(t.listingId)],
);

export const savedSearches = pgTable(
  "saved_searches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    // URL query string for /deals, e.g. "community=Business+Bay&maxCash=500000"
    query: text("query").notNull(),
    alerts: boolean("alerts").notNull().default(true),
    // listings published after this are "new" for the next alert run
    lastAlertedAt: timestamp("last_alerted_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("saved_searches_user_idx").on(t.userId)],
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // machine-readable event, e.g. "offer.received" — see src/lib/notify.ts
    type: text("type").notNull(),
    title: text("title").notNull(),
    body: text("body"),
    href: text("href"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("notifications_user_idx").on(t.userId, t.createdAt)],
);

export const passwordResets = pgTable(
  "password_resets",
  {
    // sha256 of the emailed token
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    /**
     * "reset": the forgot-password email (1 hour). "claim": the link our team sends a seller whose listing they created
     * (7 days, src/lib/claim.ts), opened at /reset-password?claim=1. Neither page accepts the other's token.
     */
    purpose: text("purpose").notNull().default("reset"),
    /** The listing a "claim" token confirms ownership of. */
    listingId: uuid("listing_id").references(() => listings.id, { onDelete: "cascade" }),
  },
  (t) => [index("password_resets_user_idx").on(t.userId)],
);

/** Sliding-window rate limiting for login, sign-up, password resets and inquiries (see src/lib/throttle.ts). */
export const authAttempts = pgTable(
  "auth_attempts",
  {
    id: serial("id").primaryKey(),
    // e.g. "login:user@example.com" or "signup-ip:1.2.3.4"
    key: text("key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("auth_attempts_key_idx").on(t.key, t.createdAt)],
);

/**
 * Sellers who used the free estimate (src/components/sell/QuickEstimate.tsx) without an account, shown as L-123.
 * user_id is set when they sign up from the thank-you link, listing_id when they submit the full listing.
 */
export const sellerLeads = pgTable(
  "seller_leads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    refNo: serial("ref_no").notNull(),
    name: text("name").notNull(),
    phone: text("phone").notNull(),
    email: text("email"),
    locale: text("locale").notNull().default("en"),
    // A name from DEVELOPERS in config.ts, or the name the seller typed after picking "Other"
    developer: text("developer").notNull(),
    community: text("community"),
    project: text("project"),
    // whole AED
    spaPrice: integer("spa_price").notNull(),
    amountPaid: integer("amount_paid").notNull(),
    /** Today's price for a similar unit, when it came from the exit calculator; the estimate used it. */
    marketPrice: integer("market_price"),
    /** End date of the expected handover quarter, e.g. "2027-12-31" (same format as listings.handover_date). */
    handoverQuarter: text("handover_quarter").notNull(),
    missed: leadMissed("missed").notNull().default("none"),
    defaultNotice: boolean("default_notice").notNull().default(false),
    source: jsonb("source").$type<Source>(),
    status: leadStatus("status").notNull().default("new"),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    listingId: uuid("listing_id").references(() => listings.id, { onDelete: "set null" }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("seller_leads_ref_idx").on(t.refNo),
    index("seller_leads_status_idx").on(t.status, t.createdAt),
    index("seller_leads_user_idx").on(t.userId),
  ],
);

/**
 * First-party, cookieless visit statistics (src/lib/analytics.ts, collected by src/components/analytics/PageViewTracker.tsx
 * through POST /api/a). One row per page shown. No IP address, user agent or account is stored: visitors are told apart by
 * visitor_hash, a keyed hash of IP + user agent + the Dubai date that changes every day. Signed-in admins and devices
 * marked "ignore" are never recorded. Rows older than 13 months are deleted by the daily ops cron.
 */
export const pageViews = pgTable(
  "page_views",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    /** Random id the browser gives this page view, so the leave beacon can add the time spent on it. */
    viewId: uuid("view_id").notNull(),
    /** Random per browser tab (sessionStorage), renewed after 30 minutes without a page view. */
    sessionId: text("session_id").notNull(),
    /** Keyed HMAC-SHA256 of Dubai date + IP + user agent (src/lib/analytics.ts), 32 hex characters; rotates daily. */
    visitorHash: text("visitor_hash").notNull(),
    /** Path only, never the query string. */
    path: text("path").notNull(),
    /** Host of an external referring site, on the first page of a visit only. */
    referrerHost: text("referrer_host"),
    utmSource: text("utm_source"),
    utmMedium: text("utm_medium"),
    utmCampaign: text("utm_campaign"),
    /** A partner's ?ref= code. */
    ref: text("ref"),
    /** ISO country code and city from the hosting platform's IP geolocation (x-vercel-ip-country / -city). */
    country: text("country"),
    city: text("city"),
    /** "mobile" | "tablet" | "desktop" */
    device: text("device"),
    /** Browser family only, e.g. "Chrome", "Safari". */
    browser: text("browser"),
    /** Site language when the page was shown: "en" | "ar". */
    locale: text("locale"),
    /** Time the page was visible, set by the leave beacon (only ever increases, at most 30 minutes); null until then. */
    durationMs: integer("duration_ms"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("page_views_view_idx").on(t.viewId),
    index("page_views_created_idx").on(t.createdAt),
    index("page_views_session_idx").on(t.sessionId, t.createdAt),
    index("page_views_visitor_idx").on(t.visitorHash),
    index("page_views_path_idx").on(t.path),
  ],
);

/**
 * Follow-up nudges the daily ops cron already sent (src/lib/reminders.ts), so each goes out once even when runs
 * overlap or are repeated: the cron inserts the row first and only sends if the insert went in. entity_type is "user",
 * "listing" or "offer" (entity_id is then that row's id) or "digest" (entity_id is the Dubai date of the admins' daily
 * digest); kind names the nudge, e.g. "finish_listing:24h".
 */
export const reminders = pgTable(
  "reminders",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    kind: text("kind").notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("reminders_entity_kind_idx").on(t.entityType, t.entityId, t.kind)],
);

/**
 * The transaction file of one agreed deal (src/lib/deals.ts), from the accepted offer to the DLD transfer: the RERA
 * contracts (Form A seller–broker, Form B buyer–broker, Form F the MOU, Form I with a co-broker), the deposit, the
 * developer's NOC, the trustee appointment and our invoice. Opened when an offer is accepted (or lazily, from the
 * accepted offer, the first time our team opens a deal agreed before this table existed). A unit has at most one open
 * deal (cancelled_at null); one that falls through is kept with its reason. Dates are Dubai calendar dates; money is
 * whole AED. Only our team sees it; the parties see their milestone dates on their dashboards, never each other.
 */
export const deals = pgTable(
  "deals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    offerId: uuid("offer_id").references(() => offers.id, { onDelete: "set null" }),
    buyerId: uuid("buyer_id").references(() => users.id, { onDelete: "set null" }),
    sellerId: uuid("seller_id").references(() => users.id, { onDelete: "set null" }),
    /** What the buyer pays the seller for the equity paid in (as in Form F); prefilled from the accepted offer. */
    agreedPrice: integer("agreed_price"),
    /** agreed_price + the balance still owed to the developer (original_price − amount_paid): what our 2% is on. */
    saleValue: integer("sale_value"),
    formANo: text("form_a_no"),
    formASignedAt: date("form_a_signed_at"),
    formAExpiresAt: date("form_a_expires_at"),
    formBNo: text("form_b_no"),
    formBSignedAt: date("form_b_signed_at"),
    formFNo: text("form_f_no"),
    formFSignedAt: date("form_f_signed_at"),
    depositAmount: integer("deposit_amount"),
    /** "broker" | "seller" | "trustee" | "developer" | "other" */
    depositHeldBy: text("deposit_held_by"),
    cobrokerCompany: text("cobroker_company"),
    cobrokerOrn: text("cobroker_orn"),
    cobrokerBrn: text("cobroker_brn"),
    cobrokerFormINo: text("cobroker_form_i_no"),
    /** The co-broker's share of our commission, in whole percent (0–100). */
    cobrokerSplitPct: integer("cobroker_split_pct"),
    nocAppliedAt: date("noc_applied_at"),
    nocFee: integer("noc_fee"),
    nocIssuedAt: date("noc_issued_at"),
    nocValidUntil: date("noc_valid_until"),
    trusteeOffice: text("trustee_office"),
    transferBookedFor: date("transfer_booked_for"),
    transferredAt: date("transferred_at"),
    invoiceNo: text("invoice_no"),
    commissionPaidAt: date("commission_paid_at"),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    /** "relisted" (back on the market), "seller_withdrew" or "superseded" (a newer deal on the unit). */
    cancelReason: text("cancel_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("deals_open_listing_idx").on(t.listingId).where(sql`cancelled_at is null`),
    index("deals_listing_idx").on(t.listingId, t.createdAt),
    index("deals_buyer_idx").on(t.buyerId),
  ],
);

/** Our team's running notes on a deal file. */
export const dealNotes = pgTable(
  "deal_notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    dealId: uuid("deal_id")
      .notNull()
      .references(() => deals.id, { onDelete: "cascade" }),
    authorId: uuid("author_id").references(() => users.id, { onDelete: "set null" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("deal_notes_deal_idx").on(t.dealId, t.createdAt)],
);

/**
 * Who changed what (src/lib/audit.ts): every admin action, a seller's own status changes, answers to offers our team gave
 * on a seller's behalf, and documents opened by someone other than their uploader. diff holds the changed fields as
 * { field: [before, after] } (or a few facts about the event), never passwords, tokens or file contents. actor_id has no
 * foreign key on purpose: the record stays as it was even if the account is deleted. Rows are never updated or deleted.
 */
export const auditEvents = pgTable(
  "audit_events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    /** The signed-in user who did it; null for the system (cron). */
    actorId: uuid("actor_id"),
    /** e.g. "listing.update", "deal.update", "file.view" */
    action: text("action").notNull(),
    /** "listing" | "deal" | "offer" | "file" | "user" | "inquiry" | "lead" | "export" */
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    diff: jsonb("diff").$type<Record<string, unknown>>(),
    /** clientIp() of the request (x-forwarded-for on Vercel). */
    ip: text("ip"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("audit_events_entity_idx").on(t.entityType, t.entityId, t.createdAt),
    index("audit_events_actor_idx").on(t.actorId, t.createdAt),
  ],
);

export type User = typeof users.$inferSelect;
export type Listing = typeof listings.$inferSelect;
export type Offer = typeof offers.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type SellerLead = typeof sellerLeads.$inferSelect;
export type Deal = typeof deals.$inferSelect;

import { sql } from "drizzle-orm";
import {
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
    motivation: motivation("motivation").notNull().default("motivated"),
    description: text("description"),
    images: text("images").array().notNull().default(sql`'{}'::text[]`),
    adminNotes: text("admin_notes"),
    rejectionReason: text("rejection_reason"),
    isSample: boolean("is_sample").notNull().default(false),
    views: integer("views").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
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
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("saved_searches_user_idx").on(t.userId)],
);

export type User = typeof users.$inferSelect;
export type Listing = typeof listings.$inferSelect;
export type Offer = typeof offers.$inferSelect;

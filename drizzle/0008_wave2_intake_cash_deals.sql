CREATE TABLE "audit_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"actor_id" uuid,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"diff" jsonb,
	"ip" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deal_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deal_id" uuid NOT NULL,
	"author_id" uuid,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid NOT NULL,
	"offer_id" uuid,
	"buyer_id" uuid,
	"seller_id" uuid,
	"agreed_price" integer,
	"sale_value" integer,
	"form_a_no" text,
	"form_a_signed_at" date,
	"form_a_expires_at" date,
	"form_b_no" text,
	"form_b_signed_at" date,
	"form_f_no" text,
	"form_f_signed_at" date,
	"deposit_amount" integer,
	"deposit_held_by" text,
	"cobroker_company" text,
	"cobroker_orn" text,
	"cobroker_brn" text,
	"cobroker_form_i_no" text,
	"cobroker_split_pct" integer,
	"noc_applied_at" date,
	"noc_fee" integer,
	"noc_issued_at" date,
	"noc_valid_until" date,
	"trustee_office" text,
	"transfer_booked_for" date,
	"transferred_at" date,
	"invoice_no" text,
	"commission_paid_at" date,
	"cancelled_at" timestamp with time zone,
	"cancel_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reminders" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"kind" text NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "overdue_amount" integer;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "overdue_penalty" integer;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "arrears_checked_at" date;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "created_by_staff" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "ownership_confirmed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "lead_id" uuid;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "terms_version" text;--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN "terms_accepted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN "terms_version" text;--> statement-breakpoint
ALTER TABLE "password_resets" ADD COLUMN "purpose" text DEFAULT 'reset' NOT NULL;--> statement-breakpoint
ALTER TABLE "password_resets" ADD COLUMN "listing_id" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "terms_version" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "kyc_verified_by" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "kyc_verified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "deal_notes" ADD CONSTRAINT "deal_notes_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_notes" ADD CONSTRAINT "deal_notes_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_buyer_id_users_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_seller_id_users_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_events_entity_idx" ON "audit_events" USING btree ("entity_type","entity_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_events_actor_idx" ON "audit_events" USING btree ("actor_id","created_at");--> statement-breakpoint
CREATE INDEX "deal_notes_deal_idx" ON "deal_notes" USING btree ("deal_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "deals_open_listing_idx" ON "deals" USING btree ("listing_id") WHERE cancelled_at is null;--> statement-breakpoint
CREATE INDEX "deals_listing_idx" ON "deals" USING btree ("listing_id","created_at");--> statement-breakpoint
CREATE INDEX "deals_buyer_idx" ON "deals" USING btree ("buyer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reminders_entity_kind_idx" ON "reminders" USING btree ("entity_type","entity_id","kind");--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_lead_id_seller_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."seller_leads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_resets" ADD CONSTRAINT "password_resets_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_kyc_verified_by_users_id_fk" FOREIGN KEY ("kyc_verified_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
-- Every listing created before staff intake came through the sell form, where the seller confirmed ownership and authority: that confirmation is its creation date. Staff-created listings stay unconfirmed until the seller claims them.
UPDATE "listings" SET "ownership_confirmed_at" = "created_at" WHERE "ownership_confirmed_at" IS NULL AND NOT "created_by_staff";

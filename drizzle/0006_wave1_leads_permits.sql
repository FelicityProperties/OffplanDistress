CREATE TYPE "public"."lead_missed" AS ENUM('none', 'one', 'more');--> statement-breakpoint
CREATE TYPE "public"."lead_status" AS ENUM('new', 'contacted', 'converted', 'lost');--> statement-breakpoint
CREATE TABLE "seller_leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ref_no" serial NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"locale" text DEFAULT 'en' NOT NULL,
	"developer" text NOT NULL,
	"community" text,
	"project" text,
	"spa_price" integer NOT NULL,
	"amount_paid" integer NOT NULL,
	"market_price" integer,
	"handover_quarter" text NOT NULL,
	"missed" "lead_missed" DEFAULT 'none' NOT NULL,
	"default_notice" boolean DEFAULT false NOT NULL,
	"source" jsonb,
	"status" "lead_status" DEFAULT 'new' NOT NULL,
	"user_id" uuid,
	"listing_id" uuid,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "inquiries" ADD COLUMN "source" jsonb;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "developer_other" text;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "community_other" text;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "dld_permit_expires_at" date;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "dld_permit_url" text;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "form_a_expires_at" date;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "expiry_notices" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "source" jsonb;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "source" jsonb;--> statement-breakpoint
ALTER TABLE "seller_leads" ADD CONSTRAINT "seller_leads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_leads" ADD CONSTRAINT "seller_leads_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "seller_leads_ref_idx" ON "seller_leads" USING btree ("ref_no");--> statement-breakpoint
CREATE INDEX "seller_leads_status_idx" ON "seller_leads" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "seller_leads_user_idx" ON "seller_leads" USING btree ("user_id");
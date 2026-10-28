ALTER TABLE "listings" ADD COLUMN "permit_attested_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "permit_attested_by" uuid;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_permit_attested_by_users_id_fk" FOREIGN KEY ("permit_attested_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
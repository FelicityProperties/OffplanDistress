ALTER TABLE "listings" ADD COLUMN "public_price" integer;--> statement-breakpoint
-- The advertised price as it stands today, for price-drop alerts after a seller edit is re-approved.
UPDATE "listings" SET "public_price" = "asking_price" WHERE "status" IN ('live', 'under_offer', 'noc_in_progress', 'paused');--> statement-breakpoint
-- RERA: no property advert without a DLD (Trakheesi) permit. Real listings that went live before permits were
-- recorded come off the market (paused by our team) until a permit number is entered in the admin editor.
UPDATE "listings" SET "status" = 'paused', "paused_by_admin" = true, "updated_at" = now()
WHERE "status" = 'live' AND NOT "is_sample" AND "dld_permit" IS NULL;

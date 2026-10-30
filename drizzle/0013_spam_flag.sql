ALTER TABLE "inquiries" ADD COLUMN "spam" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "inquiries" ADD COLUMN "spam_reason" text;--> statement-breakpoint
-- Backfill: the SEO-scam enquiries already in the inbox move to the admin's Spam tab (same wording test as
-- src/lib/spam.ts, applied once to rows that predate the content score).
UPDATE "inquiries" SET "spam" = true, "spam_reason" = 'wording: seo scam (backfilled)'
WHERE "spam" = false AND "message" ~* '(google.s index|(site|website|domain) into google|index(ed|ing)? (your|the) (web)?site|seo (service|package|expert|audit)|backlinks?|domain authority|rank(ing)? (on|in) google|page 1 of google)';

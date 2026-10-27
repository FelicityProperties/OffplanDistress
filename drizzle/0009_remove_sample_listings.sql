-- The 16 demo listings marked "Sample" come off the live marketplace: real deals replace them. Their offers, watchers,
-- files and viewing requests go with them (foreign keys cascade). scripts/migrate.mjs never seeds them again once they were
-- seeded (the sample seller account stays as that marker).
DELETE FROM "listings" WHERE "is_sample" = true;

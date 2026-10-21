// Runs before `next build` on Vercel: applies pending SQL migrations from ./drizzle to the
// Neon database, then seeds sample listings into an empty marketplace.
// Skips quietly when no database URL is configured (e.g. a local build without .env).
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

// Load .env.local / .env for local runs (Vercel injects env vars itself).
for (const file of [".env.local", ".env"]) {
  try {
    const text = await readFile(path.join(root, file), "utf8");
    for (const line of text.split("\n")) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
      if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {}
}

// `||`, not `??`: a variable added in Vercel with an empty value must not hide the next one.
const url =
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL;

if (!url) {
  if (process.env.VERCEL_ENV === "production") {
    // Going live without a database would publish a site whose every page errors; fail the build so the
    // previous deployment stays live instead.
    console.error(
      "[migrate] No DATABASE_URL in the Vercel Production environment. " +
        "Connect the Neon database to Production under Storage → Connect Project, then redeploy.",
    );
    process.exit(1);
  }
  // Previews may deliberately have no database (Neon connected to Production only).
  console.warn("[migrate] No DATABASE_URL set — skipping migrations.");
  process.exit(0);
}

const local = /localhost|127\.0\.0\.1/.test(url);
const pool = new pg.Pool({ connectionString: url, ssl: !local, max: 1 });

try {
  const db = drizzle(pool);
  const migrationsFolder = path.join(root, "drizzle");
  try {
    await migrate(db, { migrationsFolder });
  } catch (err) {
    // A preview and a production build can start together against the same database; the loser of
    // that race sees "already exists". Pending migrations run in one transaction, so retrying is safe.
    console.warn(`[migrate] Migration failed (${err.message}); retrying once in 5s.`);
    await new Promise((resolve) => setTimeout(resolve, 5000));
    await migrate(db, { migrationsFolder });
  }
  console.log("[migrate] Database schema is up to date.");

  if (process.env.VERCEL_ENV === "preview") {
    // Preview builds may share the production database, possibly with a different (or no) ADMIN_PASSWORD:
    // only production builds manage the owner login.
    console.log("[migrate] Preview build — owner login left unchanged.");
  } else {
    await ensureOwners(pool);
  }

  if (process.env.SEED_SAMPLE_DATA !== "false") {
    await seedSamples(pool);
  }
} catch (err) {
  console.error("[migrate] Failed:", err);
  process.exitCode = 1;
} finally {
  await pool.end();
}

// Owner logins come from env, never from public sign-up: ADMIN_PASSWORD (set in Vercel) is the source of
// truth, so whoever controls the Vercel project controls the admin account — even if someone registered
// the email first.
async function ensureOwners(pool) {
  const emails = (process.env.ADMIN_EMAILS || "mouhannad@felicitypro.com")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const password = process.env.ADMIN_PASSWORD ?? "";
  if (password.length < 10) {
    // Owner logins must only ever work with the ADMIN_PASSWORD hash: lock any existing owner row
    // (e.g. one registered by someone else before sign-up blocked these emails).
    const locked = await pool.query("update users set password_hash = null where lower(email) = any($1) returning id", [emails]);
    if (locked.rowCount) {
      await pool.query("delete from sessions where user_id = any($1)", [locked.rows.map((r) => r.id)]);
    }
    console.warn(
      `[migrate] ADMIN_PASSWORD is not set (or shorter than 10 characters) — the owner login for ${emails.join(", ")} ` +
        "is locked until you add it in Vercel → Settings → Environment Variables and redeploy.",
    );
    return;
  }
  const { default: bcrypt } = await import("bcryptjs");
  for (const email of emails) {
    const { rows } = await pool.query("select id, password_hash from users where lower(email) = $1", [email]);
    if (rows.length === 0) {
      await pool.query(
        `insert into users (email, full_name, password_hash, role, intent, kyc_status)
         values ($1, $2, $3, 'admin', 'both', 'verified')`,
        [email, "Admin", await bcrypt.hash(password, 10)],
      );
      console.log(`[migrate] Created owner login for ${email}.`);
      continue;
    }
    const { id, password_hash: hash } = rows[0];
    const matches = hash ? await bcrypt.compare(password, hash) : false;
    if (!matches) {
      await pool.query("update users set password_hash = $2, role = 'admin' where id = $1", [id, await bcrypt.hash(password, 10)]);
      await pool.query("delete from sessions where user_id = $1", [id]);
      console.log(`[migrate] Owner password for ${email} set from ADMIN_PASSWORD (other sessions signed out).`);
    } else {
      await pool.query("update users set role = 'admin' where id = $1 and role <> 'admin'", [id]);
    }
  }
}

async function seedSamples(pool) {
  const { rows } = await pool.query("select count(*)::int as n from listings");
  if (rows[0].n > 0) return;

  const samples = JSON.parse(await readFile(path.join(root, "scripts", "sample-listings.json"), "utf8"));
  const client = await pool.connect();
  try {
    await client.query("begin");
    const seller = await client.query(
      `insert into users (email, full_name, role, intent)
       values ('sample-seller@offplandistress.invalid', 'Sample Seller', 'user', 'sell')
       on conflict do nothing
       returning id`,
    );
    const sellerId =
      seller.rows[0]?.id ??
      (await client.query("select id from users where email = 'sample-seller@offplandistress.invalid'")).rows[0].id;

    for (const s of samples) {
      await client.query(
        `insert into listings (
           seller_id, status, verified, noc_eligible, project_name, developer, community, unit_type,
           size_sqft, floor, view, original_price, amount_paid, asking_price, launch_price,
           handover_date, next_instalment_date, next_instalment_amount, payment_plan, motivation,
           description, images, is_sample, views, published_at, created_at
         ) values (
           $1, 'live', true, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
           $14, $15, $16, $17, $18, $19, $20, true, $21, now() - ($22 || ' days')::interval, now() - ($22 || ' days')::interval
         )`,
        [
          sellerId,
          s.nocEligible,
          s.projectName,
          s.developer,
          s.community,
          s.unitType,
          s.sizeSqft,
          s.floor,
          s.view,
          s.originalPrice,
          s.amountPaid,
          s.askingPrice,
          s.launchPrice,
          s.handoverDate,
          s.nextInstalmentDate,
          s.nextInstalmentAmount,
          JSON.stringify(s.paymentPlan),
          s.motivation,
          s.description,
          s.images,
          s.views,
          String(s.ageDays),
        ],
      );
    }
    await client.query("commit");
    console.log(`[migrate] Seeded ${samples.length} sample listings (marked "Sample").`);
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }
}

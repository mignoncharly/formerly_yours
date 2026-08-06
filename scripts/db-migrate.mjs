// Apply supabase/migrations/*.sql to the linked Postgres database.
//
// Docker-less, CLI-independent migration runner. Records applied versions in
// supabase_migrations.schema_migrations (the same table the Supabase CLI uses),
// so `supabase db push` stays consistent if used later.
//
// Connection: reads SUPABASE_DB_* from the environment, else parses the local
// (git-ignored) docs/supabase_access.md. Never prints secret values.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";
import pg from "pg";

function parseKV(file) {
  const out = {};
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const i = line.indexOf("=");
    if (i === -1) continue;
    out[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return out;
}

function resolveConnection() {
  // Prefer explicit env (e.g. pooler URL) if provided.
  if (process.env.SUPABASE_DB_URL) {
    return { connectionString: process.env.SUPABASE_DB_URL };
  }
  const secretsFile = process.env.OWY_SECRETS_FILE ?? "docs/supabase_access.md";
  if (!existsSync(secretsFile)) {
    throw new Error(
      `No SUPABASE_DB_URL and secrets file not found: ${secretsFile}`,
    );
  }
  const kv = parseKV(secretsFile);
  const ref = kv.project_id;
  const password = kv.supabase_password;
  if (!ref || !password) {
    throw new Error("Could not resolve project_id / supabase_password.");
  }
  const host = process.env.SUPABASE_DB_HOST ?? `db.${ref}.supabase.co`;
  const user = process.env.SUPABASE_DB_USER ?? "postgres";
  return {
    host,
    port: Number(process.env.SUPABASE_DB_PORT ?? 5432),
    user,
    password,
    database: "postgres",
    ssl: { rejectUnauthorized: false },
  };
}

async function main() {
  const conn = resolveConnection();
  const client = new pg.Client({ ...conn, connectionTimeoutMillis: 20000 });
  await client.connect();
  console.log("connected to database");

  await client.query("create schema if not exists supabase_migrations");
  await client.query(
    `create table if not exists supabase_migrations.schema_migrations (
       version text primary key,
       name text,
       statements text[]
     )`,
  );

  const applied = new Set(
    (
      await client.query("select version from supabase_migrations.schema_migrations")
    ).rows.map((r) => r.version),
  );

  const dir = "supabase/migrations";
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  let count = 0;
  for (const file of files) {
    const version = file.split("_")[0];
    if (applied.has(version)) {
      console.log(`skip   ${file} (already applied)`);
      continue;
    }
    const sql = readFileSync(path.join(dir, file), "utf8");
    await client.query("begin");
    try {
      await client.query(sql);
      await client.query(
        "insert into supabase_migrations.schema_migrations(version, name) values ($1, $2)",
        [version, file],
      );
      await client.query("commit");
      console.log(`apply  ${file}`);
      count++;
    } catch (err) {
      await client.query("rollback");
      console.error(`FAILED ${file}: ${err.message}`);
      throw err;
    }
  }

  await client.end();
  console.log(count === 0 ? "already up to date" : `done — applied ${count} migration(s)`);
}

main().catch((err) => {
  console.error("migration error:", err.message);
  process.exit(1);
});

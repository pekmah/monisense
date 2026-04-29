import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

import postgres from "postgres";

import { env } from "../lib/config.js";

const databaseUrl = env.DATABASE_ADMIN_URL ?? env.DATABASE_URL;
const sql = postgres(databaseUrl, {
  max: 1,
  idle_timeout: 20,
});

const migrationsFolder = join(process.cwd(), "src/db/migrations");
const entries = await readdir(migrationsFolder, {
  withFileTypes: true,
});

const migrationFiles = entries
  .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
  .map((entry) => entry.name)
  .sort();

for (const fileName of migrationFiles) {
  const sqlText = await readFile(join(migrationsFolder, fileName), "utf8");
  if (sqlText.trim() === "") continue;
  await sql.unsafe(sqlText);
}

await sql.end();

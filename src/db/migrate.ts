import { migrate } from "drizzle-orm/postgres-js/migrator";

import { env } from "../lib/config.js";
import { createDb } from "./client.js";

const db = createDb(env.DATABASE_ADMIN_URL ?? env.DATABASE_URL);

await migrate(db, {
  migrationsFolder: "src/db/migrations",
});

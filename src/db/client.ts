import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "@/db/schema";
import { loadDbEnv } from "@/lib/env";

const env = loadDbEnv({
  DATABASE_URL: process.env.DATABASE_URL,
});
const pool = new Pool({
  connectionString: env.DATABASE_URL
});

export const db = drizzle(pool, { schema });

import type { D1DatabaseLike } from "@worker/types";
import { INIT_SQL } from "@worker/db/schema.sql";

function splitSqlStatements(sql: string): string[] {
  return sql
    .split(";")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `${line};`);
}

export async function runMigrations(db: D1DatabaseLike): Promise<number> {
  const statements = splitSqlStatements(INIT_SQL);
  for (const statement of statements) {
    await db.prepare(statement).run();
  }
  return statements.length;
}

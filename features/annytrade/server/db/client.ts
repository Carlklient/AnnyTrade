import postgres from "postgres";

let sql: ReturnType<typeof postgres> | null = null;

export function getDatabaseUrl(): string | undefined {
  const url = process.env.ANNYTRADE_DATABASE_URL ?? process.env.DATABASE_URL;
  return url && url.length > 0 ? url : undefined;
}

export function requireDatabaseUrl(): string {
  const url = getDatabaseUrl();
  if (!url) {
    throw new Error(
      "AnnyTrade database is not configured. Set ANNYTRADE_DATABASE_URL or DATABASE_URL.",
    );
  }
  return url;
}

export function getSql() {
  if (!sql) {
    sql = postgres(requireDatabaseUrl(), {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false,
    });
  }
  return sql;
}

export async function closeSql() {
  if (sql) {
    await sql.end({ timeout: 5 });
    sql = null;
  }
}

export type Sql = ReturnType<typeof getSql>;

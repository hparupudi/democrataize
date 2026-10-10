import { Pool, type QueryResultRow } from "pg";
import { requireTigerDataUrl } from "./env";

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: requireTigerDataUrl(),
      ssl: { rejectUnauthorized: false },
      max: 8,
    });
  }
  return pool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<T[]> {
  const result = await getPool().query<T>(text, params);
  return result.rows;
}

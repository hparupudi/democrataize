import { Pool, type QueryResultRow } from "pg";
import { requireTigerDataUrl } from "./env";

let pool: Pool | null = null;

/**
 * node-postgres drops Pool `ssl` options when the connection string contains
 * sslmode / sslrootcert / sslcert / sslkey. TigerData URLs usually include
 * sslmode=require, which then fails on their initial self-signed cert with
 * "self-signed certificate in certificate chain". Strip those params and
 * force rejectUnauthorized: false for local/dev connections.
 */
function connectionConfig() {
  const raw = requireTigerDataUrl();
  const url = new URL(raw);
  for (const key of ["sslmode", "sslrootcert", "sslcert", "sslkey"]) {
    url.searchParams.delete(key);
  }
  return {
    connectionString: url.toString(),
    ssl: { rejectUnauthorized: false },
    max: 8,
  };
}

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool(connectionConfig());
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

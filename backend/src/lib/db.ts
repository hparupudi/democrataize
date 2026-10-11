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
function stripSslQueryParams(connectionString: string): string {
  const qIndex = connectionString.indexOf("?");
  if (qIndex < 0) return connectionString;
  const base = connectionString.slice(0, qIndex);
  const query = connectionString.slice(qIndex + 1);
  const kept = query.split("&").filter((part) => {
    const key = part.split("=")[0]?.toLowerCase();
    return Boolean(key) && !["sslmode", "sslrootcert", "sslcert", "sslkey"].includes(key);
  });
  return kept.length ? `${base}?${kept.join("&")}` : base;
}

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: stripSslQueryParams(requireTigerDataUrl()),
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

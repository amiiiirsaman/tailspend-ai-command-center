// TailSpend AI — DuckDB-WASM Service
// Initializes DuckDB in the browser and loads supplier data as a queryable table.
// Uses the jsdelivr CDN bundles (no local WASM files needed).

import * as duckdb from "@duckdb/duckdb-wasm";
import type { Supplier } from "@/contexts/DataContext";

let db: duckdb.AsyncDuckDB | null = null;
let conn: duckdb.AsyncDuckDBConnection | null = null;
let loadedDataHash: string | null = null;

const BUNDLES = duckdb.getJsDelivrBundles();

export async function initDuckDB(): Promise<duckdb.AsyncDuckDB> {
  if (db) return db;
  const bundle = await duckdb.selectBundle(BUNDLES);
  const worker_url = URL.createObjectURL(
    new Blob([`importScripts("${bundle.mainWorker!}");`], { type: "text/javascript" })
  );
  const worker = new Worker(worker_url);
  const logger = new duckdb.ConsoleLogger(duckdb.LogLevel.WARNING);
  db = new duckdb.AsyncDuckDB(logger, worker);
  await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
  URL.revokeObjectURL(worker_url);
  return db;
}

export async function getConnection(): Promise<duckdb.AsyncDuckDBConnection> {
  if (!db) await initDuckDB();
  if (!conn) conn = await db!.connect();
  return conn;
}

// Load supplier data into DuckDB as the "suppliers" table.
// Re-creates the table only when the data changes (keyed by supplier count + total spend).
export async function loadSuppliers(suppliers: Supplier[]): Promise<void> {
  const hash = `${suppliers.length}_${suppliers.reduce((s, x) => s + x.total_spend, 0).toFixed(0)}`;
  if (loadedDataHash === hash) return; // already loaded

  const c = await getConnection();

  // Drop and recreate
  await c.query(`DROP TABLE IF EXISTS suppliers`);

  // Build CSV in memory
  const header = [
    "vendor_name", "cleansed_name", "l1", "l2", "total_spend",
    "tiering", "alaska", "hawaii", "overlapping",
    "confidence", "evidence_tier", "review_flag",
    "savings_levers", "contract_structure", "what_they_do",
    "consolidation_note",
  ].join(",");

  const escape = (v: unknown) => {
    if (v === null || v === undefined) return "";
    const s = String(v).replace(/"/g, '""');
    return `"${s}"`;
  };

  const rows = suppliers.map(s =>
    [
      escape(s.vendor_name),
      escape(s.cleansed_name),
      escape(s.l1),
      escape(s.l2),
      s.total_spend,
      escape(s.tiering),
      s.alaska ?? 0,
      s.hawaii ?? 0,
      s.overlapping ? 1 : 0,
      escape(s.confidence),
      escape(s.evidence_tier),
      s.review_flag ? 1 : 0,
      escape(s.savings_levers.join("; ")),
      escape(s.contract_structure),
      escape(s.what_they_do),
      escape(s.consolidation_note),
    ].join(",")
  );

  const csv = [header, ...rows].join("\n");

  // Register as virtual file and read
  await db!.registerFileText("suppliers.csv", csv);
  await c.query(`
    CREATE TABLE suppliers AS
    SELECT * FROM read_csv_auto('suppliers.csv', header=true)
  `);

  loadedDataHash = hash;
}

export async function runQuery(sql: string): Promise<{ columns: string[]; rows: Record<string, unknown>[] }> {
  const c = await getConnection();
  const result = await c.query(sql);
  const columns = result.schema.fields.map(f => f.name);
  const rows: Record<string, unknown>[] = [];
  for (const batch of result.batches) {
    for (let i = 0; i < batch.numRows; i++) {
      const row: Record<string, unknown> = {};
      columns.forEach((col, j) => {
        const val = batch.getChildAt(j)?.get(i);
        // BigInt → Number for JSON-safe serialization downstream (e.g. JSON.stringify
        // in the agent pipeline). `instanceof BigInt` is always false for primitive
        // bigints; must use typeof.
        row[col] = typeof val === "bigint" ? Number(val) : val;
      });
      rows.push(row);
    }
  }
  return { columns, rows };
}

export function getSchema(): string {
  return `
TABLE: suppliers
COLUMNS:
  vendor_name     VARCHAR  -- supplier name
  cleansed_name   VARCHAR  -- normalized supplier name
  l1              VARCHAR  -- L1 procurement category (e.g. 'Information Technology')
  l2              VARCHAR  -- L2 sub-category
  total_spend     DOUBLE   -- total spend in dollars
  tiering         VARCHAR  -- spend tier: '<$50K', '$50K-$100K', '$100K - $250K', '$250K - $500K', '$500K+'
  alaska          DOUBLE   -- Alaska Airlines spend (0 if not applicable)
  hawaii          DOUBLE   -- Hawaiian Airlines spend (0 if not applicable)
  overlapping     INTEGER  -- 1 if supplier serves both airlines, 0 otherwise
  confidence      VARCHAR  -- AI confidence: 'High', 'Medium', 'Low'
  evidence_tier   VARCHAR  -- source quality: 'A', 'B', 'C' (or 'Tier A' etc.)
  review_flag     INTEGER  -- 1 if flagged for review, 0 otherwise
  savings_levers  VARCHAR  -- semicolon-separated list of savings levers
  contract_structure VARCHAR -- contract type description
  what_they_do    VARCHAR  -- AI-generated supplier description
  consolidation_note VARCHAR -- AI consolidation recommendation

NOTES:
  - All spend values are in USD
  - Use ILIKE for case-insensitive text matching
  - savings_levers is a text field; use ILIKE '%competitive bid%' to filter
  - tiering values use exact strings like '<$50K' (with dollar sign and angle bracket)
  - Always LIMIT results to 50 rows maximum unless counting
  - For aggregations, use SUM(total_spend), COUNT(*), AVG(total_spend)
`.trim();
}

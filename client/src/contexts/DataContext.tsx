// TailSpend AI — DataContext
// Holds parsed Excel data and makes it available to all pages.
// When no file is uploaded the context returns null so the app
// redirects to the Upload page.

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import * as XLSX from "xlsx";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Supplier {
  vendor_name: string;
  cleansed_name: string;
  l1: string;
  l2: string;
  total_spend: number;
  tiering: string;
  hawaii: number | null;
  alaska: number | null;
  overlapping: boolean;
  what_they_do: string;
  savings_levers: string[];
  competitors_in_spend: string[];
  market_competitors: string[];
  contract_structure: string;
  confidence: string;
  research_basis: string;
  review_flag: boolean;
  consolidation_note: string;
  source_urls: string[];
  evidence_tier: string;
}

export interface DataSummary {
  total_spend: number;
  total_count: number;
  high_confidence_count: number;
  review_flag_count: number;
  alaska_spend: number;
  hawaii_spend: number;
  l1_spend: Record<string, number>;
  l1_count: Record<string, number>;
  l2_spend: Record<string, Record<string, number>>;
  tiering_counts: Record<string, number>;
  confidence_counts: Record<string, number>;
  evidence_counts: Record<string, number>;
  top_levers: Record<string, number>;
  file_name: string;
  uploaded_at: string;
}

export interface TailSpendData {
  suppliers: Supplier[];
  summary: DataSummary;
}

// ─── Column name normalizer ───────────────────────────────────────────────────

function norm(s: unknown): string {
  return String(s ?? "").toLowerCase().trim().replace(/\s+/g, " ");
}

// Maps flexible column names → canonical field names
const COL_MAP: Record<string, keyof Supplier | "__skip__"> = {
  "vendor name": "vendor_name",
  "cleansed vendor name": "cleansed_name",
  "l1": "l1",
  "l2": "l2",
  "total spend": "total_spend",
  "supplier tiering": "tiering",
  "hawaii airlines": "__skip__",
  "hawaiian airlines": "__skip__",
  "alaska airlines": "__skip__",
  "overlapping": "overlapping",
  "al": "alaska",
  "ha": "hawaii",
  "what they do": "what_they_do",
  "top 3 savings levers": "savings_levers",
  "competitors within spend": "competitors_in_spend",
  "market competitors": "market_competitors",
  "ai contract structure": "contract_structure",
  "contract structure": "contract_structure",
  "ai confidence": "confidence",
  "confidence": "confidence",
  "ai research basis": "research_basis",
  "research basis": "research_basis",
  "ai review flag": "review_flag",
  "review flag": "review_flag",
  "ai potential consolidation review": "consolidation_note",
  "exact urls leveraged for study": "source_urls",
  "evidence tier": "evidence_tier",
};

function parseLevers(raw: unknown): string[] {
  if (!raw) return [];
  return String(raw)
    .split(/[;,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseCompetitors(raw: unknown): string[] {
  if (!raw) return [];
  // "ACME ($123,456); OTHER ($789)" → ["ACME", "OTHER"]
  return String(raw)
    .split(/[;,\n]/)
    .map((s) => s.replace(/\s*\(.*?\)/, "").trim())
    .filter(Boolean);
}

function parseUrls(raw: unknown): string[] {
  if (!raw) return [];
  return String(raw)
    .split(/[;\n]/)
    .map((s) => s.trim())
    .filter((s) => s.startsWith("http"));
}

function parseNum(raw: unknown): number {
  if (raw === null || raw === undefined || raw === "") return 0;
  const n = Number(raw);
  return isNaN(n) ? 0 : n;
}

function parseBool(raw: unknown): boolean {
  if (!raw) return false;
  const s = String(raw).toLowerCase().trim();
  return s === "yes" || s === "true" || s === "1" || s === "y";
}

// ─── Main parser ─────────────────────────────────────────────────────────────

function findDataSheet(wb: XLSX.WorkBook): XLSX.WorkSheet | null {
  // Prefer sheets that look like data sheets
  const preferred = ["ai enriched tail spend", "updated tail spend", "tail spend", "data", "sheet1"];
  for (const name of wb.SheetNames) {
    if (preferred.includes(name.toLowerCase().trim())) {
      return wb.Sheets[name];
    }
  }
  // Fallback: first sheet with >10 rows
  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    const range = XLSX.utils.decode_range(ws["!ref"] || "A1:A1");
    if (range.e.r > 10) return ws;
  }
  return null;
}

export function parseExcelFile(buffer: ArrayBuffer, fileName: string): TailSpendData {
  const wb = XLSX.read(buffer, { type: "array" });
  const ws = findDataSheet(wb);
  if (!ws) throw new Error("Could not find a data sheet in this workbook.");

  const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
  if (rows.length < 2) throw new Error("Sheet appears to be empty.");

  // Build column index map
  const headerRow = rows[0] as unknown[];
  const colIndex: Record<string, number> = {};
  headerRow.forEach((h, i) => {
    const key = norm(h);
    if (COL_MAP[key] && COL_MAP[key] !== "__skip__") {
      colIndex[COL_MAP[key] as string] = i;
    }
  });

  const required = ["vendor_name", "total_spend"];
  for (const r of required) {
    if (colIndex[r] === undefined) {
      throw new Error(`Required column "${r}" not found. Make sure you're uploading a TailSpend output file.`);
    }
  }

  const get = (row: unknown[], field: string) =>
    colIndex[field] !== undefined ? row[colIndex[field]] : null;

  const suppliers: Supplier[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] as unknown[];
    const vendorName = String(get(row, "vendor_name") ?? "").trim();
    if (!vendorName || vendorName === "null") continue;

    const totalSpend = parseNum(get(row, "total_spend"));
    if (totalSpend <= 0) continue;

    suppliers.push({
      vendor_name: vendorName,
      cleansed_name: String(get(row, "cleansed_name") ?? vendorName).trim(),
      l1: String(get(row, "l1") ?? "Uncategorized").trim() || "Uncategorized",
      l2: String(get(row, "l2") ?? "Uncategorized").trim() || "Uncategorized",
      total_spend: totalSpend,
      tiering: String(get(row, "tiering") ?? "").trim(),
      alaska: parseNum(get(row, "alaska")) || null,
      hawaii: parseNum(get(row, "hawaii")) || null,
      // Note: AL and HA columns are the actual dollar amounts; Hawaii/Alaska Airlines columns are Yes/No flags
      overlapping: parseBool(get(row, "overlapping")),
      what_they_do: String(get(row, "what_they_do") ?? "").trim(),
      savings_levers: parseLevers(get(row, "savings_levers")),
      competitors_in_spend: parseCompetitors(get(row, "competitors_in_spend")),
      market_competitors: parseLevers(get(row, "market_competitors")),
      contract_structure: String(get(row, "contract_structure") ?? "").trim(),
      confidence: String(get(row, "confidence") ?? "").trim() || "Unknown",
      research_basis: String(get(row, "research_basis") ?? "").trim(),
      review_flag: parseBool(get(row, "review_flag")),
      consolidation_note: String(get(row, "consolidation_note") ?? "").trim(),
      source_urls: parseUrls(get(row, "source_urls")),
      evidence_tier: String(get(row, "evidence_tier") ?? "").trim(),
    });
  }

  if (suppliers.length === 0) {
    throw new Error("No valid supplier rows found. Check that the file has spend data.");
  }

  // ── Compute summary ──
  const l1_spend: Record<string, number> = {};
  const l1_count: Record<string, number> = {};
  const l2_spend: Record<string, Record<string, number>> = {};
  const tiering_counts: Record<string, number> = {};
  const confidence_counts: Record<string, number> = {};
  const evidence_counts: Record<string, number> = {};
  const top_levers: Record<string, number> = {};

  let total_spend = 0;
  let high_confidence_count = 0;
  let review_flag_count = 0;
  let alaska_spend = 0;
  let hawaii_spend = 0;

  for (const s of suppliers) {
    total_spend += s.total_spend;
    if (s.confidence.toLowerCase() === "high") high_confidence_count++;
    if (s.review_flag) review_flag_count++;
    if (s.alaska) alaska_spend += s.alaska;
    if (s.hawaii) hawaii_spend += s.hawaii;

    l1_spend[s.l1] = (l1_spend[s.l1] || 0) + s.total_spend;
    l1_count[s.l1] = (l1_count[s.l1] || 0) + 1;

    if (!l2_spend[s.l1]) l2_spend[s.l1] = {};
    l2_spend[s.l1][s.l2] = (l2_spend[s.l1][s.l2] || 0) + s.total_spend;

    if (s.tiering) tiering_counts[s.tiering] = (tiering_counts[s.tiering] || 0) + 1;
    if (s.confidence) confidence_counts[s.confidence] = (confidence_counts[s.confidence] || 0) + 1;
    if (s.evidence_tier) evidence_counts[s.evidence_tier] = (evidence_counts[s.evidence_tier] || 0) + 1;

    for (const lever of s.savings_levers) {
      const k = lever.toLowerCase().trim();
      if (k) top_levers[k] = (top_levers[k] || 0) + 1;
    }
  }

  const summary: DataSummary = {
    total_spend,
    total_count: suppliers.length,
    high_confidence_count,
    review_flag_count,
    alaska_spend,
    hawaii_spend,
    l1_spend,
    l1_count,
    l2_spend,
    tiering_counts,
    confidence_counts,
    evidence_counts,
    top_levers,
    file_name: fileName,
    uploaded_at: new Date().toISOString(),
  };

  return { suppliers, summary };
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface DataContextValue {
  data: TailSpendData | null;
  isLoading: boolean;
  error: string | null;
  loadFile: (file: File) => Promise<void>;
  clearData: () => void;
}

const DataContext = createContext<DataContextValue | null>(null);

const SESSION_KEY = "tailspend_data";

export function DataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<TailSpendData | null>(() => {
    try {
      const stored = sessionStorage.getItem(SESSION_KEY);
      if (stored) return JSON.parse(stored) as TailSpendData;
    } catch {}
    return null;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Persist to sessionStorage whenever data changes
  useEffect(() => {
    try {
      if (data) sessionStorage.setItem(SESSION_KEY, JSON.stringify(data));
      else sessionStorage.removeItem(SESSION_KEY);
    } catch {}
  }, [data]);

  const loadFile = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);
    try {
      const buffer = await file.arrayBuffer();
      const parsed = parseExcelFile(buffer, file.name);
      setData(parsed);
    } catch (e: any) {
      setError(e.message || "Failed to parse file.");
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearData = useCallback(() => {
    setData(null);
    setError(null);
    try { sessionStorage.removeItem(SESSION_KEY); } catch {}
  }, []);

  return (
    <DataContext.Provider value={{ data, isLoading, error, loadFile, clearData }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}

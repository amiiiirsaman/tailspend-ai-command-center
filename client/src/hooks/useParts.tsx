// Parts dataset — types + provider + hooks in one file (avoids circular imports
// between a provider and the hooks that read it).
//
// Data sources, in priority order:
//   1. User-uploaded parts xlsx (parsed in browser, lives in PartsProvider state)
//   2. Bundled JSON in /public/parts/ (fetched on demand)
//
// Summary is small (~32 KB) and fetched eagerly. Enriched (~10 MB) and tail
// (~8 MB) are fetched on demand when their tabs open. We do not persist the
// large arrays to sessionStorage.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import * as XLSX from "xlsx";
import {
  computePartsSummary,
  mapPartsRow,
  slimPart,
} from "@/lib/partsParser";

const ENRICHED_CUTOFF = 12000;

// ─── Types ──────────────────────────────────────────────────────────────────

export interface EnrichedPart {
  part_number: string;
  nomenclature: string;
  part_category: string;
  ata_code: string;
  ata_description: string;
  airline_source: string;
  total_demand: number | null;
  demand_period: string;
  total_cost: number | null;
  unit_cost_best: number | null;
  unit_cost_as: number | null;
  unit_cost_ha: number | null;
  unit_cost_qx: number | null;
  uom: string;
  oem: string;
  oem_confidence: string;
  oem_url: string;
  is_sole_source: boolean;
  online_price: number | null;
  price_source: string;
  price_source_url: string;
  price_delta_pct: number | null;
  potential_savings: number | null;
  savings_flag: boolean;
  uom_warning: boolean;
  nsn: string;
  aerobase_url: string;
  aerobase_found: boolean;
  ata_full: string;
  business_note: string;
}

export interface TailPart {
  part_number: string;
  nomenclature: string;
  part_category: string;
  ata_description: string;
  airline_source: string;
  total_demand: number | null;
  total_cost: number | null;
  unit_cost_best: number | null;
  uom: string;
  oem: string;
  is_sole_source: boolean;
}

export interface PartsSummary {
  generated_at: string;
  total_parts: number;
  total_spend: number;
  potential_savings: number;
  // Coverage across the ENTIRE 48k dataset
  online_price_coverage_pct: number;
  online_price_count: number;
  // Coverage across just the enriched top-12k subset (where we actually look
  // for online benchmarks). This is the more informative number for the
  // Insights tab — the full-48k % is included for context only.
  online_price_coverage_enriched_pct: number;
  online_price_count_enriched: number;
  sole_source_count: number;
  sole_source_spend: number;
  sole_source_pct: number;
  enriched_count: number;
  tail_count: number;
  top_ata: { name: string; spend: number }[];
  top_oem: {
    name: string;
    spend: number;
    soleSourceSpend: number;
    nonSoleSpend: number;
  }[];
  part_category_split: { name: string; count: number; spend: number }[];
  price_gap_buckets: { name: string; count: number; savings: boolean }[];
  airline_split: { name: string; count: number; spend: number }[];
  oem_options: string[];
  ata_options: string[];
  airline_options: string[];
  part_category_options: string[];
  // —— v2 insights ——
  top_savings: {
    part_number: string;
    nomenclature: string;
    oem: string;
    ata_description: string;
    total_cost: number | null;
    potential_savings: number | null;
    price_delta_pct: number | null;
    online_price: number | null;
    is_sole_source: boolean;
  }[];
  spend_concentration: {
    parts_for_50: number;
    parts_for_80: number;
    parts_for_95: number;
    pct_count_for_50: number;
    pct_count_for_80: number;
    pct_count_for_95: number;
  };
  data_quality: {
    uom_warning_count: number;
    uom_warning_pct: number;
    suppressed_price_count: number;
    missing_oem_count: number;
    missing_oem_pct: number;
  };
  oem_concentration: {
    top1_pct: number;
    top1_name: string;
    top5_pct: number;
    top10_pct: number;
    unique_oem_count: number;
  };
  sole_source_by_ata: { name: string; soleSourceSpend: number; totalSpend: number; pct: number }[];
}

interface UploadedParts {
  enriched: EnrichedPart[];
  tail: TailPart[];
  summary: PartsSummary;
  fileName: string;
  uploadedAt: string;
}

// ─── Provider ───────────────────────────────────────────────────────────────

interface PartsContextValue {
  uploaded: UploadedParts | null;
  loadFromBuffer: (buf: ArrayBuffer, fileName: string) => void;
  clearUpload: () => void;
}

const PartsContext = createContext<PartsContextValue | null>(null);

export function PartsProvider({ children }: { children: ReactNode }) {
  const [uploaded, setUploaded] = useState<UploadedParts | null>(null);

  const loadFromBuffer = useCallback((buf: ArrayBuffer, fileName: string) => {
    const wb = XLSX.read(buf, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
      defval: null,
    });
    const parts = raw.map(mapPartsRow).filter((p) => p.part_number);
    const enriched = parts.slice(0, ENRICHED_CUTOFF);
    const tail = parts.slice(ENRICHED_CUTOFF).map(slimPart);
    const summary = computePartsSummary(parts, enriched.length, tail.length);
    setUploaded({
      enriched,
      tail,
      summary,
      fileName,
      uploadedAt: new Date().toISOString(),
    });
  }, []);

  const clearUpload = useCallback(() => setUploaded(null), []);

  const value = useMemo(
    () => ({ uploaded, loadFromBuffer, clearUpload }),
    [uploaded, loadFromBuffer, clearUpload]
  );

  return (
    <PartsContext.Provider value={value}>{children}</PartsContext.Provider>
  );
}

export function usePartsUploader() {
  const ctx = useContext(PartsContext);
  if (!ctx) throw new Error("usePartsUploader must be used within PartsProvider");
  return ctx;
}

// ─── In-memory cache for bundled JSON ───────────────────────────────────────

let summaryCache: PartsSummary | null = null;
let enrichedCache: EnrichedPart[] | null = null;
let tailCache: TailPart[] | null = null;

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
  return (await res.json()) as T;
}

// ─── Read hooks ─────────────────────────────────────────────────────────────

function useUploadedOrNull(): UploadedParts | null {
  const ctx = useContext(PartsContext);
  return ctx?.uploaded ?? null;
}

export function usePartsSummary() {
  const uploaded = useUploadedOrNull();
  const [data, setData] = useState<PartsSummary | null>(
    uploaded?.summary ?? summaryCache
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (uploaded) {
      setData(uploaded.summary);
      return;
    }
    if (summaryCache) {
      setData(summaryCache);
      return;
    }
    let cancelled = false;
    fetchJson<PartsSummary>("/parts/parts-summary.json")
      .then((d) => {
        summaryCache = d;
        if (!cancelled) setData(d);
      })
      .catch((e) => !cancelled && setError(String(e)));
    return () => {
      cancelled = true;
    };
  }, [uploaded]);

  return { data, error, loading: !data && !error };
}

export function useEnrichedParts(enabled: boolean) {
  const uploaded = useUploadedOrNull();
  const [data, setData] = useState<EnrichedPart[] | null>(
    uploaded?.enriched ?? enrichedCache
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (uploaded) {
      setData(uploaded.enriched);
      return;
    }
    if (!enabled) return;
    if (enrichedCache) {
      setData(enrichedCache);
      return;
    }
    let cancelled = false;
    fetchJson<EnrichedPart[]>("/parts/parts-enriched.json")
      .then((d) => {
        enrichedCache = d;
        if (!cancelled) setData(d);
      })
      .catch((e) => !cancelled && setError(String(e)));
    return () => {
      cancelled = true;
    };
  }, [enabled, uploaded]);

  return { data, error, loading: enabled && !data && !error };
}

export function useTailParts(enabled: boolean) {
  const uploaded = useUploadedOrNull();
  const [data, setData] = useState<TailPart[] | null>(
    uploaded?.tail ?? tailCache
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (uploaded) {
      setData(uploaded.tail);
      return;
    }
    if (!enabled) return;
    if (tailCache) {
      setData(tailCache);
      return;
    }
    let cancelled = false;
    fetchJson<TailPart[]>("/parts/parts-tail.json")
      .then((d) => {
        tailCache = d;
        if (!cancelled) setData(d);
      })
      .catch((e) => !cancelled && setError(String(e)));
    return () => {
      cancelled = true;
    };
  }, [enabled, uploaded]);

  return { data, error, loading: enabled && !data && !error };
}

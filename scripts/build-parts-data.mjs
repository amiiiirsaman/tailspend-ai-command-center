// Build-time converter: AArete delivery file → bundled JSON
//
// Looks for the freshest delivery in the repo root (CSV or XLSX, v3/v4/v5/…)
// and produces:
//   - parts-enriched.json  → top 12 000 (full columns, online price + BD notes)
//   - parts-tail.json      → remaining ~36 000 (slim columns)
//   - parts-summary.json   → pre-computed KPIs + chart series for the Insights tab
//
// Run via:  pnpm build:parts

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { dirname, resolve, extname } from "node:path";
import { fileURLToPath } from "node:url";
import * as XLSX from "xlsx";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const OUT_DIR = resolve(ROOT, "client", "public", "parts");

const ENRICHED_CUTOFF = 12000;

// ── Pick the freshest delivery file ──────────────────────────────────────────
// Prefer CSV (handles the v5 export which is CSV-only) then XLSX, and within
// each kind pick the highest version number found in the filename.
function pickDeliveryFile() {
  const candidates = readdirSync(ROOT)
    .filter((f) => /AArete.*DELIVERY.*v\d+.*\.(csv|xlsx)$/i.test(f))
    .map((f) => {
      const ext = extname(f).toLowerCase();
      const v = Number(f.match(/v(\d+)/i)?.[1] ?? 0);
      const isCopy = /copy/i.test(f);
      return { file: f, ext, v, isCopy };
    })
    .sort((a, b) => {
      if (b.v !== a.v) return b.v - a.v;
      if (a.ext !== b.ext) return a.ext === ".csv" ? -1 : 1;
      // Prefer non-"Copy" file if both exist for the same version+ext
      return Number(a.isCopy) - Number(b.isCopy);
    });
  if (!candidates.length) {
    console.error("No AArete_*DELIVERY* file found in repo root.");
    process.exit(1);
  }
  return resolve(ROOT, candidates[0].file);
}

const SRC = pickDeliveryFile();

// ── Helpers ──────────────────────────────────────────────────────────────────
const num = (v) => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const bool = (v) => {
  if (v === null || v === undefined || v === "") return false;
  const s = String(v).toLowerCase().trim();
  return s === "true" || s === "yes" || s === "1" || s === "y";
};
const str = (v) => {
  if (v === null || v === undefined) return "";
  return String(v).trim();
};

function mapRow(row) {
  return {
    part_number: str(row["Part Number"]),
    nomenclature: str(row["Nomenclature"]),
    part_category: str(row["Part_Category"]),
    ata_code: str(row["ATA_Code"]),
    ata_description: str(row["ATA_Description"]),
    airline_source: str(row["Airline_Source"]),
    total_demand: num(row["Total_Demand"]),
    demand_period: str(row["Demand_Period"]),
    total_cost: num(row["Total_Cost"]),
    unit_cost_best: num(row["Original_Unit_Cost_Best"]),
    unit_cost_as: num(row["Original_Unit_Cost_AS"]),
    unit_cost_ha: num(row["Original_Unit_Cost_HA"]),
    unit_cost_qx: num(row["Original_Unit_Cost_QX"]),
    uom: str(row["Unit_Of_Measure"]),
    oem: str(row["OEM_Manufacturer"]),
    oem_confidence: str(row["OEM_Confidence"]),
    oem_url: str(row["OEM_URL"]),
    is_sole_source: bool(row["Is_Sole_Source"]),
    online_price: num(row["Online_Market_Price_USD"]),
    price_source: str(row["Price_Source"]),
    price_source_url: str(row["Price_Source_URL"]),
    price_delta_pct: num(row["Online_Price_Delta_Pct"]),
    potential_savings: num(row["Potential_Savings_USD"]),
    savings_flag: bool(row["Savings_Flag"]),
    uom_warning: bool(row["UOM_Warning"]),
    nsn: str(row["NSN"]),
    aerobase_url: str(row["AeroBase_URL"]),
    aerobase_found: bool(row["AeroBase_Found"]),
    ata_full: str(row["ATA_Full_Meaning"]),
    business_note: str(row["Business_Note"]),
  };
}

function slimRow(r) {
  return {
    part_number: r.part_number,
    nomenclature: r.nomenclature,
    part_category: r.part_category,
    ata_description: r.ata_description,
    airline_source: r.airline_source,
    total_demand: r.total_demand,
    total_cost: r.total_cost,
    unit_cost_best: r.unit_cost_best,
    uom: r.uom,
    oem: r.oem,
    is_sole_source: r.is_sole_source,
  };
}

// ── Read source ──────────────────────────────────────────────────────────────
console.log(`Reading ${SRC} ...`);
const ext = extname(SRC).toLowerCase();
let wb;
if (ext === ".csv") {
  let text = readFileSync(SRC, "utf-8");
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1); // strip BOM
  wb = XLSX.read(text, { type: "string", raw: false });
} else {
  wb = XLSX.read(readFileSync(SRC), { type: "buffer" });
}
const sheetName = wb.SheetNames[0];
const ws = wb.Sheets[sheetName];
const raw = XLSX.utils.sheet_to_json(ws, { defval: null });
console.log(`Sheet "${sheetName}": ${raw.length.toLocaleString()} rows`);

const headerRow = XLSX.utils.sheet_to_json(ws, { header: 1, range: 0 })[0];
console.log(`Headers (${headerRow.length}):`, headerRow.join(" | "));

const parts = raw.map(mapRow).filter((r) => r.part_number);

const enriched = parts.slice(0, ENRICHED_CUTOFF);
const tail = parts.slice(ENRICHED_CUTOFF).map(slimRow);

console.log(`Enriched (top ${ENRICHED_CUTOFF}): ${enriched.length.toLocaleString()}`);
console.log(`Tail: ${tail.length.toLocaleString()}`);

// ── Summary computation ──────────────────────────────────────────────────────
const all = parts;
const totalParts = all.length;
const totalSpend = all.reduce((s, r) => s + (r.total_cost ?? 0), 0);
const potentialSavings = all.reduce((s, r) => s + (r.potential_savings ?? 0), 0);
const withOnlinePrice = all.filter((r) => r.online_price !== null).length;
const withOnlinePriceEnriched = enriched.filter((r) => r.online_price !== null).length;
const soleSourceSpend = all
  .filter((r) => r.is_sole_source)
  .reduce((s, r) => s + (r.total_cost ?? 0), 0);
const soleSourceCount = all.filter((r) => r.is_sole_source).length;

// Top 10 ATA categories by spend
const byAta = new Map();
for (const r of all) {
  const k = r.ata_description || "(Uncategorized)";
  byAta.set(k, (byAta.get(k) ?? 0) + (r.total_cost ?? 0));
}
const topAta = [...byAta.entries()]
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10)
  .map(([name, spend]) => ({ name, spend }));

// Top 10 OEMs by spend (with sole-source split)
const byOem = new Map();
for (const r of all) {
  const k = r.oem || "(Unknown)";
  const cur = byOem.get(k) ?? { spend: 0, soleSourceSpend: 0 };
  cur.spend += r.total_cost ?? 0;
  if (r.is_sole_source) cur.soleSourceSpend += r.total_cost ?? 0;
  byOem.set(k, cur);
}
const topOem = [...byOem.entries()]
  .sort((a, b) => b[1].spend - a[1].spend)
  .slice(0, 10)
  .map(([name, v]) => ({
    name,
    spend: v.spend,
    soleSourceSpend: v.soleSourceSpend,
    nonSoleSpend: v.spend - v.soleSourceSpend,
  }));

// Price-gap distribution (only rows with delta pct)
const buckets = [
  { name: "< -50%", min: -Infinity, max: -50, count: 0, savings: true },
  { name: "-50% to -20%", min: -50, max: -20, count: 0, savings: true },
  { name: "-20% to 0%", min: -20, max: 0, count: 0, savings: true },
  { name: "0% to 20%", min: 0, max: 20, count: 0, savings: false },
  { name: "> 20%", min: 20, max: Infinity, count: 0, savings: false },
];
for (const r of all) {
  if (r.price_delta_pct === null) continue;
  const d = r.price_delta_pct;
  for (const b of buckets) {
    if (d >= b.min && d < b.max) {
      b.count++;
      break;
    }
  }
}

// Airline split
const byAirline = new Map();
for (const r of all) {
  const k = r.airline_source || "Unspecified";
  const cur = byAirline.get(k) ?? { count: 0, spend: 0 };
  cur.count++;
  cur.spend += r.total_cost ?? 0;
  byAirline.set(k, cur);
}
const airlineSplit = [...byAirline.entries()]
  .sort((a, b) => b[1].spend - a[1].spend)
  .map(([name, v]) => ({ name, count: v.count, spend: v.spend }));

// Part category split (v5+ schema)
const byCategory = new Map();
for (const r of all) {
  const k = r.part_category || "(Uncategorized)";
  const cur = byCategory.get(k) ?? { count: 0, spend: 0 };
  cur.count++;
  cur.spend += r.total_cost ?? 0;
  byCategory.set(k, cur);
}
const partCategorySplit = [...byCategory.entries()]
  .sort((a, b) => b[1].spend - a[1].spend)
  .map(([name, v]) => ({ name, count: v.count, spend: v.spend }));

// Filter option lists (for the table dropdowns) — small, dedup, sorted
const uniqSorted = (xs) =>
  [...new Set(xs.filter(Boolean))].sort((a, b) => a.localeCompare(b));
const oemOptions = uniqSorted(all.map((r) => r.oem));
const ataOptions = uniqSorted(all.map((r) => r.ata_description));
const airlineOptions = uniqSorted(all.map((r) => r.airline_source));
const partCategoryOptions = uniqSorted(all.map((r) => r.part_category));

// — Top savings opportunities (Top 10) —
const topSavings = all
  .filter((r) => (r.potential_savings ?? 0) > 0)
  .sort((a, b) => (b.potential_savings ?? 0) - (a.potential_savings ?? 0))
  .slice(0, 10)
  .map((r) => ({
    part_number: r.part_number,
    nomenclature: r.nomenclature,
    oem: r.oem,
    ata_description: r.ata_description,
    total_cost: r.total_cost,
    potential_savings: r.potential_savings,
    price_delta_pct: r.price_delta_pct,
    online_price: r.online_price,
    is_sole_source: r.is_sole_source,
  }));

// — Pareto / spend concentration —
const spendSorted = all.map((r) => r.total_cost ?? 0).sort((a, b) => b - a);
const cumThresholds = [0.5, 0.8, 0.95];
const cumCounts = [0, 0, 0];
let running = 0;
let idx = 0;
for (let i = 0; i < spendSorted.length; i++) {
  running += spendSorted[i];
  while (idx < cumThresholds.length && running >= totalSpend * cumThresholds[idx]) {
    cumCounts[idx] = i + 1;
    idx++;
  }
  if (idx >= cumThresholds.length) break;
}
const spendConcentration = {
  parts_for_50: cumCounts[0],
  parts_for_80: cumCounts[1],
  parts_for_95: cumCounts[2],
  pct_count_for_50: totalParts ? (cumCounts[0] / totalParts) * 100 : 0,
  pct_count_for_80: totalParts ? (cumCounts[1] / totalParts) * 100 : 0,
  pct_count_for_95: totalParts ? (cumCounts[2] / totalParts) * 100 : 0,
};

// — Data quality strip —
const uomWarningCount = all.filter((r) => r.uom_warning).length;
const suppressedPriceCount = all.filter((r) => /SUPPRESSED/i.test(r.price_source || "")).length;
const missingOemCount = all.filter((r) => !r.oem).length;
const dataQuality = {
  uom_warning_count: uomWarningCount,
  uom_warning_pct: totalParts ? (uomWarningCount / totalParts) * 100 : 0,
  suppressed_price_count: suppressedPriceCount,
  missing_oem_count: missingOemCount,
  missing_oem_pct: totalParts ? (missingOemCount / totalParts) * 100 : 0,
};

// — OEM concentration —
const oemSpendList = [...byOem.entries()]
  .map(([name, v]) => ({ name, spend: v.spend }))
  .sort((a, b) => b.spend - a.spend);
const top1 = oemSpendList[0];
const top5Sum = oemSpendList.slice(0, 5).reduce((s, o) => s + o.spend, 0);
const top10Sum = oemSpendList.slice(0, 10).reduce((s, o) => s + o.spend, 0);
const oemConcentration = {
  top1_pct: totalSpend ? ((top1?.spend ?? 0) / totalSpend) * 100 : 0,
  top1_name: top1?.name ?? "",
  top5_pct: totalSpend ? (top5Sum / totalSpend) * 100 : 0,
  top10_pct: totalSpend ? (top10Sum / totalSpend) * 100 : 0,
  unique_oem_count: oemSpendList.length,
};

// — Sole-source by ATA —
const ataSoleMap = new Map();
for (const r of all) {
  const k = r.ata_description || "(Uncategorized)";
  const cur = ataSoleMap.get(k) ?? { sole: 0, total: 0 };
  cur.total += r.total_cost ?? 0;
  if (r.is_sole_source) cur.sole += r.total_cost ?? 0;
  ataSoleMap.set(k, cur);
}
const soleSourceByAta = [...ataSoleMap.entries()]
  .map(([name, v]) => ({
    name,
    soleSourceSpend: v.sole,
    totalSpend: v.total,
    pct: v.total ? (v.sole / v.total) * 100 : 0,
  }))
  .filter((x) => x.totalSpend >= totalSpend * 0.01)
  .sort((a, b) => b.pct - a.pct)
  .slice(0, 10);

const summary = {
  generated_at: new Date().toISOString(),
  total_parts: totalParts,
  total_spend: totalSpend,
  potential_savings: potentialSavings,
  online_price_coverage_pct: totalParts ? (withOnlinePrice / totalParts) * 100 : 0,
  online_price_count: withOnlinePrice,
  online_price_coverage_enriched_pct: enriched.length
    ? (withOnlinePriceEnriched / enriched.length) * 100
    : 0,
  online_price_count_enriched: withOnlinePriceEnriched,
  sole_source_count: soleSourceCount,
  sole_source_spend: soleSourceSpend,
  sole_source_pct: totalSpend ? (soleSourceSpend / totalSpend) * 100 : 0,
  enriched_count: enriched.length,
  tail_count: tail.length,
  top_ata: topAta,
  top_oem: topOem,
  part_category_split: partCategorySplit,
  price_gap_buckets: buckets.map((b) => ({
    name: b.name,
    count: b.count,
    savings: b.savings,
  })),
  airline_split: airlineSplit,
  oem_options: oemOptions,
  ata_options: ataOptions,
  airline_options: airlineOptions,
  part_category_options: partCategoryOptions,
  top_savings: topSavings,
  spend_concentration: spendConcentration,
  data_quality: dataQuality,
  oem_concentration: oemConcentration,
  sole_source_by_ata: soleSourceByAta,
};

// ── Write output ─────────────────────────────────────────────────────────────
if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

const write = (name, obj) => {
  const path = resolve(OUT_DIR, name);
  writeFileSync(path, JSON.stringify(obj));
  const kb = Math.round(JSON.stringify(obj).length / 1024);
  console.log(`  wrote ${name} (${kb.toLocaleString()} KB)`);
};

write("parts-enriched.json", enriched);
write("parts-tail.json", tail);
write("parts-summary.json", summary);

console.log("\nDone.");
console.log(`  Total spend:        $${(totalSpend / 1e6).toFixed(1)}M`);
console.log(`  Potential savings:  $${(potentialSavings / 1e6).toFixed(2)}M`);
console.log(`  Online-price cov:   ${summary.online_price_coverage_pct.toFixed(1)}% overall · ${summary.online_price_coverage_enriched_pct.toFixed(1)}% of top 12K`);
console.log(`  Sole-source spend:  $${(soleSourceSpend / 1e6).toFixed(1)}M (${summary.sole_source_pct.toFixed(1)}%)`);
console.log(`  Part categories:    ${partCategorySplit.length}`);

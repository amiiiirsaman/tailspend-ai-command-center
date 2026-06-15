// Parts parser — shared between the browser uploader (PartsContext) and the
// build-time converter logic. Keeps the field-name mapping in one place.

import type { EnrichedPart, TailPart, PartsSummary } from "@/hooks/useParts";

export const PARTS_HEADER_HINTS = [
  "Part Number",
  "Nomenclature",
  "ATA_Code",
  "Total_Cost",
];

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const bool = (v: unknown): boolean => {
  if (v === null || v === undefined || v === "") return false;
  const s = String(v).toLowerCase().trim();
  return s === "true" || s === "yes" || s === "1" || s === "y";
};
const str = (v: unknown): string => {
  if (v === null || v === undefined) return "";
  return String(v).trim();
};

export function mapPartsRow(row: Record<string, unknown>): EnrichedPart {
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

export function slimPart(r: EnrichedPart): TailPart {
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

export function computePartsSummary(
  parts: EnrichedPart[],
  enrichedCount: number,
  tailCount: number
): PartsSummary {
  const totalParts = parts.length;
  const totalSpend = parts.reduce((s, r) => s + (r.total_cost ?? 0), 0);
  const potentialSavings = parts.reduce(
    (s, r) => s + (r.potential_savings ?? 0),
    0
  );
  const withOnlinePrice = parts.filter((r) => r.online_price !== null).length;
  // Enriched-only coverage. The first `enrichedCount` rows are the enriched
  // subset; we count online-price hits within just that slice.
  const enrichedSlice = parts.slice(0, enrichedCount);
  const withOnlinePriceEnriched = enrichedSlice.filter(
    (r) => r.online_price !== null
  ).length;
  const soleSourceSpend = parts
    .filter((r) => r.is_sole_source)
    .reduce((s, r) => s + (r.total_cost ?? 0), 0);
  const soleSourceCount = parts.filter((r) => r.is_sole_source).length;

  const byAta = new Map<string, number>();
  for (const r of parts) {
    const k = r.ata_description || "(Uncategorized)";
    byAta.set(k, (byAta.get(k) ?? 0) + (r.total_cost ?? 0));
  }
  const topAta = Array.from(byAta.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, spend]) => ({ name, spend }));

  const byOem = new Map<
    string,
    { spend: number; soleSourceSpend: number }
  >();
  for (const r of parts) {
    const k = r.oem || "(Unknown)";
    const cur = byOem.get(k) ?? { spend: 0, soleSourceSpend: 0 };
    cur.spend += r.total_cost ?? 0;
    if (r.is_sole_source) cur.soleSourceSpend += r.total_cost ?? 0;
    byOem.set(k, cur);
  }
  const topOem = Array.from(byOem.entries())
    .sort((a, b) => b[1].spend - a[1].spend)
    .slice(0, 10)
    .map(([name, v]) => ({
      name,
      spend: v.spend,
      soleSourceSpend: v.soleSourceSpend,
      nonSoleSpend: v.spend - v.soleSourceSpend,
    }));

  const buckets = [
    { name: "< -50%", min: -Infinity, max: -50, count: 0, savings: true },
    { name: "-50% to -20%", min: -50, max: -20, count: 0, savings: true },
    { name: "-20% to 0%", min: -20, max: 0, count: 0, savings: true },
    { name: "0% to 20%", min: 0, max: 20, count: 0, savings: false },
    { name: "> 20%", min: 20, max: Infinity, count: 0, savings: false },
  ];
  for (const r of parts) {
    if (r.price_delta_pct === null) continue;
    const d = r.price_delta_pct;
    for (const b of buckets) {
      if (d >= b.min && d < b.max) {
        b.count++;
        break;
      }
    }
  }

  const byAirline = new Map<string, { count: number; spend: number }>();
  for (const r of parts) {
    const k = r.airline_source || "Unspecified";
    const cur = byAirline.get(k) ?? { count: 0, spend: 0 };
    cur.count++;
    cur.spend += r.total_cost ?? 0;
    byAirline.set(k, cur);
  }
  const airlineSplit = Array.from(byAirline.entries())
    .sort((a, b) => b[1].spend - a[1].spend)
    .map(([name, v]) => ({ name, count: v.count, spend: v.spend }));

  const byCategory = new Map<string, { count: number; spend: number }>();
  for (const r of parts) {
    const k = r.part_category || "(Uncategorized)";
    const cur = byCategory.get(k) ?? { count: 0, spend: 0 };
    cur.count++;
    cur.spend += r.total_cost ?? 0;
    byCategory.set(k, cur);
  }
  const partCategorySplit = Array.from(byCategory.entries())
    .sort((a, b) => b[1].spend - a[1].spend)
    .map(([name, v]) => ({ name, count: v.count, spend: v.spend }));

  const uniqSorted = (xs: string[]) =>
    Array.from(new Set(xs.filter(Boolean))).sort((a, b) => a.localeCompare(b));
  const oemOptions = uniqSorted(parts.map((r) => r.oem));
  const ataOptions = uniqSorted(parts.map((r) => r.ata_description));
  const airlineOptions = uniqSorted(parts.map((r) => r.airline_source));
  const partCategoryOptions = uniqSorted(parts.map((r) => r.part_category));

  // —— Top savings opportunities ——
  const topSavings = parts
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

  // —— Pareto / spend concentration ——
  const spendSorted = parts
    .map((r) => r.total_cost ?? 0)
    .sort((a, b) => b - a);
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

  // —— Data quality strip ——
  const uomWarningCount = parts.filter((r) => r.uom_warning).length;
  const suppressedPriceCount = parts.filter((r) =>
    /SUPPRESSED/i.test(r.price_source)
  ).length;
  const missingOemCount = parts.filter((r) => !r.oem).length;
  const dataQuality = {
    uom_warning_count: uomWarningCount,
    uom_warning_pct: totalParts ? (uomWarningCount / totalParts) * 100 : 0,
    suppressed_price_count: suppressedPriceCount,
    missing_oem_count: missingOemCount,
    missing_oem_pct: totalParts ? (missingOemCount / totalParts) * 100 : 0,
  };

  // —— OEM concentration ——
  const oemSpendList = Array.from(byOem.entries())
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

  // —— Sole-source by ATA ——
  const ataSoleMap = new Map<string, { sole: number; total: number }>();
  for (const r of parts) {
    const k = r.ata_description || "(Uncategorized)";
    const cur = ataSoleMap.get(k) ?? { sole: 0, total: 0 };
    cur.total += r.total_cost ?? 0;
    if (r.is_sole_source) cur.sole += r.total_cost ?? 0;
    ataSoleMap.set(k, cur);
  }
  const soleSourceByAta = Array.from(ataSoleMap.entries())
    .map(([name, v]) => ({
      name,
      soleSourceSpend: v.sole,
      totalSpend: v.total,
      pct: v.total ? (v.sole / v.total) * 100 : 0,
    }))
    .filter((x) => x.totalSpend >= totalSpend * 0.01) // only ATAs with ≥1% of total spend
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 10);

  return {
    generated_at: new Date().toISOString(),
    total_parts: totalParts,
    total_spend: totalSpend,
    potential_savings: potentialSavings,
    online_price_coverage_pct: totalParts
      ? (withOnlinePrice / totalParts) * 100
      : 0,
    online_price_count: withOnlinePrice,
    online_price_coverage_enriched_pct: enrichedSlice.length
      ? (withOnlinePriceEnriched / enrichedSlice.length) * 100
      : 0,
    online_price_count_enriched: withOnlinePriceEnriched,
    sole_source_count: soleSourceCount,
    sole_source_spend: soleSourceSpend,
    sole_source_pct: totalSpend ? (soleSourceSpend / totalSpend) * 100 : 0,
    enriched_count: enrichedCount,
    tail_count: tailCount,
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
}

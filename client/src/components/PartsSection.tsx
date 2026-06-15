// Parts Dataset — Insights | Top 12k Enriched | All 48k Parts
// Lives below the TailSpend overview on the Home page.

import { useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  Boxes,
  DollarSign,
  PiggyBank,
  Globe2,
  Lock,
  Search,
  Download,
  ExternalLink,
  AlertTriangle,
  Loader2,
  Flag,
  FlagOff,
  X,
  TrendingUp,
  Tag,
  Link2,
  Trash2,
  Layers,
  BarChart3,
  Star,
  List,
  Target,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import InfoTip from "@/components/InfoTip";
import {
  usePartsSummary,
  useEnrichedParts,
  useTailParts,
  type EnrichedPart,
  type TailPart,
  type PartsSummary,
} from "@/hooks/useParts";
import {
  usePartFlags,
  PART_FLAG_CATEGORIES,
  type PartFlagCategory,
  type PartFlagEntry,
} from "@/contexts/PartFlagContext";

const ORANGE = "#E87722";
const NAVY = "#1A1A2E";
const GREEN = "#22C55E";
const RED = "#EF4444";

function fmtMoney(n: number | null | undefined) {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}
function fmtMoneyFull(n: number | null | undefined) {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}
function fmtNum(n: number | null | undefined) {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  return n.toLocaleString();
}
function fmtPct(n: number | null | undefined, digits = 1) {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  return `${n >= 0 ? "+" : ""}${n.toFixed(digits)}%`;
}

const BarTip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-lg p-2.5 shadow-lg text-xs"
      style={{
        background: "white",
        border: "1px solid #E8E9EC",
        fontFamily: "DM Sans, sans-serif",
      }}
    >
      <div className="font-semibold mb-1" style={{ color: NAVY }}>
        {label}
      </div>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ color: p.color || p.fill }}>
          {p.name}: {typeof p.value === "number" && p.value >= 1000 ? fmtMoney(p.value) : p.value.toLocaleString?.() ?? p.value}
        </div>
      ))}
    </div>
  );
};

const HistTip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-lg p-2.5 shadow-lg text-xs"
      style={{
        background: "white",
        border: "1px solid #E8E9EC",
        fontFamily: "DM Sans, sans-serif",
      }}
    >
      <div className="font-semibold mb-0.5" style={{ color: NAVY }}>
        {label}
      </div>
      <div style={{ color: payload[0].fill }}>
        {payload[0].value.toLocaleString()} parts
      </div>
    </div>
  );
};

// ─── INSIGHTS TAB ────────────────────────────────────────────────────────────

function InsightsTab({ summary }: { summary: PartsSummary }) {
  const kpis = [
    {
      label: "Total Parts",
      value: summary.total_parts.toLocaleString(),
      sub: `${summary.enriched_count.toLocaleString()} enriched · ${summary.tail_count.toLocaleString()} tail`,
      icon: Boxes,
      color: "#4A90D9",
      bg: "rgba(74,144,217,0.08)",
    },
    {
      label: "Total Spend",
      value: fmtMoney(summary.total_spend),
      sub: `Across ${summary.total_parts.toLocaleString()} parts`,
      icon: DollarSign,
      color: ORANGE,
      bg: "rgba(232,119,34,0.08)",
    },
    {
      label: "Potential Savings",
      value: fmtMoney(summary.potential_savings),
      sub: "From online-price benchmarks",
      icon: PiggyBank,
      color: GREEN,
      bg: "rgba(34,197,94,0.08)",
    },
    {
      label: "Online-Price Coverage",
      value: `${summary.online_price_coverage_enriched_pct.toFixed(1)}%`,
      sub: `${summary.online_price_count_enriched.toLocaleString()} of ${summary.enriched_count.toLocaleString()} top-spend parts benchmarked`,
      icon: Globe2,
      color: "#7B68EE",
      bg: "rgba(123,104,238,0.08)",
    },
    {
      label: "Sole-Source Spend",
      value: fmtMoney(summary.sole_source_spend),
      sub: `${summary.sole_source_pct.toFixed(1)}% of total · ${summary.sole_source_count.toLocaleString()} parts`,
      icon: Lock,
      color: "#F59E0B",
      bg: "rgba(245,158,11,0.08)",
    },
  ];

  const ataData = summary.top_ata.map((d) => ({
    name: d.name.length > 26 ? d.name.slice(0, 24) + "…" : d.name,
    spend: d.spend,
  }));

  const oemData = summary.top_oem.map((d) => ({
    name: d.name.length > 26 ? d.name.slice(0, 24) + "…" : d.name,
    "Sole-source": d.soleSourceSpend,
    Competitive: d.nonSoleSpend,
  }));

  const gapData = summary.price_gap_buckets.map((b) => ({
    name: b.name,
    count: b.count,
    fill: b.savings ? GREEN : RED,
  }));

  // Part Category breakdown (v5+ schema). Truncate to top 8 + Other rollup.
  const categoryRaw = summary.part_category_split ?? [];
  const categoryData = categoryRaw.slice(0, 8).map((c) => ({
    name: c.name.length > 28 ? c.name.slice(0, 26) + "…" : c.name,
    spend: c.spend,
    count: c.count,
    pctSpend: summary.total_spend ? (c.spend / summary.total_spend) * 100 : 0,
    pctCount: summary.total_parts ? (c.count / summary.total_parts) * 100 : 0,
  }));
  const CATEGORY_COLORS = [
    ORANGE,
    NAVY,
    "#4A90D9",
    "#7B68EE",
    "#22C55E",
    "#F59E0B",
    "#EC4899",
    "#94A3B8",
  ];

  return (
    <div className="space-y-6 pt-2">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        {kpis.map((k, i) => (
          <div
            key={k.label}
            className="card-hover rounded-xl p-4 animate-fade-up"
            style={{
              background: "white",
              border: "1px solid #E8E9EC",
              boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
              animationDelay: `${i * 40}ms`,
            }}
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center mb-2"
              style={{ background: k.bg }}
            >
              <k.icon size={16} style={{ color: k.color }} />
            </div>
            <div
              className="text-xl font-bold num"
              style={{ color: NAVY, fontFamily: "DM Mono, monospace" }}
            >
              {k.value}
            </div>
            <div
              className="text-xs font-semibold mt-0.5"
              style={{ color: "#6B7280", fontFamily: "DM Sans, sans-serif" }}
            >
              {k.label}
            </div>
            <div
              className="text-xs mt-0.5"
              style={{ color: "#9CA3AF", fontFamily: "DM Sans, sans-serif" }}
            >
              {k.sub}
            </div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* ATA bar */}
        <div
          className="rounded-xl p-5"
          style={{
            background: "white",
            border: "1px solid #E8E9EC",
            boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
          }}
        >
          <div className="mb-3">
            <div className="flex items-center gap-1.5">
              <h3
                className="font-semibold text-sm"
                style={{ fontFamily: "Sora, sans-serif", color: NAVY }}
              >
                Spend by ATA Category
              </h3>
              <InfoTip text="Total spend grouped by ATA (Air Transport Association) chapter. ATA codes classify aircraft parts by functional system (e.g. 25 = Equipment & Furnishings, 49 = Auxiliary Power Unit). Top 10 categories shown." />
            </div>
            <p
              className="text-xs mt-0.5"
              style={{ color: "#9CA3AF", fontFamily: "DM Sans, sans-serif" }}
            >
              Top 10 ATA categories by total spend
            </p>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart
              data={ataData}
              layout="vertical"
              margin={{ left: 0, right: 50, top: 4, bottom: 4 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#F3F4F6"
                horizontal={false}
              />
              <XAxis
                type="number"
                tickFormatter={fmtMoney}
                tick={{ fontSize: 10, fontFamily: "DM Mono, monospace", fill: "#9CA3AF" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={170}
                tick={{ fontSize: 10.5, fontFamily: "DM Sans, sans-serif", fill: "#6B7280" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<BarTip />} cursor={{ fill: "rgba(232,119,34,0.05)" }} />
              <Bar dataKey="spend" fill={ORANGE} radius={[0, 4, 4, 0]} maxBarSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* OEM stacked bar */}
        <div
          className="rounded-xl p-5"
          style={{
            background: "white",
            border: "1px solid #E8E9EC",
            boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
          }}
        >
          <div className="mb-3">
            <div className="flex items-center gap-1.5">
              <h3
                className="font-semibold text-sm"
                style={{ fontFamily: "Sora, sans-serif", color: NAVY }}
              >
                Top OEMs — Sole-Source vs Competitive
              </h3>
              <InfoTip text="Top 10 OEMs by total spend. The orange segment is spend on parts where this OEM is the only available source (sole-source) — a concentration risk and a key target for PMA alternatives or volume negotiation. Navy is spend with competitive alternatives." />
            </div>
            <p
              className="text-xs mt-0.5"
              style={{ color: "#9CA3AF", fontFamily: "DM Sans, sans-serif" }}
            >
              Sole-source spend in orange — supplier concentration risk
            </p>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart
              data={oemData}
              layout="vertical"
              margin={{ left: 0, right: 50, top: 4, bottom: 4 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#F3F4F6"
                horizontal={false}
              />
              <XAxis
                type="number"
                tickFormatter={fmtMoney}
                tick={{ fontSize: 10, fontFamily: "DM Mono, monospace", fill: "#9CA3AF" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={170}
                tick={{ fontSize: 10.5, fontFamily: "DM Sans, sans-serif", fill: "#6B7280" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<BarTip />} cursor={{ fill: "rgba(232,119,34,0.05)" }} />
              <Legend
                wrapperStyle={{ fontSize: 11, fontFamily: "DM Sans, sans-serif" }}
                iconType="square"
              />
              <Bar dataKey="Sole-source" stackId="a" fill={ORANGE} maxBarSize={20} />
              <Bar dataKey="Competitive" stackId="a" fill={NAVY} radius={[0, 4, 4, 0]} maxBarSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Price gap distribution + airline split */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div
          className="xl:col-span-2 rounded-xl p-5"
          style={{
            background: "white",
            border: "1px solid #E8E9EC",
            boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
          }}
        >
          <div className="mb-3">
            <div className="flex items-center gap-1.5">
              <h3
                className="font-semibold text-sm"
                style={{ fontFamily: "Sora, sans-serif", color: NAVY }}
              >
                Online Price vs. Paid Price — Distribution
              </h3>
              <InfoTip text="Each bar shows how many enriched parts fall into a price-gap bucket. Negative (green) = the online benchmark price is LOWER than we're paying — savings opportunity. Positive (red) = online price higher than we're paying (already competitive). Excludes parts with no online benchmark." />
            </div>
            <p
              className="text-xs mt-0.5"
              style={{ color: "#9CA3AF", fontFamily: "DM Sans, sans-serif" }}
            >
              Green = savings opportunity · Red = already below market
            </p>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={gapData} margin={{ left: 0, right: 16, top: 12, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fontFamily: "DM Sans, sans-serif", fill: "#6B7280" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fontFamily: "DM Mono, monospace", fill: "#9CA3AF" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<HistTip />} cursor={{ fill: "rgba(0,0,0,0.03)" }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={70}>
                {gapData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Airline split */}
        <div
          className="rounded-xl p-5"
          style={{
            background: "white",
            border: "1px solid #E8E9EC",
            boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
          }}
        >
          <div className="mb-3">
            <div className="flex items-center gap-1.5">
              <h3
                className="font-semibold text-sm"
                style={{ fontFamily: "Sora, sans-serif", color: NAVY }}
              >
                Spend by Airline
              </h3>
              <InfoTip text="How parts spend splits between Alaska Airlines, Hawaiian Airlines, and unspecified rows." />
            </div>
          </div>
          <div className="space-y-3 mt-2">
            {summary.airline_split.map((a, i) => {
              const pct = summary.total_spend ? (a.spend / summary.total_spend) * 100 : 0;
              return (
                <div key={a.name}>
                  <div className="flex justify-between text-xs mb-1">
                    <span
                      className="font-medium"
                      style={{ color: NAVY, fontFamily: "DM Sans, sans-serif" }}
                    >
                      {a.name}
                    </span>
                    <span
                      className="num"
                      style={{ color: "#6B7280", fontFamily: "DM Mono, monospace" }}
                    >
                      {fmtMoney(a.spend)} · {a.count.toLocaleString()} parts
                    </span>
                  </div>
                  <div
                    className="h-2 rounded-full overflow-hidden"
                    style={{ background: "#F3F4F6" }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${pct}%`,
                        background: i === 0 ? ORANGE : i === 1 ? "#4ECDC4" : "#9CA3AF",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Part Category breakdown (v5+ schema) */}
      {categoryData.length > 0 && (
        <div
          className="rounded-xl p-5"
          style={{
            background: "white",
            border: "1px solid #E8E9EC",
            boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
          }}
        >
          <div className="mb-3">
            <div className="flex items-center gap-1.5">
              <Layers size={14} style={{ color: ORANGE }} />
              <h3
                className="font-semibold text-sm"
                style={{ fontFamily: "Sora, sans-serif", color: NAVY }}
              >
                Spend by Part Category
              </h3>
              <InfoTip text="Inventory classification from the delivery file (Part_Category column). Expendables and consumables are typically lower-cost, high-volume parts; rotables and repairables drive most of the spend. Use this to find pockets where consolidation or volume aggregation may yield the most savings." />
            </div>
            <p
              className="text-xs mt-0.5"
              style={{ color: "#9CA3AF", fontFamily: "DM Sans, sans-serif" }}
            >
              How $ and part count split by inventory class
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
            {/* Chart: horizontal bars showing spend share */}
            <div className="lg:col-span-3">
              <ResponsiveContainer width="100%" height={Math.max(240, categoryData.length * 36)}>
                <BarChart
                  data={categoryData}
                  layout="vertical"
                  margin={{ left: 0, right: 50, top: 4, bottom: 4 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#F3F4F6"
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    tickFormatter={fmtMoney}
                    tick={{ fontSize: 10, fontFamily: "DM Mono, monospace", fill: "#9CA3AF" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={170}
                    tick={{ fontSize: 10.5, fontFamily: "DM Sans, sans-serif", fill: "#6B7280" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<BarTip />} cursor={{ fill: "rgba(232,119,34,0.05)" }} />
                  <Bar dataKey="spend" radius={[0, 4, 4, 0]} maxBarSize={22}>
                    {categoryData.map((_, i) => (
                      <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Legend with stats */}
            <div className="lg:col-span-2 space-y-2">
              {categoryData.map((c, i) => (
                <div
                  key={c.name}
                  className="rounded-lg p-2.5"
                  style={{
                    background: "#FAFAFB",
                    border: "1px solid #F0F0F2",
                  }}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                        style={{ background: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }}
                      />
                      <span
                        className="text-xs font-semibold truncate"
                        style={{ color: NAVY, fontFamily: "DM Sans, sans-serif" }}
                        title={c.name}
                      >
                        {c.name}
                      </span>
                    </div>
                    <span
                      className="text-xs font-semibold num flex-shrink-0"
                      style={{ color: NAVY, fontFamily: "DM Mono, monospace" }}
                    >
                      {fmtMoney(c.spend)}
                    </span>
                  </div>
                  <div
                    className="flex justify-between text-[10.5px]"
                    style={{ color: "#9CA3AF", fontFamily: "DM Mono, monospace" }}
                  >
                    <span>{c.count.toLocaleString()} parts · {c.pctCount.toFixed(1)}%</span>
                    <span>{c.pctSpend.toFixed(1)}% of spend</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Top Savings Opportunities + concentration sidebar */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Top savings table */}
        <div
          className="xl:col-span-2 rounded-xl p-5"
          style={{
            background: "white",
            border: "1px solid #E8E9EC",
            boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
          }}
        >
          <div className="mb-3">
            <div className="flex items-center gap-1.5">
              <Target size={14} style={{ color: GREEN }} />
              <h3
                className="font-semibold text-sm"
                style={{ fontFamily: "Sora, sans-serif", color: NAVY }}
              >
                Top 10 Savings Opportunities
              </h3>
              <InfoTip text="Single parts where the online benchmark is materially below what we're paying. Sorted by dollar savings, not by gap %. These are the highest-impact negotiation candidates." />
            </div>
            <p
              className="text-xs mt-0.5"
              style={{ color: "#9CA3AF", fontFamily: "DM Sans, sans-serif" }}
            >
              Sorted by potential dollar savings
            </p>
          </div>
          {summary.top_savings.length === 0 ? (
            <div
              className="text-xs py-6 text-center"
              style={{ color: "#9CA3AF", fontFamily: "DM Sans, sans-serif" }}
            >
              No savings opportunities identified in the current dataset.
            </div>
          ) : (
            <div style={{ maxHeight: 360, overflowY: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #E8E9EC" }}>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "6px 8px",
                        fontSize: 10,
                        fontWeight: 600,
                        color: "#6B7280",
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                        fontFamily: "DM Sans, sans-serif",
                      }}
                    >
                      Part
                    </th>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "6px 8px",
                        fontSize: 10,
                        fontWeight: 600,
                        color: "#6B7280",
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                        fontFamily: "DM Sans, sans-serif",
                      }}
                    >
                      OEM
                    </th>
                    <th
                      style={{
                        textAlign: "right",
                        padding: "6px 8px",
                        fontSize: 10,
                        fontWeight: 600,
                        color: "#6B7280",
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                        fontFamily: "DM Sans, sans-serif",
                      }}
                    >
                      Paid
                    </th>
                    <th
                      style={{
                        textAlign: "right",
                        padding: "6px 8px",
                        fontSize: 10,
                        fontWeight: 600,
                        color: "#6B7280",
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                        fontFamily: "DM Sans, sans-serif",
                      }}
                    >
                      Δ %
                    </th>
                    <th
                      style={{
                        textAlign: "right",
                        padding: "6px 8px",
                        fontSize: 10,
                        fontWeight: 600,
                        color: "#6B7280",
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                        fontFamily: "DM Sans, sans-serif",
                      }}
                    >
                      Savings
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {summary.top_savings.map((s) => (
                    <tr
                      key={s.part_number}
                      style={{ borderBottom: "1px solid #F3F4F6" }}
                    >
                      <td style={{ padding: "7px 8px", verticalAlign: "top" }}>
                        <div
                          className="text-xs font-semibold"
                          style={{
                            color: NAVY,
                            fontFamily: "DM Mono, monospace",
                          }}
                        >
                          {s.part_number}
                          {s.is_sole_source && (
                            <span
                              style={{
                                marginLeft: 6,
                                fontSize: 9,
                                padding: "1px 5px",
                                borderRadius: 4,
                                background: "rgba(232,119,34,0.12)",
                                color: ORANGE,
                                fontFamily: "DM Sans, sans-serif",
                                fontWeight: 700,
                              }}
                            >
                              SOLE
                            </span>
                          )}
                        </div>
                        <div
                          className="text-xs truncate"
                          style={{
                            color: "#6B7280",
                            fontFamily: "DM Sans, sans-serif",
                            maxWidth: 260,
                          }}
                          title={s.nomenclature}
                        >
                          {s.nomenclature}
                        </div>
                      </td>
                      <td
                        style={{
                          padding: "7px 8px",
                          fontSize: 11.5,
                          color: "#374151",
                          fontFamily: "DM Sans, sans-serif",
                          verticalAlign: "top",
                          maxWidth: 140,
                        }}
                      >
                        <div className="truncate" title={s.oem}>
                          {s.oem || "—"}
                        </div>
                      </td>
                      <td
                        style={{
                          padding: "7px 8px",
                          fontSize: 11.5,
                          color: NAVY,
                          fontFamily: "DM Mono, monospace",
                          textAlign: "right",
                          verticalAlign: "top",
                        }}
                      >
                        {fmtMoney(s.total_cost)}
                      </td>
                      <td
                        style={{
                          padding: "7px 8px",
                          fontSize: 11.5,
                          color: GREEN,
                          fontFamily: "DM Mono, monospace",
                          textAlign: "right",
                          fontWeight: 600,
                          verticalAlign: "top",
                        }}
                      >
                        {fmtPct(s.price_delta_pct)}
                      </td>
                      <td
                        style={{
                          padding: "7px 8px",
                          fontSize: 11.5,
                          color: GREEN,
                          fontFamily: "DM Mono, monospace",
                          textAlign: "right",
                          fontWeight: 700,
                          verticalAlign: "top",
                        }}
                      >
                        {fmtMoney(s.potential_savings)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* OEM Concentration + Pareto stack */}
        <div className="space-y-4">
          <div
            className="rounded-xl p-5"
            style={{
              background: "white",
              border: "1px solid #E8E9EC",
              boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
            }}
          >
            <div className="flex items-center gap-1.5 mb-3">
              <ShieldAlert size={14} style={{ color: ORANGE }} />
              <h3
                className="font-semibold text-sm"
                style={{ fontFamily: "Sora, sans-serif", color: NAVY }}
              >
                OEM Concentration
              </h3>
              <InfoTip text="How dependent we are on a small number of OEMs. High concentration = leverage risk; if the top supplier raises prices we have limited near-term alternatives." />
            </div>
            <div
              className="text-xs mb-3"
              style={{ color: "#6B7280", fontFamily: "DM Sans, sans-serif" }}
            >
              <span
                className="font-semibold"
                style={{ color: NAVY }}
              >
                {summary.oem_concentration.unique_oem_count.toLocaleString()}
              </span>{" "}
              unique OEMs across {summary.total_parts.toLocaleString()} parts
            </div>
            <div className="space-y-2">
              {[
                {
                  label: `#1 — ${summary.oem_concentration.top1_name || "—"}`,
                  pct: summary.oem_concentration.top1_pct,
                  color: ORANGE,
                },
                {
                  label: "Top 5 OEMs",
                  pct: summary.oem_concentration.top5_pct,
                  color: "#4A90D9",
                },
                {
                  label: "Top 10 OEMs",
                  pct: summary.oem_concentration.top10_pct,
                  color: "#7B68EE",
                },
              ].map((row) => (
                <div key={row.label}>
                  <div
                    className="flex justify-between text-xs mb-1"
                    style={{ fontFamily: "DM Sans, sans-serif" }}
                  >
                    <span
                      className="truncate"
                      style={{ color: NAVY, fontWeight: 500 }}
                      title={row.label}
                    >
                      {row.label}
                    </span>
                    <span
                      className="num font-semibold"
                      style={{
                        color: row.color,
                        fontFamily: "DM Mono, monospace",
                      }}
                    >
                      {row.pct.toFixed(1)}%
                    </span>
                  </div>
                  <div
                    className="h-2 rounded-full overflow-hidden"
                    style={{ background: "#F3F4F6" }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(100, row.pct)}%`,
                        background: row.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div
            className="rounded-xl p-5"
            style={{
              background: "white",
              border: "1px solid #E8E9EC",
              boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
            }}
          >
            <div className="flex items-center gap-1.5 mb-3">
              <Sparkles size={14} style={{ color: "#7B68EE" }} />
              <h3
                className="font-semibold text-sm"
                style={{ fontFamily: "Sora, sans-serif", color: NAVY }}
              >
                Pareto — Where the spend lives
              </h3>
              <InfoTip text="Classic spend concentration cut. Tells you how many SKUs to focus on for 50/80/95% of total dollars." />
            </div>
            <div className="space-y-3">
              {[
                {
                  pct: 50,
                  parts: summary.spend_concentration.parts_for_50,
                  pctCount: summary.spend_concentration.pct_count_for_50,
                  color: ORANGE,
                },
                {
                  pct: 80,
                  parts: summary.spend_concentration.parts_for_80,
                  pctCount: summary.spend_concentration.pct_count_for_80,
                  color: "#4A90D9",
                },
                {
                  pct: 95,
                  parts: summary.spend_concentration.parts_for_95,
                  pctCount: summary.spend_concentration.pct_count_for_95,
                  color: "#7B68EE",
                },
              ].map((p) => (
                <div
                  key={p.pct}
                  className="flex items-center justify-between text-xs"
                  style={{ fontFamily: "DM Sans, sans-serif" }}
                >
                  <div className="flex items-center gap-2">
                    <span
                      style={{
                        background: `${p.color}1A`,
                        color: p.color,
                        padding: "3px 8px",
                        borderRadius: 6,
                        fontWeight: 700,
                        fontFamily: "DM Mono, monospace",
                        fontSize: 11,
                      }}
                    >
                      {p.pct}% spend
                    </span>
                    <span style={{ color: "#6B7280" }}>=</span>
                    <span
                      className="num font-semibold"
                      style={{
                        color: NAVY,
                        fontFamily: "DM Mono, monospace",
                      }}
                    >
                      {p.parts.toLocaleString()} parts
                    </span>
                  </div>
                  <span
                    className="num"
                    style={{
                      color: "#9CA3AF",
                      fontFamily: "DM Mono, monospace",
                    }}
                  >
                    {p.pctCount.toFixed(1)}% of SKUs
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Sole-source by ATA + Data Quality */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {summary.sole_source_by_ata.length > 0 && (
          <div
            className="xl:col-span-2 rounded-xl p-5"
            style={{
              background: "white",
              border: "1px solid #E8E9EC",
              boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
            }}
          >
            <div className="mb-3">
              <div className="flex items-center gap-1.5">
                <Lock size={14} style={{ color: ORANGE }} />
                <h3
                  className="font-semibold text-sm"
                  style={{ fontFamily: "Sora, sans-serif", color: NAVY }}
                >
                  Sole-Source Concentration by ATA
                </h3>
                <InfoTip text="ATA categories ranked by what share of their dollar spend is locked to a single source. Categories ≥1% of total spend only. High % → PMA / alternate-source candidates." />
              </div>
              <p
                className="text-xs mt-0.5"
                style={{ color: "#9CA3AF", fontFamily: "DM Sans, sans-serif" }}
              >
                Top targets for PMA, alternate sourcing, or volume negotiation
              </p>
            </div>
            <div className="space-y-2">
              {summary.sole_source_by_ata.map((a) => (
                <div key={a.name}>
                  <div
                    className="flex justify-between items-center text-xs mb-1"
                    style={{ fontFamily: "DM Sans, sans-serif" }}
                  >
                    <span
                      className="truncate"
                      style={{ color: NAVY, fontWeight: 500, maxWidth: 320 }}
                      title={a.name}
                    >
                      {a.name}
                    </span>
                    <span className="flex items-center gap-3 shrink-0">
                      <span
                        className="num"
                        style={{
                          color: "#9CA3AF",
                          fontFamily: "DM Mono, monospace",
                        }}
                      >
                        {fmtMoney(a.soleSourceSpend)} / {fmtMoney(a.totalSpend)}
                      </span>
                      <span
                        className="num font-semibold"
                        style={{
                          color: a.pct >= 90 ? RED : a.pct >= 60 ? ORANGE : "#6B7280",
                          fontFamily: "DM Mono, monospace",
                          minWidth: 48,
                          textAlign: "right",
                        }}
                      >
                        {a.pct.toFixed(0)}%
                      </span>
                    </span>
                  </div>
                  <div
                    className="h-2 rounded-full overflow-hidden"
                    style={{ background: "#F3F4F6" }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(100, a.pct)}%`,
                        background:
                          a.pct >= 90 ? RED : a.pct >= 60 ? ORANGE : "#9CA3AF",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Data Quality card */}
        <div
          className="rounded-xl p-5"
          style={{
            background: "white",
            border: "1px solid #E8E9EC",
            boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
          }}
        >
          <div className="flex items-center gap-1.5 mb-3">
            <AlertTriangle size={14} style={{ color: "#F59E0B" }} />
            <h3
              className="font-semibold text-sm"
              style={{ fontFamily: "Sora, sans-serif", color: NAVY }}
            >
              Data Quality
            </h3>
            <InfoTip text="Caveats to keep in mind when presenting the savings number. These are rows where the benchmark or vendor mapping is uncertain." />
          </div>
          <div className="space-y-2.5">
            {[
              {
                label: "UOM mismatch",
                count: summary.data_quality.uom_warning_count,
                pct: summary.data_quality.uom_warning_pct,
                color: "#F59E0B",
                bg: "rgba(245,158,11,0.08)",
                hint: "verify before negotiating",
              },
              {
                label: "Price suppressed",
                count: summary.data_quality.suppressed_price_count,
                pct: summary.total_parts
                  ? (summary.data_quality.suppressed_price_count /
                      summary.total_parts) *
                    100
                  : 0,
                color: RED,
                bg: "rgba(239,68,68,0.06)",
                hint: "benchmark intentionally excluded",
              },
              {
                label: "OEM unknown",
                count: summary.data_quality.missing_oem_count,
                pct: summary.data_quality.missing_oem_pct,
                color: "#6B7280",
                bg: "#F9FAFB",
                hint: "map to source before sourcing",
              },
            ].map((row) => (
              <div
                key={row.label}
                className="rounded-lg p-3"
                style={{ background: row.bg }}
              >
                <div
                  className="flex items-baseline justify-between"
                  style={{ fontFamily: "DM Sans, sans-serif" }}
                >
                  <span
                    className="text-xs font-semibold"
                    style={{ color: NAVY }}
                  >
                    {row.label}
                  </span>
                  <span
                    className="num font-bold text-sm"
                    style={{
                      color: row.color,
                      fontFamily: "DM Mono, monospace",
                    }}
                  >
                    {row.count.toLocaleString()}
                    <span
                      className="text-xs ml-1"
                      style={{ color: "#9CA3AF", fontWeight: 500 }}
                    >
                      ({row.pct.toFixed(1)}%)
                    </span>
                  </span>
                </div>
                <div
                  className="text-xs mt-0.5"
                  style={{
                    color: "#9CA3AF",
                    fontFamily: "DM Sans, sans-serif",
                  }}
                >
                  {row.hint}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── TABLE FILTERS (shared shape) ────────────────────────────────────────────

interface Filters {
  query: string;
  oem: string[];
  ata: string[];
  airline: string[];
  soleSourceOnly: boolean;
  savingsOnly: boolean;
  uomWarningOnly: boolean;
}

const emptyFilters: Filters = {
  query: "",
  oem: [],
  ata: [],
  airline: [],
  soleSourceOnly: false,
  savingsOnly: false,
  uomWarningOnly: false,
};

function FilterBar({
  filters,
  setFilters,
  summary,
  showEnrichmentToggles,
}: {
  filters: Filters;
  setFilters: (f: Filters) => void;
  summary: PartsSummary;
  showEnrichmentToggles: boolean;
}) {
  const inputStyle: React.CSSProperties = {
    background: "white",
    border: "1px solid #E8E9EC",
    borderRadius: 8,
    padding: "6px 10px",
    fontSize: 12,
    fontFamily: "DM Sans, sans-serif",
    color: NAVY,
    outline: "none",
    minWidth: 0,
  };

  return (
    <div className="flex flex-wrap gap-2 items-center mb-3">
      <div className="relative flex-1 min-w-[200px]">
        <Search
          size={13}
          style={{
            position: "absolute",
            left: 9,
            top: "50%",
            transform: "translateY(-50%)",
            color: "#9CA3AF",
          }}
        />
        <input
          type="text"
          placeholder="Search part # or nomenclature…"
          value={filters.query}
          onChange={(e) => setFilters({ ...filters, query: e.target.value })}
          style={{ ...inputStyle, paddingLeft: 28, width: "100%" }}
        />
      </div>
      <MultiSelect
        label="OEMs"
        options={summary.oem_options}
        selected={filters.oem}
        onChange={(v) => setFilters({ ...filters, oem: v })}
      />
      <MultiSelect
        label="ATA"
        options={summary.ata_options}
        selected={filters.ata}
        onChange={(v) => setFilters({ ...filters, ata: v })}
      />
      <MultiSelect
        label="Airlines"
        options={summary.airline_options}
        selected={filters.airline}
        onChange={(v) => setFilters({ ...filters, airline: v })}
      />
      <ToggleChip
        active={filters.soleSourceOnly}
        onClick={() => setFilters({ ...filters, soleSourceOnly: !filters.soleSourceOnly })}
        color={ORANGE}
      >
        Sole-source only
      </ToggleChip>
      {showEnrichmentToggles && (
        <>
          <ToggleChip
            active={filters.savingsOnly}
            onClick={() => setFilters({ ...filters, savingsOnly: !filters.savingsOnly })}
            color={GREEN}
          >
            Savings flag
          </ToggleChip>
          <ToggleChip
            active={filters.uomWarningOnly}
            onClick={() => setFilters({ ...filters, uomWarningOnly: !filters.uomWarningOnly })}
            color="#F59E0B"
          >
            UOM warning
          </ToggleChip>
        </>
      )}
      {(filters.query ||
        filters.oem.length ||
        filters.ata.length ||
        filters.airline.length ||
        filters.soleSourceOnly ||
        filters.savingsOnly ||
        filters.uomWarningOnly) && (
        <button
          onClick={() => setFilters(emptyFilters)}
          style={{
            ...inputStyle,
            cursor: "pointer",
            color: "#6B7280",
            background: "#F9FAFB",
          }}
        >
          Clear
        </button>
      )}
    </div>
  );
}

function MultiSelect({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  // Convention: empty `selected` array means "all options selected" (no filter).
  // When the user starts toggling individual items, we materialize the explicit
  // subset; if they end up with all options ticked, we collapse back to empty.
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const allSelected = selected.length === 0 || selected.length === options.length;
  const effectiveSet = allSelected ? new Set(options) : new Set(selected);

  const filteredOpts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [options, query]);

  const toggle = (val: string) => {
    const next = new Set(effectiveSet);
    if (next.has(val)) next.delete(val);
    else next.add(val);
    if (next.size === options.length || next.size === 0) {
      onChange([]); // back to "all"
    } else {
      onChange(Array.from(next));
    }
  };

  const selectAll = () => onChange([]);
  const clearAll = () => {
    // Clear-all means "none selected" — filter shows zero rows. Represent it by
    // a single sentinel that doesn't exist in the options so the count works.
    onChange(["__none__"]);
  };

  const summary = allSelected
    ? `All ${label}`
    : selected.length === 0 || (selected.length === 1 && selected[0] === "__none__")
      ? `No ${label}`
      : `${selected.length} ${label}`;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          background: "white",
          border: `1px solid ${allSelected ? "#E8E9EC" : ORANGE}`,
          borderRadius: 8,
          padding: "6px 10px",
          fontSize: 12,
          fontFamily: "DM Sans, sans-serif",
          color: allSelected ? NAVY : ORANGE,
          fontWeight: allSelected ? 500 : 600,
          cursor: "pointer",
          minWidth: 120,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 6,
        }}
      >
        <span className="truncate">{summary}</span>
        <span style={{ fontSize: 9, color: "#9CA3AF" }}>▾</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div
            className="absolute z-40 mt-1 rounded-lg overflow-hidden"
            style={{
              background: "white",
              border: "1px solid #E8E9EC",
              boxShadow: "0 8px 24px rgba(0,0,0,0.10)",
              width: 260,
              left: 0,
            }}
          >
            <div
              className="px-2 py-2"
              style={{ borderBottom: "1px solid #F3F4F6" }}
            >
              <input
                autoFocus
                placeholder={`Search ${label.toLowerCase()}…`}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                style={{
                  width: "100%",
                  border: "1px solid #E8E9EC",
                  borderRadius: 6,
                  padding: "4px 8px",
                  fontSize: 12,
                  fontFamily: "DM Sans, sans-serif",
                  color: NAVY,
                  outline: "none",
                }}
              />
              <div className="flex gap-1 mt-2">
                <button
                  onClick={selectAll}
                  style={{
                    flex: 1,
                    padding: "3px 6px",
                    fontSize: 11,
                    borderRadius: 5,
                    border: "1px solid #E8E9EC",
                    background: allSelected ? "rgba(232,119,34,0.08)" : "white",
                    color: allSelected ? ORANGE : "#6B7280",
                    fontWeight: 600,
                    fontFamily: "DM Sans, sans-serif",
                    cursor: "pointer",
                  }}
                >
                  Select all
                </button>
                <button
                  onClick={clearAll}
                  style={{
                    flex: 1,
                    padding: "3px 6px",
                    fontSize: 11,
                    borderRadius: 5,
                    border: "1px solid #E8E9EC",
                    background: "white",
                    color: "#6B7280",
                    fontWeight: 600,
                    fontFamily: "DM Sans, sans-serif",
                    cursor: "pointer",
                  }}
                >
                  Clear
                </button>
              </div>
            </div>
            <div style={{ maxHeight: 240, overflowY: "auto" }}>
              {filteredOpts.length === 0 ? (
                <div
                  className="px-3 py-3 text-xs text-center"
                  style={{ color: "#9CA3AF", fontFamily: "DM Sans, sans-serif" }}
                >
                  No matches
                </div>
              ) : (
                filteredOpts.map((opt) => {
                  const checked = effectiveSet.has(opt);
                  return (
                    <label
                      key={opt}
                      className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-gray-50"
                      style={{
                        fontSize: 12,
                        fontFamily: "DM Sans, sans-serif",
                        color: NAVY,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(opt)}
                        style={{ accentColor: ORANGE, cursor: "pointer" }}
                      />
                      <span className="truncate" title={opt}>
                        {opt}
                      </span>
                    </label>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ToggleChip({
  active,
  onClick,
  color,
  children,
}: {
  active: boolean;
  onClick: () => void;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "6px 10px",
        borderRadius: 8,
        fontSize: 12,
        fontFamily: "DM Sans, sans-serif",
        cursor: "pointer",
        border: `1px solid ${active ? color : "#E8E9EC"}`,
        background: active ? `${color}14` : "white",
        color: active ? color : "#6B7280",
        fontWeight: active ? 600 : 500,
      }}
    >
      {children}
    </button>
  );
}

// ─── CSV export ──────────────────────────────────────────────────────────────

function downloadCsv(filename: string, rows: Record<string, unknown>[], headers: string[]) {
  const esc = (v: unknown) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const lines = [headers.join(",")];
  for (const r of rows) lines.push(headers.map((h) => esc(r[h])).join(","));
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── ENRICHED TABLE ──────────────────────────────────────────────────────────

const PAGE_SIZE = 50;

function EnrichedTab({
  summary,
  onRowClick,
  selectedPartNumber,
}: {
  summary: PartsSummary;
  onRowClick: (partNumber: string) => void;
  selectedPartNumber: string | null;
}) {
  const { data, loading, error } = useEnrichedParts(true);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = filters.query.trim().toLowerCase();
    const oemSet = filters.oem.length ? new Set(filters.oem) : null;
    const ataSet = filters.ata.length ? new Set(filters.ata) : null;
    const airSet = filters.airline.length ? new Set(filters.airline) : null;
    return data.filter((r) => {
      if (q && !r.part_number.toLowerCase().includes(q) && !r.nomenclature.toLowerCase().includes(q)) return false;
      if (oemSet && !oemSet.has(r.oem)) return false;
      if (ataSet && !ataSet.has(r.ata_description)) return false;
      if (airSet && !airSet.has(r.airline_source)) return false;
      if (filters.soleSourceOnly && !r.is_sole_source) return false;
      if (filters.savingsOnly && !r.savings_flag) return false;
      if (filters.uomWarningOnly && !r.uom_warning) return false;
      return true;
    });
  }, [data, filters]);

  const pageStart = page * PAGE_SIZE;
  const pageRows = filtered.slice(pageStart, pageStart + PAGE_SIZE);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  useEffect(() => setPage(0), [filters]);

  if (loading) return <LoadingBlock message="Loading 12 000 enriched parts…" />;
  if (error) return <ErrorBlock message={error} />;

  return (
    <div className="pt-2">
      <FilterBar
        filters={filters}
        setFilters={setFilters}
        summary={summary}
        showEnrichmentToggles
      />

      <div className="flex items-center justify-between mb-2">
        <div
          className="text-xs"
          style={{ color: "#6B7280", fontFamily: "DM Sans, sans-serif" }}
        >
          <span className="num font-semibold" style={{ color: NAVY, fontFamily: "DM Mono, monospace" }}>
            {filtered.length.toLocaleString()}
          </span>{" "}
          parts · sorted by spend ↓
        </div>
        <button
          onClick={() =>
            downloadCsv(
              "parts-enriched-filtered.csv",
              filtered.map((r) => ({
                "Part Number": r.part_number,
                Nomenclature: r.nomenclature,
                ATA: r.ata_description,
                Airline: r.airline_source,
                OEM: r.oem,
                "Sole Source": r.is_sole_source,
                Demand: r.total_demand,
                "Total Spend": r.total_cost,
                "Unit Cost": r.unit_cost_best,
                "Online Price": r.online_price,
                "Delta %": r.price_delta_pct,
                "Potential Savings": r.potential_savings,
                "BD Note": r.business_note,
              })),
              [
                "Part Number",
                "Nomenclature",
                "ATA",
                "Airline",
                "OEM",
                "Sole Source",
                "Demand",
                "Total Spend",
                "Unit Cost",
                "Online Price",
                "Delta %",
                "Potential Savings",
                "BD Note",
              ]
            )
          }
          className="flex items-center gap-1.5"
          style={{
            background: "white",
            border: "1px solid #E8E9EC",
            borderRadius: 8,
            padding: "5px 10px",
            fontSize: 12,
            fontFamily: "DM Sans, sans-serif",
            color: NAVY,
            cursor: "pointer",
          }}
        >
          <Download size={12} /> Export CSV
        </button>
      </div>

      <EnrichedTable rows={pageRows} onRowClick={onRowClick} selectedPartNumber={selectedPartNumber} />

      <Paginator page={page} pageCount={pageCount} onChange={setPage} total={filtered.length} />
    </div>
  );
}

function EnrichedTable({
  rows,
  onRowClick,
  selectedPartNumber,
}: {
  rows: EnrichedPart[];
  onRowClick: (partNumber: string) => void;
  selectedPartNumber: string | null;
}) {
  const th: React.CSSProperties = {
    textAlign: "left",
    fontSize: 11,
    fontWeight: 600,
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    padding: "8px 10px",
    background: "#F9FAFB",
    borderBottom: "1px solid #E8E9EC",
    fontFamily: "DM Sans, sans-serif",
    position: "sticky",
    top: 0,
    zIndex: 1,
  };
  const td: React.CSSProperties = {
    padding: "8px 10px",
    fontSize: 12,
    color: NAVY,
    borderBottom: "1px solid #F3F4F6",
    fontFamily: "DM Sans, sans-serif",
    verticalAlign: "top",
  };
  const num: React.CSSProperties = { ...td, fontFamily: "DM Mono, monospace", textAlign: "right", whiteSpace: "nowrap" };

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: "white",
        border: "1px solid #E8E9EC",
        boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
      }}
    >
      <div style={{ maxHeight: 620, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1100 }}>
          <thead>
            <tr>
              <th style={th}>Part #</th>
              <th style={th}>Nomenclature</th>
              <th style={th}>ATA</th>
              <th style={th}>Airline</th>
              <th style={th}>OEM</th>
              <th style={{ ...th, textAlign: "right" }}>Demand</th>
              <th style={{ ...th, textAlign: "right" }}>Total Spend</th>
              <th style={{ ...th, textAlign: "right" }}>Unit Cost</th>
              <th style={{ ...th, textAlign: "right" }}>Online Price</th>
              <th style={{ ...th, textAlign: "right" }}>Δ %</th>
              <th style={{ ...th, textAlign: "right" }}>Savings</th>
              <th style={th}>BD Note</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={12} style={{ ...td, textAlign: "center", padding: 32, color: "#9CA3AF" }}>
                  No parts match the current filters.
                </td>
              </tr>
            )}
            {rows.map((r) => {
              const delta = r.price_delta_pct;
              const deltaColor =
                delta === null ? "#9CA3AF" : delta < 0 ? GREEN : delta > 0 ? RED : "#6B7280";
              const deltaBg =
                delta === null ? "transparent" : delta < 0 ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)";
              const isSelected = selectedPartNumber === r.part_number;
              return (
                <tr
                  key={r.part_number}
                  onClick={() => onRowClick(r.part_number)}
                  className="hover:bg-gray-50"
                  style={{
                    cursor: "pointer",
                    background: isSelected ? "rgba(232,119,34,0.06)" : undefined,
                  }}
                >
                  <td style={{ ...td, fontFamily: "DM Mono, monospace", fontWeight: 600 }}>
                    {r.part_number}
                  </td>
                  <td style={{ ...td, maxWidth: 260 }} title={r.nomenclature}>
                    <div className="truncate" style={{ maxWidth: 260 }}>{r.nomenclature}</div>
                  </td>
                  <td style={td} title={r.ata_full}>
                    {r.ata_description || "—"}
                  </td>
                  <td style={td}>{r.airline_source || "—"}</td>
                  <td style={td}>
                    <div className="flex items-center gap-1.5">
                      <span>{r.oem || "—"}</span>
                      {r.is_sole_source && (
                        <span
                          style={{
                            fontSize: 9,
                            padding: "1px 5px",
                            borderRadius: 4,
                            background: "rgba(232,119,34,0.12)",
                            color: ORANGE,
                            fontWeight: 600,
                            fontFamily: "DM Sans, sans-serif",
                          }}
                        >
                          SOLE
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={num}>{fmtNum(r.total_demand)}</td>
                  <td style={{ ...num, fontWeight: 600 }}>{fmtMoneyFull(r.total_cost)}</td>
                  <td style={num}>{fmtMoneyFull(r.unit_cost_best)}</td>
                  <td style={num}>
                    {r.online_price !== null ? (
                      <span className="inline-flex items-center gap-1 justify-end">
                        {fmtMoneyFull(r.online_price)}
                        {r.price_source_url && (
                          <a
                            href={r.price_source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={r.price_source}
                            onClick={(e) => e.stopPropagation()}
                            style={{ color: "#9CA3AF" }}
                          >
                            <ExternalLink size={11} />
                          </a>
                        )}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td style={{ ...num }}>
                    {delta !== null ? (
                      <span
                        style={{
                          padding: "2px 6px",
                          borderRadius: 4,
                          background: deltaBg,
                          color: deltaColor,
                          fontWeight: 600,
                          fontSize: 11,
                        }}
                      >
                        {fmtPct(delta)}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td style={{ ...num, color: r.potential_savings ? GREEN : "#9CA3AF", fontWeight: 600 }}>
                    {fmtMoneyFull(r.potential_savings)}
                  </td>
                  <td style={{ ...td, maxWidth: 340 }} onClick={(e) => e.stopPropagation()}>
                    {r.business_note ? (
                      <details>
                        <summary
                          style={{
                            cursor: "pointer",
                            color: "#4B5563",
                            fontSize: 12,
                            listStyle: "none",
                          }}
                        >
                          <div className="flex items-center gap-1.5">
                            {r.uom_warning && <AlertTriangle size={11} style={{ color: "#F59E0B" }} />}
                            <span
                              style={{
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                                overflow: "hidden",
                                maxWidth: 320,
                              }}
                            >
                              {r.business_note}
                            </span>
                          </div>
                        </summary>
                        <div
                          style={{
                            marginTop: 6,
                            padding: 10,
                            background: "#F9FAFB",
                            borderRadius: 6,
                            fontSize: 12,
                            lineHeight: 1.5,
                            color: "#374151",
                            maxWidth: 380,
                          }}
                        >
                          {r.uom_warning && (
                            <div
                              style={{
                                marginBottom: 6,
                                padding: "6px 8px",
                                background: "rgba(245,158,11,0.1)",
                                color: "#B45309",
                                borderRadius: 4,
                                fontSize: 11,
                                fontWeight: 600,
                              }}
                            >
                              ⚠ Unit-of-measure mismatch — verify online price before negotiating.
                            </div>
                          )}
                          {r.business_note}
                        </div>
                      </details>
                    ) : (
                      <span style={{ color: "#9CA3AF" }}>—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── ALL 48k TAB ─────────────────────────────────────────────────────────────

// Slim an enriched part down to TailPart shape so the combined list is
// homogeneous and the table only renders the columns guaranteed to exist for
// every row in the 48k dataset.
function enrichedToTail(r: EnrichedPart): TailPart {
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

function AllTab({
  summary,
  onSwitchTab,
  onRowClick,
  selectedPartNumber,
}: {
  summary: PartsSummary;
  onSwitchTab: (id: string) => void;
  onRowClick: (partNumber: string) => void;
  selectedPartNumber: string | null;
}) {
  const tail = useTailParts(true);
  const enriched = useEnrichedParts(true);
  const loading = tail.loading || enriched.loading;
  const error = tail.error || enriched.error;

  // Concatenate enriched (slimmed) + tail to form the full 48k list. We sort
  // by total_cost desc so the table reads spend-first like the other tabs.
  const allParts = useMemo<TailPart[]>(() => {
    if (!tail.data || !enriched.data) return [];
    const combined = [
      ...enriched.data.map(enrichedToTail),
      ...tail.data,
    ];
    combined.sort((a, b) => (b.total_cost ?? 0) - (a.total_cost ?? 0));
    return combined;
  }, [tail.data, enriched.data]);

  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    if (!allParts.length) return [];
    const q = filters.query.trim().toLowerCase();
    const oemSet = filters.oem.length ? new Set(filters.oem) : null;
    const ataSet = filters.ata.length ? new Set(filters.ata) : null;
    const airSet = filters.airline.length ? new Set(filters.airline) : null;
    return allParts.filter((r) => {
      if (q && !r.part_number.toLowerCase().includes(q) && !r.nomenclature.toLowerCase().includes(q)) return false;
      if (oemSet && !oemSet.has(r.oem)) return false;
      if (ataSet && !ataSet.has(r.ata_description)) return false;
      if (airSet && !airSet.has(r.airline_source)) return false;
      if (filters.soleSourceOnly && !r.is_sole_source) return false;
      return true;
    });
  }, [allParts, filters]);

  const pageStart = page * PAGE_SIZE;
  const pageRows = filtered.slice(pageStart, pageStart + PAGE_SIZE);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  useEffect(() => setPage(0), [filters]);

  if (loading) return <LoadingBlock message={`Loading all ${summary.total_parts.toLocaleString()} parts…`} />;
  if (error) return <ErrorBlock message={error} />;

  return (
    <div className="pt-2">
      <div
        className="rounded-lg p-3 mb-3 flex items-start gap-2.5"
        style={{ background: "rgba(74,144,217,0.06)", border: "1px solid rgba(74,144,217,0.2)" }}
      >
        <div
          style={{
            width: 4,
            background: "#4A90D9",
            alignSelf: "stretch",
            borderRadius: 2,
            flexShrink: 0,
          }}
        />
        <div style={{ fontSize: 12, color: "#374151", fontFamily: "DM Sans, sans-serif" }}>
          Showing <strong>all {summary.total_parts.toLocaleString()} parts</strong> sorted by spend. The top 12 000 also have
          online-price benchmarks and BD notes — see the{" "}
          <button
            onClick={() => onSwitchTab("enriched")}
            style={{
              color: ORANGE,
              fontWeight: 600,
              textDecoration: "underline",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
              font: "inherit",
            }}
          >
            Top 12K Parts
          </button>{" "}
          tab for the richer view.
        </div>
      </div>

      <FilterBar
        filters={filters}
        setFilters={setFilters}
        summary={summary}
        showEnrichmentToggles={false}
      />

      <div className="flex items-center justify-between mb-2">
        <div
          className="text-xs"
          style={{ color: "#6B7280", fontFamily: "DM Sans, sans-serif" }}
        >
          <span className="num font-semibold" style={{ color: NAVY, fontFamily: "DM Mono, monospace" }}>
            {filtered.length.toLocaleString()}
          </span>{" "}
          parts
        </div>
        <button
          onClick={() =>
            downloadCsv(
              "parts-tail-filtered.csv",
              filtered.map((r) => ({
                "Part Number": r.part_number,
                Nomenclature: r.nomenclature,
                ATA: r.ata_description,
                Airline: r.airline_source,
                OEM: r.oem,
                "Sole Source": r.is_sole_source,
                Demand: r.total_demand,
                "Total Spend": r.total_cost,
                "Unit Cost": r.unit_cost_best,
                UOM: r.uom,
              })),
              [
                "Part Number",
                "Nomenclature",
                "ATA",
                "Airline",
                "OEM",
                "Sole Source",
                "Demand",
                "Total Spend",
                "Unit Cost",
                "UOM",
              ]
            )
          }
          className="flex items-center gap-1.5"
          style={{
            background: "white",
            border: "1px solid #E8E9EC",
            borderRadius: 8,
            padding: "5px 10px",
            fontSize: 12,
            fontFamily: "DM Sans, sans-serif",
            color: NAVY,
            cursor: "pointer",
          }}
        >
          <Download size={12} /> Export CSV
        </button>
      </div>

      <TailTable rows={pageRows} onRowClick={onRowClick} selectedPartNumber={selectedPartNumber} />

      <Paginator page={page} pageCount={pageCount} onChange={setPage} total={filtered.length} />
    </div>
  );
}

function TailTable({
  rows,
  onRowClick,
  selectedPartNumber,
}: {
  rows: TailPart[];
  onRowClick: (partNumber: string) => void;
  selectedPartNumber: string | null;
}) {
  const th: React.CSSProperties = {
    textAlign: "left",
    fontSize: 11,
    fontWeight: 600,
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    padding: "8px 10px",
    background: "#F9FAFB",
    borderBottom: "1px solid #E8E9EC",
    fontFamily: "DM Sans, sans-serif",
    position: "sticky",
    top: 0,
    zIndex: 1,
  };
  const td: React.CSSProperties = {
    padding: "8px 10px",
    fontSize: 12,
    color: NAVY,
    borderBottom: "1px solid #F3F4F6",
    fontFamily: "DM Sans, sans-serif",
  };
  const num: React.CSSProperties = { ...td, fontFamily: "DM Mono, monospace", textAlign: "right", whiteSpace: "nowrap" };

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: "white",
        border: "1px solid #E8E9EC",
        boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
      }}
    >
      <div style={{ maxHeight: 620, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
          <thead>
            <tr>
              <th style={th}>Part #</th>
              <th style={th}>Nomenclature</th>
              <th style={th}>ATA</th>
              <th style={th}>Airline</th>
              <th style={th}>OEM</th>
              <th style={{ ...th, textAlign: "right" }}>Demand</th>
              <th style={{ ...th, textAlign: "right" }}>Total Spend</th>
              <th style={{ ...th, textAlign: "right" }}>Unit Cost</th>
              <th style={th}>UOM</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={9} style={{ ...td, textAlign: "center", padding: 32, color: "#9CA3AF" }}>
                  No parts match the current filters.
                </td>
              </tr>
            )}
            {rows.map((r) => {
              const isSelected = selectedPartNumber === r.part_number;
              return (
              <tr
                key={r.part_number}
                onClick={() => onRowClick(r.part_number)}
                className="hover:bg-gray-50"
                style={{
                  cursor: "pointer",
                  background: isSelected ? "rgba(232,119,34,0.06)" : undefined,
                }}
              >
                <td style={{ ...td, fontFamily: "DM Mono, monospace", fontWeight: 600 }}>
                  {r.part_number}
                </td>
                <td style={{ ...td, maxWidth: 320 }} title={r.nomenclature}>
                  <div className="truncate" style={{ maxWidth: 320 }}>{r.nomenclature}</div>
                </td>
                <td style={td}>{r.ata_description || "—"}</td>
                <td style={td}>{r.airline_source || "—"}</td>
                <td style={td}>
                  <div className="flex items-center gap-1.5">
                    <span>{r.oem || "—"}</span>
                    {r.is_sole_source && (
                      <span
                        style={{
                          fontSize: 9,
                          padding: "1px 5px",
                          borderRadius: 4,
                          background: "rgba(232,119,34,0.12)",
                          color: ORANGE,
                          fontWeight: 600,
                          fontFamily: "DM Sans, sans-serif",
                        }}
                      >
                        SOLE
                      </span>
                    )}
                  </div>
                </td>
                <td style={num}>{fmtNum(r.total_demand)}</td>
                <td style={{ ...num, fontWeight: 600 }}>{fmtMoneyFull(r.total_cost)}</td>
                <td style={num}>{fmtMoneyFull(r.unit_cost_best)}</td>
                <td style={td}>{r.uom || "—"}</td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Shared helpers ──────────────────────────────────────────────────────────

function Paginator({
  page,
  pageCount,
  onChange,
  total,
}: {
  page: number;
  pageCount: number;
  onChange: (p: number) => void;
  total: number;
}) {
  if (total === 0) return null;
  const btn: React.CSSProperties = {
    padding: "4px 10px",
    fontSize: 12,
    borderRadius: 6,
    border: "1px solid #E8E9EC",
    background: "white",
    color: NAVY,
    cursor: "pointer",
    fontFamily: "DM Sans, sans-serif",
  };
  const disabled: React.CSSProperties = { ...btn, opacity: 0.4, cursor: "not-allowed" };
  return (
    <div className="flex items-center justify-between mt-3">
      <div
        className="text-xs"
        style={{ color: "#9CA3AF", fontFamily: "DM Sans, sans-serif" }}
      >
        Page{" "}
        <span className="num" style={{ color: NAVY, fontFamily: "DM Mono, monospace" }}>
          {page + 1}
        </span>{" "}
        of{" "}
        <span className="num" style={{ color: NAVY, fontFamily: "DM Mono, monospace" }}>
          {pageCount}
        </span>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(0)}
          disabled={page === 0}
          style={page === 0 ? disabled : btn}
        >
          ‹‹
        </button>
        <button
          onClick={() => onChange(Math.max(0, page - 1))}
          disabled={page === 0}
          style={page === 0 ? disabled : btn}
        >
          Prev
        </button>
        <button
          onClick={() => onChange(Math.min(pageCount - 1, page + 1))}
          disabled={page >= pageCount - 1}
          style={page >= pageCount - 1 ? disabled : btn}
        >
          Next
        </button>
        <button
          onClick={() => onChange(pageCount - 1)}
          disabled={page >= pageCount - 1}
          style={page >= pageCount - 1 ? disabled : btn}
        >
          ››
        </button>
      </div>
    </div>
  );
}

function LoadingBlock({ message }: { message: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-2 rounded-xl"
      style={{
        background: "white",
        border: "1px solid #E8E9EC",
        padding: 60,
      }}
    >
      <Loader2 size={28} className="animate-spin" style={{ color: ORANGE }} />
      <div
        className="text-sm"
        style={{ color: "#6B7280", fontFamily: "DM Sans, sans-serif" }}
      >
        {message}
      </div>
    </div>
  );
}

function ErrorBlock({ message }: { message: string }) {
  return (
    <div
      className="rounded-xl p-5 flex items-start gap-3"
      style={{
        background: "rgba(239,68,68,0.06)",
        border: "1px solid rgba(239,68,68,0.2)",
      }}
    >
      <AlertTriangle size={18} style={{ color: RED, flexShrink: 0, marginTop: 1 }} />
      <div>
        <div
          className="text-sm font-semibold"
          style={{ color: RED, fontFamily: "DM Sans, sans-serif" }}
        >
          Could not load parts data
        </div>
        <div
          className="text-xs mt-1"
          style={{ color: "#6B7280", fontFamily: "DM Sans, sans-serif" }}
        >
          {message}
        </div>
        <div
          className="text-xs mt-2"
          style={{ color: "#9CA3AF", fontFamily: "DM Sans, sans-serif" }}
        >
          Run <code>pnpm build:parts</code> from the project root to regenerate the JSON files.
        </div>
      </div>
    </div>
  );
}

// ─── ROOT EXPORT ─────────────────────────────────────────────────────────────

interface PartsSectionProps {
  tab?: string;
  onTabChange?: (tab: string) => void;
}

export default function PartsSection({ tab, onTabChange }: PartsSectionProps = {}) {
  const [internalTab, setInternalTab] = useState("insights");
  const activeTab = tab ?? internalTab;
  const setTab = onTabChange ?? setInternalTab;
  const { data: summary, loading, error } = usePartsSummary();
  const { flagCount } = usePartFlags();

  // Detail drawer state — shared across tabs
  const [selectedPartNumber, setSelectedPartNumber] = useState<string | null>(null);

  if (loading) return <LoadingBlock message="Loading parts summary…" />;
  if (error || !summary) return <ErrorBlock message={error || "Summary missing"} />;

  const onRowClick = (partNumber: string) => setSelectedPartNumber(partNumber);

  return (
    <div className="flex gap-4 items-start">
      <div className="flex-1 min-w-0">
        <Tabs value={activeTab} onValueChange={setTab} className="w-full">
          <TabsList
            className="flex gap-1"
            style={{
              background: "white",
              padding: 6,
              height: "auto",
              borderRadius: 12,
              border: "1px solid #E8E9EC",
              boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
              width: "fit-content",
              marginBottom: 16,
            }}
          >
            <PartTabTrigger value="insights">
              <BarChart3 size={14} style={{ marginRight: 6 }} />
              Insights
            </PartTabTrigger>
            <PartTabTrigger value="enriched">
              <Star size={14} style={{ marginRight: 6 }} />
              Top 12K Parts
              <span
                style={{
                  marginLeft: 8,
                  fontSize: 10.5,
                  padding: "2px 7px",
                  borderRadius: 5,
                  background: "rgba(232,119,34,0.15)",
                  color: ORANGE,
                  fontFamily: "DM Mono, monospace",
                  fontWeight: 700,
                  lineHeight: 1.2,
                }}
              >
                95.5% spend
              </span>
            </PartTabTrigger>
            <PartTabTrigger value="all">
              <List size={14} style={{ marginRight: 6 }} />
              All Parts
              <span
                style={{
                  marginLeft: 8,
                  fontSize: 10.5,
                  padding: "2px 7px",
                  borderRadius: 5,
                  background: "rgba(74,144,217,0.15)",
                  color: "#4A90D9",
                  fontFamily: "DM Mono, monospace",
                  fontWeight: 700,
                  lineHeight: 1.2,
                }}
              >
                {summary.total_parts.toLocaleString()}
              </span>
            </PartTabTrigger>
            <PartTabTrigger value="flagged">
              <Flag size={14} style={{ marginRight: 6 }} />
              Flagged
              {flagCount > 0 && (
                <span
                  style={{
                    marginLeft: 8,
                    fontSize: 10.5,
                    padding: "2px 7px",
                    borderRadius: 5,
                    background: "rgba(232,119,34,0.15)",
                    color: ORANGE,
                    fontFamily: "DM Mono, monospace",
                    fontWeight: 700,
                    lineHeight: 1.2,
                  }}
                >
                  {flagCount}
                </span>
              )}
            </PartTabTrigger>
          </TabsList>

          <TabsContent value="insights">
            <InsightsTab summary={summary} />
          </TabsContent>
          <TabsContent value="enriched">
            <EnrichedTab summary={summary} onRowClick={onRowClick} selectedPartNumber={selectedPartNumber} />
          </TabsContent>
          <TabsContent value="all">
            <AllTab summary={summary} onSwitchTab={setTab} onRowClick={onRowClick} selectedPartNumber={selectedPartNumber} />
          </TabsContent>
          <TabsContent value="flagged">
            <FlaggedTab onRowClick={onRowClick} selectedPartNumber={selectedPartNumber} onSwitchTab={setTab} />
          </TabsContent>
        </Tabs>
      </div>

      {selectedPartNumber && (
        <PartDetailDrawer
          partNumber={selectedPartNumber}
          onClose={() => setSelectedPartNumber(null)}
        />
      )}
    </div>
  );
}

function PartTabTrigger({ value, children }: { value: string; children: React.ReactNode }) {
  return (
    <TabsTrigger
      value={value}
      className="flex-none data-[state=active]:bg-[#1A1A2E] data-[state=active]:text-white data-[state=active]:shadow-sm"
      style={{
        padding: "9px 18px",
        fontSize: 13.5,
        fontFamily: "DM Sans, sans-serif",
        fontWeight: 600,
        borderRadius: 8,
        height: "auto",
        lineHeight: 1.2,
        color: NAVY,
        whiteSpace: "nowrap",
        display: "inline-flex",
        alignItems: "center",
      }}
    >
      {children}
    </TabsTrigger>
  );
}

// ─── FLAGGED TAB ─────────────────────────────────────────────────────────────

function FlaggedTab({
  onRowClick,
  selectedPartNumber,
  onSwitchTab,
}: {
  onRowClick: (partNumber: string) => void;
  selectedPartNumber: string | null;
  onSwitchTab: (id: string) => void;
}) {
  const { flags, removeFlag, clearAll, flagCount } = usePartFlags();
  const list = useMemo(
    () =>
      Object.values(flags).sort(
        (a, b) => (b.flagged_at > a.flagged_at ? 1 : -1)
      ),
    [flags]
  );

  if (flagCount === 0) {
    return (
      <div className="pt-6">
        <div
          className="rounded-xl p-8 flex flex-col items-center text-center"
          style={{ background: "white", border: "1px dashed #E8E9EC" }}
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
            style={{ background: "rgba(232,119,34,0.08)" }}
          >
            <Flag size={24} style={{ color: ORANGE }} />
          </div>
          <h3
            className="text-base font-bold mb-1"
            style={{ color: NAVY, fontFamily: "Sora, sans-serif" }}
          >
            No parts flagged yet
          </h3>
          <p
            className="text-xs max-w-md mb-4"
            style={{ color: "#6B7280", fontFamily: "DM Sans, sans-serif" }}
          >
            Open a part from the <strong>Top 12K Parts</strong> or{" "}
            <strong>All Parts</strong> tab, then click the flag icon in the
            detail panel to add notes, a category, or a custom online price.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => onSwitchTab("enriched")}
              style={{
                background: ORANGE,
                color: "white",
                padding: "6px 14px",
                borderRadius: 8,
                fontSize: 12,
                fontFamily: "DM Sans, sans-serif",
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
              }}
            >
              Browse Top 12K
            </button>
            <button
              onClick={() => onSwitchTab("all")}
              style={{
                background: "white",
                color: NAVY,
                padding: "6px 14px",
                borderRadius: 8,
                fontSize: 12,
                fontFamily: "DM Sans, sans-serif",
                fontWeight: 600,
                border: "1px solid #E8E9EC",
                cursor: "pointer",
              }}
            >
              Browse All Parts
            </button>
          </div>
        </div>
      </div>
    );
  }

  const th: React.CSSProperties = {
    textAlign: "left",
    fontSize: 11,
    fontWeight: 600,
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    padding: "8px 10px",
    background: "#F9FAFB",
    borderBottom: "1px solid #E8E9EC",
    fontFamily: "DM Sans, sans-serif",
    position: "sticky",
    top: 0,
    zIndex: 1,
  };
  const td: React.CSSProperties = {
    padding: "8px 10px",
    fontSize: 12,
    color: NAVY,
    borderBottom: "1px solid #F3F4F6",
    fontFamily: "DM Sans, sans-serif",
  };
  const num: React.CSSProperties = {
    ...td,
    fontFamily: "DM Mono, monospace",
    textAlign: "right",
    whiteSpace: "nowrap",
  };

  return (
    <div className="pt-2">
      <div className="flex items-center justify-between mb-2">
        <div
          className="text-xs"
          style={{ color: "#6B7280", fontFamily: "DM Sans, sans-serif" }}
        >
          <span
            className="num font-semibold"
            style={{ color: NAVY, fontFamily: "DM Mono, monospace" }}
          >
            {flagCount}
          </span>{" "}
          flagged part{flagCount === 1 ? "" : "s"} · stored in your browser
        </div>
        <div className="flex gap-2">
          <button
            onClick={() =>
              downloadCsv(
                "flagged-parts.csv",
                list.map((f) => ({
                  "Part Number": f.part_number,
                  Nomenclature: f.nomenclature,
                  OEM: f.oem,
                  ATA: f.ata_description,
                  Airline: f.airline_source,
                  "Total Cost": f.total_cost,
                  "Sole Source": f.is_sole_source,
                  Category: f.category,
                  Note: f.note,
                  "Custom Online Price": f.custom_online_price,
                  "Custom Price URL": f.custom_price_url,
                  "Flagged At": f.flagged_at,
                })),
                [
                  "Part Number",
                  "Nomenclature",
                  "OEM",
                  "ATA",
                  "Airline",
                  "Total Cost",
                  "Sole Source",
                  "Category",
                  "Note",
                  "Custom Online Price",
                  "Custom Price URL",
                  "Flagged At",
                ]
              )
            }
            className="flex items-center gap-1.5"
            style={{
              background: "white",
              border: "1px solid #E8E9EC",
              borderRadius: 8,
              padding: "5px 10px",
              fontSize: 12,
              fontFamily: "DM Sans, sans-serif",
              color: NAVY,
              cursor: "pointer",
            }}
          >
            <Download size={12} /> Export CSV
          </button>
          <button
            onClick={() => {
              if (confirm(`Remove all ${flagCount} flagged parts?`)) clearAll();
            }}
            className="flex items-center gap-1.5"
            style={{
              background: "white",
              border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: 8,
              padding: "5px 10px",
              fontSize: 12,
              fontFamily: "DM Sans, sans-serif",
              color: RED,
              cursor: "pointer",
            }}
          >
            <Trash2 size={12} /> Clear all
          </button>
        </div>
      </div>

      <div
        className="rounded-xl overflow-hidden"
        style={{
          background: "white",
          border: "1px solid #E8E9EC",
          boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
        }}
      >
        <div style={{ maxHeight: 620, overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1100 }}>
            <thead>
              <tr>
                <th style={th}>Part #</th>
                <th style={th}>Nomenclature</th>
                <th style={th}>Category</th>
                <th style={th}>OEM</th>
                <th style={{ ...th, textAlign: "right" }}>Total Spend</th>
                <th style={{ ...th, textAlign: "right" }}>Custom Online $</th>
                <th style={th}>Note</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {list.map((f) => {
                const cat = PART_FLAG_CATEGORIES.find((c) => c.value === f.category);
                const isSelected = selectedPartNumber === f.part_number;
                return (
                  <tr
                    key={f.part_number}
                    onClick={() => onRowClick(f.part_number)}
                    className="hover:bg-gray-50"
                    style={{
                      cursor: "pointer",
                      background: isSelected ? "rgba(232,119,34,0.06)" : undefined,
                    }}
                  >
                    <td style={{ ...td, fontFamily: "DM Mono, monospace", fontWeight: 600 }}>
                      {f.part_number}
                    </td>
                    <td style={{ ...td, maxWidth: 280 }} title={f.nomenclature}>
                      <div className="truncate" style={{ maxWidth: 280 }}>
                        {f.nomenclature}
                      </div>
                    </td>
                    <td style={td}>
                      {cat && (
                        <span
                          className="chip text-xs"
                          style={{
                            background: cat.bg,
                            color: cat.color,
                            padding: "2px 8px",
                            borderRadius: 999,
                            fontFamily: "DM Sans, sans-serif",
                            fontWeight: 600,
                          }}
                        >
                          {cat.label}
                        </span>
                      )}
                    </td>
                    <td style={td}>
                      <div className="flex items-center gap-1.5">
                        <span>{f.oem || "—"}</span>
                        {f.is_sole_source && (
                          <span
                            style={{
                              fontSize: 9,
                              padding: "1px 5px",
                              borderRadius: 4,
                              background: "rgba(232,119,34,0.12)",
                              color: ORANGE,
                              fontWeight: 600,
                              fontFamily: "DM Sans, sans-serif",
                            }}
                          >
                            SOLE
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ ...num, fontWeight: 600 }}>
                      {fmtMoneyFull(f.total_cost)}
                    </td>
                    <td style={num}>
                      {f.custom_online_price !== null
                        ? fmtMoneyFull(f.custom_online_price)
                        : "—"}
                    </td>
                    <td style={{ ...td, maxWidth: 260, color: "#4B5563" }}>
                      <div
                        style={{
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                          maxWidth: 260,
                        }}
                      >
                        {f.note || (
                          <span style={{ color: "#9CA3AF" }}>(no note)</span>
                        )}
                      </div>
                    </td>
                    <td style={td} onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => removeFlag(f.part_number)}
                        title="Remove flag"
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "#9CA3AF",
                          cursor: "pointer",
                          padding: 4,
                        }}
                      >
                        <X size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── DETAIL DRAWER ───────────────────────────────────────────────────────────

function PartDetailDrawer({
  partNumber,
  onClose,
}: {
  partNumber: string;
  onClose: () => void;
}) {
  // Look the part up in whichever dataset has it. Both hooks return cached
  // data after first load, so this is cheap.
  const { data: enriched } = useEnrichedParts(true);
  const { data: tail } = useTailParts(true);

  const enrichedHit = enriched?.find((p) => p.part_number === partNumber);
  const tailHit = tail?.find((p) => p.part_number === partNumber);
  const part: EnrichedPart | TailPart | null = enrichedHit ?? tailHit ?? null;

  const { flags, addFlag, removeFlag } = usePartFlags();
  const existing = flags[partNumber];

  const [note, setNote] = useState(existing?.note ?? "");
  const [category, setCategory] = useState<PartFlagCategory>(
    existing?.category ?? "review"
  );
  const [customPrice, setCustomPrice] = useState<string>(
    existing?.custom_online_price !== undefined &&
      existing?.custom_online_price !== null
      ? String(existing.custom_online_price)
      : ""
  );
  const [customUrl, setCustomUrl] = useState(existing?.custom_price_url ?? "");

  // Re-seed local state when the selected part changes (drawer stays mounted)
  useEffect(() => {
    setNote(existing?.note ?? "");
    setCategory(existing?.category ?? "review");
    setCustomPrice(
      existing?.custom_online_price !== undefined &&
        existing?.custom_online_price !== null
        ? String(existing.custom_online_price)
        : ""
    );
    setCustomUrl(existing?.custom_price_url ?? "");
  }, [partNumber, existing]);

  if (!part) {
    return (
      <aside
        className="shrink-0 animate-fade-up rounded-xl"
        style={{
          width: 380,
          background: "white",
          border: "1px solid #E8E9EC",
          padding: 24,
          position: "sticky",
          top: 16,
          maxHeight: "calc(100vh - 32px)",
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold" style={{ color: NAVY, fontFamily: "Sora, sans-serif" }}>
            Loading part…
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100">
            <X size={14} style={{ color: "#9CA3AF" }} />
          </button>
        </div>
        <Loader2 size={20} className="animate-spin" style={{ color: ORANGE }} />
      </aside>
    );
  }

  const isEnriched = !!enrichedHit;
  const e = enrichedHit as EnrichedPart | undefined;

  const handleSaveFlag = () => {
    const cp = customPrice.trim();
    const numeric = cp ? Number(cp) : NaN;
    addFlag({
      part_number: part.part_number,
      nomenclature: part.nomenclature,
      oem: part.oem,
      ata_description: part.ata_description,
      airline_source: part.airline_source,
      total_cost: part.total_cost,
      is_sole_source: part.is_sole_source,
      note,
      category,
      custom_online_price: Number.isFinite(numeric) ? numeric : null,
      custom_price_url: customUrl.trim(),
    });
  };

  const handleRemoveFlag = () => {
    removeFlag(part.part_number);
    setNote("");
    setCategory("review");
    setCustomPrice("");
    setCustomUrl("");
  };

  const catMeta =
    PART_FLAG_CATEGORIES.find((c) => c.value === category) ?? PART_FLAG_CATEGORIES[0];

  return (
    <aside
      className="shrink-0 animate-fade-up rounded-xl overflow-hidden flex flex-col"
      style={{
        width: 380,
        background: "white",
        border: "1px solid #E8E9EC",
        boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
        position: "sticky",
        top: 16,
        maxHeight: "calc(100vh - 32px)",
      }}
    >
      {/* Header */}
      <div
        className="px-5 pt-4 pb-3 shrink-0"
        style={{ borderBottom: "1px solid #F3F4F6" }}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div
              className="text-xs"
              style={{ color: "#9CA3AF", fontFamily: "DM Mono, monospace" }}
            >
              {part.part_number}
            </div>
            <h2
              className="font-bold text-sm leading-tight"
              style={{ color: NAVY, fontFamily: "Sora, sans-serif" }}
              title={part.nomenclature}
            >
              {part.nomenclature || "(no nomenclature)"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 shrink-0"
            title="Close"
          >
            <X size={14} style={{ color: "#9CA3AF" }} />
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5 mt-2">
          {part.part_category && (
            <span
              className="chip text-xs"
              style={{
                background: "rgba(34,197,94,0.1)",
                color: GREEN,
                padding: "2px 8px",
                borderRadius: 999,
                fontFamily: "DM Sans, sans-serif",
                fontWeight: 500,
              }}
            >
              {part.part_category}
            </span>
          )}
          {part.ata_description && (
            <span
              className="chip text-xs"
              style={{
                background: "rgba(74,144,217,0.1)",
                color: "#4A90D9",
                padding: "2px 8px",
                borderRadius: 999,
                fontFamily: "DM Sans, sans-serif",
              }}
            >
              {part.ata_description}
            </span>
          )}
          {part.airline_source && (
            <span
              className="chip text-xs"
              style={{
                background: "rgba(123,104,238,0.1)",
                color: "#7B68EE",
                padding: "2px 8px",
                borderRadius: 999,
                fontFamily: "DM Sans, sans-serif",
              }}
            >
              {part.airline_source}
            </span>
          )}
          {part.is_sole_source && (
            <span
              className="chip text-xs"
              style={{
                background: "rgba(232,119,34,0.12)",
                color: ORANGE,
                padding: "2px 8px",
                borderRadius: 999,
                fontFamily: "DM Sans, sans-serif",
                fontWeight: 600,
              }}
            >
              SOLE-SOURCE
            </span>
          )}
          {existing && (
            <span
              className="chip text-xs flex items-center gap-1"
              style={{
                background: catMeta.bg,
                color: catMeta.color,
                padding: "2px 8px",
                borderRadius: 999,
                fontFamily: "DM Sans, sans-serif",
                fontWeight: 600,
              }}
            >
              <Flag size={9} /> {catMeta.label}
            </span>
          )}
        </div>
      </div>

      {/* Scrollable body */}
      <div className="overflow-y-auto flex-1">
        {/* Spend metrics */}
        <div
          className="px-5 py-4 grid grid-cols-3 gap-2"
          style={{ borderBottom: "1px solid #F3F4F6" }}
        >
          <Metric label="Total Spend" value={fmtMoney(part.total_cost)} color={ORANGE} />
          <Metric label="Demand" value={fmtNum(part.total_demand)} color="#4A90D9" />
          <Metric label="Unit Cost" value={fmtMoney(part.unit_cost_best)} color={NAVY} />
        </div>

        {/* All fields */}
        <div className="px-5 py-4 space-y-3" style={{ borderBottom: "1px solid #F3F4F6" }}>
          <SectionHeader icon={Tag} label="Identification" />
          <Field label="Part Number" value={part.part_number} mono />
          <Field label="Nomenclature" value={part.nomenclature} />
          {part.part_category && (
            <Field label="Part Category" value={part.part_category} />
          )}
          {isEnriched && e?.nsn && <Field label="NSN" value={e.nsn} mono />}
          {isEnriched && e?.ata_code && <Field label="ATA Code" value={e.ata_code} mono />}
          <Field label="ATA Description" value={part.ata_description} />
          {isEnriched && e?.ata_full && e.ata_full !== part.ata_description && (
            <Field label="ATA Full" value={e.ata_full} />
          )}

          <SectionHeader icon={Boxes} label="Supplier" />
          <Field label="OEM" value={part.oem} />
          {isEnriched && e?.oem_confidence && (
            <Field label="OEM Confidence" value={e.oem_confidence} />
          )}
          {isEnriched && e?.oem_url && (
            <LinkField label="OEM URL" url={e.oem_url} />
          )}
          <Field
            label="Sole Source"
            value={part.is_sole_source ? "Yes" : "No"}
            valueColor={part.is_sole_source ? ORANGE : "#6B7280"}
          />
          <Field label="Airline Source" value={part.airline_source || "—"} />

          <SectionHeader icon={DollarSign} label="Cost & Demand" />
          <Field label="Total Demand" value={fmtNum(part.total_demand)} mono align="right" />
          {isEnriched && e?.demand_period && (
            <Field label="Demand Period" value={e.demand_period} />
          )}
          <Field label="Total Spend" value={fmtMoneyFull(part.total_cost)} mono align="right" />
          <Field label="Unit Cost (best)" value={fmtMoneyFull(part.unit_cost_best)} mono align="right" />
          {isEnriched && e?.unit_cost_as !== null && e?.unit_cost_as !== undefined && (
            <Field label="Unit Cost — AS" value={fmtMoneyFull(e.unit_cost_as)} mono align="right" />
          )}
          {isEnriched && e?.unit_cost_ha !== null && e?.unit_cost_ha !== undefined && (
            <Field label="Unit Cost — HA" value={fmtMoneyFull(e.unit_cost_ha)} mono align="right" />
          )}
          {isEnriched && e?.unit_cost_qx !== null && e?.unit_cost_qx !== undefined && (
            <Field label="Unit Cost — QX" value={fmtMoneyFull(e.unit_cost_qx)} mono align="right" />
          )}
          <Field label="UOM" value={part.uom || "—"} />

          {isEnriched && e && (
            <>
              <SectionHeader icon={Globe2} label="Online Benchmark" />
              <Field
                label="Online Price"
                value={
                  e.online_price !== null ? fmtMoneyFull(e.online_price) : "Not found"
                }
                mono
                align="right"
                valueColor={e.online_price === null ? "#9CA3AF" : NAVY}
              />
              {e.price_source && <Field label="Source" value={e.price_source} />}
              {e.price_source_url && <LinkField label="Source URL" url={e.price_source_url} />}
              {e.price_delta_pct !== null && (
                <Field
                  label="Δ vs Paid"
                  value={fmtPct(e.price_delta_pct)}
                  mono
                  align="right"
                  valueColor={
                    e.price_delta_pct < 0
                      ? GREEN
                      : e.price_delta_pct > 0
                        ? RED
                        : "#6B7280"
                  }
                />
              )}
              {e.potential_savings !== null && e.potential_savings > 0 && (
                <Field
                  label="Potential Savings"
                  value={fmtMoneyFull(e.potential_savings)}
                  mono
                  align="right"
                  valueColor={GREEN}
                />
              )}
              {e.uom_warning && (
                <div
                  className="rounded-lg p-2 flex items-start gap-2"
                  style={{
                    background: "rgba(245,158,11,0.08)",
                    border: "1px solid rgba(245,158,11,0.25)",
                  }}
                >
                  <AlertTriangle
                    size={13}
                    style={{ color: "#F59E0B", flexShrink: 0, marginTop: 1 }}
                  />
                  <div
                    className="text-xs"
                    style={{ color: "#92400E", fontFamily: "DM Sans, sans-serif" }}
                  >
                    Unit-of-measure mismatch — verify the online price before
                    negotiating.
                  </div>
                </div>
              )}
              {e.aerobase_url && (
                <LinkField label="Aerobase" url={e.aerobase_url} />
              )}
            </>
          )}

          {isEnriched && e?.business_note && (
            <>
              <SectionHeader icon={TrendingUp} label="BD Note" />
              <div
                className="rounded-lg p-3 text-xs leading-relaxed"
                style={{
                  background: "#F9FAFB",
                  border: "1px solid #E8E9EC",
                  color: "#374151",
                  fontFamily: "DM Sans, sans-serif",
                }}
              >
                {e.business_note}
              </div>
            </>
          )}
        </div>

        {/* Flag / annotate */}
        <div className="px-5 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Flag size={14} style={{ color: existing ? ORANGE : "#9CA3AF" }} />
              <h4
                className="text-xs font-bold uppercase"
                style={{
                  color: NAVY,
                  fontFamily: "Sora, sans-serif",
                  letterSpacing: "0.04em",
                }}
              >
                {existing ? "Update Annotation" : "Flag & Annotate"}
              </h4>
            </div>
            {existing && (
              <button
                onClick={handleRemoveFlag}
                className="flex items-center gap-1 px-2 py-1 rounded-md text-xs"
                style={{
                  background: "#FEE2E2",
                  color: RED,
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "DM Sans, sans-serif",
                }}
              >
                <FlagOff size={10} /> Remove
              </button>
            )}
          </div>

          {/* Category */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {PART_FLAG_CATEGORIES.map((c) => (
              <button
                key={c.value}
                onClick={() => setCategory(c.value)}
                className="px-2 py-0.5 rounded-full text-xs font-semibold transition-all"
                style={{
                  background: category === c.value ? c.color : c.bg,
                  color: category === c.value ? "white" : c.color,
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "DM Sans, sans-serif",
                }}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* Note */}
          <label
            className="block text-xs mb-1"
            style={{ color: "#6B7280", fontFamily: "DM Sans, sans-serif" }}
          >
            Note
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add context for the BD team…"
            rows={3}
            className="w-full rounded-lg px-2.5 py-2 text-xs outline-none resize-none mb-3"
            style={{
              border: "1px solid #E8E9EC",
              fontFamily: "DM Sans, sans-serif",
              color: NAVY,
              background: "white",
            }}
          />

          {/* Custom online price */}
          <label
            className="block text-xs mb-1"
            style={{ color: "#6B7280", fontFamily: "DM Sans, sans-serif" }}
          >
            Custom online price ($)
          </label>
          <input
            type="number"
            inputMode="decimal"
            value={customPrice}
            onChange={(e) => setCustomPrice(e.target.value)}
            placeholder="e.g. 184.50"
            className="w-full rounded-lg px-2.5 py-2 text-xs outline-none mb-3"
            style={{
              border: "1px solid #E8E9EC",
              fontFamily: "DM Mono, monospace",
              color: NAVY,
              background: "white",
            }}
          />

          {/* Custom price URL */}
          <label
            className="block text-xs mb-1 flex items-center gap-1"
            style={{ color: "#6B7280", fontFamily: "DM Sans, sans-serif" }}
          >
            <Link2 size={11} /> Source URL
          </label>
          <input
            type="url"
            value={customUrl}
            onChange={(e) => setCustomUrl(e.target.value)}
            placeholder="https://…"
            className="w-full rounded-lg px-2.5 py-2 text-xs outline-none mb-4"
            style={{
              border: "1px solid #E8E9EC",
              fontFamily: "DM Mono, monospace",
              color: NAVY,
              background: "white",
            }}
          />

          <button
            onClick={handleSaveFlag}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all active:scale-[0.98]"
            style={{
              background: ORANGE,
              color: "white",
              border: "none",
              cursor: "pointer",
              fontFamily: "DM Sans, sans-serif",
              boxShadow: "0 2px 8px rgba(232,119,34,0.25)",
            }}
          >
            <Flag size={12} /> {existing ? "Update Flag" : "Flag Part"}
          </button>

          {existing && (
            <div
              className="mt-3 text-xs text-center"
              style={{ color: "#9CA3AF", fontFamily: "DM Sans, sans-serif" }}
            >
              Flagged {new Date(existing.flagged_at).toLocaleString()}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

// ─── Drawer-local helpers ────────────────────────────────────────────────────

function Metric({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div
      className="rounded-lg p-2.5 text-center"
      style={{ background: "#F9FAFB", border: "1px solid #E8E9EC" }}
    >
      <div
        className="text-sm font-bold num"
        style={{ color, fontFamily: "DM Mono, monospace" }}
      >
        {value}
      </div>
      <div
        className="text-xs mt-0.5"
        style={{ color: "#9CA3AF", fontFamily: "DM Sans, sans-serif" }}
      >
        {label}
      </div>
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  label: string;
}) {
  return (
    <div className="flex items-center gap-1.5 pt-1">
      <Icon size={12} style={{ color: ORANGE }} />
      <h4
        className="text-xs font-bold uppercase"
        style={{
          color: NAVY,
          fontFamily: "Sora, sans-serif",
          letterSpacing: "0.04em",
        }}
      >
        {label}
      </h4>
    </div>
  );
}

function Field({
  label,
  value,
  mono,
  align,
  valueColor,
}: {
  label: string;
  value: string;
  mono?: boolean;
  align?: "left" | "right";
  valueColor?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span
        className="text-xs shrink-0"
        style={{ color: "#9CA3AF", fontFamily: "DM Sans, sans-serif" }}
      >
        {label}
      </span>
      <span
        className="text-xs min-w-0"
        style={{
          color: valueColor ?? NAVY,
          fontFamily: mono ? "DM Mono, monospace" : "DM Sans, sans-serif",
          fontWeight: mono ? 500 : 500,
          textAlign: align ?? "right",
          wordBreak: "break-word",
        }}
        title={value}
      >
        {value}
      </span>
    </div>
  );
}

function LinkField({ label, url }: { label: string; url: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span
        className="text-xs shrink-0"
        style={{ color: "#9CA3AF", fontFamily: "DM Sans, sans-serif" }}
      >
        {label}
      </span>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs hover:underline inline-flex items-center gap-1 min-w-0 truncate"
        style={{
          color: "#4A90D9",
          fontFamily: "DM Mono, monospace",
          textAlign: "right",
          maxWidth: 240,
        }}
        title={url}
      >
        <span className="truncate">{url.replace(/^https?:\/\//, "")}</span>
        <ExternalLink size={10} />
      </a>
    </div>
  );
}


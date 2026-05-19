// TailSpend AI — Overview / Home Page
// Design: Precision White | AArete Brand
// Reads from DataContext — populated by Excel upload

import { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  DollarSign, Users, ShieldCheck, AlertTriangle, Plane, TrendingUp,
} from "lucide-react";
import { useData } from "@/contexts/DataContext";
import InfoTip from "@/components/InfoTip";

const ORANGE = "#E87722";
const NAVY = "#1A1A2E";
const PALETTE = [
  "#E87722", "#1A1A2E", "#4A90D9", "#7B68EE", "#50C878",
  "#F5A623", "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4",
];

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

const CustomBarTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="rounded-lg p-3 shadow-lg text-sm" style={{ background: "white", border: "1px solid #E8E9EC", fontFamily: "DM Sans, sans-serif", maxWidth: 220 }}>
        <div className="font-semibold mb-1 text-xs" style={{ color: NAVY }}>{label}</div>
        <div style={{ color: ORANGE }}>{fmt(payload[0].value)}</div>
      </div>
    );
  }
  return null;
};

const CustomPieTooltip = ({ active, payload }: any) => {
  if (active && payload?.length) {
    return (
      <div className="rounded-lg p-2.5 shadow-lg text-xs" style={{ background: "white", border: "1px solid #E8E9EC", fontFamily: "DM Sans, sans-serif" }}>
        <div className="font-semibold mb-0.5" style={{ color: NAVY }}>{payload[0].name}</div>
        <div style={{ color: payload[0].payload.fill }}>{payload[0].value.toLocaleString()} suppliers</div>
      </div>
    );
  }
  return null;
};

export default function Home() {
  const { data } = useData();
  if (!data) return null;

  const { summary, suppliers } = data;

  // KPI cards
  const kpis = [
    {
      label: "Total Spend",
      value: fmt(summary.total_spend),
      sub: `${summary.total_count.toLocaleString()} suppliers`,
      icon: DollarSign,
      color: ORANGE,
      bg: "rgba(232,119,34,0.08)",
    },
    {
      label: "Suppliers Analyzed",
      value: summary.total_count.toLocaleString(),
      sub: `${Object.keys(summary.l1_spend).length} L1 categories`,
      icon: Users,
      color: "#4A90D9",
      bg: "rgba(74,144,217,0.08)",
    },
    {
      label: "High Confidence",
      value: `${Math.round((summary.high_confidence_count / summary.total_count) * 100)}%`,
      sub: `${summary.high_confidence_count.toLocaleString()} suppliers`,
      icon: ShieldCheck,
      color: "#22C55E",
      bg: "rgba(34,197,94,0.08)",
    },
    {
      label: "Review Flags",
      value: summary.review_flag_count.toLocaleString(),
      sub: `${Math.round((summary.review_flag_count / summary.total_count) * 100)}% of sample`,
      icon: AlertTriangle,
      color: "#F59E0B",
      bg: "rgba(245,158,11,0.08)",
    },
    {
      label: "Alaska Airlines",
      value: fmt(summary.alaska_spend),
      sub: `${Math.round((summary.alaska_spend / summary.total_spend) * 100)}% of total`,
      icon: Plane,
      color: "#7B68EE",
      bg: "rgba(123,104,238,0.08)",
    },
    {
      label: "Hawaiian Airlines",
      value: fmt(summary.hawaii_spend),
      sub: `${Math.round((summary.hawaii_spend / summary.total_spend) * 100)}% of total`,
      icon: TrendingUp,
      color: "#4ECDC4",
      bg: "rgba(78,205,196,0.08)",
    },
  ];

  // L1 spend bar chart (top 10)
  const l1ChartData = useMemo(() =>
    Object.entries(summary.l1_spend)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, spend]) => ({
        name: name.length > 22 ? name.slice(0, 20) + "…" : name,
        spend,
      })),
    [summary]
  );

  // Tiering donut
  const tieringData = useMemo(() =>
    Object.entries(summary.tiering_counts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value], i) => ({ name, value, fill: PALETTE[i % PALETTE.length] })),
    [summary]
  );

  // Confidence pie
  const confData = useMemo(() =>
    Object.entries(summary.confidence_counts)
      .map(([name, value], i) => ({
        name,
        value,
        fill: name === "High" ? "#22C55E" : name === "Medium" ? "#F59E0B" : "#EF4444",
      })),
    [summary]
  );

  // Evidence pie
  const evidenceData = useMemo(() =>
    Object.entries(summary.evidence_counts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value], i) => ({
        name: `Tier ${name}`,
        value,
        fill: i === 0 ? "#22C55E" : i === 1 ? "#F59E0B" : "#9CA3AF",
      })),
    [summary]
  );

  // Top levers list
  const topLevers = useMemo(() =>
    Object.entries(summary.top_levers)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, count]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        count,
      })),
    [summary]
  );

  const uploadedAt = summary.uploaded_at
    ? new Date(summary.uploaded_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "—";

  return (
    <div className="p-6 animate-fade-up space-y-6">
      {/* Hero Banner */}
      <div
        className="relative rounded-2xl overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #1A1A2E 0%, #16213E 60%, #0F3460 100%)",
          minHeight: 160,
        }}
      >
        {/* Decorative dots */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(18)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full"
              style={{
                width: i % 3 === 0 ? 6 : 4,
                height: i % 3 === 0 ? 6 : 4,
                background: "rgba(232,119,34,0.25)",
                left: `${(i * 17 + 5) % 95}%`,
                top: `${(i * 23 + 10) % 85}%`,
              }}
            />
          ))}
        </div>
        {/* Decorative bar chart silhouette */}
        <div className="absolute right-8 bottom-0 flex items-end gap-1.5 opacity-10">
          {[60, 90, 45, 110, 75, 130, 55, 95, 70, 115].map((h, i) => (
            <div key={i} className="w-4 rounded-t" style={{ height: h, background: ORANGE }} />
          ))}
        </div>

        <div className="relative p-7">
          <h1 className="text-2xl font-bold text-white mb-1" style={{ fontFamily: "Sora, sans-serif" }}>
            TailSpend AI Command Center
          </h1>
          <p className="text-sm mb-4" style={{ color: "rgba(255,255,255,0.6)", fontFamily: "DM Sans, sans-serif" }}>
            Tail-spend enrichment &amp; savings intelligence · {summary.file_name}
          </p>
          <div className="flex flex-wrap gap-2">
            <span
              className="chip text-xs"
              style={{ background: "rgba(232,119,34,0.2)", color: "#E87722", border: "1px solid rgba(232,119,34,0.3)", fontFamily: "DM Sans, sans-serif" }}
            >
              ● Live Data — {uploadedAt}
            </span>
            <span
              className="chip text-xs"
              style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.12)", fontFamily: "DM Sans, sans-serif" }}
            >
              {summary.total_count.toLocaleString()} Suppliers Enriched
            </span>
          </div>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpis.map((kpi, i) => (
          <div
            key={kpi.label}
            className="card-hover rounded-xl p-4 animate-fade-up"
            style={{
              background: "white",
              border: "1px solid #E8E9EC",
              boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
              animationDelay: `${i * 40}ms`,
            }}
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2" style={{ background: kpi.bg }}>
              <kpi.icon size={16} style={{ color: kpi.color }} />
            </div>
            <div className="text-xl font-bold num" style={{ color: NAVY, fontFamily: "DM Mono, monospace" }}>
              {kpi.value}
            </div>
            <div className="text-xs font-semibold mt-0.5" style={{ color: "#6B7280", fontFamily: "DM Sans, sans-serif" }}>
              {kpi.label}
            </div>
            <div className="text-xs mt-0.5" style={{ color: "#9CA3AF", fontFamily: "DM Sans, sans-serif" }}>
              {kpi.sub}
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* L1 Spend Bar */}
        <div
          className="xl:col-span-2 rounded-xl p-5 animate-fade-up delay-100"
          style={{ background: "white", border: "1px solid #E8E9EC", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-semibold text-sm" style={{ fontFamily: "Sora, sans-serif", color: NAVY }}>Spend by L1 Category</h3>
                <InfoTip text="Total spend aggregated by L1 (top-level) procurement category. Each bar represents the sum of all supplier spend within that category. The top 10 categories by spend are shown. Source: 'L1' and 'Total Spend' columns from your Excel file." />
              </div>
              <p className="text-xs mt-0.5" style={{ color: "#9CA3AF", fontFamily: "DM Sans, sans-serif" }}>Top 10 categories by total spend</p>
            </div>
            <span className="text-xs font-bold num" style={{ color: ORANGE, fontFamily: "DM Mono, monospace" }}>
              {fmt(summary.total_spend)} total
            </span>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={l1ChartData} layout="vertical" margin={{ left: 0, right: 60, top: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
              <XAxis
                type="number"
                tickFormatter={fmt}
                tick={{ fontSize: 10, fontFamily: "DM Mono, monospace", fill: "#9CA3AF" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={155}
                tick={{ fontSize: 10.5, fontFamily: "DM Sans, sans-serif", fill: "#6B7280" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomBarTooltip />} cursor={{ fill: "rgba(232,119,34,0.05)" }} />
              <Bar dataKey="spend" fill={ORANGE} radius={[0, 4, 4, 0]} maxBarSize={22} barSize={22} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Tiering Donut */}
        <div
          className="rounded-xl p-5 animate-fade-up delay-150"
          style={{ background: "white", border: "1px solid #E8E9EC", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}
        >
          <div className="mb-3">
            <div className="flex items-center gap-1.5">
              <h3 className="font-semibold text-sm" style={{ fontFamily: "Sora, sans-serif", color: NAVY }}>Supplier Tiering</h3>
              <InfoTip text="Suppliers are bucketed into spend tiers based on their Total Spend value: <$50K, $50K–$100K, $100K–$250K, $250K–$500K, $500K+. This distribution shows how many suppliers fall in each tier — useful for prioritizing sourcing waves and effort allocation." />
            </div>
            <p className="text-xs mt-0.5" style={{ color: "#9CA3AF", fontFamily: "DM Sans, sans-serif" }}>Distribution by spend tier</p>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={tieringData}
                cx="50%"
                cy="50%"
                innerRadius={48}
                outerRadius={72}
                paddingAngle={2}
                dataKey="value"
              >
                {tieringData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip content={<CustomPieTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-1">
            {tieringData.map((t) => (
              <div key={t.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-sm" style={{ background: t.fill }} />
                  <span style={{ color: "#6B7280", fontFamily: "DM Sans, sans-serif" }}>{t.name}</span>
                </div>
                <span className="font-medium num" style={{ color: NAVY, fontFamily: "DM Mono, monospace" }}>
                  {t.value.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Confidence Pie */}
        <div
          className="rounded-xl p-5 animate-fade-up delay-200"
          style={{ background: "white", border: "1px solid #E8E9EC", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}
        >
          <div className="flex items-center gap-1.5 mb-1">
            <h3 className="font-semibold text-sm" style={{ fontFamily: "Sora, sans-serif", color: NAVY }}>Confidence Level</h3>
            <InfoTip text="The AI Confidence field reflects how certain the TailSpend enrichment model is about the supplier classification and savings lever recommendations. High = strong evidence from verified sources. Medium = inferred from partial data. Low = estimated with limited information." />
          </div>
          <p className="text-xs mb-3" style={{ color: "#9CA3AF", fontFamily: "DM Sans, sans-serif" }}>AI enrichment confidence</p>
          <ResponsiveContainer width="100%" height={140}>
            <PieChart>
              <Pie data={confData} cx="50%" cy="50%" outerRadius={55} paddingAngle={2} dataKey="value">
                {confData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Pie>
              <Tooltip content={<CustomPieTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {confData.map((c) => (
              <div key={c.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: c.fill }} />
                  <span style={{ color: "#6B7280", fontFamily: "DM Sans, sans-serif" }}>{c.name}</span>
                </div>
                <span className="font-medium num" style={{ color: NAVY, fontFamily: "DM Mono, monospace" }}>
                  {c.value.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Evidence Pie */}
        <div
          className="rounded-xl p-5 animate-fade-up delay-250"
          style={{ background: "white", border: "1px solid #E8E9EC", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}
        >
          <div className="flex items-center gap-1.5 mb-1">
            <h3 className="font-semibold text-sm" style={{ fontFamily: "Sora, sans-serif", color: NAVY }}>Evidence Tier</h3>
            <InfoTip text="Evidence Tier rates the quality of sources used to enrich each supplier. Tier A = verified primary sources (company websites, SEC filings, contracts). Tier B = inferred from secondary sources (industry databases, news). Tier C = estimated from limited or indirect data." />
          </div>
          <p className="text-xs mb-3" style={{ color: "#9CA3AF", fontFamily: "DM Sans, sans-serif" }}>Source quality rating</p>
          <ResponsiveContainer width="100%" height={140}>
            <PieChart>
              <Pie data={evidenceData} cx="50%" cy="50%" outerRadius={55} paddingAngle={2} dataKey="value">
                {evidenceData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Pie>
              <Tooltip content={<CustomPieTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {evidenceData.map((e) => (
              <div key={e.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-sm" style={{ background: e.fill }} />
                  <span style={{ color: "#6B7280", fontFamily: "DM Sans, sans-serif" }}>{e.name}</span>
                </div>
                <span className="font-medium num" style={{ color: NAVY, fontFamily: "DM Mono, monospace" }}>
                  {e.value.toLocaleString()} · {Math.round((e.value / summary.total_count) * 100)}%
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs mt-2" style={{ color: "#C4C9D4", fontFamily: "DM Sans, sans-serif" }}>
            A = Verified source · B = Inferred · C = Estimated
          </p>
        </div>

        {/* Top Levers */}
        <div
          className="rounded-xl p-5 animate-fade-up delay-300"
          style={{ background: "white", border: "1px solid #E8E9EC", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}
        >
          <div className="flex items-center gap-1.5 mb-1">
            <h3 className="font-semibold text-sm" style={{ fontFamily: "Sora, sans-serif", color: NAVY }}>Top Savings Levers</h3>
            <InfoTip text="Count of how many suppliers have each savings lever listed in their 'Top 3 Savings Levers' field. A lever appearing on 1,000 suppliers means that action (e.g., competitive bid) was recommended for 1,000 vendors. This does not represent dollar savings — see the Savings Levers page for spend-weighted analysis." />
          </div>
          <p className="text-xs mb-3" style={{ color: "#9CA3AF", fontFamily: "DM Sans, sans-serif" }}>Most frequent across suppliers</p>
          <div className="space-y-2.5">
            {topLevers.map((lever, i) => (
              <div key={lever.name} className="flex items-center gap-2.5">
                <div
                  className="w-5 h-5 rounded flex items-center justify-center text-xs font-bold shrink-0"
                  style={{
                    background: i === 0 ? "rgba(232,119,34,0.12)" : "#F3F4F6",
                    color: i === 0 ? ORANGE : "#9CA3AF",
                    fontFamily: "DM Mono, monospace",
                  }}
                >
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate" style={{ color: "#374151", fontFamily: "DM Sans, sans-serif" }}>
                    {lever.name}
                  </div>
                  <div className="h-1 mt-1 rounded-full overflow-hidden" style={{ background: "#F3F4F6" }}>
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(lever.count / topLevers[0].count) * 100}%`,
                        background: i === 0 ? ORANGE : "#D1D5DB",
                      }}
                    />
                  </div>
                </div>
                <div className="text-xs font-medium num shrink-0" style={{ color: "#6B7280", fontFamily: "DM Mono, monospace" }}>
                  {lever.count}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

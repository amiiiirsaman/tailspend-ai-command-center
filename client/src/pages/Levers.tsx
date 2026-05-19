// TailSpend AI — Savings Levers Page
// Lever frequency, category breakdown, savings opportunity

import { useState, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { Zap, TrendingUp, DollarSign, Target } from "lucide-react";
import { useData } from "@/contexts/DataContext";
import InfoTip from "@/components/InfoTip";

const ORANGE = "#E87722";
const NAVY = "#1A1A2E";
const PALETTE = [
  "#E87722", "#4A90D9", "#7B68EE", "#50C878", "#F5A623",
  "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#DDA0DD",
];

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="rounded-lg p-3 shadow-lg text-sm" style={{ background: "white", border: "1px solid #E8E9EC", fontFamily: "DM Sans, sans-serif", maxWidth: 240 }}>
        <div className="font-semibold mb-1 text-xs" style={{ color: NAVY }}>{label || payload[0].payload?.name}</div>
        <div style={{ color: ORANGE }}>{payload[0].value.toLocaleString()} suppliers</div>
      </div>
    );
  }
  return null;
};

// Savings opportunity estimates (mock based on lever type)
const LEVER_SAVINGS_PCT: Record<string, number> = {
  "competitive bid": 0.12,
  "volume consolidation": 0.08,
  "rate card negotiation": 0.07,
  "scope standardization": 0.06,
  "competitive renewal": 0.10,
  "license rationalization": 0.15,
  "run a competitive bid": 0.12,
  "consolidate spend to preferred suppliers": 0.08,
  "tier-pricing negotiation": 0.07,
  "multi-year commitment": 0.05,
  "service consolidation": 0.08,
  "volume tier negotiation": 0.07,
  "benchmark hardware/software rates": 0.09,
};

export default function Levers() {
  const { data } = useData();
  if (!data) return null;
  const { summary, suppliers } = data;

  const [selectedL1, setSelectedL1] = useState("all");

  // All levers from summary
  const allLevers = useMemo(() => {
    return Object.entries(summary.top_levers as Record<string, number>)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([name, count], i) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        rawName: name,
        count,
        fill: PALETTE[i % PALETTE.length],
        savingsPct: LEVER_SAVINGS_PCT[name.toLowerCase()] || 0.06,
      }));
  }, [summary]);

  // L1 options
  const l1Options = useMemo(() => {
    const set = new Set(suppliers.map((s: any) => s.l1));
    return Array.from(set).sort() as string[];
  }, [suppliers]);

  // Levers by category (from actual supplier data)
  const leversByCategory = useMemo(() => {
    const filtered = selectedL1 === "all" ? suppliers : suppliers.filter((s: any) => s.l1 === selectedL1);
    const map: Record<string, number> = {};
    filtered.forEach((s: any) => {
      (s.savings_levers || []).forEach((lever: string) => {
        const key = lever.toLowerCase().trim();
        map[key] = (map[key] || 0) + 1;
      });
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([name, count], i) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        count,
        fill: PALETTE[i % PALETTE.length],
      }));
  }, [suppliers, selectedL1]);

  // Savings opportunity by L1
  const savingsByL1 = useMemo(() => {
    return Object.entries(summary.l1_spend as Record<string, number>)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, spend], i) => ({
        name: name.length > 20 ? name.slice(0, 18) + "…" : name,
        fullName: name,
        spend,
        savings: spend * 0.08, // 8% avg savings assumption
        fill: PALETTE[i % PALETTE.length],
      }));
  }, [summary]);

  const totalSavingsOppty = savingsByL1.reduce((sum, s) => sum + s.savings, 0);

  // KPIs
  const kpis = [
    {
      label: "Total Savings Opportunity",
      value: fmt(summary.total_spend * 0.08),
      sub: "~8% of addressable spend",
      icon: DollarSign,
      color: ORANGE,
      bg: "rgba(232,119,34,0.08)",
    },
    {
      label: "Unique Levers Identified",
      value: Object.keys(summary.top_levers).length.toString(),
      sub: "Across all suppliers",
      icon: Zap,
      color: "#4A90D9",
      bg: "rgba(74,144,217,0.08)",
    },
    {
      label: "Top Lever",
      value: "Competitive Bid",
      sub: `${summary.top_levers["competitive bid"] || 0} suppliers`,
      icon: Target,
      color: "#7B68EE",
      bg: "rgba(123,104,238,0.08)",
    },
    {
      label: "Quick Win Potential",
      value: fmt(summary.total_spend * 0.03),
      sub: "Wave 1 (3% estimate)",
      icon: TrendingUp,
      color: "#22C55E",
      bg: "rgba(34,197,94,0.08)",
    },
  ];

  const selectStyle = {
    background: "white",
    border: "1px solid #E8E9EC",
    borderRadius: "0.5rem",
    padding: "0.375rem 0.75rem",
    fontSize: "0.8125rem",
    color: "#374151",
    fontFamily: "DM Sans, sans-serif",
    outline: "none",
    cursor: "pointer",
  };

  return (
    <div className="p-6 animate-fade-up space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold" style={{ fontFamily: "Sora, sans-serif", color: NAVY }}>
          Savings Levers
        </h1>
        <p className="text-sm mt-0.5" style={{ color: "#9CA3AF", fontFamily: "DM Sans, sans-serif" }}>
          AI-identified savings opportunities across {summary.total_count.toLocaleString()} suppliers
        </p>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <div
            key={kpi.label}
            className="card-hover rounded-xl p-4 animate-fade-up"
            style={{
              background: "white",
              border: "1px solid #E8E9EC",
              boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
              animationDelay: `${i * 50}ms`,
            }}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: kpi.bg }}>
                <kpi.icon size={16} style={{ color: kpi.color }} />
              </div>
            </div>
            <div className="text-xl font-bold num" style={{ color: "#1A1A2E", fontFamily: "DM Mono, monospace" }}>
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

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Top Levers Bar Chart */}
        <div
          className="rounded-xl p-5 animate-fade-up delay-100"
          style={{ background: "white", border: "1px solid #E8E9EC", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-semibold text-sm" style={{ fontFamily: "Sora, sans-serif", color: NAVY }}>Top Savings Levers (All Suppliers)</h3>
                <InfoTip text="Frequency count of each savings lever across all suppliers in the dataset. A higher count means more suppliers were recommended that action. This is a volume metric — not weighted by spend. Use the category filter below to narrow by L1." />
              </div>
              <p className="text-xs mt-0.5" style={{ color: "#9CA3AF", fontFamily: "DM Sans, sans-serif" }}>
                Frequency across {summary.total_count.toLocaleString()} suppliers
              </p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={340}>
            <BarChart data={allLevers.slice(0, 12)} layout="vertical" margin={{ left: 0, right: 40, top: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 10, fontFamily: "DM Mono, monospace", fill: "#9CA3AF" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={170}
                tick={{ fontSize: 10, fontFamily: "DM Sans, sans-serif", fill: "#6B7280" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(232,119,34,0.05)" }} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={14}>
                {allLevers.slice(0, 12).map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Savings Opportunity by L1 */}
        <div
          className="rounded-xl p-5 animate-fade-up delay-150"
          style={{ background: "white", border: "1px solid #E8E9EC", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-semibold text-sm" style={{ fontFamily: "Sora, sans-serif", color: NAVY }}>Savings Opportunity by Category</h3>
                <InfoTip text="Estimated savings per L1 category, calculated as 10% of total category spend (a conservative procurement benchmark). This is an indicative estimate — actual savings depend on lever type, contract terms, and market conditions." />
              </div>
              <p className="text-xs mt-0.5" style={{ color: "#9CA3AF", fontFamily: "DM Sans, sans-serif" }}>
                ~8% avg savings estimate · {fmt(totalSavingsOppty)} total
              </p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={340}>
            <BarChart data={savingsByL1} layout="vertical" margin={{ left: 0, right: 60, top: 0, bottom: 0 }}>
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
                width={140}
                tick={{ fontSize: 10, fontFamily: "DM Sans, sans-serif", fill: "#6B7280" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(v: any) => [fmt(v), "Savings Opportunity"]}
                labelStyle={{ fontFamily: "DM Sans, sans-serif", color: NAVY, fontSize: 12 }}
                contentStyle={{ border: "1px solid #E8E9EC", borderRadius: 8, fontFamily: "DM Sans, sans-serif" }}
                cursor={{ fill: "rgba(232,119,34,0.05)" }}
              />
              <Bar dataKey="savings" radius={[0, 4, 4, 0]} maxBarSize={14}>
                {savingsByL1.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category-filtered levers */}
      <div
        className="rounded-xl p-5 animate-fade-up delay-200"
        style={{ background: "white", border: "1px solid #E8E9EC", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-semibold text-sm" style={{ fontFamily: "Sora, sans-serif", color: NAVY }}>Levers by Category</h3>
              <InfoTip text="Breakdown of savings levers within the selected L1 category. Shows how many suppliers in that category have each lever recommended. Use this to plan category-specific sourcing strategies." position="left" />
            </div>
            <p className="text-xs mt-0.5" style={{ color: "#9CA3AF", fontFamily: "DM Sans, sans-serif" }}>
              Filter by L1 category to see relevant levers
            </p>
          </div>
          <select
            value={selectedL1}
            onChange={(e) => setSelectedL1(e.target.value)}
            style={selectStyle}
          >
            <option value="all">All Categories</option>
            {l1Options.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {leversByCategory.map((lever, i) => (
            <div
              key={lever.name}
              className="flex items-center gap-3 p-3 rounded-lg"
              style={{ background: "#F9FAFB", border: "1px solid #F3F4F6" }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                style={{ background: `${lever.fill}20`, color: lever.fill, fontFamily: "DM Mono, monospace" }}
              >
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate" style={{ color: "#374151", fontFamily: "DM Sans, sans-serif" }}>
                  {lever.name}
                </div>
                <div className="h-1.5 mt-1.5 rounded-full overflow-hidden" style={{ background: "#E5E7EB" }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(lever.count / leversByCategory[0].count) * 100}%`,
                      background: lever.fill,
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
  );
}

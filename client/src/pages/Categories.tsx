// TailSpend AI — Category Analytics Page
// L1/L2 spend breakdown, bar charts, drill-down

import { useState, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  Treemap,
} from "recharts";
import { ChevronRight, ArrowLeft } from "lucide-react";
import { useData } from "@/contexts/DataContext";
import InfoTip from "@/components/InfoTip";

const ORANGE = "#E87722";
const NAVY = "#1A1A2E";
const PALETTE = [
  "#E87722", "#1A1A2E", "#4A90D9", "#7B68EE", "#50C878",
  "#F5A623", "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4",
  "#FFEAA7", "#DDA0DD", "#98D8C8", "#F7DC6F", "#BB8FCE",
  "#85C1E9", "#82E0AA", "#F0B27A", "#AED6F1", "#A9DFBF",
  "#FAD7A0", "#D7BDE2", "#A3E4D7",
];

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="rounded-lg p-3 shadow-lg text-sm" style={{ background: "white", border: "1px solid #E8E9EC", fontFamily: "DM Sans, sans-serif" }}>
        <div className="font-semibold mb-1" style={{ color: NAVY }}>{label || payload[0].payload?.name}</div>
        <div style={{ color: ORANGE }}>{fmt(payload[0].value)}</div>
        {payload[0].payload?.count && (
          <div className="text-xs mt-0.5" style={{ color: "#9CA3AF" }}>{payload[0].payload.count} suppliers</div>
        )}
      </div>
    );
  }
  return null;
};

const CustomTreemapContent = (props: any) => {
  const { x, y, width, height, name, value, index } = props;
  if (width < 30 || height < 20) return null;
  return (
    <g>
      <rect
        x={x + 1}
        y={y + 1}
        width={width - 2}
        height={height - 2}
        rx={6}
        fill={PALETTE[index % PALETTE.length]}
        fillOpacity={0.85}
      />
      {width > 60 && height > 30 && (
        <>
          <text x={x + 8} y={y + 18} fill="white" fontSize={11} fontFamily="DM Sans, sans-serif" fontWeight={600}>
            {name?.length > 18 ? name.slice(0, 16) + "…" : name}
          </text>
          {height > 45 && (
            <text x={x + 8} y={y + 33} fill="rgba(255,255,255,0.75)" fontSize={10} fontFamily="DM Mono, monospace">
              {fmt(value)}
            </text>
          )}
        </>
      )}
    </g>
  );
};

export default function Categories() {
  const { data } = useData();
  if (!data) return null;
  const { summary, suppliers } = data;

  const [selectedL1, setSelectedL1] = useState<string | null>(null);

  // L1 data sorted by spend
  const l1Data = useMemo(() => {
    return Object.entries(summary.l1_spend as Record<string, number>)
      .sort((a, b) => b[1] - a[1])
      .map(([name, spend], i) => ({
        name,
        spend,
        count: (summary.l1_count as Record<string, number>)[name] || 0,
        fill: PALETTE[i % PALETTE.length],
      }));
  }, [summary]);

  // L2 data for selected L1
  const l2Data = useMemo(() => {
    if (!selectedL1) return [];
    const l2Map: Record<string, { spend: number; count: number }> = {};
    suppliers.forEach((s) => {
      if (s.l1 === selectedL1) {
        if (!l2Map[s.l2]) l2Map[s.l2] = { spend: 0, count: 0 };
        l2Map[s.l2].spend += s.total_spend;
        l2Map[s.l2].count += 1;
      }
    });
    return Object.entries(l2Map)
      .sort((a, b) => b[1].spend - a[1].spend)
      .map(([name, { spend, count }], i) => ({
        name,
        spend,
        count,
        fill: PALETTE[i % PALETTE.length],
      }));
  }, [selectedL1, suppliers]);

  // Treemap data — sorted by spend descending for proper layout
  const treemapData = useMemo(() => {
    return [...l1Data]
      .sort((a, b) => b.spend - a.spend)
      .map((item) => ({
        name: item.name,
        size: item.spend,
        value: item.spend,
        count: item.count,
      }));
  }, [l1Data]);

  const totalSpend = summary.total_spend;

  return (
    <div className="p-6 animate-fade-up">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        {selectedL1 && (
          <button
            onClick={() => setSelectedL1(null)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors hover:bg-gray-100"
            style={{ color: "#6B7280", fontFamily: "DM Sans, sans-serif" }}
          >
            <ArrowLeft size={14} />
            Back
          </button>
        )}
        <div>
          <h1 className="text-xl font-bold" style={{ fontFamily: "Sora, sans-serif", color: NAVY }}>
            {selectedL1 ? `${selectedL1} — Sub-Categories` : "Category Analytics"}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "#9CA3AF", fontFamily: "DM Sans, sans-serif" }}>
            {selectedL1
              ? `${l2Data.length} sub-categories · ${fmt(l1Data.find(l => l.name === selectedL1)?.spend || 0)} total`
              : `${l1Data.length} L1 categories · ${fmt(totalSpend)} total spend`}
          </p>
        </div>
      </div>

      {!selectedL1 ? (
        <>
          {/* Treemap */}
          <div
            className="rounded-xl p-5 mb-6 animate-fade-up delay-50"
            style={{ background: "white", border: "1px solid #E8E9EC", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-semibold text-sm" style={{ fontFamily: "Sora, sans-serif", color: NAVY }}>Spend Distribution — Treemap</h3>
                  <InfoTip text="Each rectangle represents an L1 category. Size is proportional to total spend. Click any block to drill down into its L2 sub-categories. Hover to see exact spend values." />
                </div>
                <p className="text-xs mt-0.5" style={{ color: "#9CA3AF", fontFamily: "DM Sans, sans-serif" }}>
                  Click a category bar below to drill into sub-categories
                </p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <Treemap
                data={treemapData}
                dataKey="size"
                content={<CustomTreemapContent />}
              />
            </ResponsiveContainer>
          </div>

          {/* L1 Bar Chart */}
          <div
            className="rounded-xl p-5 animate-fade-up delay-100"
            style={{ background: "white", border: "1px solid #E8E9EC", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-semibold text-sm" style={{ fontFamily: "Sora, sans-serif", color: NAVY }}>All L1 Categories</h3>
                  <InfoTip text="Horizontal bar chart showing all L1 categories ranked by total spend. Each bar = sum of all supplier spend in that category. Click a bar to drill into its L2 sub-categories." />
                </div>
                <p className="text-xs mt-0.5" style={{ color: "#9CA3AF", fontFamily: "DM Sans, sans-serif" }}>
                  Click any bar to drill into sub-categories
                </p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={380}>
              <BarChart
                data={l1Data}
                layout="vertical"
                margin={{ left: 0, right: 60, top: 0, bottom: 0 }}
                onClick={(e) => {
                  if (e?.activePayload?.[0]?.payload?.name) {
                    setSelectedL1(e.activePayload[0].payload.name);
                  }
                }}
              >
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
                  width={160}
                  tick={{ fontSize: 11, fontFamily: "DM Sans, sans-serif", fill: "#6B7280" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(232,119,34,0.05)" }} />
                <Bar dataKey="spend" radius={[0, 4, 4, 0]} maxBarSize={16} cursor="pointer">
                  {l1Data.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      ) : (
        <>
          {/* L2 drill-down */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Bar chart */}
            <div
              className="rounded-xl p-5 animate-fade-up delay-50"
              style={{ background: "white", border: "1px solid #E8E9EC", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}
            >
              <div className="flex items-center gap-1.5 mb-4">
                <h3 className="font-semibold text-sm" style={{ fontFamily: "Sora, sans-serif", color: NAVY }}>Spend by Sub-Category</h3>
                <InfoTip text="L2 sub-categories within the selected L1. Each bar shows the total spend for that sub-category. Use this to identify where within a category the spend is concentrated." />
              </div>
              <ResponsiveContainer width="100%" height={Math.max(200, l2Data.length * 28)}>
                <BarChart
                  data={l2Data}
                  layout="vertical"
                  margin={{ left: 0, right: 60, top: 0, bottom: 0 }}
                >
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
                    tick={{ fontSize: 11, fontFamily: "DM Sans, sans-serif", fill: "#6B7280" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(232,119,34,0.05)" }} />
                  <Bar dataKey="spend" radius={[0, 4, 4, 0]} maxBarSize={16}>
                    {l2Data.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* L2 table */}
            <div
              className="rounded-xl overflow-hidden animate-fade-up delay-100"
              style={{ background: "white", border: "1px solid #E8E9EC", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}
            >
              <div className="p-4" style={{ borderBottom: "1px solid #F3F4F6" }}>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-semibold text-sm" style={{ fontFamily: "Sora, sans-serif", color: NAVY }}>Sub-Category Breakdown</h3>
                  <InfoTip text="Detailed table of all L2 sub-categories within the selected L1. Shows supplier count, total spend, and percentage of the L1 total." position="left" />
                </div>
              </div>
              <div className="overflow-y-auto" style={{ maxHeight: 400 }}>
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: "#F9FAFB" }}>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold" style={{ color: "#6B7280", fontFamily: "DM Sans, sans-serif" }}>Sub-Category</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold" style={{ color: "#6B7280", fontFamily: "DM Sans, sans-serif" }}>Spend</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold" style={{ color: "#6B7280", fontFamily: "DM Sans, sans-serif" }}>Suppliers</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold" style={{ color: "#6B7280", fontFamily: "DM Sans, sans-serif" }}>% of L1</th>
                    </tr>
                  </thead>
                  <tbody>
                    {l2Data.map((item, i) => {
                      const l1Total = l1Data.find(l => l.name === selectedL1)?.spend || 1;
                      return (
                        <tr key={item.name} style={{ borderBottom: "1px solid #F3F4F6" }}>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: item.fill }} />
                              <span className="text-xs" style={{ color: "#374151", fontFamily: "DM Sans, sans-serif" }}>{item.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <span className="text-xs font-medium num" style={{ color: ORANGE, fontFamily: "DM Mono, monospace" }}>
                              {fmt(item.spend)}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <span className="text-xs num" style={{ color: "#6B7280", fontFamily: "DM Mono, monospace" }}>
                              {item.count}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <span className="text-xs num" style={{ color: "#9CA3AF", fontFamily: "DM Mono, monospace" }}>
                              {((item.spend / l1Total) * 100).toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// TailSpend AI — Waves & Progress
// DATA-DRIVEN wave assignment from supplier tiering + confidence fields.
// Settings panel lets users adjust savings rates and spend band cutoffs.
// Excel export writes all 3 waves as separate tabs using SheetJS.

import { useState, useMemo, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  Zap, Target, TrendingUp, DollarSign, Download, ChevronDown, ChevronUp,
  Info, Settings2, X, RotateCcw,
} from "lucide-react";
import * as XLSX from "xlsx";
import { useData, Supplier } from "@/contexts/DataContext";
import InfoTip from "@/components/InfoTip";

const ORANGE = "#E87722";
const NAVY = "#1A1A2E";

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

// ─── Default settings ─────────────────────────────────────────────────────────

const DEFAULT_SETTINGS = {
  w1_rate: 12,          // Wave 1 savings % (integer)
  w2_rate: 8,           // Wave 2 savings %
  w3_rate: 6,           // Wave 3 savings %
  w1_max_spend: 50,     // Wave 1 upper spend band ($K)
  w2_min_spend: 50,     // Wave 2 lower spend band ($K)
  w2_max_spend: 250,    // Wave 2 upper spend band ($K)
  w3_min_spend: 250,    // Wave 3 lower spend band ($K)
  w3_max_spend: 500,    // Wave 3 upper spend band ($K)
  w1_require_high_conf: true, // Wave 1 requires High confidence
};

type Settings = typeof DEFAULT_SETTINGS;

// ─── Wave filter factory ──────────────────────────────────────────────────────

function makeWaveFilters(s: Settings) {
  return [
    // Wave 1: spend < w1_max_spend AND (optionally) High confidence
    (sup: Supplier) => {
      const inBand = sup.total_spend < s.w1_max_spend * 1000;
      return s.w1_require_high_conf ? inBand && sup.confidence === "High" : inBand;
    },
    // Wave 2: spend in [w2_min, w2_max]
    (sup: Supplier) =>
      sup.total_spend >= s.w2_min_spend * 1000 && sup.total_spend < s.w2_max_spend * 1000,
    // Wave 3: spend in [w3_min, w3_max]
    (sup: Supplier) =>
      sup.total_spend >= s.w3_min_spend * 1000 && sup.total_spend < s.w3_max_spend * 1000,
  ];
}

// ─── Excel export ─────────────────────────────────────────────────────────────

function exportWavesToExcel(
  wave1: Supplier[], wave2: Supplier[], wave3: Supplier[],
  settings: Settings, fileName: string
) {
  const wb = XLSX.utils.book_new();

  const toRows = (suppliers: Supplier[], waveLabel: string, pct: number) =>
    suppliers.map((s) => ({
      "Wave": waveLabel,
      "Vendor Name": s.vendor_name,
      "Cleansed Name": s.cleansed_name,
      "L1 Category": s.l1,
      "L2 Sub-Category": s.l2,
      "Total Spend ($)": s.total_spend,
      "Est. Savings ($)": +(s.total_spend * pct / 100).toFixed(2),
      "Savings Rate": `${pct}%`,
      "Supplier Tiering": s.tiering,
      "AI Confidence": s.confidence,
      "Evidence Tier": s.evidence_tier,
      "Review Flag": s.review_flag ? "Yes" : "No",
      "Alaska Spend ($)": s.alaska ?? "",
      "Hawaii Spend ($)": s.hawaii ?? "",
      "Savings Levers": s.savings_levers.join("; "),
      "What They Do": s.what_they_do,
      "Contract Structure": s.contract_structure,
      "Market Competitors": s.market_competitors.join("; "),
      "Source URLs": s.source_urls.join("; "),
    }));

  const addSheet = (data: ReturnType<typeof toRows>, sheetName: string) => {
    if (data.length === 0) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["No suppliers in this wave"]]), sheetName);
      return;
    }
    const ws = XLSX.utils.json_to_sheet(data);
    ws["!cols"] = [
      { wch: 22 }, { wch: 30 }, { wch: 30 }, { wch: 22 }, { wch: 28 },
      { wch: 16 }, { wch: 16 }, { wch: 12 }, { wch: 18 }, { wch: 14 },
      { wch: 14 }, { wch: 12 }, { wch: 16 }, { wch: 16 }, { wch: 40 },
      { wch: 50 }, { wch: 40 }, { wch: 40 }, { wch: 60 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  };

  addSheet(toRows(wave1, "Wave 1 — Quick Wins", settings.w1_rate), "Wave 1 Quick Wins");
  addSheet(toRows(wave2, "Wave 2 — Consolidation", settings.w2_rate), "Wave 2 Consolidation");
  addSheet(toRows(wave3, "Wave 3 — Strategic", settings.w3_rate), "Wave 3 Strategic");

  const w1Spend = wave1.reduce((s, x) => s + x.total_spend, 0);
  const w2Spend = wave2.reduce((s, x) => s + x.total_spend, 0);
  const w3Spend = wave3.reduce((s, x) => s + x.total_spend, 0);

  const summaryData = [
    ["TailSpend — Wave Summary", "", "", "", ""],
    ["Generated", new Date().toLocaleDateString(), "", "", ""],
    ["Source File", fileName, "", "", ""],
    ["Settings", `W1: ${settings.w1_rate}% · W2: ${settings.w2_rate}% · W3: ${settings.w3_rate}%`, "", "", ""],
    ["", "", "", "", ""],
    ["Wave", "Supplier Count", "Total Spend ($)", "Savings Rate", "Estimated Savings ($)"],
    ["Wave 1 — Quick Wins", wave1.length, w1Spend, `${settings.w1_rate}%`, +(w1Spend * settings.w1_rate / 100).toFixed(2)],
    ["Wave 2 — Consolidation", wave2.length, w2Spend, `${settings.w2_rate}%`, +(w2Spend * settings.w2_rate / 100).toFixed(2)],
    ["Wave 3 — Strategic", wave3.length, w3Spend, `${settings.w3_rate}%`, +(w3Spend * settings.w3_rate / 100).toFixed(2)],
    ["TOTAL", wave1.length + wave2.length + wave3.length, w1Spend + w2Spend + w3Spend, "",
      +((w1Spend * settings.w1_rate + w2Spend * settings.w2_rate + w3Spend * settings.w3_rate) / 100).toFixed(2)],
  ];
  const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
  summaryWs["!cols"] = [{ wch: 28 }, { wch: 18 }, { wch: 20 }, { wch: 14 }, { wch: 22 }];
  XLSX.utils.book_append_sheet(wb, summaryWs, "Summary");

  XLSX.writeFile(wb, `TailSpend_Waves_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="rounded-lg p-3 shadow-lg text-xs" style={{ background: "white", border: "1px solid #E8E9EC", fontFamily: "DM Sans, sans-serif", maxWidth: 200 }}>
        <div className="font-semibold mb-1" style={{ color: NAVY }}>{label || payload[0].payload?.name}</div>
        <div style={{ color: ORANGE }}>{fmt(payload[0].value)}</div>
      </div>
    );
  }
  return null;
};

// ─── Supplier Table ───────────────────────────────────────────────────────────

function WaveTable({ suppliers, color, savingsPct }: { suppliers: Supplier[]; color: string; savingsPct: number }) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? suppliers : suppliers.slice(0, 8);

  if (suppliers.length === 0) {
    return (
      <div className="text-center py-8 text-sm" style={{ color: "#9CA3AF", fontFamily: "DM Sans, sans-serif" }}>
        No suppliers match this wave's criteria. Try adjusting the settings.
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto rounded-xl" style={{ border: "1px solid #E8E9EC" }}>
        <table className="w-full text-xs">
          <thead>
            <tr style={{ background: "#F9FAFB", borderBottom: "1px solid #E8E9EC" }}>
              {["Supplier", "L1 Category", "L2 Sub-Category", "Total Spend", "Confidence", "Evidence", "Top Lever", "Est. Savings"].map(h => (
                <th key={h} className="px-3 py-2.5 text-left font-semibold" style={{ color: "#6B7280", fontFamily: "DM Sans, sans-serif" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((s, i) => {
              const lever = s.savings_levers[0] ?? "—";
              return (
                <tr key={i} style={{ borderBottom: "1px solid #F3F4F6" }}>
                  <td className="px-3 py-2 font-medium" style={{ color: NAVY, fontFamily: "DM Sans, sans-serif", maxWidth: 180 }}>
                    <div className="truncate">{s.vendor_name}</div>
                  </td>
                  <td className="px-3 py-2" style={{ color: ORANGE, fontFamily: "DM Sans, sans-serif" }}>{s.l1}</td>
                  <td className="px-3 py-2" style={{ color: "#6B7280", fontFamily: "DM Sans, sans-serif" }}>{s.l2}</td>
                  <td className="px-3 py-2 font-bold num" style={{ color: ORANGE, fontFamily: "DM Mono, monospace" }}>{fmt(s.total_spend)}</td>
                  <td className="px-3 py-2">
                    <span className="chip" style={{
                      background: s.confidence === "High" ? "#22C55E18" : s.confidence === "Medium" ? "#F59E0B18" : "#EF444418",
                      color: s.confidence === "High" ? "#22C55E" : s.confidence === "Medium" ? "#F59E0B" : "#EF4444",
                      fontFamily: "DM Sans, sans-serif",
                    }}>{s.confidence}</span>
                  </td>
                  <td className="px-3 py-2">
                    <span className="chip num" style={{ background: "#F3F4F6", color: "#6B7280", fontFamily: "DM Mono, monospace" }}>{s.evidence_tier || "—"}</span>
                  </td>
                  <td className="px-3 py-2" style={{ color: "#6B7280", fontFamily: "DM Sans, sans-serif", maxWidth: 160 }}>
                    <div className="truncate">{lever.charAt(0).toUpperCase() + lever.slice(1)}</div>
                  </td>
                  <td className="px-3 py-2 font-bold num" style={{ color, fontFamily: "DM Mono, monospace" }}>
                    {fmt(s.total_spend * savingsPct / 100)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {suppliers.length > 8 && (
        <button
          onClick={() => setExpanded(v => !v)}
          className="flex items-center gap-1.5 mx-auto mt-3 text-xs px-4 py-1.5 rounded-lg transition-colors"
          style={{ background: "#F3F4F6", color: "#6B7280", fontFamily: "DM Sans, sans-serif", border: "1px solid #E8E9EC", cursor: "pointer" }}
        >
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          {expanded ? "Show less" : `Show all ${suppliers.length} suppliers`}
        </button>
      )}
    </div>
  );
}

// ─── Settings Panel ───────────────────────────────────────────────────────────

function SettingsPanel({ settings, onChange, onClose }: {
  settings: Settings;
  onChange: (s: Settings) => void;
  onClose: () => void;
}) {
  const [local, setLocal] = useState<Settings>({ ...settings });
  const isDirty = JSON.stringify(local) !== JSON.stringify(settings);

  const update = (key: keyof Settings, value: number | boolean) => {
    setLocal(prev => ({ ...prev, [key]: value }));
  };

  const apply = () => { onChange(local); onClose(); };
  const reset = () => { setLocal({ ...DEFAULT_SETTINGS }); };

  const SliderRow = ({
    label, field, min, max, step = 1, suffix = "", tip,
  }: {
    label: string; field: keyof Settings; min: number; max: number; step?: number; suffix?: string; tip: string;
  }) => (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <label className="text-xs font-semibold" style={{ color: NAVY, fontFamily: "DM Sans, sans-serif" }}>{label}</label>
          <InfoTip text={tip} position="right" />
        </div>
        <span className="text-xs font-bold num" style={{ color: ORANGE, fontFamily: "DM Mono, monospace" }}>
          {local[field]}{suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={local[field] as number}
        onChange={e => update(field, Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{ accentColor: ORANGE }}
      />
      <div className="flex justify-between text-xs mt-0.5" style={{ color: "#C4C9D4", fontFamily: "DM Mono, monospace" }}>
        <span>{min}{suffix}</span><span>{max}{suffix}</span>
      </div>
    </div>
  );

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" style={{ background: "rgba(0,0,0,0.2)" }} onClick={onClose} />

      {/* Panel */}
      <div
        className="fixed right-0 top-0 bottom-0 z-50 flex flex-col overflow-y-auto"
        style={{
          width: 360,
          background: "white",
          boxShadow: "-4px 0 32px rgba(0,0,0,0.12)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 shrink-0" style={{ borderBottom: "1px solid #F3F4F6" }}>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(232,119,34,0.1)" }}>
              <Settings2 size={14} style={{ color: ORANGE }} />
            </div>
            <div>
              <div className="font-semibold text-sm" style={{ fontFamily: "Sora, sans-serif", color: NAVY }}>Wave Settings</div>
              <div className="text-xs" style={{ color: "#9CA3AF", fontFamily: "DM Sans, sans-serif" }}>Adjust thresholds &amp; savings rates</div>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#F3F4F6" }}>
            <X size={13} style={{ color: "#6B7280" }} />
          </button>
        </div>

        <div className="flex-1 p-5 overflow-y-auto">
          {/* Wave 1 */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full" style={{ background: ORANGE }} />
              <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: ORANGE, fontFamily: "DM Sans, sans-serif" }}>Wave 1 — Quick Wins</h3>
            </div>
            <SliderRow
              label="Savings Rate"
              field="w1_rate"
              min={1} max={30} suffix="%"
              tip="Percentage of spend expected to be saved through competitive bids and rate renegotiations. Industry benchmark: 10–15% for tail-spend vendors."
            />
            <SliderRow
              label="Max Spend Threshold"
              field="w1_max_spend"
              min={10} max={200} step={5} suffix="K"
              tip="Suppliers with total spend below this threshold qualify for Wave 1. Default: $50K. Raise this to include more suppliers in Wave 1."
            />
            <div className="flex items-center gap-2 mt-2">
              <input
                type="checkbox"
                id="w1_conf"
                checked={local.w1_require_high_conf}
                onChange={e => update("w1_require_high_conf", e.target.checked)}
                style={{ accentColor: ORANGE }}
              />
              <label htmlFor="w1_conf" className="text-xs" style={{ color: "#374151", fontFamily: "DM Sans, sans-serif", cursor: "pointer" }}>
                Require High AI Confidence
              </label>
              <InfoTip text="When checked, only suppliers with 'High' AI confidence are included in Wave 1. Uncheck to include all confidence levels below the spend threshold." />
            </div>
          </div>

          {/* Wave 2 */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full" style={{ background: "#4A90D9" }} />
              <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: "#4A90D9", fontFamily: "DM Sans, sans-serif" }}>Wave 2 — Consolidation</h3>
            </div>
            <SliderRow
              label="Savings Rate"
              field="w2_rate"
              min={1} max={25} suffix="%"
              tip="Percentage of spend expected from consolidation and scope standardization. Industry benchmark: 6–10% for mid-market spend."
            />
            <SliderRow
              label="Min Spend Threshold"
              field="w2_min_spend"
              min={10} max={200} step={5} suffix="K"
              tip="Suppliers with spend above this threshold enter Wave 2. Should match Wave 1's max spend."
            />
            <SliderRow
              label="Max Spend Threshold"
              field="w2_max_spend"
              min={100} max={1000} step={25} suffix="K"
              tip="Suppliers with spend below this threshold qualify for Wave 2. Default: $250K."
            />
          </div>

          {/* Wave 3 */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full" style={{ background: "#7B68EE" }} />
              <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: "#7B68EE", fontFamily: "DM Sans, sans-serif" }}>Wave 3 — Strategic</h3>
            </div>
            <SliderRow
              label="Savings Rate"
              field="w3_rate"
              min={1} max={20} suffix="%"
              tip="Conservative estimate for strategic sourcing events. Industry benchmark: 4–8% for complex, high-spend vendors."
            />
            <SliderRow
              label="Min Spend Threshold"
              field="w3_min_spend"
              min={100} max={1000} step={25} suffix="K"
              tip="Suppliers with spend above this threshold enter Wave 3. Should match Wave 2's max spend."
            />
            <SliderRow
              label="Max Spend Threshold"
              field="w3_max_spend"
              min={250} max={5000} step={50} suffix="K"
              tip="Suppliers with spend above this cap are excluded from Wave 3 (too strategic for this program)."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 shrink-0 flex gap-2" style={{ borderTop: "1px solid #F3F4F6" }}>
          <button
            onClick={reset}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs transition-colors"
            style={{ background: "#F3F4F6", color: "#6B7280", fontFamily: "DM Sans, sans-serif", border: "1px solid #E8E9EC", cursor: "pointer" }}
          >
            <RotateCcw size={11} />
            Reset
          </button>
          <button
            onClick={apply}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all"
            style={{
              background: isDirty ? ORANGE : "#F3F4F6",
              color: isDirty ? "white" : "#9CA3AF",
              fontFamily: "DM Sans, sans-serif",
              cursor: "pointer",
              boxShadow: isDirty ? "0 2px 8px rgba(232,119,34,0.3)" : "none",
            }}
          >
            Apply Settings
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const WAVE_META = [
  {
    name: "Wave 1 — Quick Wins", shortName: "Wave 1", color: ORANGE,
    bg: "rgba(232,119,34,0.08)", border: "rgba(232,119,34,0.3)",
    icon: Zap, status: "Active", statusColor: "#22C55E", timeline: "Q3 2026",
    levers: ["Competitive bid", "Rate card negotiation", "Volume consolidation"],
  },
  {
    name: "Wave 2 — Consolidation", shortName: "Wave 2", color: "#4A90D9",
    bg: "rgba(74,144,217,0.08)", border: "rgba(74,144,217,0.3)",
    icon: Target, status: "Planning", statusColor: "#F59E0B", timeline: "Q4 2026",
    levers: ["Volume consolidation", "Scope standardization", "Multi-year commitment"],
  },
  {
    name: "Wave 3 — Strategic", shortName: "Wave 3", color: "#7B68EE",
    bg: "rgba(123,104,238,0.08)", border: "rgba(123,104,238,0.3)",
    icon: TrendingUp, status: "Backlog", statusColor: "#9CA3AF", timeline: "Q1 2027",
    levers: ["Competitive renewal", "License rationalization", "Benchmark rates"],
  },
];

export default function Waves() {
  const { data } = useData();
  if (!data) return null;
  const { suppliers, summary } = data;

  const [activeWave, setActiveWave] = useState<number | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<Settings>({ ...DEFAULT_SETTINGS });

  const waveFilters = useMemo(() => makeWaveFilters(settings), [settings]);

  const wave1 = useMemo(() => suppliers.filter(waveFilters[0]).sort((a, b) => b.total_spend - a.total_spend), [suppliers, waveFilters]);
  const wave2 = useMemo(() => suppliers.filter(waveFilters[1]).sort((a, b) => b.total_spend - a.total_spend), [suppliers, waveFilters]);
  const wave3 = useMemo(() => suppliers.filter(waveFilters[2]).sort((a, b) => b.total_spend - a.total_spend), [suppliers, waveFilters]);
  const waveSuppliers = [wave1, wave2, wave3];
  const waveRates = [settings.w1_rate, settings.w2_rate, settings.w3_rate];

  const waveSpends = useMemo(() => [
    wave1.reduce((s, x) => s + x.total_spend, 0),
    wave2.reduce((s, x) => s + x.total_spend, 0),
    wave3.reduce((s, x) => s + x.total_spend, 0),
  ], [wave1, wave2, wave3]);

  const waveSavings = useMemo(() => [
    waveSpends[0] * settings.w1_rate / 100,
    waveSpends[1] * settings.w2_rate / 100,
    waveSpends[2] * settings.w3_rate / 100,
  ], [waveSpends, settings]);

  const totalSavings = waveSavings[0] + waveSavings[1] + waveSavings[2];
  const totalWaveSuppliers = wave1.length + wave2.length + wave3.length;

  const funnelData = useMemo(() => [
    { name: "All Suppliers", value: summary.total_count, fill: "#E8E9EC" },
    { name: "In Waves", value: totalWaveSuppliers, fill: "#4A90D9" },
    { name: "Wave 1 Quick Wins", value: wave1.length, fill: ORANGE },
    { name: "Wave 2 Consolidation", value: wave2.length, fill: "#7B68EE" },
    { name: "Wave 3 Strategic", value: wave3.length, fill: "#50C878" },
  ], [summary, wave1, wave2, wave3, totalWaveSuppliers]);

  const savingsByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    wave1.forEach(s => { map[s.l1] = (map[s.l1] || 0) + s.total_spend * settings.w1_rate / 100; });
    wave2.forEach(s => { map[s.l1] = (map[s.l1] || 0) + s.total_spend * settings.w2_rate / 100; });
    wave3.forEach(s => { map[s.l1] = (map[s.l1] || 0) + s.total_spend * settings.w3_rate / 100; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, savings]) => ({ name, savings }));
  }, [wave1, wave2, wave3, settings]);

  const handleExport = useCallback(() => {
    exportWavesToExcel(wave1, wave2, wave3, settings, summary.file_name);
  }, [wave1, wave2, wave3, settings, summary.file_name]);

  const isCustomized = JSON.stringify(settings) !== JSON.stringify(DEFAULT_SETTINGS);

  return (
    <div className="p-6 animate-fade-up space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold mb-0.5" style={{ fontFamily: "Sora, sans-serif", color: NAVY }}>
            Waves &amp; Progress
          </h1>
          <p className="text-sm" style={{ color: "#9CA3AF", fontFamily: "DM Sans, sans-serif" }}>
            Suppliers are assigned to waves based on their <strong>Supplier Tiering</strong> and <strong>AI Confidence</strong> fields from your Excel file.
            Savings estimates apply lever-type percentages to each supplier's actual spend.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all"
            style={{
              background: isCustomized ? "rgba(232,119,34,0.1)" : "#F3F4F6",
              color: isCustomized ? ORANGE : "#6B7280",
              fontFamily: "DM Sans, sans-serif",
              border: isCustomized ? `1px solid rgba(232,119,34,0.3)` : "1px solid #E8E9EC",
              cursor: "pointer",
            }}
          >
            <Settings2 size={14} />
            Settings{isCustomized ? " ●" : ""}
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            style={{ background: ORANGE, color: "white", fontFamily: "DM Sans, sans-serif", border: "none", cursor: "pointer", boxShadow: "0 2px 8px rgba(232,119,34,0.3)" }}
          >
            <Download size={14} />
            Download All Waves (.xlsx)
          </button>
        </div>
      </div>

      {/* Total savings KPI */}
      <div className="rounded-xl p-5" style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #2D2D4E 100%)`, boxShadow: "0 4px 20px rgba(26,26,46,0.2)" }}>
        <div className="flex items-center gap-2 mb-1">
          <DollarSign size={16} style={{ color: ORANGE }} />
          <span className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.6)", fontFamily: "DM Sans, sans-serif" }}>TOTAL ESTIMATED SAVINGS OPPORTUNITY</span>
          <InfoTip text="Sum of savings estimates across all three waves. Each wave applies a configurable savings rate to the actual total spend of suppliers in that wave. Click 'Settings' to adjust rates and spend band thresholds." />
        </div>
        <div className="text-4xl font-bold num" style={{ color: ORANGE, fontFamily: "DM Mono, monospace" }}>{fmt(totalSavings)}</div>
        <div className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.5)", fontFamily: "DM Sans, sans-serif" }}>
          across {totalWaveSuppliers} suppliers · {fmt(waveSpends[0] + waveSpends[1] + waveSpends[2])} addressable spend
          {isCustomized && <span style={{ color: ORANGE }}> · Custom settings active</span>}
        </div>
      </div>

      {/* Wave cards */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {WAVE_META.map((wave, i) => {
          const count = waveSuppliers[i].length;
          const spend = waveSpends[i];
          const savings = waveSavings[i];
          const rate = waveRates[i];
          const isActive = activeWave === i + 1;
          return (
            <div
              key={wave.name}
              className="rounded-xl p-5 cursor-pointer transition-all card-hover"
              style={{
                background: "white",
                border: isActive ? `2px solid ${wave.color}` : `1px solid ${wave.border}`,
                boxShadow: isActive ? `0 0 0 3px ${wave.color}18` : "0 1px 4px rgba(0,0,0,0.05)",
              }}
              onClick={() => setActiveWave(isActive ? null : i + 1)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: wave.bg }}>
                    <wave.icon size={16} style={{ color: wave.color }} />
                  </div>
                  <div>
                    <div className="text-xs font-bold" style={{ color: NAVY, fontFamily: "Sora, sans-serif" }}>{wave.name}</div>
                    <div className="text-xs" style={{ color: wave.statusColor, fontFamily: "DM Sans, sans-serif" }}>● {wave.status}</div>
                  </div>
                </div>
                <InfoTip text={`${wave.name}: ${rate}% savings rate applied to actual supplier spend. Click 'Settings' to adjust.`} />
              </div>

              <div className="grid grid-cols-3 gap-2 mb-3">
                {[
                  { label: "Suppliers", value: count.toLocaleString() },
                  { label: "Spend", value: fmt(spend) },
                  { label: "Est. Savings", value: fmt(savings) },
                ].map(m => (
                  <div key={m.label} className="rounded-lg p-2 text-center" style={{ background: wave.bg }}>
                    <div className="text-sm font-bold num" style={{ color: wave.color, fontFamily: "DM Mono, monospace" }}>{m.value}</div>
                    <div className="text-xs mt-0.5" style={{ color: "#9CA3AF", fontFamily: "DM Sans, sans-serif" }}>{m.label}</div>
                  </div>
                ))}
              </div>

              <div className="mb-3">
                <div className="flex items-center justify-between text-xs mb-1" style={{ color: "#9CA3AF", fontFamily: "DM Sans, sans-serif" }}>
                  <span>Savings rate: {rate}%</span>
                  <span>{wave.timeline}</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#F3F4F6" }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${totalSavings > 0 ? Math.min(100, (savings / totalSavings) * 100) : 0}%`, background: wave.color }} />
                </div>
              </div>

              <div className="flex flex-wrap gap-1">
                {wave.levers.map((l, j) => (
                  <span key={j} className="chip text-xs" style={{ background: wave.bg, color: wave.color, fontFamily: "DM Sans, sans-serif" }}>{l}</span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Expanded wave table */}
      {activeWave !== null && (
        <div
          className="rounded-xl p-5 animate-fade-up"
          style={{
            background: "white",
            border: `1px solid ${WAVE_META[activeWave - 1].border}`,
            boxShadow: `0 2px 12px ${WAVE_META[activeWave - 1].color}18`,
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-sm" style={{ fontFamily: "Sora, sans-serif", color: NAVY }}>
                {WAVE_META[activeWave - 1].name} — Supplier List
              </h3>
              <p className="text-xs mt-0.5" style={{ color: "#9CA3AF", fontFamily: "DM Sans, sans-serif" }}>
                {waveSuppliers[activeWave - 1].length} suppliers · {fmt(waveSpends[activeWave - 1])} total spend · {fmt(waveSavings[activeWave - 1])} estimated savings at {waveRates[activeWave - 1]}%
              </p>
            </div>
          </div>
          <WaveTable
            suppliers={waveSuppliers[activeWave - 1]}
            color={WAVE_META[activeWave - 1].color}
            savingsPct={waveRates[activeWave - 1]}
          />
        </div>
      )}

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="rounded-xl p-5" style={{ background: "white", border: "1px solid #E8E9EC", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-sm" style={{ fontFamily: "Sora, sans-serif", color: NAVY }}>Estimated Savings by Category</h3>
            <InfoTip text="Estimated savings per L1 category, calculated by applying each wave's savings rate to the actual spend of suppliers assigned to that wave. Adjust rates in Settings to see how the savings opportunity changes." />
          </div>
          <p className="text-xs mb-4" style={{ color: "#9CA3AF", fontFamily: "DM Sans, sans-serif" }}>Top 8 categories across all waves</p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={savingsByCategory} layout="vertical" margin={{ left: 0, right: 60, top: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
              <XAxis type="number" tickFormatter={fmt} tick={{ fontSize: 10, fontFamily: "DM Mono, monospace", fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 10.5, fontFamily: "DM Sans, sans-serif", fill: "#6B7280" }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(232,119,34,0.05)" }} />
              <Bar dataKey="savings" fill={ORANGE} radius={[0, 4, 4, 0]} maxBarSize={18} barSize={18} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl p-5" style={{ background: "white", border: "1px solid #E8E9EC", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-sm" style={{ fontFamily: "Sora, sans-serif", color: NAVY }}>Supplier Pipeline</h3>
            <InfoTip text="Shows how the total supplier population narrows as wave criteria are applied. Adjust the spend band thresholds in Settings to see how wave sizes change." />
          </div>
          <p className="text-xs mb-4" style={{ color: "#9CA3AF", fontFamily: "DM Sans, sans-serif" }}>From total population to wave-assigned suppliers</p>
          <div className="space-y-3">
            {funnelData.map((d) => (
              <div key={d.name}>
                <div className="flex items-center justify-between text-xs mb-1" style={{ fontFamily: "DM Sans, sans-serif" }}>
                  <span style={{ color: "#374151" }}>{d.name}</span>
                  <span className="num font-semibold" style={{ color: NAVY, fontFamily: "DM Mono, monospace" }}>{d.value.toLocaleString()}</span>
                </div>
                <div className="h-5 rounded-lg overflow-hidden" style={{ background: "#F3F4F6" }}>
                  <div className="h-full rounded-lg transition-all" style={{ width: `${(d.value / summary.total_count) * 100}%`, background: d.fill, minWidth: d.value > 0 ? 4 : 0 }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 rounded-lg text-xs" style={{ background: "#F9FAFB", border: "1px solid #F3F4F6", fontFamily: "DM Sans, sans-serif", color: "#6B7280" }}>
            <strong style={{ color: NAVY }}>Note:</strong> Suppliers outside the three wave bands are excluded from savings estimates. Adjust spend band thresholds in Settings to capture more suppliers.
          </div>
        </div>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <SettingsPanel
          settings={settings}
          onChange={setSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}

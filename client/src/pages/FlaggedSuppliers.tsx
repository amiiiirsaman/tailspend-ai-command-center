// TailSpend — Flagged Suppliers Page
// Shows all suppliers flagged for review, with notes, categories, and Excel export.

import { useState, useMemo } from "react";
import { Flag, Download, Trash2, X, Filter } from "lucide-react";
import * as XLSX from "xlsx";
import { useFlags, FlagEntry, FlagCategory } from "@/contexts/FlagContext";
import InfoTip from "@/components/InfoTip";

const ORANGE = "#E87722";
const NAVY = "#1A1A2E";

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

const CATEGORY_META: Record<FlagCategory, { label: string; color: string; bg: string }> = {
  review: { label: "For Review", color: "#F59E0B", bg: "#FEF3C7" },
  priority: { label: "Priority", color: "#EF4444", bg: "#FEE2E2" },
  exclude: { label: "Exclude", color: "#6B7280", bg: "#F3F4F6" },
  negotiate: { label: "Negotiate", color: "#4A90D9", bg: "#DBEAFE" },
  consolidate: { label: "Consolidate", color: "#7B68EE", bg: "#EDE9FE" },
};

function exportFlagged(flagList: FlagEntry[]) {
  if (flagList.length === 0) return;
  const wb = XLSX.utils.book_new();

  const rows = flagList.map(f => ({
    "Vendor Name": f.vendor_name,
    "Cleansed Name": f.cleansed_name,
    "L1 Category": f.l1,
    "L2 Sub-Category": f.l2,
    "Total Spend ($)": f.total_spend,
    "AI Confidence": f.confidence,
    "Supplier Tiering": f.tiering,
    "Flag Category": CATEGORY_META[f.category]?.label ?? f.category,
    "Review Note": f.note,
    "Flagged At": new Date(f.flagged_at).toLocaleString(),
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = [
    { wch: 30 }, { wch: 30 }, { wch: 22 }, { wch: 28 },
    { wch: 16 }, { wch: 14 }, { wch: 18 }, { wch: 16 },
    { wch: 50 }, { wch: 20 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, "Flagged Suppliers");

  // Summary by category
  const catMap: Record<string, { count: number; spend: number }> = {};
  for (const f of flagList) {
    const cat = CATEGORY_META[f.category]?.label ?? f.category;
    if (!catMap[cat]) catMap[cat] = { count: 0, spend: 0 };
    catMap[cat].count++;
    catMap[cat].spend += f.total_spend;
  }
  const summaryRows = [
    ["Category", "Count", "Total Spend ($)"],
    ...Object.entries(catMap).map(([cat, v]) => [cat, v.count, v.spend]),
    ["TOTAL", flagList.length, flagList.reduce((s, f) => s + f.total_spend, 0)],
  ];
  const summaryWs = XLSX.utils.aoa_to_sheet(summaryRows);
  summaryWs["!cols"] = [{ wch: 20 }, { wch: 10 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, summaryWs, "Summary");

  XLSX.writeFile(wb, `TailSpend_Flagged_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export default function FlaggedSuppliers() {
  const { flags, removeFlag, updateNote, updateCategory, clearAllFlags, flagCount } = useFlags();
  const [filterCat, setFilterCat] = useState<FlagCategory | "all">("all");
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");

  const flagList = useMemo(() =>
    Object.values(flags).sort((a, b) => b.total_spend - a.total_spend),
    [flags]
  );

  const filtered = useMemo(() =>
    filterCat === "all" ? flagList : flagList.filter(f => f.category === filterCat),
    [flagList, filterCat]
  );

  const totalFlaggedSpend = useMemo(() =>
    flagList.reduce((s, f) => s + f.total_spend, 0),
    [flagList]
  );

  const catCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const f of flagList) m[f.category] = (m[f.category] || 0) + 1;
    return m;
  }, [flagList]);

  if (flagCount === 0) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: "rgba(232,119,34,0.08)" }}>
          <Flag size={24} style={{ color: ORANGE }} />
        </div>
        <h2 className="text-lg font-bold mb-2" style={{ fontFamily: "Sora, sans-serif", color: NAVY }}>No Flagged Suppliers</h2>
        <p className="text-sm text-center max-w-xs" style={{ color: "#9CA3AF", fontFamily: "DM Sans, sans-serif" }}>
          Open any supplier in the Suppliers Explorer and click the flag icon to mark it for review. Flags persist across sessions.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 animate-fade-up space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <h1 className="text-xl font-bold" style={{ fontFamily: "Sora, sans-serif", color: NAVY }}>Flagged Suppliers</h1>
            <InfoTip text="Suppliers you've flagged for review from the Suppliers Explorer. Flags are stored in your browser's localStorage and persist across sessions. Export to Excel to share with your team." />
          </div>
          <p className="text-sm" style={{ color: "#9CA3AF", fontFamily: "DM Sans, sans-serif" }}>
            {flagCount} supplier{flagCount !== 1 ? "s" : ""} flagged · {fmt(totalFlaggedSpend)} total spend
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => { if (confirm("Clear all flags? This cannot be undone.")) clearAllFlags(); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs transition-colors"
            style={{ background: "#FEE2E2", color: "#EF4444", fontFamily: "DM Sans, sans-serif", border: "1px solid #FECACA", cursor: "pointer" }}
          >
            <Trash2 size={11} />
            Clear All
          </button>
          <button
            onClick={() => exportFlagged(filtered)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            style={{ background: ORANGE, color: "white", fontFamily: "DM Sans, sans-serif", border: "none", cursor: "pointer", boxShadow: "0 2px 8px rgba(232,119,34,0.3)" }}
          >
            <Download size={14} />
            Export Flagged (.xlsx)
          </button>
        </div>
      </div>

      {/* Category filter pills */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter size={13} style={{ color: "#9CA3AF" }} />
        <button
          onClick={() => setFilterCat("all")}
          className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
          style={{
            background: filterCat === "all" ? NAVY : "#F3F4F6",
            color: filterCat === "all" ? "white" : "#6B7280",
            fontFamily: "DM Sans, sans-serif",
            cursor: "pointer",
          }}
        >
          All ({flagCount})
        </button>
        {(Object.keys(CATEGORY_META) as FlagCategory[]).map(cat => {
          const count = catCounts[cat] || 0;
          if (count === 0) return null;
          const meta = CATEGORY_META[cat];
          return (
            <button
              key={cat}
              onClick={() => setFilterCat(cat)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
              style={{
                background: filterCat === cat ? meta.color : meta.bg,
                color: filterCat === cat ? "white" : meta.color,
                fontFamily: "DM Sans, sans-serif",
                cursor: "pointer",
              }}
            >
              {meta.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #E8E9EC", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
        <table className="w-full text-xs">
          <thead>
            <tr style={{ background: "#F9FAFB", borderBottom: "1px solid #E8E9EC" }}>
              {["Supplier", "L1 Category", "Spend", "Confidence", "Flag Type", "Note", "Actions"].map(h => (
                <th key={h} className="px-3 py-2.5 text-left font-semibold" style={{ color: "#6B7280", fontFamily: "DM Sans, sans-serif" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((f, i) => {
              const meta = CATEGORY_META[f.category];
              const isEditing = editingNote === f.vendor_name;
              return (
                <tr key={f.vendor_name} style={{ borderBottom: "1px solid #F3F4F6", background: i % 2 === 0 ? "white" : "#FAFAFA" }}>
                  <td className="px-3 py-2.5" style={{ maxWidth: 200 }}>
                    <div className="font-semibold truncate" style={{ color: NAVY, fontFamily: "DM Sans, sans-serif" }}>{f.vendor_name}</div>
                    <div className="text-xs truncate" style={{ color: "#9CA3AF", fontFamily: "DM Sans, sans-serif" }}>{f.l2}</div>
                  </td>
                  <td className="px-3 py-2.5" style={{ color: ORANGE, fontFamily: "DM Sans, sans-serif" }}>{f.l1}</td>
                  <td className="px-3 py-2.5 font-bold" style={{ color: NAVY, fontFamily: "DM Mono, monospace" }}>{fmt(f.total_spend)}</td>
                  <td className="px-3 py-2.5">
                    <span className="chip" style={{
                      background: f.confidence === "High" ? "#22C55E18" : f.confidence === "Medium" ? "#F59E0B18" : "#EF444418",
                      color: f.confidence === "High" ? "#22C55E" : f.confidence === "Medium" ? "#F59E0B" : "#EF4444",
                    }}>{f.confidence}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <select
                      value={f.category}
                      onChange={e => updateCategory(f.vendor_name, e.target.value as FlagCategory)}
                      className="rounded-full px-2 py-0.5 text-xs font-semibold border-0 cursor-pointer"
                      style={{ background: meta.bg, color: meta.color, fontFamily: "DM Sans, sans-serif" }}
                    >
                      {(Object.keys(CATEGORY_META) as FlagCategory[]).map(cat => (
                        <option key={cat} value={cat}>{CATEGORY_META[cat].label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2.5" style={{ maxWidth: 240 }}>
                    {isEditing ? (
                      <div className="flex items-center gap-1">
                        <input
                          autoFocus
                          value={noteText}
                          onChange={e => setNoteText(e.target.value)}
                          onBlur={() => { updateNote(f.vendor_name, noteText); setEditingNote(null); }}
                          onKeyDown={e => { if (e.key === "Enter") { updateNote(f.vendor_name, noteText); setEditingNote(null); } if (e.key === "Escape") setEditingNote(null); }}
                          className="flex-1 rounded px-2 py-1 text-xs outline-none"
                          style={{ border: `1px solid ${ORANGE}`, fontFamily: "DM Sans, sans-serif", color: NAVY }}
                          placeholder="Add note…"
                        />
                        <button onClick={() => setEditingNote(null)}><X size={10} style={{ color: "#9CA3AF" }} /></button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setEditingNote(f.vendor_name); setNoteText(f.note); }}
                        className="text-left w-full truncate hover:underline"
                        style={{ color: f.note ? "#374151" : "#C4C9D4", fontFamily: "DM Sans, sans-serif", cursor: "pointer", background: "none", border: "none" }}
                      >
                        {f.note || "Click to add note…"}
                      </button>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <button
                      onClick={() => removeFlag(f.vendor_name)}
                      className="w-6 h-6 rounded-lg flex items-center justify-center transition-colors hover:bg-red-50"
                      title="Remove flag"
                    >
                      <X size={11} style={{ color: "#EF4444" }} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-8 text-sm" style={{ color: "#9CA3AF", fontFamily: "DM Sans, sans-serif" }}>
          No suppliers in this category.
        </div>
      )}
    </div>
  );
}

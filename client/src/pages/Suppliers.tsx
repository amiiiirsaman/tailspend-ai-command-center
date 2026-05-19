// TailSpend — Suppliers Explorer
// Reads from DataContext — populated by Excel upload.
// Flagging uses FlagContext — persisted to localStorage.

import { useState, useMemo } from "react";
import {
  Search, X, ExternalLink, ChevronLeft, ChevronRight as ChevronRightIcon,
  AlertTriangle, TrendingUp, Info, Building2, Users2, FileText, Flag, FlagOff,
} from "lucide-react";
import { useData, Supplier } from "@/contexts/DataContext";
import { useFlags, FlagCategory, FlagEntry } from "@/contexts/FlagContext";
import InfoTip from "@/components/InfoTip";

const ORANGE = "#E87722";
const NAVY = "#1A1A2E";
const PAGE_SIZE = 20;

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

const CONF_COLOR: Record<string, string> = { High: "#22C55E", Medium: "#F59E0B", Low: "#EF4444" };
const EV_COLOR: Record<string, string> = { A: "#22C55E", B: "#F59E0B", C: "#9CA3AF" };

const FLAG_CATEGORIES: { value: FlagCategory; label: string; color: string; bg: string }[] = [
  { value: "review", label: "For Review", color: "#F59E0B", bg: "#FEF3C7" },
  { value: "priority", label: "Priority", color: "#EF4444", bg: "#FEE2E2" },
  { value: "negotiate", label: "Negotiate", color: "#4A90D9", bg: "#DBEAFE" },
  { value: "consolidate", label: "Consolidate", color: "#7B68EE", bg: "#EDE9FE" },
  { value: "exclude", label: "Exclude", color: "#6B7280", bg: "#F3F4F6" },
];

function Badge({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span className="chip text-xs" style={{ background: bg, color, fontFamily: "DM Sans, sans-serif" }}>
      {label}
    </span>
  );
}

function SupplierDrawer({ supplier, peers, onClose }: { supplier: Supplier; peers: Supplier[]; onClose: () => void }) {
  const { isFlagged, addFlag, removeFlag, flags } = useFlags();
  const flagged = isFlagged(supplier.vendor_name);
  const existingFlag = flags[supplier.vendor_name];

  const [showFlagMenu, setShowFlagMenu] = useState(false);
  const [flagNote, setFlagNote] = useState(existingFlag?.note ?? "");
  const [flagCat, setFlagCat] = useState<FlagCategory>(existingFlag?.category ?? "review");

  const handleFlag = () => {
    addFlag({
      vendor_name: supplier.vendor_name,
      cleansed_name: supplier.cleansed_name,
      l1: supplier.l1,
      l2: supplier.l2,
      total_spend: supplier.total_spend,
      confidence: supplier.confidence,
      tiering: supplier.tiering,
      note: flagNote,
      category: flagCat,
    });
    setShowFlagMenu(false);
  };

  const handleUnflag = () => {
    removeFlag(supplier.vendor_name);
    setShowFlagMenu(false);
  };

  const catMeta = FLAG_CATEGORIES.find(c => c.value === flagCat) ?? FLAG_CATEGORIES[0];

  return (
    <div
      className="shrink-0 overflow-y-auto animate-fade-up"
      style={{ width: 340, borderLeft: "1px solid #E8E9EC", background: "white", height: "100%" }}
    >
      {/* Header */}
      <div className="sticky top-0 z-10 px-5 pt-5 pb-3" style={{ background: "white", borderBottom: "1px solid #F3F4F6" }}>
        <div className="flex items-start justify-between gap-2">
          <h2 className="font-bold text-sm leading-tight min-w-0" style={{ color: NAVY, fontFamily: "Sora, sans-serif" }}>
            {supplier.vendor_name}
          </h2>
          <div className="flex items-center gap-1 shrink-0">
            {/* Flag button */}
            <div className="relative">
              <button
                onClick={() => setShowFlagMenu(v => !v)}
                className="p-1.5 rounded-lg transition-colors"
                title={flagged ? "Manage flag" : "Flag for review"}
                style={{
                  background: flagged ? "rgba(232,119,34,0.1)" : "#F3F4F6",
                  border: flagged ? `1px solid rgba(232,119,34,0.3)` : "1px solid transparent",
                }}
              >
                <Flag size={13} style={{ color: flagged ? ORANGE : "#9CA3AF" }} />
              </button>

              {showFlagMenu && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setShowFlagMenu(false)} />
                  <div
                    className="absolute right-0 top-8 z-40 rounded-xl shadow-xl p-3"
                    style={{ background: "white", border: "1px solid #E8E9EC", width: 240, boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }}
                  >
                    <p className="text-xs font-semibold mb-2" style={{ color: NAVY, fontFamily: "Sora, sans-serif" }}>
                      {flagged ? "Update Flag" : "Flag Supplier"}
                    </p>

                    {/* Category selector */}
                    <div className="flex flex-wrap gap-1 mb-2">
                      {FLAG_CATEGORIES.map(c => (
                        <button
                          key={c.value}
                          onClick={() => setFlagCat(c.value)}
                          className="px-2 py-0.5 rounded-full text-xs font-semibold transition-all"
                          style={{
                            background: flagCat === c.value ? c.color : c.bg,
                            color: flagCat === c.value ? "white" : c.color,
                            cursor: "pointer",
                          }}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>

                    {/* Note input */}
                    <textarea
                      value={flagNote}
                      onChange={e => setFlagNote(e.target.value)}
                      placeholder="Add a note (optional)…"
                      rows={2}
                      className="w-full rounded-lg px-2.5 py-2 text-xs outline-none resize-none mb-2"
                      style={{ border: "1px solid #E8E9EC", fontFamily: "DM Sans, sans-serif", color: NAVY }}
                    />

                    <div className="flex gap-1.5">
                      {flagged && (
                        <button
                          onClick={handleUnflag}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs"
                          style={{ background: "#FEE2E2", color: "#EF4444", fontFamily: "DM Sans, sans-serif", cursor: "pointer" }}
                        >
                          <FlagOff size={10} /> Remove
                        </button>
                      )}
                      <button
                        onClick={handleFlag}
                        className="flex-1 flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold"
                        style={{ background: catMeta.color, color: "white", fontFamily: "DM Sans, sans-serif", cursor: "pointer" }}
                      >
                        <Flag size={10} /> {flagged ? "Update" : "Flag"}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
              <X size={13} style={{ color: "#9CA3AF" }} />
            </button>
          </div>
        </div>

        {/* Flag badge if flagged */}
        {flagged && existingFlag && (
          <div className="mt-2 flex items-center gap-1.5 px-2 py-1 rounded-lg" style={{ background: "rgba(232,119,34,0.06)", border: "1px solid rgba(232,119,34,0.2)" }}>
            <Flag size={10} style={{ color: ORANGE }} />
            <span className="text-xs font-semibold" style={{ color: ORANGE, fontFamily: "DM Sans, sans-serif" }}>
              {FLAG_CATEGORIES.find(c => c.value === existingFlag.category)?.label ?? "Flagged"}
            </span>
            {existingFlag.note && (
              <span className="text-xs truncate" style={{ color: "#9CA3AF", fontFamily: "DM Sans, sans-serif" }}>· {existingFlag.note}</span>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-1.5 mt-2">
          <Badge label={supplier.l1} color="#4A90D9" bg="rgba(74,144,217,0.1)" />
          <Badge label={supplier.l2} color="#7B68EE" bg="rgba(123,104,238,0.1)" />
        </div>
      </div>

      {/* Spend metrics */}
      <div className="px-5 py-4 grid grid-cols-3 gap-3" style={{ borderBottom: "1px solid #F3F4F6" }}>
        {[
          { label: "Total Spend", value: fmt(supplier.total_spend), color: ORANGE },
          { label: "Alaska", value: supplier.alaska ? fmt(supplier.alaska) : "—", color: "#4A90D9" },
          { label: "Hawaiian", value: supplier.hawaii ? fmt(supplier.hawaii) : "—", color: "#7B68EE" },
        ].map(m => (
          <div key={m.label} className="rounded-lg p-3 text-center" style={{ background: "#F9FAFB", border: "1px solid #E8E9EC" }}>
            <div className="text-base font-bold num" style={{ color: m.color, fontFamily: "DM Mono, monospace" }}>{m.value}</div>
            <div className="text-xs mt-0.5" style={{ color: "#9CA3AF", fontFamily: "DM Sans, sans-serif" }}>{m.label}</div>
          </div>
        ))}
      </div>

      {/* Badges */}
      <div className="px-5 py-3 flex flex-wrap gap-1.5" style={{ borderBottom: "1px solid #F3F4F6" }}>
        <Badge label={`Tiering: ${supplier.tiering}`} color="#374151" bg="#F3F4F6" />
        <Badge label={`Confidence: ${supplier.confidence}`} color={CONF_COLOR[supplier.confidence] ?? "#6B7280"} bg={`${CONF_COLOR[supplier.confidence] ?? "#9CA3AF"}18`} />
        <Badge label={`Evidence: ${supplier.evidence_tier || "—"}`} color={EV_COLOR[supplier.evidence_tier] ?? "#6B7280"} bg={`${EV_COLOR[supplier.evidence_tier] ?? "#9CA3AF"}18`} />
        {supplier.review_flag && <Badge label="⚠ Review Flag" color="#F59E0B" bg="rgba(245,158,11,0.1)" />}
      </div>

      {/* Body */}
      <div className="px-5 py-4 space-y-4">
        {supplier.what_they_do && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Info size={13} style={{ color: ORANGE }} />
              <h4 className="text-xs font-bold" style={{ fontFamily: "Sora, sans-serif", color: NAVY }}>What They Do</h4>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: "#4B5563", fontFamily: "DM Sans, sans-serif" }}>{supplier.what_they_do}</p>
          </div>
        )}
        {supplier.contract_structure && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <FileText size={13} style={{ color: ORANGE }} />
              <h4 className="text-xs font-bold" style={{ fontFamily: "Sora, sans-serif", color: NAVY }}>Contract Structure</h4>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: "#4B5563", fontFamily: "DM Sans, sans-serif" }}>{supplier.contract_structure}</p>
          </div>
        )}
        {supplier.savings_levers.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={13} style={{ color: ORANGE }} />
              <h4 className="text-xs font-bold" style={{ fontFamily: "Sora, sans-serif", color: NAVY }}>Savings Levers</h4>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {supplier.savings_levers.map((l, i) => (
                <span key={i} className="chip text-xs" style={{ background: i === 0 ? "rgba(232,119,34,0.1)" : "#F3F4F6", color: i === 0 ? ORANGE : "#374151", fontFamily: "DM Sans, sans-serif" }}>
                  {l.charAt(0).toUpperCase() + l.slice(1)}
                </span>
              ))}
            </div>
          </div>
        )}
        {supplier.market_competitors.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Users2 size={13} style={{ color: ORANGE }} />
              <h4 className="text-xs font-bold" style={{ fontFamily: "Sora, sans-serif", color: NAVY }}>Market Competitors</h4>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {supplier.market_competitors.map((c, i) => (
                <span key={i} className="chip text-xs" style={{ background: "#F3F4F6", color: "#374151", fontFamily: "DM Sans, sans-serif" }}>{c}</span>
              ))}
            </div>
          </div>
        )}
        {peers.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Building2 size={13} style={{ color: ORANGE }} />
              <h4 className="text-xs font-bold" style={{ fontFamily: "Sora, sans-serif", color: NAVY }}>Peers in Spend (same category)</h4>
            </div>
            <div className="space-y-1.5">
              {peers.map((p, i) => (
                <div key={i} className="flex items-center justify-between text-xs py-1.5 px-2 rounded-lg" style={{ background: "#F9FAFB" }}>
                  <span className="truncate" style={{ color: "#374151", fontFamily: "DM Sans, sans-serif" }}>{p.vendor_name}</span>
                  <span className="font-medium num ml-2 shrink-0" style={{ color: ORANGE, fontFamily: "DM Mono, monospace" }}>{fmt(p.total_spend)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {supplier.source_urls.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <ExternalLink size={13} style={{ color: ORANGE }} />
              <h4 className="text-xs font-bold" style={{ fontFamily: "Sora, sans-serif", color: NAVY }}>Source URLs</h4>
            </div>
            <div className="space-y-1">
              {supplier.source_urls.slice(0, 4).map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs hover:underline"
                  style={{ color: "#4A90D9", fontFamily: "DM Mono, monospace" }}>
                  <ExternalLink size={10} />
                  <span className="truncate">{url.replace(/^https?:\/\//, "").slice(0, 45)}</span>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Suppliers() {
  const { data } = useData();
  const { isFlagged, flagCount } = useFlags();
  if (!data) return null;
  const { suppliers } = data;

  const [search, setSearch] = useState("");
  const [filterL1, setFilterL1] = useState("all");
  const [filterL2, setFilterL2] = useState("all");
  const [filterTier, setFilterTier] = useState("all");
  const [filterConf, setFilterConf] = useState("all");
  const [filterEv, setFilterEv] = useState("all");
  const [filterFlagged, setFilterFlagged] = useState(false);
  const [sortField, setSortField] = useState<"total_spend" | "vendor_name">("total_spend");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Supplier | null>(null);

  const l1Options = useMemo(() => Array.from(new Set(suppliers.map(s => s.l1))).sort(), [suppliers]);
  const l2Options = useMemo(() => {
    const src = filterL1 === "all" ? suppliers : suppliers.filter(s => s.l1 === filterL1);
    return Array.from(new Set(src.map(s => s.l2))).sort();
  }, [suppliers, filterL1]);
  const tierOptions = useMemo(() => Array.from(new Set(suppliers.map(s => s.tiering).filter(Boolean))).sort(), [suppliers]);
  const confOptions = useMemo(() => Array.from(new Set(suppliers.map(s => s.confidence).filter(Boolean))).sort(), [suppliers]);
  const evOptions = useMemo(() => Array.from(new Set(suppliers.map(s => s.evidence_tier).filter(Boolean))).sort(), [suppliers]);

  const filtered = useMemo(() => {
    let list = suppliers;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(s => s.vendor_name.toLowerCase().includes(q) || s.l1.toLowerCase().includes(q) || s.l2.toLowerCase().includes(q));
    }
    if (filterL1 !== "all") list = list.filter(s => s.l1 === filterL1);
    if (filterL2 !== "all") list = list.filter(s => s.l2 === filterL2);
    if (filterTier !== "all") list = list.filter(s => s.tiering === filterTier);
    if (filterConf !== "all") list = list.filter(s => s.confidence === filterConf);
    if (filterEv !== "all") list = list.filter(s => s.evidence_tier === filterEv);
    if (filterFlagged) list = list.filter(s => isFlagged(s.vendor_name));
    return [...list].sort((a, b) => {
      const av = sortField === "total_spend" ? a.total_spend : a.vendor_name;
      const bv = sortField === "total_spend" ? b.total_spend : b.vendor_name;
      return av < bv ? (sortDir === "asc" ? -1 : 1) : av > bv ? (sortDir === "asc" ? 1 : -1) : 0;
    });
  }, [suppliers, search, filterL1, filterL2, filterTier, filterConf, filterEv, filterFlagged, sortField, sortDir, isFlagged]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const peers = useMemo(() => {
    if (!selected) return [];
    return suppliers.filter(s => s.l1 === selected.l1 && s.vendor_name !== selected.vendor_name)
      .sort((a, b) => b.total_spend - a.total_spend).slice(0, 5);
  }, [selected, suppliers]);

  const toggleSort = (field: "total_spend" | "vendor_name") => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("desc"); }
    setPage(1);
  };

  const sel = (style: object) => ({ ...style, background: "white", border: "1px solid #E8E9EC", borderRadius: "0.5rem", padding: "0.375rem 0.625rem", fontSize: "0.8125rem", color: "#374151", fontFamily: "DM Sans, sans-serif", outline: "none", cursor: "pointer", minWidth: 140 });

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <div className="p-6 pb-4 animate-fade-up">
          <div className="flex items-center gap-2 mb-0.5">
            <h1 className="text-xl font-bold" style={{ fontFamily: "Sora, sans-serif", color: NAVY }}>Suppliers Explorer</h1>
            <InfoTip text="Full list of all suppliers from your Excel file. Click any row to open the supplier detail drawer. Use the flag icon in the drawer to mark suppliers for review — flags persist across sessions." width={280} />
            {flagCount > 0 && (
              <button
                onClick={() => { setFilterFlagged(v => !v); setPage(1); }}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ml-2 transition-all"
                style={{
                  background: filterFlagged ? ORANGE : "rgba(232,119,34,0.1)",
                  color: filterFlagged ? "white" : ORANGE,
                  fontFamily: "DM Sans, sans-serif",
                  cursor: "pointer",
                }}
              >
                <Flag size={10} />
                {filterFlagged ? "All Suppliers" : `Show Flagged (${flagCount})`}
              </button>
            )}
          </div>
          <p className="text-sm" style={{ color: "#9CA3AF", fontFamily: "DM Sans, sans-serif" }}>
            {filtered.length.toLocaleString()} of {suppliers.length.toLocaleString()} suppliers
            {filterFlagged && ` · showing flagged only`}
          </p>
        </div>

        {/* Filters */}
        <div className="px-6 pb-3 flex flex-wrap gap-2 animate-fade-up delay-50">
          <div className="relative flex-1 min-w-48">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#9CA3AF" }} />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search suppliers, categories…"
              className="w-full pl-8 pr-3 py-1.5 rounded-lg text-sm outline-none"
              style={{ border: "1px solid #E8E9EC", fontFamily: "DM Sans, sans-serif", color: "#374151", background: "white" }}
            />
          </div>
          <select style={sel({})} value={filterL1} onChange={e => { setFilterL1(e.target.value); setFilterL2("all"); setPage(1); }}>
            <option value="all">All Categories (L1)</option>
            {l1Options.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
          <select style={sel({})} value={filterL2} onChange={e => { setFilterL2(e.target.value); setPage(1); }}>
            <option value="all">All Sub-Categories (L2)</option>
            {l2Options.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
          <select style={sel({})} value={filterTier} onChange={e => { setFilterTier(e.target.value); setPage(1); }}>
            <option value="all">All Tiers</option>
            {tierOptions.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
          <select style={sel({})} value={filterConf} onChange={e => { setFilterConf(e.target.value); setPage(1); }}>
            <option value="all">All Confidence</option>
            {confOptions.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
          <select style={sel({})} value={filterEv} onChange={e => { setFilterEv(e.target.value); setPage(1); }}>
            <option value="all">All Evidence</option>
            {evOptions.map(o => <option key={o} value={o}>{`Tier ${o}`}</option>)}
          </select>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto px-6 pb-4">
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #E8E9EC", background: "white" }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "#F9FAFB", borderBottom: "1px solid #E8E9EC" }}>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold cursor-pointer select-none" style={{ color: "#6B7280", fontFamily: "DM Sans, sans-serif" }} onClick={() => toggleSort("vendor_name")}>
                    Supplier {sortField === "vendor_name" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold" style={{ color: "#6B7280", fontFamily: "DM Sans, sans-serif" }}>L1 Category</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold" style={{ color: "#6B7280", fontFamily: "DM Sans, sans-serif" }}>L2 Sub-Category</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold cursor-pointer select-none" style={{ color: "#6B7280", fontFamily: "DM Sans, sans-serif" }} onClick={() => toggleSort("total_spend")}>
                    Total Spend {sortField === "total_spend" ? (sortDir === "asc" ? "↑" : "↓") : "↓"}
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold" style={{ color: "#6B7280", fontFamily: "DM Sans, sans-serif" }}>Tier</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold" style={{ color: "#6B7280", fontFamily: "DM Sans, sans-serif" }}>Confidence</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold" style={{ color: "#6B7280", fontFamily: "DM Sans, sans-serif" }}>Evidence</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold" style={{ color: "#6B7280", fontFamily: "DM Sans, sans-serif" }}>Flag</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {paginated.map((s, i) => {
                  const flagged = isFlagged(s.vendor_name);
                  return (
                    <tr
                      key={s.vendor_name + i}
                      className="cursor-pointer transition-colors"
                      style={{ borderBottom: "1px solid #F3F4F6", background: selected?.vendor_name === s.vendor_name ? "rgba(232,119,34,0.04)" : undefined }}
                      onClick={() => setSelected(selected?.vendor_name === s.vendor_name ? null : s)}
                    >
                      <td className="px-4 py-2.5">
                        <div className="font-medium text-xs flex items-center gap-1.5" style={{ color: NAVY, fontFamily: "DM Sans, sans-serif" }}>
                          {s.vendor_name}
                        </div>
                      </td>
                      <td className="px-4 py-2.5"><span className="text-xs" style={{ color: ORANGE, fontFamily: "DM Sans, sans-serif" }}>{s.l1}</span></td>
                      <td className="px-4 py-2.5"><span className="text-xs" style={{ color: "#6B7280", fontFamily: "DM Sans, sans-serif" }}>{s.l2}</span></td>
                      <td className="px-4 py-2.5"><span className="text-xs font-semibold num" style={{ color: ORANGE, fontFamily: "DM Mono, monospace" }}>{fmt(s.total_spend)}</span></td>
                      <td className="px-4 py-2.5"><span className="chip text-xs" style={{ background: "#F3F4F6", color: "#6B7280", fontFamily: "DM Sans, sans-serif" }}>{s.tiering}</span></td>
                      <td className="px-4 py-2.5">
                        <span className="chip text-xs font-semibold" style={{ background: `${CONF_COLOR[s.confidence] ?? "#9CA3AF"}18`, color: CONF_COLOR[s.confidence] ?? "#9CA3AF", fontFamily: "DM Sans, sans-serif" }}>{s.confidence}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="chip text-xs font-bold" style={{ background: `${EV_COLOR[s.evidence_tier] ?? "#9CA3AF"}18`, color: EV_COLOR[s.evidence_tier] ?? "#9CA3AF", fontFamily: "DM Mono, monospace" }}>{s.evidence_tier || "—"}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1">
                          {s.review_flag && <AlertTriangle size={12} style={{ color: "#F59E0B" }} />}
                          {flagged && <Flag size={12} style={{ color: ORANGE }} />}
                        </div>
                      </td>
                      <td className="px-4 py-2.5"><ChevronRightIcon size={13} style={{ color: "#D1D5DB" }} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-3 text-xs" style={{ color: "#9CA3AF", fontFamily: "DM Sans, sans-serif" }}>
            <span>Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length.toLocaleString()}</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-2 py-1 rounded disabled:opacity-30" style={{ border: "1px solid #E8E9EC", background: "white", cursor: page === 1 ? "not-allowed" : "pointer" }}>
                <ChevronLeft size={12} />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
                return (
                  <button key={p} onClick={() => setPage(p)} className="w-7 h-7 rounded text-xs" style={{ border: "1px solid #E8E9EC", background: p === page ? ORANGE : "white", color: p === page ? "white" : "#6B7280", fontFamily: "DM Mono, monospace", cursor: "pointer" }}>
                    {p}
                  </button>
                );
              })}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-2 py-1 rounded disabled:opacity-30" style={{ border: "1px solid #E8E9EC", background: "white", cursor: page === totalPages ? "not-allowed" : "pointer" }}>
                <ChevronRightIcon size={12} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Detail Drawer */}
      {selected && <SupplierDrawer supplier={selected} peers={peers} onClose={() => setSelected(null)} />}
    </div>
  );
}

// TailSpend AI — Upload Page
// Full-screen drag-and-drop Excel uploader. Parses in-browser via SheetJS.

import { useCallback, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Upload as UploadIcon, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2, ChevronRight, Zap } from "lucide-react";
import { useData } from "@/contexts/DataContext";

const ORANGE = "#E87722";
const NAVY = "#1A1A2E";

const ACCEPTED = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
];

const REQUIRED_COLS = [
  "Vendor Name", "L1", "L2", "Total Spend", "Supplier Tiering",
  "AI Confidence", "Evidence Tier", "Top 3 Savings Levers",
];

export default function Upload() {
  const { loadFile, isLoading, error, data } = useData();
  const [, navigate] = useLocation();
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!ACCEPTED.includes(file.type) && !file.name.match(/\.xlsx?$/i)) {
      return;
    }
    setFileName(file.name);
    setDone(false);
    await loadFile(file);
    setDone(true);
  }, [loadFile]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const goToDashboard = () => navigate("/");

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ background: "linear-gradient(135deg, #F9FAFB 0%, #F3F4F6 100%)" }}
    >
      {/* Logo / brand */}
      <div className="flex items-center gap-3 mb-10">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: ORANGE }}
        >
          <Zap size={20} color="white" strokeWidth={2.5} />
        </div>
        <div>
          <div className="font-bold text-lg leading-tight" style={{ fontFamily: "Sora, sans-serif", color: NAVY }}>
            TailSpend AI
          </div>
          <div className="text-xs" style={{ color: "#9CA3AF", fontFamily: "DM Sans, sans-serif" }}>
            AArete Consulting · Command Center
          </div>
        </div>
      </div>

      {/* Card */}
      <div
        className="w-full max-w-xl rounded-2xl overflow-hidden"
        style={{
          background: "white",
          boxShadow: "0 4px 32px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)",
          border: "1px solid #E8E9EC",
        }}
      >
        {/* Header */}
        <div className="px-8 pt-8 pb-6" style={{ borderBottom: "1px solid #F3F4F6" }}>
          <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: "Sora, sans-serif", color: NAVY }}>
            Upload TailSpend Data
          </h1>
          <p className="text-sm" style={{ color: "#6B7280", fontFamily: "DM Sans, sans-serif" }}>
            Drop your enriched Excel output file and the entire dashboard populates automatically.
          </p>
        </div>

        {/* Drop zone */}
        <div className="px-8 py-6">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => !isLoading && inputRef.current?.click()}
            className="rounded-xl flex flex-col items-center justify-center gap-3 cursor-pointer transition-all"
            style={{
              border: `2px dashed ${dragging ? ORANGE : "#D1D5DB"}`,
              background: dragging ? "rgba(232,119,34,0.04)" : "#FAFAFA",
              padding: "2.5rem 1.5rem",
              minHeight: 200,
              transition: "all 0.2s cubic-bezier(0.23,1,0.32,1)",
            }}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={onInputChange}
            />

            {isLoading ? (
              <>
                <Loader2 size={36} className="animate-spin" style={{ color: ORANGE }} />
                <div className="text-sm font-medium" style={{ color: NAVY, fontFamily: "DM Sans, sans-serif" }}>
                  Parsing {fileName}…
                </div>
                <div className="text-xs" style={{ color: "#9CA3AF", fontFamily: "DM Sans, sans-serif" }}>
                  Reading rows, computing summaries
                </div>
              </>
            ) : done && !error ? (
              <>
                <CheckCircle2 size={36} style={{ color: "#22C55E" }} />
                <div className="text-sm font-bold" style={{ color: NAVY, fontFamily: "DM Sans, sans-serif" }}>
                  {fileName}
                </div>
                <div className="text-xs" style={{ color: "#22C55E", fontFamily: "DM Sans, sans-serif" }}>
                  {data?.summary.total_count.toLocaleString()} suppliers · ${(data?.summary.total_spend! / 1_000_000).toFixed(1)}M total spend
                </div>
                <div className="text-xs mt-1" style={{ color: "#9CA3AF", fontFamily: "DM Sans, sans-serif" }}>
                  Click to upload a different file
                </div>
              </>
            ) : (
              <>
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{ background: "rgba(232,119,34,0.08)" }}
                >
                  <FileSpreadsheet size={28} style={{ color: ORANGE }} />
                </div>
                <div className="text-sm font-semibold text-center" style={{ color: NAVY, fontFamily: "DM Sans, sans-serif" }}>
                  Drag &amp; drop your Excel file here
                </div>
                <div className="text-xs text-center" style={{ color: "#9CA3AF", fontFamily: "DM Sans, sans-serif" }}>
                  or click to browse · .xlsx / .xls supported
                </div>
              </>
            )}
          </div>

          {/* Error */}
          {error && (
            <div
              className="mt-4 rounded-lg p-3 flex items-start gap-2.5"
              style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)" }}
            >
              <AlertCircle size={16} style={{ color: "#EF4444", marginTop: 1, flexShrink: 0 }} />
              <div>
                <div className="text-xs font-semibold" style={{ color: "#EF4444", fontFamily: "DM Sans, sans-serif" }}>
                  Could not parse file
                </div>
                <div className="text-xs mt-0.5" style={{ color: "#6B7280", fontFamily: "DM Sans, sans-serif" }}>
                  {error}
                </div>
              </div>
            </div>
          )}

          {/* Go to dashboard button */}
          {done && !error && (
            <button
              onClick={goToDashboard}
              className="w-full mt-5 flex items-center justify-center gap-2 rounded-xl py-3 font-semibold text-sm transition-all active:scale-[0.98]"
              style={{
                background: ORANGE,
                color: "white",
                fontFamily: "DM Sans, sans-serif",
                boxShadow: "0 2px 12px rgba(232,119,34,0.35)",
                border: "none",
                cursor: "pointer",
              }}
            >
              Open Dashboard
              <ChevronRight size={16} />
            </button>
          )}
        </div>

        {/* Expected columns hint */}
        <div className="px-8 pb-7">
          <div className="text-xs font-semibold mb-2" style={{ color: "#9CA3AF", fontFamily: "DM Sans, sans-serif", letterSpacing: "0.05em" }}>
            EXPECTED COLUMNS (TailSpend output format)
          </div>
          <div className="flex flex-wrap gap-1.5">
            {REQUIRED_COLS.map((col) => (
              <span
                key={col}
                className="text-xs px-2 py-0.5 rounded-md"
                style={{
                  background: "#F3F4F6",
                  color: "#6B7280",
                  fontFamily: "DM Mono, monospace",
                  border: "1px solid #E8E9EC",
                }}
              >
                {col}
              </span>
            ))}
            <span
              className="text-xs px-2 py-0.5 rounded-md"
              style={{
                background: "#F3F4F6",
                color: "#9CA3AF",
                fontFamily: "DM Mono, monospace",
                border: "1px solid #E8E9EC",
              }}
            >
              + more…
            </span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 text-xs text-center" style={{ color: "#C4C9D4", fontFamily: "DM Sans, sans-serif" }}>
        Data is processed entirely in your browser — nothing is sent to a server.
      </div>
    </div>
  );
}

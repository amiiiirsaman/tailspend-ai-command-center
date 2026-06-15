// TailSpend AI — Upload Page
// Full-screen drag-and-drop. Detects whether the dropped Excel is a TailSpend
// output (vendor-level) or the Parts dataset (part-level) and routes to the
// matching context.

import { useCallback, useRef, useState } from "react";
import { useLocation } from "wouter";
import {
  Upload as UploadIcon,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronRight,
  Zap,
  Boxes,
  Users,
} from "lucide-react";
import * as XLSX from "xlsx";
import { useData } from "@/contexts/DataContext";
import { usePartsUploader } from "@/hooks/useParts";
import { PARTS_HEADER_HINTS } from "@/lib/partsParser";

const ORANGE = "#E87722";
const NAVY = "#1A1A2E";

const ACCEPTED = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
];

const TAILSPEND_REQUIRED_COLS = [
  "Vendor Name",
  "L1",
  "L2",
  "Total Spend",
  "Supplier Tiering",
  "AI Confidence",
  "Evidence Tier",
  "Top 3 Savings Levers",
];

type FileKind = "tailspend" | "parts" | "unknown";

// Sniff a workbook to figure out what kind of dataset it is. Looks at the
// header row of every sheet.
async function detectKind(file: File): Promise<{
  kind: FileKind;
  buffer: ArrayBuffer;
}> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: "array" });
  let best: FileKind = "unknown";
  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, {
      header: 1,
      defval: null,
      range: 0,
    });
    const header = (rows[0] as unknown[] | undefined) ?? [];
    const headerStrs = header.map((h) => String(h ?? "").trim());
    const partsHits = PARTS_HEADER_HINTS.filter((h) =>
      headerStrs.includes(h)
    ).length;
    const tsHits = ["Vendor Name", "Total Spend", "L1"].filter((h) =>
      headerStrs.some((s) => s.toLowerCase() === h.toLowerCase())
    ).length;
    if (partsHits >= 3) return { kind: "parts", buffer };
    if (tsHits >= 2) best = "tailspend";
  }
  return { kind: best, buffer };
}

export default function Upload() {
  const { loadFile, isLoading: tsLoading, error: tsError, data } = useData();
  const { loadFromBuffer: loadParts, uploaded: partsUploaded } =
    usePartsUploader();
  const [, navigate] = useLocation();

  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [detectedKind, setDetectedKind] = useState<FileKind | null>(null);
  const [partsLoading, setPartsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isLoading = tsLoading || partsLoading || detecting;
  const liveError = error ?? tsError;

  const handleFile = useCallback(
    async (file: File) => {
      if (!ACCEPTED.includes(file.type) && !file.name.match(/\.xlsx?$/i)) {
        setError("Please drop an .xlsx or .xls file.");
        return;
      }
      setFileName(file.name);
      setDone(false);
      setError(null);
      setDetectedKind(null);
      setDetecting(true);
      try {
        const { kind, buffer } = await detectKind(file);
        setDetecting(false);
        setDetectedKind(kind);
        if (kind === "parts") {
          setPartsLoading(true);
          try {
            loadParts(buffer, file.name);
            setDone(true);
          } catch (e: any) {
            setError(`Failed to parse parts file: ${e?.message ?? e}`);
          } finally {
            setPartsLoading(false);
          }
        } else if (kind === "tailspend") {
          await loadFile(file);
          setDone(true);
        } else {
          setError(
            "Could not recognize this file. Expected either a TailSpend output (Vendor Name + Total Spend columns) or a Parts dataset (Part Number + ATA_Code columns)."
          );
        }
      } catch (e: any) {
        setDetecting(false);
        setError(`Could not read file: ${e?.message ?? e}`);
      }
    },
    [loadFile, loadParts]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const dataLoaded = !!data;
  const partsLoaded = !!partsUploaded;

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
          <div
            className="font-bold text-lg leading-tight"
            style={{ fontFamily: "Sora, sans-serif", color: NAVY }}
          >
            TailSpend AI
          </div>
          <div
            className="text-xs"
            style={{ color: "#9CA3AF", fontFamily: "DM Sans, sans-serif" }}
          >
            AArete Consulting · Command Center
          </div>
        </div>
      </div>

      {/* Card */}
      <div
        className="w-full max-w-2xl rounded-2xl overflow-hidden"
        style={{
          background: "white",
          boxShadow: "0 4px 32px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)",
          border: "1px solid #E8E9EC",
        }}
      >
        {/* Header */}
        <div
          className="px-8 pt-8 pb-6"
          style={{ borderBottom: "1px solid #F3F4F6" }}
        >
          <h1
            className="text-2xl font-bold mb-1"
            style={{ fontFamily: "Sora, sans-serif", color: NAVY }}
          >
            Upload Dataset
          </h1>
          <p
            className="text-sm"
            style={{ color: "#6B7280", fontFamily: "DM Sans, sans-serif" }}
          >
            Drop a <strong>TailSpend output</strong> or a <strong>Parts
            dataset</strong> — the file type is detected automatically.
          </p>
        </div>

        {/* Type cards */}
        <div className="px-8 pt-5 grid grid-cols-1 md:grid-cols-2 gap-3">
          <TypeCard
            icon={Users}
            title="TailSpend Output"
            sub="Vendor-level enrichment"
            loaded={dataLoaded}
            highlighted={detectedKind === "tailspend"}
            badge={
              data
                ? `${data.summary.total_count.toLocaleString()} suppliers`
                : null
            }
          />
          <TypeCard
            icon={Boxes}
            title="Parts Dataset"
            sub="Part-level with BD notes"
            loaded={partsLoaded}
            highlighted={detectedKind === "parts"}
            badge={
              partsUploaded
                ? `${partsUploaded.summary.total_parts.toLocaleString()} parts`
                : null
            }
          />
        </div>

        {/* Drop zone */}
        <div className="px-8 py-6">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
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
                <Loader2
                  size={36}
                  className="animate-spin"
                  style={{ color: ORANGE }}
                />
                <div
                  className="text-sm font-medium"
                  style={{ color: NAVY, fontFamily: "DM Sans, sans-serif" }}
                >
                  {detecting
                    ? `Detecting file type — ${fileName}…`
                    : `Parsing ${detectedKind === "parts" ? "parts" : "TailSpend"} data — ${fileName}…`}
                </div>
                <div
                  className="text-xs"
                  style={{ color: "#9CA3AF", fontFamily: "DM Sans, sans-serif" }}
                >
                  {detectedKind === "parts"
                    ? "Reading 48 000 part rows, computing summaries"
                    : "Reading rows, computing summaries"}
                </div>
              </>
            ) : done && !liveError ? (
              <>
                <CheckCircle2 size={36} style={{ color: "#22C55E" }} />
                <div
                  className="text-sm font-bold"
                  style={{ color: NAVY, fontFamily: "DM Sans, sans-serif" }}
                >
                  {fileName}
                </div>
                <div
                  className="text-xs"
                  style={{ color: "#22C55E", fontFamily: "DM Sans, sans-serif" }}
                >
                  {detectedKind === "parts"
                    ? `${partsUploaded?.summary.total_parts.toLocaleString()} parts · $${((partsUploaded?.summary.total_spend ?? 0) / 1_000_000).toFixed(1)}M total spend`
                    : `${data?.summary.total_count.toLocaleString()} suppliers · $${((data?.summary.total_spend ?? 0) / 1_000_000).toFixed(1)}M total spend`}
                </div>
                <div
                  className="text-xs mt-1"
                  style={{ color: "#9CA3AF", fontFamily: "DM Sans, sans-serif" }}
                >
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
                <div
                  className="text-sm font-semibold text-center"
                  style={{ color: NAVY, fontFamily: "DM Sans, sans-serif" }}
                >
                  Drag &amp; drop your Excel file here
                </div>
                <div
                  className="text-xs text-center"
                  style={{ color: "#9CA3AF", fontFamily: "DM Sans, sans-serif" }}
                >
                  or click to browse · .xlsx / .xls supported
                </div>
              </>
            )}
          </div>

          {/* Error */}
          {liveError && (
            <div
              className="mt-4 rounded-lg p-3 flex items-start gap-2.5"
              style={{
                background: "rgba(239,68,68,0.06)",
                border: "1px solid rgba(239,68,68,0.2)",
              }}
            >
              <AlertCircle
                size={16}
                style={{ color: "#EF4444", marginTop: 1, flexShrink: 0 }}
              />
              <div>
                <div
                  className="text-xs font-semibold"
                  style={{ color: "#EF4444", fontFamily: "DM Sans, sans-serif" }}
                >
                  Could not load file
                </div>
                <div
                  className="text-xs mt-0.5"
                  style={{ color: "#6B7280", fontFamily: "DM Sans, sans-serif" }}
                >
                  {liveError}
                </div>
              </div>
            </div>
          )}

          {/* Action buttons */}
          {(done && !liveError) || dataLoaded || partsLoaded ? (
            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-2.5">
              <button
                onClick={() => navigate("/")}
                disabled={!dataLoaded}
                className="flex items-center justify-center gap-2 rounded-xl py-3 font-semibold text-sm transition-all active:scale-[0.98]"
                style={{
                  background: dataLoaded ? ORANGE : "#E8E9EC",
                  color: dataLoaded ? "white" : "#9CA3AF",
                  fontFamily: "DM Sans, sans-serif",
                  boxShadow: dataLoaded
                    ? "0 2px 12px rgba(232,119,34,0.35)"
                    : "none",
                  border: "none",
                  cursor: dataLoaded ? "pointer" : "not-allowed",
                }}
              >
                <Users size={14} />
                Open TailSpend Dashboard
                <ChevronRight size={14} />
              </button>
              <button
                onClick={() => navigate("/parts")}
                className="flex items-center justify-center gap-2 rounded-xl py-3 font-semibold text-sm transition-all active:scale-[0.98]"
                style={{
                  background: NAVY,
                  color: "white",
                  fontFamily: "DM Sans, sans-serif",
                  boxShadow: "0 2px 12px rgba(26,26,46,0.25)",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                <Boxes size={14} />
                Open Parts Dataset
                <ChevronRight size={14} />
              </button>
            </div>
          ) : null}

          {/* Skip-to-bundled-parts shortcut when nothing is loaded */}
          {!done && !dataLoaded && !partsLoaded && (
            <button
              onClick={() => navigate("/parts")}
              className="w-full mt-4 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm transition-all"
              style={{
                background: "white",
                color: "#6B7280",
                border: "1px solid #E8E9EC",
                fontFamily: "DM Sans, sans-serif",
                cursor: "pointer",
              }}
            >
              <Boxes size={14} />
              Skip — explore the bundled Parts dataset
              <ChevronRight size={14} />
            </button>
          )}
        </div>

        {/* Expected columns hint */}
        <div className="px-8 pb-7 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div
              className="text-xs font-semibold mb-2"
              style={{
                color: "#9CA3AF",
                fontFamily: "DM Sans, sans-serif",
                letterSpacing: "0.05em",
              }}
            >
              TAILSPEND COLUMNS
            </div>
            <div className="flex flex-wrap gap-1">
              {TAILSPEND_REQUIRED_COLS.map((col) => (
                <span key={col} style={chipStyle}>
                  {col}
                </span>
              ))}
            </div>
          </div>
          <div>
            <div
              className="text-xs font-semibold mb-2"
              style={{
                color: "#9CA3AF",
                fontFamily: "DM Sans, sans-serif",
                letterSpacing: "0.05em",
              }}
            >
              PARTS DATASET COLUMNS
            </div>
            <div className="flex flex-wrap gap-1">
              {PARTS_HEADER_HINTS.map((col) => (
                <span key={col} style={chipStyle}>
                  {col}
                </span>
              ))}
              <span style={{ ...chipStyle, color: "#9CA3AF" }}>+ 24 more…</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        className="mt-8 text-xs text-center"
        style={{ color: "#C4C9D4", fontFamily: "DM Sans, sans-serif" }}
      >
        Data is processed entirely in your browser — nothing is sent to a server.
      </div>
    </div>
  );
}

const chipStyle: React.CSSProperties = {
  background: "#F3F4F6",
  color: "#6B7280",
  fontFamily: "DM Mono, monospace",
  border: "1px solid #E8E9EC",
  fontSize: 11,
  padding: "2px 8px",
  borderRadius: 6,
};

function TypeCard({
  icon: Icon,
  title,
  sub,
  loaded,
  highlighted,
  badge,
}: {
  icon: React.ComponentType<{
    size?: number;
    color?: string;
    style?: React.CSSProperties;
  }>;
  title: string;
  sub: string;
  loaded: boolean;
  highlighted: boolean;
  badge: string | null;
}) {
  const accent = highlighted ? ORANGE : loaded ? "#22C55E" : "#E8E9EC";
  return (
    <div
      className="rounded-xl p-3 flex items-center gap-3"
      style={{
        background: highlighted ? "rgba(232,119,34,0.05)" : "white",
        border: `1px solid ${accent}`,
        transition: "all 0.2s",
      }}
    >
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center"
        style={{
          background: highlighted
            ? "rgba(232,119,34,0.12)"
            : loaded
              ? "rgba(34,197,94,0.12)"
              : "#F4F5F7",
        }}
      >
        <Icon
          size={18}
          color={highlighted ? ORANGE : loaded ? "#22C55E" : "#9CA3AF"}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div
          className="text-sm font-semibold"
          style={{ color: NAVY, fontFamily: "DM Sans, sans-serif" }}
        >
          {title}
        </div>
        <div
          className="text-xs"
          style={{ color: "#9CA3AF", fontFamily: "DM Sans, sans-serif" }}
        >
          {sub}
        </div>
      </div>
      {badge && (
        <span
          className="text-xs font-medium px-2 py-0.5 rounded-md whitespace-nowrap"
          style={{
            background: "rgba(34,197,94,0.1)",
            color: "#16A34A",
            fontFamily: "DM Mono, monospace",
          }}
        >
          ✓ {badge}
        </span>
      )}
    </div>
  );
}

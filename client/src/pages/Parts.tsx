// Parts Dataset page — dedicated route for the parts xlsx (12k enriched + 48k tail).
// Same content as the Home section, but accessible standalone via /parts.

import { Boxes, Upload as UploadIcon } from "lucide-react";
import { Link, useLocation } from "wouter";
import PartsSection from "@/components/PartsSection";
import { usePartsUploader } from "@/hooks/useParts";

const ORANGE = "#E87722";
const NAVY = "#1A1A2E";

// /parts/<tab> — normalize to the PartsSection tab id.
function tabFromLocation(location: string): string {
  const m = location.match(/^\/parts\/?([^/]+)?/);
  const seg = m?.[1];
  if (!seg || seg === "insights") return "insights";
  if (seg === "top" || seg === "enriched") return "enriched";
  if (seg === "all") return "all";
  if (seg === "flagged") return "flagged";
  return "insights";
}

function locationFromTab(tab: string): string {
  if (tab === "enriched") return "/parts/top";
  if (tab === "all") return "/parts/all";
  if (tab === "flagged") return "/parts/flagged";
  return "/parts/insights";
}

export default function Parts() {
  const { uploaded, clearUpload } = usePartsUploader();
  const [location, navigate] = useLocation();
  const activeTab = tabFromLocation(location);

  return (
    <div className="p-6 animate-fade-up space-y-6">
      {/* Header */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, #1A1A2E 0%, #16213E 60%, #0F3460 100%)",
          minHeight: 140,
        }}
      >
        <div className="relative p-7 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Boxes size={20} color={ORANGE} />
              <h1
                className="text-2xl font-bold text-white"
                style={{ fontFamily: "Sora, sans-serif" }}
              >
                Parts Dataset
              </h1>
            </div>
            <p
              className="text-sm"
              style={{
                color: "rgba(255,255,255,0.65)",
                fontFamily: "DM Sans, sans-serif",
              }}
            >
              48 089 parts · top 12 000 enriched with online-price benchmarks and BD notes
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              <span
                className="chip text-xs"
                style={{
                  background: "rgba(232,119,34,0.2)",
                  color: ORANGE,
                  border: "1px solid rgba(232,119,34,0.3)",
                  fontFamily: "DM Sans, sans-serif",
                  padding: "4px 10px",
                  borderRadius: 999,
                }}
              >
                For Business Development
              </span>
              {uploaded ? (
                <span
                  className="chip text-xs"
                  style={{
                    background: "rgba(34,197,94,0.18)",
                    color: "#86EFAC",
                    border: "1px solid rgba(34,197,94,0.35)",
                    fontFamily: "DM Sans, sans-serif",
                    padding: "4px 10px",
                    borderRadius: 999,
                  }}
                  title={uploaded.fileName}
                >
                  ● Uploaded — {uploaded.fileName.length > 28 ? uploaded.fileName.slice(0, 26) + "…" : uploaded.fileName}
                </span>
              ) : (
                <span
                  className="chip text-xs"
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    color: "rgba(255,255,255,0.7)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    fontFamily: "DM Sans, sans-serif",
                    padding: "4px 10px",
                    borderRadius: 999,
                  }}
                >
                  Using bundled delivery data
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/upload"
              className="flex items-center gap-1.5"
              style={{
                background: ORANGE,
                color: "white",
                fontFamily: "DM Sans, sans-serif",
                fontSize: 13,
                fontWeight: 600,
                padding: "8px 14px",
                borderRadius: 10,
                textDecoration: "none",
                boxShadow: "0 2px 12px rgba(232,119,34,0.35)",
              }}
            >
              <UploadIcon size={14} /> Upload Parts File
            </Link>
            {uploaded && (
              <button
                onClick={clearUpload}
                style={{
                  background: "rgba(255,255,255,0.08)",
                  color: "rgba(255,255,255,0.85)",
                  border: "1px solid rgba(255,255,255,0.18)",
                  fontFamily: "DM Sans, sans-serif",
                  fontSize: 13,
                  fontWeight: 500,
                  padding: "8px 14px",
                  borderRadius: 10,
                  cursor: "pointer",
                }}
              >
                Revert to bundled data
              </button>
            )}
          </div>
        </div>
      </div>

      <PartsSection
        tab={activeTab}
        onTabChange={(t) => navigate(locationFromTab(t))}
      />
    </div>
  );
}

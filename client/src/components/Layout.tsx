// TailSpend AI — Layout Component
// Design: Precision White | AArete Brand
// Sidebar: 220px fixed | Main: scrollable content area
// No personal user branding — shows uploaded file info instead

import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Users,
  FolderTree,
  Zap,
  Waves,
  ChevronRight,
  Search,
  Upload,
  FileSpreadsheet,
  Flag,
} from "lucide-react";
import { useState } from "react";
import { useData } from "@/contexts/DataContext";
import { useFlags } from "@/contexts/FlagContext";

const navItems = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/suppliers", label: "Suppliers", icon: Users },
  { href: "/categories", label: "Categories", icon: FolderTree },
  { href: "/levers", label: "Savings Levers", icon: Zap },
  { href: "/waves", label: "Waves & Progress", icon: Waves },
  { href: "/flagged", label: "Flagged Suppliers", icon: Flag },
];

const ORANGE = "#E87722";
const NAVY = "#1A1A2E";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location, navigate] = useLocation();
  const { data } = useData();
  const { flagCount } = useFlags();
  const [searchOpen, setSearchOpen] = useState(false);

  const fileName = data?.summary.file_name ?? "";
  const shortName = fileName.length > 22 ? fileName.slice(0, 20) + "…" : fileName;

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#FAFAFA" }}>
      {/* ── Sidebar ── */}
      <aside
        className="flex flex-col shrink-0 h-full overflow-hidden"
        style={{
          width: 220,
          background: "#F4F5F7",
          borderRight: "1px solid #E8E9EC",
        }}
      >
        {/* Brand */}
        <div
          className="flex items-center gap-2.5 px-4 py-5 shrink-0"
          style={{ borderBottom: "1px solid #E8E9EC" }}
        >
          <div
            className="flex items-center justify-center rounded-lg shrink-0"
            style={{ width: 34, height: 34, background: ORANGE }}
          >
            <Zap size={18} color="white" strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <div className="text-sm leading-tight" style={{ color: NAVY, fontFamily: "Sora, sans-serif", fontWeight: 700 }}>
              TailSpend
            </div>
            <div className="text-xs" style={{ color: ORANGE, fontFamily: "DM Sans, sans-serif", fontWeight: 500 }}>
              AI Command Center
            </div>
          </div>
        </div>

        {/* AArete badge */}
        <div className="px-4 pt-3 pb-1">
          <div
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
            style={{ background: "rgba(232,119,34,0.1)", color: ORANGE, fontFamily: "DM Sans, sans-serif" }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            AArete Consulting
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
          <div className="text-xs font-semibold px-2 py-1.5 mb-1" style={{ color: "#9CA3AF", letterSpacing: "0.06em", fontFamily: "DM Sans, sans-serif" }}>
            ANALYTICS
          </div>
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = location === href || (href !== "/" && location.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={`nav-item ${isActive ? "active" : ""}`}
                style={{ fontFamily: "DM Sans, sans-serif", display: "flex", alignItems: "center", gap: "0.5rem", textDecoration: "none" }}
              >
                <Icon size={16} strokeWidth={isActive ? 2.2 : 1.8} />
                <span className="flex-1">{label}</span>
                {href === "/flagged" && flagCount > 0 && (
                  <span className="ml-auto text-xs font-bold rounded-full px-1.5 py-0.5" style={{ background: "rgba(232,119,34,0.15)", color: "#E87722", fontFamily: "DM Mono, monospace", fontSize: 10 }}>
                    {flagCount}
                  </span>
                )}
                {isActive && href !== "/flagged" && (
                  <ChevronRight size={12} className="ml-auto opacity-50" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer — file info + re-upload */}
        <div
          className="px-3 py-3 shrink-0"
          style={{ borderTop: "1px solid #E8E9EC" }}
        >
          {/* Current file */}
          {data && (
            <div
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg mb-2"
              style={{ background: "rgba(232,119,34,0.06)", border: "1px solid rgba(232,119,34,0.15)" }}
            >
              <FileSpreadsheet size={13} style={{ color: ORANGE, flexShrink: 0 }} />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium truncate" style={{ color: NAVY, fontFamily: "DM Mono, monospace" }}>
                  {shortName}
                </div>
                <div className="text-xs" style={{ color: "#9CA3AF", fontFamily: "DM Sans, sans-serif" }}>
                  {data.summary.total_count.toLocaleString()} suppliers
                </div>
              </div>
            </div>
          )}
          {/* Re-upload button */}
          <button
            onClick={() => navigate("/upload")}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80 active:scale-[0.98]"
            style={{
              background: "#F4F5F7",
              color: "#6B7280",
              border: "1px solid #E8E9EC",
              fontFamily: "DM Sans, sans-serif",
              cursor: "pointer",
            }}
          >
            <Upload size={12} />
            Upload New File
          </button>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Top bar */}
        <header
          className="flex items-center gap-4 px-6 py-3 shrink-0"
          style={{
            background: "white",
            borderBottom: "1px solid #E8E9EC",
            height: 56,
          }}
        >
          {/* Breadcrumb / page title */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-sm font-medium" style={{ color: "#9CA3AF", fontFamily: "DM Sans, sans-serif" }}>
              TailSpend
            </span>
            <ChevronRight size={14} className="opacity-30" />
            <span className="text-sm font-semibold truncate" style={{ color: NAVY, fontFamily: "DM Sans, sans-serif" }}>
              {navItems.find(n => n.href === location || (n.href !== "/" && location.startsWith(n.href)))?.label ?? "Overview"}
            </span>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors"
              style={{
                background: "#F4F5F7",
                color: "#9CA3AF",
                border: "1px solid #E8E9EC",
                fontFamily: "DM Sans, sans-serif",
                cursor: "pointer",
              }}
            >
              <Search size={13} />
              <span>Search suppliers…</span>
              <kbd className="ml-1 text-xs opacity-60" style={{ fontFamily: "DM Mono, monospace" }}>⌘K</kbd>
            </button>
            {/* File badge in header */}
            {data && (
              <div
                className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium"
                style={{ background: "rgba(232,119,34,0.08)", color: ORANGE, fontFamily: "DM Sans, sans-serif", border: "1px solid rgba(232,119,34,0.2)" }}
              >
                <FileSpreadsheet size={12} />
                <span>{data.summary.total_count.toLocaleString()} suppliers</span>
              </div>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto" style={{ background: "#FAFAFA" }}>
          {children}
        </main>
      </div>
    </div>
  );
}

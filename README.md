# TailSpend AI — Command Center

> Indirect-spend and aircraft-parts analytics for enterprise procurement programs.
> Built for procurement leads, BD analysts, and sourcing teams.

A single-page React dashboard that turns a raw supplier spend file plus the
12 000-part enriched delivery dataset into negotiation-ready insights: KPIs,
Pareto views, sole-source risk, OEM concentration, savings opportunities,
and per-row drilldowns — all client-side, no backend required.

---

## Highlights

**TailSpend Analytics** — supplier-side
- Overview KPIs, savings-lever breakdowns, category and supplier explorers
- Wave/progress tracker
- Per-supplier flagging with persistent annotations
- Upload your own XLSX/CSV spend file (parsed in-browser)

**Parts Analytics** — aircraft-parts dataset (48K parts, 12K enriched)
- **Insights** — cached summary with KPIs, charts, and BD-focused panels:
  Top 10 Savings Opportunities, OEM Concentration, Pareto (50/80/95% of
  spend), Sole-Source by ATA, Data Quality strip
- **Top 12K Parts** — full enriched table with online-price benchmarks
- **All Parts** — the remaining 36K tail
- **Flagged Parts** — review/priority/negotiate/sole-source-risk buckets
- Multi-select filters (OEM / ATA / Airline) with search + select-all
- Per-part drawer with full detail and external benchmark link
- CSV export from any filtered view

---

## Tech stack

- **React 19** + **TypeScript 5.6** + **Vite 7**
- **TailwindCSS 4** + **shadcn/ui** (Radix primitives)
- **recharts** for visualisations
- **wouter** for routing
- **xlsx** for in-browser file parsing
- **lucide-react** icons
- Brand: enterprise (ORANGE `#E87722` / NAVY `#1A1A2E`, Sora / DM Sans / DM Mono)

---

## Getting started

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm check        # tsc --noEmit
pnpm build        # production bundle
pnpm build:parts  # regenerate parts JSON from delivery CSV/XLSX (see below)
```

> Requires Node 20+ and pnpm 10+.

---

## Project layout

```
client/
  public/parts/        Bundled parts data (summary / enriched / tail JSON)
  src/
    components/        Layout, PartsSection, AIChatDrawer, ui/ (shadcn)
    contexts/          DataContext, FlagContext, PartFlagContext, ThemeContext
    data/              Bundled TailSpend sample dataset
    hooks/             useParts, useMobile, useComposition, usePersistFn
    lib/               agentPipeline, duckdb, partsParser, utils
    pages/             Home, Suppliers, Categories, Levers, Waves,
                       FlaggedSuppliers, Upload, Parts, NotFound
scripts/
  build-parts-data.mjs Regenerates client/public/parts/*.json from delivery file
server/
  index.ts             Lightweight Express server for production preview
shared/                Constants shared between client and server
```

Path alias: `@/*` → `client/src/*` (configured in `tsconfig.json` and `vite.config.ts`).

---

## Data sources

| Module           | Source                                    | Notes                                                 |
| ---------------- | ----------------------------------------- | ----------------------------------------------------- |
| TailSpend        | `client/src/data/tailspend.json`          | Bundled sample. User upload overrides at runtime.     |
| Parts (summary)  | `client/public/parts/parts-summary.json`  | ~37 KB, fetched eagerly                               |
| Parts (top 12K)  | `client/public/parts/parts-enriched.json` | ~10 MB, fetched when tab opens                        |
| Parts (tail 36K) | `client/public/parts/parts-tail.json`     | ~9 MB, fetched when tab opens                         |

### Regenerating parts data

Drop a fresh delivery file at the repo root following the
`enterprise_Combined_48k_DELIVERY_v<n>.{csv,xlsx}` naming convention, then:

```bash
pnpm build:parts
```

The script auto-picks the highest version (CSV preferred), strips the UTF-8
BOM if present, maps schema fields, and writes the three JSON files. Source
CSVs are gitignored — they never get committed.

---

## Conventions

- **MultiSelect filters**: empty selection = no filter applied (everything shown).
- **Enriched cutoff**: first 12 000 rows of the delivery file are treated as
  the enriched set (online-price benchmarks available).
- **Per-part flags** persist to `localStorage`; no backend required.
- **No tests bundled** — quality gate is `pnpm check` (TypeScript strict).

---

## Repository

`amiiiirsaman/tailspend-ai-command-center` · branch `main`

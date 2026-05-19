# TailSpend Dashboard

Interactive procurement spend analytics dashboard. Parses TailSpend Excel
exports in the browser and provides supplier, category, lever, and wave-based
savings views, plus a natural-language Q&A panel backed by an in-browser
DuckDB query engine and AWS Bedrock (Claude Sonnet 4.5).

## Tech stack

- React 19 + TypeScript + Vite 7
- Tailwind CSS 4 + shadcn/ui + Recharts
- DuckDB-WASM (in-browser SQL)
- AWS Bedrock (Converse API) via a Vite dev proxy at `/api/chat`
- SheetJS (`xlsx`) for client-side Excel parsing
- Wouter for routing, Sonner for toasts
- pnpm

## Setup

```sh
pnpm install
cp .env.example .env       # then fill in AWS credentials
pnpm dev --port 3033 --strictPort
```

The app runs at <http://localhost:3033>.

## Environment variables

See `.env.example`. The Q&A panel will not work until `AWS_ACCESS_KEY_ID`,
`AWS_SECRET_ACCESS_KEY`, and `BEDROCK_MODEL_ID` are set.

## Build

```sh
pnpm build      # bundles client into dist/public and server into dist/
pnpm start      # serves the built static client via Express
```

The Bedrock proxy at `/api/chat` is provided by a Vite dev-server plugin and
is only available in `pnpm dev`. The production server (`server/index.ts`)
serves static files only.

## Project layout

```
client/src/
  App.tsx              routes + providers
  contexts/            DataContext (sessionStorage), FlagContext (localStorage)
  lib/
    duckdb.ts          DuckDB-WASM singleton
    agentPipeline.ts   Q&A pipeline (DuckDB + Bedrock)
  pages/               Upload, Home, Suppliers, Categories, Levers, Waves, FlaggedSuppliers
  components/          Layout, AIChatDrawer, InfoTip, ui/*
server/index.ts        production static-file server
vite.config.ts         Vite + Tailwind + Bedrock dev proxy
```

## Scripts

| Command         | Purpose                                  |
| --------------- | ---------------------------------------- |
| `pnpm dev`      | Start the dev server with HMR + AI proxy |
| `pnpm build`    | Production build (client + server)       |
| `pnpm start`    | Run the built server (no AI)             |
| `pnpm check`    | TypeScript type-check                    |
| `pnpm format`   | Prettier across the repo                 |

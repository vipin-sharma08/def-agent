# Project Valkyrie — DCF Valuation Agent

## Overview
A web-based financial valuation agent for Indian equities. Users upload a company's
Annual Report (PDF), the system extracts financials using Claude API, builds an
integrated 3-statement model with supporting schedules, runs a 5-year FCFF-based DCF,
and outputs an interactive valuation report.

## Tech Stack
- Framework: Next.js 16 (App Router) with TypeScript (strict)
- Styling: Tailwind CSS v4
- Charts: Recharts 3.x (waterfall, pie, football field)
- State: Zustand 5.x
- PDF Upload: react-dropzone
- PDF Export: jsPDF + jspdf-autotable (client-only, dynamic import)
- Animations: Framer Motion
- Icons: Lucide React
- AI: Anthropic Claude API (Sonnet for extraction, Opus for modeling)
- Orchestration: N8N (webhook-based, cloud instance at vipinnn.app.n8n.cloud)
- Deployment: Vercel (project: dcf-agent, domain: dcf-agent.vercel.app)

## Deployment
- Vercel project name: `dcf-agent`
- Production domain: `dcf-agent.vercel.app`
- Project is linked via `.vercel/project.json` (projectId: prj_Cqj3h66ngxd8CBdXMMlp1U01B2sZ)
- Function timeouts in `vercel.json`: extract=120s, model=180s
- Environment variables needed on Vercel:
  - `ANTHROPIC_API_KEY` (secret)
  - `N8N_WEBHOOK_URL_EXTRACT` (secret)
  - `N8N_WEBHOOK_URL_MODEL` (secret)
  - `NEXT_PUBLIC_APP_URL` (plain)

## Architecture
- Frontend: Next.js on Vercel
- Backend: Next.js API Routes → N8N Webhooks → Claude API
- Flow: Upload PDF → Extract Financials → User Reviews → Input Assumptions → Generate Model → Display Report
- API routes proxy to N8N — NEVER call Claude directly from frontend
- jsPDF must be dynamically imported (client-only) to avoid Turbopack SSR errors with fflate

## File Structure
```
src/
├── app/
│   ├── page.tsx                    # Landing page with PdfUploader + hero
│   ├── layout.tsx                  # Root layout (Sidebar, fonts, ErrorBoundary)
│   ├── globals.css                 # Tailwind v4 + design tokens + custom classes
│   ├── loading.tsx                 # Root loading skeleton
│   ├── robots.ts                   # SEO robots
│   ├── sitemap.ts                  # SEO sitemap
│   ├── review/page.tsx             # Extracted data review (3-tab, inline edit)
│   ├── assumptions/page.tsx        # Assumptions form (6 sections, live WACC calc)
│   ├── report/page.tsx             # DCF report dashboard (6 tabs, PDF export)
│   └── api/
│       ├── extract/route.ts        # Proxy to N8N extraction webhook (120s)
│       ├── model/route.ts          # Proxy to N8N modeling webhook (180s)
│       └── health/route.ts         # Health check (edge runtime)
├── components/
│   ├── ui/
│   │   ├── Sidebar.tsx             # 4-step nav stepper with Valkyrie logo
│   │   ├── ErrorBoundary.tsx       # React error boundary (class component)
│   │   ├── LoadingSkeleton.tsx      # Table/card skeleton loaders
│   │   └── WarningBanner.tsx       # Warning/error/info banners
│   ├── upload/
│   │   └── PdfUploader.tsx         # Dropzone with progress + error states
│   ├── review/
│   │   └── FinancialTable.tsx      # Editable financial table (sticky cols)
│   ├── report/
│   │   ├── ReportTable.tsx         # Read-only financial table with H/P bands
│   │   ├── ValuationSummaryCard.tsx # Hero card (intrinsic value, gauge, EV bridge)
│   │   ├── IncomeStatementTab.tsx  # Historical + projected P&L
│   │   ├── BalanceSheetTab.tsx     # Historical + projected BS with balance check
│   │   ├── CashFlowTab.tsx        # CFO/CFI/CFF with tie-to-BS checks
│   │   ├── SchedulesTab.tsx       # WC, D&A, Debt, Equity, Tax schedules
│   │   ├── DcfValuationTab.tsx    # FCFF table + WACC + TV + equity bridge + charts
│   │   └── SensitivityTab.tsx     # Heatmap grid + football field + scenario cards
│   └── charts/
│       ├── FcffWaterfall.tsx       # EBIT→NOPAT→D&A→CapEx→NWC→FCFF (Recharts)
│       ├── EvBridgeWaterfall.tsx   # PV FCFFs→EV→Equity bridge (Recharts)
│       ├── WaccPieChart.tsx        # Capital structure donut (Recharts)
│       └── FootballField.tsx       # Bear–Bull range bars + CMP line (Recharts)
├── lib/
│   ├── store.ts                    # Zustand store (cross-page state)
│   ├── types.ts                    # Full TypeScript interfaces (ExtractedData, FinancialModel, etc.)
│   ├── constants.ts                # India-specific defaults (Rf, ERP, betas, WC days)
│   ├── formatters.ts               # INR/percent/growth/cell formatters
│   ├── prompts.ts                  # Claude system prompts (extraction + modeling)
│   ├── normalizeExtractedData.ts   # N8N response → app schema normalizer
│   ├── exportPdf.ts                # 11-page jsPDF valuation report (client-only)
│   └── utils.ts                    # cn() utility (clsx + tailwind-merge)
└── styles/
    └── globals.css                 # (duplicate — primary is app/globals.css)
```

## Coding Conventions
- Use named exports, not default exports (except page.tsx which Next.js requires default)
- All components are functional with arrow syntax
- Use async/await, never raw .then() chains
- All monetary values in ₹ Crores unless stated
- Format numbers with Indian numbering (12,45,678)
- Use Zustand for cross-page state management
- API routes proxy to N8N, never call Claude directly from frontend
- Every financial calculation must show its formula in a tooltip
- Use TypeScript strict mode — no `any` types
- Dynamic import jsPDF/jspdf-autotable to avoid Turbopack SSR build errors

## Financial Model Rules
- All projections are 5 years forward (F+1 to F+5)
- Historical data is 3 years back (H-3, H-2, H-1)
- FCFF method: EBIT(1-t) + D&A - CapEx - ΔNWC
- WACC uses CAPM with India 10Y G-Sec as risk-free rate (default 7.1%)
- Equity Risk Premium: Damodaran India Total ERP (default 8.2%)
- Terminal value uses Gordon Growth Model by default (default g = 4.5%)
- Statutory Tax Rate (New Regime): 25.168%
- Balance sheet must always balance (use Cash as plug)
- Working capital uses days-based approach
- Mid-year discounting convention for DCF
- Sensitivity: 5×5 grid WACC ±1% vs Terminal Growth ±1%

## Design System
- Theme: Dark primary (navy #0A1628), light theme optional
- Surfaces: --base (#0D1B2A), --surface (#111D2E), --surface-elevated (#162336)
- Accents: Teal (#14B8A6) primary, Emerald (#10B981) positive, Rose (#F43F5E) negative, Amber (#F59E0B) warning
- Borders: rgba(255,255,255,0.06)
- Fonts:
  - Headers: Playfair Display (serif) via `font-display` class
  - Body: DM Sans (sans-serif)
  - Numbers/Code: JetBrains Mono (monospace) via `font-numbers` class
- CSS custom classes in globals.css: `.card`, `.card-elevated`, `.step-badge--*`, `.bg-dot-grid`, `.font-numbers`, `.font-display`, `.text-positive`, `.text-negative`, `.text-warning`
- All tables: sticky left column, horizontal scroll on mobile, monospace numbers
- Aesthetic: Bloomberg Terminal meets modern SaaS — clean, minimal, professional

## N8N Webhooks
- Extraction: `https://vipinnn.app.n8n.cloud/webhook/dcf-extract`
  - Input: { pdf_base64, system_prompt, mime_type }
  - Output: ExtractedData JSON (normalized by normalizeExtractedData.ts)
- Modeling: `https://vipinnn.app.n8n.cloud/webhook/dcf-model`
  - Input: { extracted_data, assumptions, system_prompt }
  - Output: FinancialModel JSON

## What's Done
- Full 4-page flow: Upload → Review → Assumptions → Report
- PDF extraction via N8N + Claude (extraction prompt in prompts.ts)
- Financial model generation via N8N + Claude (modeling prompt in prompts.ts)
- 6-tab report dashboard (IS, BS, CF, Schedules, DCF, Sensitivity)
- 4 Recharts visualizations (FCFF waterfall, EV bridge, WACC pie, football field)
- PDF export (11-page professional report)
- Error boundary, loading skeletons, warning banners
- Health check endpoint (edge)

## What's Remaining
- Testing with real Indian Annual Reports (PDF upload → full flow)
- Git repository initialization
- Vercel environment variables setup (production)
- Production deployment verification
- QA checklist (cross-browser, mobile responsiveness, edge cases)

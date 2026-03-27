# CODEX.MD — Project Valkyrie Frontend Design System & Implementation Bible

> **What this file is:** The single source of truth for building Valkyrie's frontend. Every design decision, token value, component spec, and layout rule is here. Follow this document precisely — do not improvise colors, spacing, fonts, or layout patterns. If something is not specified here, ask before inventing.

> **What Valkyrie is:** An AI-powered DCF (Discounted Cash Flow) valuation agent for Indian equities. It takes a stock ticker (NSE/BSE), fetches financials, runs a DCF model via N8N webhooks, and presents institutional-grade valuation output.

> **Stack:** Next.js 14+ (App Router) · Tailwind CSS v4 · React 18+ · Framer Motion · Shadcn/UI + Radix · Visx/Recharts for charts · Deployed on Vercel

> **Project Directory:** `C:\Users\Vipin\Desktop\dcf-agent\valkyrie-dcf`

---

## 1. DESIGN PHILOSOPHY — READ THIS FIRST

Valkyrie is an **institutional-grade valuation workstation**, not a consumer fintech app. The aesthetic is **Bloomberg Terminal meets Apple Design Language** — dark, dense, premium, minimal.

### The Five Laws of Valkyrie UI

1. **Dark-only.** There is no light mode. Like Apple Stocks on iOS and Bloomberg Terminal, Valkyrie is permanently dark-themed. Never add a theme toggle.

2. **Density with clarity.** Show more data per viewport than consumer apps (Groww, Zerodha), but never sacrifice readability. Every piece of whitespace is intentional. Dense ≠ cramped.

3. **Semantic tokens everywhere.** Never use raw hex codes, arbitrary px values, or ad-hoc Tailwind classes inline. Every color, spacing value, radius, and shadow maps to a design token defined in this file.

4. **Motion with purpose.** Every animation communicates a state change (data loaded, scenario switched, value updated). Zero decorative motion. Apple spring physics, not flashy parallax.

5. **Indian equity native.** ₹ Cr formatting, FY24/FY25 fiscal year labels, NSE/BSE identifiers, Indian number grouping (1,23,456 not 123,456) — these are first-class design decisions, not afterthoughts.

### What Valkyrie Is NOT
- Not a Zerodha/Groww/Kite consumer trading app
- Not a generic SaaS dashboard with colorful cards
- Not glassmorphism-heavy eye candy (glass is used on 2-3 hero valuation elements ONLY)
- Not a Bloomberg clone (we take Bloomberg's density but Apple's refinement and restraint)

---

## 2. COLOR SYSTEM — THE VALKYRIE DARK PALETTE

All colors are defined as CSS custom properties. Tailwind utilities map to these tokens. **Never use raw hex values in components.**

### 2.1 Background Hierarchy

```css
:root {
  /* Backgrounds — layered depth system, darkest to lightest */
  --valk-bg-app:          #050509;    /* App canvas — near-black with slight blue-violet cast */
  --valk-bg-surface:      #111117;    /* Primary cards, panels, sidebar */
  --valk-bg-surface-alt:  #181823;    /* Nested cards, table headers, secondary panels */
  --valk-bg-tertiary:     #1F2430;    /* Chips, pills, tag backgrounds, hover states */
  --valk-bg-hover:        #252836;    /* Row hover, interactive element hover */
  --valk-bg-active:       #2A2D3A;    /* Active/pressed state */
}
```

**Rule:** Background layers must always follow the hierarchy: app → surface → surface-alt → tertiary. Never place a darker bg inside a lighter one.

### 2.2 Border & Divider System

```css
:root {
  --valk-border-subtle:   rgba(255, 255, 255, 0.06);   /* Default card borders, table lines */
  --valk-border-medium:   rgba(255, 255, 255, 0.10);   /* Stronger separation */
  --valk-border-strong:   rgba(255, 255, 255, 0.16);   /* Focus rings, active borders */
  --valk-border-accent:   rgba(10, 132, 255, 0.40);    /* Accent focus ring (blue glow) */
}
```

### 2.3 Text Hierarchy

```css
:root {
  --valk-text-primary:    #F5F5F7;                      /* Primary text — Apple "label" equivalent */
  --valk-text-secondary:  rgba(245, 245, 247, 0.70);    /* Secondary labels, descriptions */
  --valk-text-muted:      rgba(245, 245, 247, 0.45);    /* Tertiary text, placeholders */
  --valk-text-disabled:   rgba(245, 245, 247, 0.28);    /* Disabled states */
}
```

### 2.4 Accent Colors

```css
:root {
  /* Primary accent */
  --valk-accent:          #0A84FF;    /* iOS systemBlue — primary interactive color */
  --valk-accent-hover:    #3399FF;    /* Accent hover state */
  --valk-accent-muted:    rgba(10, 132, 255, 0.15);  /* Accent backgrounds (selected tabs, etc.) */

  /* Chart/data accent palette */
  --valk-teal:            #30D158;    /* Secondary chart color */
  --valk-cyan:            #64D2FF;    /* Tertiary chart / info highlight */
  --valk-purple:          #BF5AF2;    /* Fourth chart series */
  --valk-orange:          #FF9F0A;    /* Fifth chart series */
}
```

### 2.5 Semantic / Financial Colors

```css
:root {
  /* Profit & Loss — TradingView standard, widely recognized by traders */
  --valk-profit:          #089981;    /* Green — bullish, positive, profit, upside */
  --valk-profit-bg:       rgba(8, 153, 129, 0.12);   /* Profit background tint */
  --valk-loss:            #F23645;    /* Red — bearish, negative, loss, downside */
  --valk-loss-bg:         rgba(242, 54, 69, 0.12);    /* Loss background tint */

  /* Status */
  --valk-warning:         #FDD835;    /* Warning, caution, amber alerts */
  --valk-warning-bg:      rgba(253, 216, 53, 0.10);
  --valk-info:            #64B5F6;    /* Informational, neutral highlight */
  --valk-info-bg:         rgba(100, 181, 246, 0.10);
}
```

### 2.6 Depth & Effects

```css
:root {
  /* Border radius */
  --valk-radius-sm:       6px;
  --valk-radius-md:       10px;
  --valk-radius-lg:       14px;
  --valk-radius-xl:       18px;

  /* Shadows */
  --valk-shadow-sm:       0 2px 8px rgba(0, 0, 0, 0.30);
  --valk-shadow-md:       0 8px 24px rgba(0, 0, 0, 0.40);
  --valk-shadow-lg:       0 18px 45px rgba(0, 0, 0, 0.55);
  --valk-shadow-glow:     0 0 30px rgba(10, 132, 255, 0.08);  /* Subtle blue glow for hero card */

  /* Glass effects — USE SPARINGLY, only on hero valuation card + maybe top nav */
  --valk-glass-bg:        rgba(17, 17, 23, 0.70);
  --valk-glass-border:    rgba(255, 255, 255, 0.08);
  --valk-glass-blur:      20px;
}
```

---

## 3. TYPOGRAPHY SYSTEM

### 3.1 Font Stack

```css
:root {
  --font-sans:  'Inter', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono:  'JetBrains Mono', ui-monospace, 'Cascadia Code', monospace;
}
```

- **Inter** — Primary typeface. Optimized for UI at 12-24px. Tall x-height (~73% cap height). Load weights: 400 (Regular), 500 (Medium), 600 (Semibold).
- **JetBrains Mono** — Monospaced. Use ONLY for: formula inspector, model formula display, code-like outputs. Load weights: 400, 500.

### 3.2 Type Scale

| Token            | Size  | Weight   | Line Height | Letter Spacing | When to Use                                  |
|------------------|-------|----------|-------------|----------------|----------------------------------------------|
| `text-display`   | 32px  | 600      | 1.20        | -0.01em        | Stock name + ticker (page-level heading)     |
| `text-heading`   | 24px  | 600      | 1.25        | -0.01em        | Section headers ("DCF Model", "Financials")  |
| `text-title`     | 20px  | 500      | 1.30        | -0.005em       | Card titles, sub-headers                     |
| `text-body`      | 16px  | 400      | 1.40        | 0              | Body text, table column headers              |
| `text-dense`     | 14px  | 400      | 1.30        | 0              | Dense table cells, form labels, tooltips     |
| `text-caption`   | 12px  | 400      | 1.25        | +0.01em        | Timestamps, metadata, tertiary labels        |

### 3.3 Critical Typography Rules

1. **Tabular figures are mandatory** on every numeric column, financial value, price, percentage, and multiple:
   ```css
   .numeric {
     font-variant-numeric: tabular-nums lining-nums;
     font-feature-settings: "tnum" 1, "lnum" 1;
   }
   ```
   This prevents column jitter when numbers update (e.g., scenario toggle changes values).

2. **Weight hierarchy, not size hierarchy** for dense areas — within tables, use color/opacity to create hierarchy rather than changing font size. All table cells are 14px; differentiate with `--valk-text-primary` vs `--valk-text-secondary`.

3. **Never use font-weight 700 (Bold)** in the UI. The heaviest weight in Valkyrie is Semibold (600). This matches Apple's restraint.

4. **Headings at 32-24px use Semibold, 20px uses Medium, 16px and below use Regular.** Emphasis within body text uses Semibold, never bold.

---

## 4. SPACING & LAYOUT GRID

### 4.1 Base Grid: 8px

All spacing derives from an 8px base unit with 4px for fine adjustments.

| Token         | Value | Tailwind | Usage                                      |
|---------------|-------|----------|--------------------------------------------|
| `space-0.5`   | 2px   | `0.5`    | Hairline gaps (icon to text in tight spots) |
| `space-1`     | 4px   | `1`      | Fine adjustment, inline element gaps        |
| `space-2`     | 8px   | `2`      | Icon-to-label gap, inline control gaps      |
| `space-3`     | 12px  | `3`      | Inner cell padding, compact card padding    |
| `space-4`     | 16px  | `4`      | Standard card internal padding              |
| `space-5`     | 20px  | `5`      | Large card padding, form group spacing      |
| `space-6`     | 24px  | `6`      | Section spacing within a page band          |
| `space-8`     | 32px  | `8`      | Major section separation                    |
| `space-10`    | 40px  | `10`     | Page-level top/bottom margin                |

### 4.2 Card Padding Rules
- Primary surface cards: `p-4` (16px) or `p-5` (20px)
- Nested/secondary cards: `p-3` (12px)
- Table cells: `px-3 py-2` (12px horizontal, 8px vertical) for dense mode
- Minimum clickable/tappable area: 40×40px (44×44px preferred, per Apple HIG)

### 4.3 Grid Gaps
- Between cards in a grid: `gap-4` (16px) or `gap-6` (24px)
- Between rows in a vertical stack: `space-y-4` (16px) or `space-y-6` (24px)
- Between form fields: `space-y-3` (12px)

---

## 5. COMPONENT LIBRARY & TECHNICAL STACK

### 5.1 UI Component Foundation

**Primary:** Shadcn/UI + Radix Primitives
- Use Shadcn/UI for: dialogs, popovers, dropdowns, inputs, select, tabs, accordion, tooltip, sheet (drawers), command palette (⌘K search)
- All Shadcn components must be re-themed using Valkyrie tokens (override shadcn's default CSS variables)
- Use Radix primitives directly when Shadcn doesn't have the component

**Data Tables:** Shadcn Table component with custom dense styling
- For tables under 200 rows: standard Shadcn table with sticky headers
- For tables 200+ rows: consider TanStack Table with virtualized rendering
- Always apply `.numeric` class (tabular-nums) to number columns

### 5.2 Chart Libraries — Two-Tier Strategy

| Chart Type                    | Library              | Why                                              |
|-------------------------------|----------------------|--------------------------------------------------|
| KPI sparklines, area charts   | Recharts or Tremor   | Simple, fast, good defaults for overview stats   |
| Waterfall (FCF bridge)        | Visx + D3 scales     | Needs pixel-perfect bar positioning              |
| Football field (range chart)  | Visx                 | Horizontal interval plots, custom layout         |
| Sensitivity tornado           | Visx or Recharts     | Horizontal diverging bars from baseline          |
| Sensitivity heatmap           | Visx or custom SVG   | 2D grid with color intensity mapping             |
| Monte Carlo distribution      | Visx                 | Histogram / kernel density, custom binning       |
| Price/time-series (if added)  | Lightweight Charts   | TradingView's library, finance-native            |
| Line/area (revenue trends)    | Recharts             | Simple, sufficient for trend overlays            |

**Chart theming rules:**
- All charts use Valkyrie token colors — never library defaults
- Chart backgrounds: transparent (inherit from card)
- Grid lines: `rgba(255,255,255,0.04)` — barely visible
- Axis labels: `--valk-text-muted` at 12px
- Data labels: `--valk-text-secondary` at 12-14px
- Profit series: `--valk-profit` | Loss series: `--valk-loss`
- Primary series: `--valk-accent` | Secondary: `--valk-teal` | Tertiary: `--valk-cyan`

### 5.3 Animation — Framer Motion

Use Framer Motion for all meaningful transitions. CSS transitions for simple hover color/opacity changes only.

**Spring config for major transitions (page, section, card reveal):**
```jsx
transition={{ type: "spring", stiffness: 260, damping: 26 }}
// Duration equivalent: ~220-320ms
```

**Micro-interaction config (hover, press, toggle):**
```jsx
transition={{ duration: 0.12, ease: [0.25, 0.8, 0.25, 1] }}
// 120ms ease-out
```

**Specific animation patterns:**

| Element                  | Animation                                          | Duration    |
|--------------------------|----------------------------------------------------|-------------|
| Page enter/exit          | Fade + slight Y translate (8px) or scale (0.98→1)  | 220-280ms   |
| Card mount               | Fade in + translateY(12px→0), staggered             | 200-300ms   |
| Skeleton → content       | Cross-fade opacity                                  | 150-200ms   |
| Number value change      | Count-up tween from old→new value                   | 300-600ms   |
| Scenario tab switch      | Cross-fade charts/cards                             | 150-220ms   |
| Chart bars on mount      | Height animate from 0→value, staggered              | 400-800ms   |
| Chart line on mount      | Stroke dashoffset full→zero                         | 600-1000ms  |
| Card hover               | translateY(-2px), scale(1.01), shadow increase      | 120-150ms   |
| Button press             | scale(0.97)                                         | 100ms       |

**Rules:**
- Always use `font-variant-numeric: tabular-nums` when animating numbers to prevent column jitter
- Never use parallax, bounce, or exaggerated overshoot
- `AnimatePresence` for route transitions in Next.js App Router
- Stagger children with `staggerChildren: 0.05` (50ms between items)

---

## 6. LAYOUT ARCHITECTURE

### 6.1 Global Layout Structure (1440px+ viewport)

```
┌──────────────────────────────────────────────────────────────────┐
│  TOP BAR (h: 56px, sticky, glass optional)                       │
│  [Logo]  [Current Stock Dropdown + Quick Switch]  [Settings] [⌘K]│
├────────────┬─────────────────────────────────────────────────────┤
│            │                                                     │
│  SIDEBAR   │  MAIN CONTENT AREA (~1160px)                        │
│  (w: 260px)│                                                     │
│  fixed     │  ┌─── BAND 1: Header (200-240px tall) ───────────┐ │
│            │  │ Left 60%: Stock header + price + key multiples  │ │
│  [Search]  │  │ Right 40%: DCF value card + MOS% + IRR         │ │
│            │  └────────────────────────────────────────────────┘ │
│  Overview  │                                                     │
│  Financials│  ┌─── BAND 2: DCF Core (360-420px tall) ─────────┐ │
│  DCF Model │  │ Left 60%: Assumptions form (accordion groups)   │ │
│  Scenarios │  │ Right 40%: Waterfall / Football field chart     │ │
│  Exports   │  └────────────────────────────────────────────────┘ │
│            │                                                     │
│            │  ┌─── BAND 3: Analysis (360-420px tall) ──────────┐ │
│            │  │ Left 60%: Projected financials table (scroll)   │ │
│            │  │ Right 40%: Sensitivity heatmap + scenarios      │ │
│            │  └────────────────────────────────────────────────┘ │
│            │                                                     │
├────────────┴─────────────────────────────────────────────────────┤
```

### 6.2 Navigation Architecture

**Left Sidebar (260px, fixed, bg-surface):**
```
┌──────────────┐
│ ◆ VALKYRIE   │  ← Logo/brand, text-display size, accent color
│              │
│ 🔍 Search... │  ← Typeahead stock search (always visible)
│              │
│ ─────────────│
│ ▸ Overview   │  ← Active state: accent-muted bg + accent text + left 2px accent border
│   Financials │
│   DCF Model  │
│   Scenarios  │
│   Exports    │
│              │
│ ─────────────│
│ ⚙ Settings   │  ← Bottom-anchored
└──────────────┘
```

**Top Bar (56px, sticky, full width):**
- Left: Brand logo (if sidebar is collapsed on smaller screens)
- Center-left: Current stock dropdown with quick switch (shows ticker + name + price)
- Right: Period selector (Annual/Quarterly), Settings icon, Command palette trigger (⌘K)
- Optional: Apply `backdrop-filter: blur(20px)` glass effect on scroll

### 6.3 Single-Stock Page — Section Order (Information Architecture)

This is the canonical flow when a user selects a stock:

1. **Stock Header Band**
   - Company name (text-display) + ticker badge (NSE: RELIANCE)
   - Sector/Industry tag
   - Current price (large, with ▲/▼ change in profit/loss color)
   - Key multiples row: P/E · P/B · EV/EBITDA · Market Cap (₹ Cr) · Dividend Yield
   - India-specific: NSE/BSE code, ISIN, Face Value, Promoter Holding %

2. **Valuation Snapshot (Hero Section)**
   - **DCF Intrinsic Value card** — THIS is the hero glassmorphic element
     - Large intrinsic value number (₹ X,XXX)
     - Margin of Safety % (profit/loss colored)
     - Valuation zone indicator (5 segments: significantly undervalued → significantly overvalued, like GuruFocus)
     - Scenario selector pills: Base | Bull | Bear
   - 2-3 KPI cards beside it: Implied IRR, WACC used, Terminal Value % of total

3. **DCF Model Core**
   - Left panel: Assumption groups in accordion/collapsible sections:
     - **Revenue & Growth:** Revenue CAGR stage 1, stage 2, terminal growth
     - **Profitability:** EBITDA margin trajectory, tax rate
     - **Reinvestment:** Capex/Revenue, Working capital assumptions
     - **Capital Structure:** WACC, cost of equity, cost of debt, D/E ratio
     - **Macro:** Risk-free rate, Equity risk premium
   - Each input: slider + numeric input field side by side
   - Right panel: FCF bridge waterfall chart + valuation output summary

4. **Projected Financials Table**
   - Multi-year P&L, Balance Sheet, Cash Flow in dense table format
   - Columns = FY years (FY24, FY25, FY26E, FY27E, FY28E...)
   - Sticky left column (line item names), sticky top row (periods)
   - All values in ₹ Cr with Indian number grouping
   - Subtle row banding: alternate `bg-surface` / `bg-surface-alt`
   - Conditional coloring on growth rates (profit green for positive, loss red for negative)

5. **Sensitivity Analysis & Scenarios**
   - 2D Sensitivity heatmap: Discount rate (rows) × Terminal growth rate (columns)
     - Each cell: intrinsic value, color-coded by over/under valuation
     - Clickable cells update the hero valuation card
   - Tornado chart: horizontal bars showing sensitivity of intrinsic value to each key driver
   - Scenario comparison: Base | Bull | Bear cards side by side showing key assumption deltas

6. **Export / Report**
   - Export buttons: Download as Excel (.xlsx), Export PDF report, Copy model link
   - Clean, minimal — just a row of buttons at the bottom

---

## 7. COMPONENT SPECIFICATIONS

### 7.1 Valuation Hero Card (Glassmorphic)

This is the ONE element that gets the glass treatment. It must feel like it's floating.

```jsx
// Tailwind classes
className="
  relative overflow-hidden
  rounded-[18px]
  bg-[--valk-glass-bg]
  backdrop-blur-[20px]
  border border-[--valk-glass-border]
  shadow-[--valk-shadow-lg]
  p-6
"
```

Inner content:
- "Intrinsic Value" label: text-caption, text-secondary
- Value: text-display (32px), Semibold, text-primary, with ₹ prefix
- Margin of Safety: text-title (20px), colored with `--valk-profit` or `--valk-loss`
- Valuation zone: horizontal 5-segment bar, current position marked with dot + label
- Scenario pills at bottom: shadcn ToggleGroup or custom pills

**Subtle radial gradient glow behind the card** (placed on parent):
```css
.hero-glow::before {
  content: '';
  position: absolute;
  width: 400px;
  height: 400px;
  background: radial-gradient(circle, rgba(10, 132, 255, 0.06) 0%, transparent 70%);
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
}
```

### 7.2 KPI Metric Card

```
┌─────────────────────────┐
│  WACC                   │  ← text-caption, text-muted, uppercase, tracking-wider
│  11.24%                 │  ← text-heading (24px), Semibold, text-primary, tabular-nums
│  ▲ 0.5% vs last run    │  ← text-caption, profit/loss colored
└─────────────────────────┘
```
- Background: `bg-surface`
- Border: `border border-[--valk-border-subtle]`
- Radius: `rounded-[--valk-radius-lg]` (14px)
- Padding: `p-4`
- Hover: translateY(-2px), shadow increase, 120ms

### 7.3 Dense Financial Table

```
┌─────────────────────────────────────────────────────────────────────┐
│  (sticky) Line Item     │  FY22   │  FY23   │  FY24   │  FY25E  │
├─────────────────────────┼─────────┼─────────┼─────────┼─────────┤
│  Revenue                │ 2,15,430│ 2,44,850│ 2,78,320│ 3,12,000│  ← text-dense, text-primary
│  YoY Growth %           │   12.3% │   13.7% │   13.7% │   12.1% │  ← text-dense, profit colored
│  EBITDA                 │  38,420 │  44,100 │  51,230 │  59,800 │
│  EBITDA Margin %        │   17.8% │   18.0% │   18.4% │   19.2% │  ← text-dense, text-secondary
├─────────────────────────┼─────────┼─────────┼─────────┼─────────┤
│  ...                    │         │         │         │         │
└─────────────────────────────────────────────────────────────────────┘
```

**Table styling rules:**
- Row height: 36px (compact density)
- Cell horizontal padding: 12px (`px-3`)
- Cell vertical padding: 8px (`py-2`)
- Header row: `bg-surface-alt`, text-body weight Semibold, text-secondary color
- Data rows: alternate `bg-surface` / transparent (very subtle banding)
- Row hover: `bg-hover`
- All numbers: `tabular-nums lining-nums`, right-aligned
- Text labels: left-aligned
- Sticky first column: left 0, z-10, with right shadow gradient
- Sticky header row: top 0, z-20
- Projected/estimated columns (FY25E, FY26E): slightly different header treatment — italic "E" suffix or muted bg tint
- Horizontal scroll indicator: subtle gradient shadow on left/right edges when scrollable
- Currency unit label in column header: "₹ Cr" — do not repeat ₹ in every cell

### 7.4 Sensitivity Heatmap

A 2D grid (e.g., 7×7 or 9×9):
- Rows: Discount rate (WACC) values — 8% to 14%
- Columns: Terminal growth rate values — 2% to 6%
- Each cell: shows intrinsic value (₹ XXX)
- Color scale: deep green (most undervalued) → neutral gray → deep red (most overvalued) relative to current market price
- Current/base-case cell: highlighted with accent border
- On cell click: update the hero valuation card with that scenario

### 7.5 Waterfall Chart (FCF Bridge)

Vertical bar chart showing how we go from Revenue → EBITDA → EBIT → NOPAT → FCF:
- Each bar shows the add/subtract from previous
- Positive increments: `--valk-profit`
- Negative decrements: `--valk-loss`
- Connector lines between bars: `--valk-border-medium`
- Final bar (FCF): `--valk-accent`
- Labels above/below each bar: value in ₹ Cr
- Use Visx for precise positioning

### 7.6 Football Field Valuation Range

Horizontal range chart showing valuation from different methods:
```
DCF (Base)        ████████████████████████████       ₹ 1,800 - ₹ 2,400
DCF (Bull)             ████████████████████████████████  ₹ 2,100 - ₹ 3,000
PE Multiple       ██████████████████████               ₹ 1,600 - ₹ 2,200
EV/EBITDA         █████████████████████████            ₹ 1,700 - ₹ 2,350
                  |         |         |         |
                  ₹1,500    ₹2,000    ₹2,500    ₹3,000

                  ▼ Current Market Price: ₹2,150
```
- Each row: method label (left), horizontal bar [low, high], value range (right)
- Current price: vertical dashed line overlay
- Color: each method gets a distinct accent from the chart palette

### 7.7 Assumption Input Form

Grouped in collapsible accordion sections (Shadcn Accordion):

```
▾ Revenue & Growth
  ┌─────────────────────────────────────────────────┐
  │  Revenue CAGR (Stage 1)                         │
  │  [═══════════●══════] 14.5%    [  14.5  ] %    │
  │                                                  │
  │  High-growth Period (years)                      │
  │  [══════●═══════════] 5 yrs    [   5    ] yrs  │
  │                                                  │
  │  Terminal Growth Rate                            │
  │  [══●═══════════════] 4.0%     [  4.0   ] %    │
  └─────────────────────────────────────────────────┘
▸ Profitability (collapsed)
▸ Reinvestment (collapsed)
▸ Capital Structure (collapsed)
```

- Slider + numeric input side by side for each assumption
- Slider track: `bg-tertiary`, filled portion: `bg-accent`
- Slider thumb: 16px circle, white, with shadow
- Numeric input: compact, right-aligned, monospace-like (tabular-nums), bg-surface-alt, no visible border until focus
- On focus: border-strong
- Section header: text-body, Semibold, with subtle left accent bar when expanded

### 7.8 Stock Search (Typeahead / Command Palette)

Two access points:
1. Sidebar search field (always visible)
2. ⌘K command palette (Shadcn Command component)

Dropdown results:
```
┌──────────────────────────────────────────────┐
│  🔍 Search stocks...                         │
├──────────────────────────────────────────────┤
│  RELIANCE    Reliance Industries   NSE  ₹2,850│
│  TCS         Tata Consultancy      NSE  ₹3,620│
│  INFY        Infosys Ltd           NSE  ₹1,440│
│  HDFCBANK    HDFC Bank             NSE  ₹1,710│
└──────────────────────────────────────────────┘
```
- Ticker: text-dense, Semibold, text-primary
- Company name: text-dense, Regular, text-secondary
- Exchange badge: tiny pill, text-caption, bg-tertiary
- Price: text-dense, tabular-nums, right-aligned

---

## 8. INDIAN EQUITY FORMATTING RULES

### 8.1 Currency Display

**Rule: Always use Indian number grouping (lakhs/crores system).**

The Indian system groups: first 3 digits from right, then groups of 2:
- 1,23,456 (NOT 123,456)
- 12,34,56,789 (NOT 1,234,567,89)

**Implementation:**
```javascript
// Use Intl.NumberFormat with en-IN locale
const formatINR = (value) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,  // No decimals for large numbers
  }).format(value);
};

// For abbreviated display (cards, headers):
const formatCrore = (value) => {
  const cr = value / 10000000;
  return `₹ ${cr.toLocaleString('en-IN', { maximumFractionDigits: 1 })} Cr`;
};

const formatLakh = (value) => {
  const l = value / 100000;
  return `₹ ${l.toLocaleString('en-IN', { maximumFractionDigits: 1 })} L`;
};
```

**When to use which format:**
| Context                          | Format                    | Example             |
|----------------------------------|---------------------------|---------------------|
| Market cap in header/card        | ₹ X,XXX Cr abbreviated   | ₹ 19,10,786 Cr     |
| Revenue in table header          | Column labeled "₹ Cr"     | 2,15,430            |
| Revenue in table cells           | Indian grouping, no ₹     | 2,15,430            |
| Stock price                      | ₹ with 2 decimals         | ₹ 2,850.45          |
| Per-share values                 | ₹ with 2 decimals         | ₹ 142.30            |
| Percentages                      | 1-2 decimals + %          | 14.5%               |
| Multiples                        | 1 decimal + x suffix      | 24.8x               |

### 8.2 Fiscal Year Labels

India's fiscal year runs April to March. Always display as:
- **FY24** = April 2023 – March 2024
- **FY25** = April 2024 – March 2025
- **FY26E** = Estimated (projected by model)

Add a tooltip or footnote on first occurrence: "FY = Indian Fiscal Year (Apr–Mar)"

### 8.3 Exchange & Identifier Display

- Show both NSE and BSE symbols where available
- Format: `NSE: RELIANCE` or as a small badge/pill
- ISIN displayed in stock header as tertiary metadata
- Face value shown in stock details section

---

## 9. LOADING STATES & SKELETON PATTERNS

### 9.1 Progressive Loading Order

When a stock is selected, load in this sequence:
1. **Immediate (0ms):** Page skeleton — all sections show skeleton blocks
2. **Fast (200-500ms):** Stock header (name, price, basic multiples) — fade in
3. **Medium (500-1500ms):** DCF model outputs (intrinsic value, MOS, valuation zone) — fade in with count-up animation on numbers
4. **Slower (1-3s):** Full financial tables, charts, sensitivity analysis — staggered fade in

### 9.2 Skeleton Design

- Skeleton blocks: `bg-surface-alt` with subtle shimmer animation
- Shimmer: left-to-right gradient sweep, 1.5s duration, ease-in-out, infinite
- Match skeleton shape to final content shape (table rows look like rows, cards look like cards)
- **Never use a single full-screen spinner.** Always use section-level loading.

```css
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.skeleton {
  background: linear-gradient(
    90deg,
    var(--valk-bg-surface-alt) 25%,
    var(--valk-bg-tertiary) 50%,
    var(--valk-bg-surface-alt) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
  border-radius: var(--valk-radius-md);
}
```

### 9.3 Number Transition Animation

When values update (e.g., scenario switch from Base to Bull):
```jsx
// Use Framer Motion's useMotionValue + animate
// Count from oldValue → newValue over 400ms
// Always apply tabular-nums to prevent width jitter
```

---

## 10. GLASSMORPHISM RULES — USE WITH EXTREME RESTRAINT

Glass effects are reserved for **maximum 3 elements** in the entire application:

1. ✅ **Hero Valuation Card** — the central DCF intrinsic value display
2. ✅ **Top Navigation Bar** — only on scroll (when content passes behind it)
3. ✅ **Command Palette overlay** — the ⌘K search modal background

**Everything else uses solid `bg-surface` or `bg-surface-alt`. No exceptions.**

Glass implementation:
```css
.glass {
  background: var(--valk-glass-bg);       /* rgba(17, 17, 23, 0.70) */
  backdrop-filter: blur(var(--valk-glass-blur));  /* 20px */
  -webkit-backdrop-filter: blur(var(--valk-glass-blur));
  border: 1px solid var(--valk-glass-border);     /* rgba(255,255,255,0.08) */
  box-shadow: var(--valk-shadow-lg);
}
```

**What makes glass look cheap (AVOID):**
- Glass on every card
- Glass over busy/noisy chart backgrounds (text becomes unreadable)
- Bright neon glows or colored shadows
- Multiple overlapping glass layers

**What makes glass look premium (DO):**
- Glass over a subtle radial gradient background (dark blue/purple blobs)
- High contrast text on glass surface
- Single, elevated hero element that feels like it's floating
- Very subtle border highlight (1px, 8% white opacity)

---

## 11. TAILWIND CONFIGURATION

### 11.1 Custom Theme Setup

In your `tailwind.config.ts` or `globals.css` with Tailwind v4:

```css
@layer base {
  :root {
    /* Paste all CSS custom properties from Section 2 here */
  }

  body {
    background-color: var(--valk-bg-app);
    color: var(--valk-text-primary);
    font-family: var(--font-sans);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
}

@layer utilities {
  /* Background utilities */
  .bg-app          { background-color: var(--valk-bg-app); }
  .bg-surface      { background-color: var(--valk-bg-surface); }
  .bg-surface-alt  { background-color: var(--valk-bg-surface-alt); }
  .bg-tertiary     { background-color: var(--valk-bg-tertiary); }
  .bg-hover        { background-color: var(--valk-bg-hover); }

  /* Text utilities */
  .text-primary    { color: var(--valk-text-primary); }
  .text-secondary  { color: var(--valk-text-secondary); }
  .text-muted      { color: var(--valk-text-muted); }

  /* Semantic utilities */
  .text-profit     { color: var(--valk-profit); }
  .text-loss       { color: var(--valk-loss); }
  .bg-profit       { background-color: var(--valk-profit-bg); }
  .bg-loss         { background-color: var(--valk-loss-bg); }

  /* Border utilities */
  .border-subtle   { border-color: var(--valk-border-subtle); }
  .border-strong   { border-color: var(--valk-border-strong); }

  /* Numeric table utility */
  .tabular-nums {
    font-variant-numeric: tabular-nums lining-nums;
    font-feature-settings: "tnum" 1, "lnum" 1;
  }
}
```

### 11.2 Shadcn/UI Theme Override

Override Shadcn's default CSS variables to match Valkyrie:

```css
@layer base {
  :root {
    --background: 230 40% 2%;         /* maps to --valk-bg-app */
    --foreground: 240 5% 96%;          /* maps to --valk-text-primary */
    --card: 230 30% 7%;                /* maps to --valk-bg-surface */
    --card-foreground: 240 5% 96%;
    --popover: 230 30% 7%;
    --popover-foreground: 240 5% 96%;
    --primary: 211 100% 52%;           /* maps to --valk-accent */
    --primary-foreground: 0 0% 100%;
    --secondary: 225 20% 13%;          /* maps to --valk-bg-surface-alt */
    --secondary-foreground: 240 5% 96%;
    --muted: 225 18% 15%;              /* maps to --valk-bg-tertiary */
    --muted-foreground: 240 5% 60%;    /* maps to --valk-text-muted */
    --accent: 225 20% 13%;
    --accent-foreground: 240 5% 96%;
    --destructive: 354 80% 58%;        /* maps to --valk-loss */
    --destructive-foreground: 0 0% 100%;
    --border: 0 0% 100% / 0.06;        /* maps to --valk-border-subtle */
    --input: 0 0% 100% / 0.06;
    --ring: 211 100% 52%;              /* maps to --valk-accent */
    --radius: 0.625rem;                /* 10px = --valk-radius-md */
  }
}
```

---

## 12. FILE & FOLDER STRUCTURE (Recommended)

```
valkyrie-dcf/
├── app/
│   ├── layout.tsx                    # Root layout: sidebar + top bar + main area
│   ├── page.tsx                      # Landing / stock search
│   ├── stock/[ticker]/
│   │   ├── layout.tsx                # Stock-level layout with header band
│   │   ├── page.tsx                  # Overview (redirects or shows snapshot)
│   │   ├── financials/page.tsx       # Financial statements tables
│   │   ├── dcf/page.tsx              # DCF model (assumptions + outputs)
│   │   ├── scenarios/page.tsx        # Sensitivity + scenario comparison
│   │   └── export/page.tsx           # Export options
│   └── globals.css                   # All Valkyrie CSS tokens + Tailwind layers
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── TopBar.tsx
│   │   └── PageTransition.tsx        # AnimatePresence wrapper
│   ├── stock/
│   │   ├── StockHeader.tsx           # Band 1: name, price, multiples
│   │   ├── ValuationHeroCard.tsx     # Glassmorphic DCF result card
│   │   ├── KPICard.tsx               # Reusable metric card
│   │   └── ValuationZoneBar.tsx      # 5-segment over/undervalued indicator
│   ├── dcf/
│   │   ├── AssumptionsForm.tsx       # Accordion groups with sliders
│   │   ├── WaterfallChart.tsx        # Visx FCF bridge
│   │   ├── FootballField.tsx         # Visx range chart
│   │   ├── SensitivityHeatmap.tsx    # 2D grid
│   │   ├── TornadoChart.tsx          # Sensitivity tornado
│   │   └── ScenarioComparison.tsx    # Base/Bull/Bear cards
│   ├── financials/
│   │   ├── FinancialTable.tsx        # Dense table with sticky headers
│   │   └── RatiosTable.tsx           # Key ratios table
│   ├── charts/
│   │   ├── LineAreaChart.tsx          # Recharts wrapper (revenue trends)
│   │   ├── SparklineChart.tsx         # Mini inline charts
│   │   └── ChartTheme.ts             # Shared chart color/style config
│   ├── ui/                           # Shadcn/UI components (auto-generated)
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── accordion.tsx
│   │   ├── command.tsx               # ⌘K palette
│   │   ├── tabs.tsx
│   │   ├── tooltip.tsx
│   │   └── ...
│   └── shared/
│       ├── Skeleton.tsx              # Shimmer skeleton component
│       ├── AnimatedNumber.tsx        # Count-up number transition
│       └── ProfitLossText.tsx        # Auto-colors based on +/-
├── lib/
│   ├── format.ts                     # Indian currency formatting, FY labels
│   ├── api.ts                        # N8N webhook calls
│   └── constants.ts                  # Token values as JS objects (for charts)
├── hooks/
│   ├── useDCFModel.ts                # State management for DCF inputs/outputs
│   └── useStockData.ts               # Fetch + cache stock data
└── public/
    └── fonts/                        # Inter + JetBrains Mono (self-hosted)
```

---

## 13. API INTEGRATION REFERENCE

**N8N Webhook Endpoints:**
- Extract financial data: `https://dcfagent.app.n8n.cloud/webhook/dcf-extract`
- Run DCF model: `https://dcfagent.app.n8n.cloud/webhook/dcf-model`

All API calls should:
- Show section-level skeleton loading during fetch
- Handle errors gracefully with a subtle inline error message (not a modal)
- Cache results in React state; re-fetch only when ticker or assumptions change

---

## 14. QUICK REFERENCE — DO's AND DON'Ts

### DO ✅
- Use Valkyrie token CSS variables for every color, radius, shadow
- Use tabular-nums on every number column and financial value
- Use Indian number grouping (1,23,456) for all ₹ amounts
- Use Inter 400/500/600 weights only
- Use 8px grid for all spacing decisions
- Use Framer Motion springs for page/section transitions
- Use section-level skeletons for loading states
- Show FY labels (FY24, FY25E) for Indian fiscal years
- Keep glass effects to ≤3 elements total
- Right-align all numeric columns in tables
- Use profit/loss semantic colors from TradingView (#089981 / #F23645)

### DON'T ❌
- Never use raw hex codes in components — always use CSS variables
- Never use font-weight 700 (Bold) — max is 600 (Semibold)
- Never use a full-screen loading spinner
- Never apply glassmorphism to more than 3 elements
- Never use light theme or add a theme toggle
- Never use Western number grouping (123,456) for Indian Rupee amounts
- Never use proportional figures in financial tables — always tabular
- Never use exaggerated bounce, parallax, or overshoot animations
- Never use bright neon glows or colored drop shadows
- Never put glass surfaces over noisy chart backgrounds
- Never use Comic Sans, Papyrus, or any serif font (this should go without saying)
- Never repeat ₹ symbol in every table cell — put "₹ Cr" in column header only

---

## 15. DESIGN INSPIRATION REFERENCE

When in doubt about how something should look and feel, reference these:

| Reference                        | What to Learn From It                                |
|----------------------------------|------------------------------------------------------|
| Apple Stocks app (iOS)           | Dark-only, compact lists, green/red semantics        |
| Bloomberg Terminal               | Density, multi-panel, keyboard-first, accent colors  |
| Koyfin dashboards                | Customizable grid panels, integrated search          |
| TradingView (dark mode)          | Chart color semantics, clean dark palette             |
| GuruFocus DCF calculator         | Valuation zone bar, 5-segment indicator              |
| Screener.in                      | Indian financial table formatting, ₹ Cr conventions  |
| Shadcn/UI dark blocks            | Card layouts, dense tables, component patterns       |
| Apple Card (glassmorphism)       | Restrained glass usage on hero financial element     |
| FactSet Workstation              | Typographic density, institutional panel composition |
| v0 by Vercel stock portfolio UI  | Tailwind glass implementation patterns               |

---

*This document is the single source of truth. When building any component, check this file first. When in doubt, choose the more restrained, more minimal option. Valkyrie whispers — it never shouts.*

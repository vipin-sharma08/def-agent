"use client";

// src/components/report/DcfValuationTab.tsx
// ═══════════════════════════════════════════════════════════════════
// Full DCF workings: FCFF schedule, WACC bridge, terminal value
// calculation, and the equity value bridge.
// ═══════════════════════════════════════════════════════════════════

import { ReportTable, type ReportRow, type ColumnType } from "@/components/report/ReportTable";
import { FcffWaterfall } from "@/components/charts/FcffWaterfall";
import { EvBridgeWaterfall } from "@/components/charts/EvBridgeWaterfall";
import { WaccPieChart } from "@/components/charts/WaccPieChart";
import type { DcfValuation } from "@/lib/types";

interface Props {
  dcf: DcfValuation;
}

// ─── Helpers ──────────────────────────────────────────────────────

function fmtCrore(v: number | null | undefined): string {
  if (v == null || !isFinite(v)) return "—";
  const neg = v < 0;
  const abs = Math.abs(v);
  const [intStr] = abs.toFixed(0).split(".");
  const len = intStr.length;
  let out = "";
  if (len <= 3) {
    out = intStr;
  } else {
    out = intStr.slice(len - 3);
    let rem = intStr.slice(0, len - 3);
    while (rem.length > 2) {
      out = rem.slice(rem.length - 2) + "," + out;
      rem = rem.slice(0, rem.length - 2);
    }
    if (rem) out = rem + "," + out;
  }
  return `${neg ? "−" : ""}₹${out} Cr`;
}

function fmtPct(v: number | null | undefined): string {
  if (v == null || !isFinite(v)) return "—";
  return `${v.toFixed(2)}%`;
}

function fmtShare(v: number | null | undefined): string {
  if (v == null || !isFinite(v)) return "—";
  const neg = v < 0;
  const abs = Math.abs(v);
  const [intStr, dec] = abs.toFixed(2).split(".");
  const len = intStr.length;
  let out = "";
  if (len <= 3) {
    out = intStr;
  } else {
    out = intStr.slice(len - 3);
    let rem = intStr.slice(0, len - 3);
    while (rem.length > 2) {
      out = rem.slice(rem.length - 2) + "," + out;
      rem = rem.slice(0, rem.length - 2);
    }
    if (rem) out = rem + "," + out;
  }
  return `${neg ? "−" : ""}₹${out}.${dec}`;
}

// ─── FCFF schedule rows ────────────────────────────────────────────

function buildFcffRows(dcf: DcfValuation): ReportRow[] {
  const { fcff, discount_factors, pv_of_fcffs } = dcf;
  return [
    { key: "h_fcff", label: "FREE CASH FLOW TO FIRM (FCFF)", values: [], isSectionHeader: true },
    { key: "ebit",       label: "EBIT",                         values: fcff.ebit },
    { key: "tax_ebit",   label: "Less: Tax on EBIT",            values: fcff.tax_on_ebit, indent: 1 },
    { key: "nopat",      label: "NOPAT (EBIT × (1 − t))",       values: fcff.nopat, isSubtotal: true },
    { key: "da_add",     label: "Add: Depreciation & Amort.",   values: fcff.depreciation, indent: 1 },
    { key: "capex_less", label: "Less: Capital Expenditure",    values: fcff.capex, indent: 1 },
    { key: "nwc_less",   label: "Less: Increase in NWC",        values: fcff.change_in_nwc, indent: 1 },
    { key: "fcff_row",   label: "FCFF",                         values: fcff.fcff, isTotal: true },

    { key: "h_pv", label: "DISCOUNTING", values: [], isSectionHeader: true },
    {
      key: "disc_factor",
      label: "Discount Factor (1/(1+WACC)ⁿ)",
      values: discount_factors,
      format: "factor",
      isMetric: true,
    },
    {
      key: "pv_fcff",
      label: "PV of FCFF",
      values: pv_of_fcffs,
      isSubtotal: true,
    },
  ];
}

// ─── Panel components ──────────────────────────────────────────────

const PanelRow = ({
  label,
  value,
  isTotal,
  isAdd,
  isSub,
  mono,
}: {
  label: string;
  value: string;
  isTotal?: boolean;
  isAdd?: boolean;
  isSub?: boolean;
  mono?: boolean;
}) => (
  <div
    className={`flex items-center justify-between py-2 ${
      isTotal ? "border-t-2 border-border mt-1" : "border-b border-border/40"
    }`}
  >
    <span
      className={`text-sm ${
        isTotal ? "font-semibold text-zinc-100" : "text-zinc-400"
      }`}
    >
      {isSub ? "Less: " : isAdd ? "Add: " : ""}{label}
    </span>
    <span
      className={`font-number text-sm ${
        isTotal
          ? "font-semibold text-teal"
          : isSub
          ? "text-negative"
          : mono
          ? "text-zinc-600 font-mono text-xs"
          : "text-zinc-300"
      }`}
    >
      {value}
    </span>
  </div>
);

const SectionHeader = ({ title }: { title: string }) => (
  <p className="text-[10px] font-mono font-semibold tracking-[0.18em] text-zinc-600 uppercase mt-5 mb-2 border-b border-border pb-1">
    {title}
  </p>
);

// ─── Main component ────────────────────────────────────────────────

export const DcfValuationTab = ({ dcf }: Props) => {
  const { wacc, terminal_value: tv } = dcf;
  const fcffYears = dcf.fcff.years;
  const columnTypes: ColumnType[] = fcffYears.map(() => "projected");
  const fcffRows = buildFcffRows(dcf);

  return (
    <div className="space-y-0">
      {/* ── FCFF Schedule ── */}
      <div className="p-0">
        <div className="px-4 pt-4 pb-2 text-[10px] font-mono font-semibold tracking-[0.18em] text-zinc-600 uppercase">
          FCFF Schedule (₹ Crores)
        </div>
        <ReportTable years={fcffYears} columnTypes={columnTypes} rows={fcffRows} />
      </div>

      {/* ── FCFF Waterfall Chart ── */}
      <div className="border-t border-border p-6">
        <FcffWaterfall fcff={dcf.fcff} />
      </div>

      {/* ── Three panels: WACC | TV | Equity Bridge ── */}
      <div className="grid grid-cols-3 divide-x divide-border border-t border-border">

        {/* WACC Bridge */}
        <div className="p-6">
          <p className="text-[10px] font-mono font-semibold tracking-[0.18em] text-zinc-600 uppercase mb-1">
            WACC Derivation
          </p>

          <SectionHeader title="Cost of Equity (CAPM)" />
          <PanelRow label="Risk-Free Rate (Rf)"           value={fmtPct(wacc.components.risk_free_rate)} />
          <PanelRow label="Beta (β)"                      value={`${wacc.components.beta.toFixed(2)}`} />
          <PanelRow label="Equity Risk Premium (ERP)"     value={fmtPct(wacc.components.equity_risk_premium ?? 0)} />
          <PanelRow label="Formula"                       value={wacc.components.ke_formula} mono />
          <PanelRow label="Cost of Equity (Ke)"           value={fmtPct(wacc.cost_of_equity)} isTotal />

          <SectionHeader title="Cost of Debt" />
          <PanelRow label="Pre-Tax Cost of Debt"          value={fmtPct(wacc.cost_of_debt_pre_tax)} />
          <PanelRow label="Post-Tax Cost of Debt (Kd)"    value={fmtPct(wacc.cost_of_debt_post_tax)} isTotal />

          <SectionHeader title="Capital Structure Weights" />
          <PanelRow label="Equity Weight (E/V)"           value={`${wacc.equity_weight.toFixed(1)}%`} />
          <PanelRow label="Debt Weight (D/V)"             value={`${wacc.debt_weight.toFixed(1)}%`} />

          {/* Capital structure pie chart */}
          <div className="mt-4 mb-4">
            <WaccPieChart wacc={wacc} />
          </div>

          <div className="mt-4 bg-teal-surface border border-teal-border rounded-lg p-4 text-center">
            <p className="text-[9px] font-mono text-teal/70 uppercase tracking-widest mb-1">WACC</p>
            <p className="font-number text-3xl font-semibold text-teal">{fmtPct(wacc.wacc)}</p>
            <p className="text-[10px] font-mono text-zinc-600 mt-1">
              Ke × E% + Kd(net) × D%
            </p>
          </div>
        </div>

        {/* Terminal Value */}
        <div className="p-6">
          <p className="text-[10px] font-mono font-semibold tracking-[0.18em] text-zinc-600 uppercase mb-1">
            Terminal Value (Gordon Growth)
          </p>

          <SectionHeader title="Inputs" />
          <PanelRow label="Terminal Year FCFF"            value={fmtCrore(tv.terminal_fcff)} />
          <PanelRow label="Terminal Growth Rate (g)"      value={fmtPct(tv.terminal_growth_rate)} />
          <PanelRow label="WACC"                          value={fmtPct(wacc.wacc)} />

          <SectionHeader title="Calculation" />
          <div className="bg-elevated rounded p-3 my-2">
            <p className="text-[10px] font-mono text-zinc-600 mb-1">Formula</p>
            <p className="font-number text-xs text-zinc-400">
              TV = FCFF₅ × (1+g) / (WACC − g)
            </p>
            <p className="font-number text-xs text-zinc-600 mt-1">
              = {fmtCrore(tv.terminal_fcff)} × (1+{tv.terminal_growth_rate}%) / ({wacc.wacc.toFixed(2)}% − {tv.terminal_growth_rate}%)
            </p>
          </div>
          <PanelRow label="Terminal Value (Undiscounted)"  value={fmtCrore(tv.terminal_value_undiscounted)} />
          <PanelRow label="PV of Terminal Value"           value={fmtCrore(tv.terminal_value_discounted)} isTotal />

          <SectionHeader title="TV Quality Check" />
          <PanelRow label="TV as % of Enterprise Value"   value={`${tv.tv_as_pct_of_ev.toFixed(1)}%`} />
          {tv.tv_warning && (
            <div className="mt-2 p-2 bg-amber-950/30 border border-amber-500/30 rounded text-[10px] font-mono text-amber-400">
              ⚠ {tv.tv_warning}
            </div>
          )}
          {tv.tv_as_pct_of_ev > 75 && !tv.tv_warning && (
            <div className="mt-2 p-2 bg-amber-950/30 border border-amber-500/30 rounded text-[10px] font-mono text-amber-400">
              ⚠ TV &gt; 75% of EV. Valuation is highly sensitive to terminal assumptions.
            </div>
          )}
        </div>

        {/* Equity Value Bridge */}
        <div className="p-6">
          <p className="text-[10px] font-mono font-semibold tracking-[0.18em] text-zinc-600 uppercase mb-1">
            Equity Value Bridge
          </p>

          <SectionHeader title="From Enterprise to Equity" />
          <PanelRow label="Sum of PV (FCFFs)"             value={fmtCrore(dcf.sum_pv_fcffs)} />
          <PanelRow label="PV of Terminal Value"          value={fmtCrore(tv.terminal_value_discounted)} isAdd />
          <PanelRow label="Enterprise Value"              value={fmtCrore(dcf.enterprise_value)} isTotal />
          <PanelRow label="Net Debt"                      value={fmtCrore(dcf.less_net_debt)} isSub />
          <PanelRow label="Non-Operating Assets"          value={fmtCrore(dcf.plus_non_operating_assets)} isAdd />
          <PanelRow label="Equity Value"                  value={fmtCrore(dcf.equity_value)} isTotal />

          <SectionHeader title="Per Share" />
          <PanelRow label="Equity Value"                  value={fmtCrore(dcf.equity_value)} />
          <PanelRow label="Diluted Shares Outstanding"    value={`${dcf.diluted_shares.toFixed(2)} Cr`} isSub />

          <div className="mt-4 bg-elevated border border-teal/20 rounded-lg p-4 text-center">
            <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest mb-1">
              Intrinsic Value per Share
            </p>
            <p className="font-number text-3xl font-semibold text-teal">
              {fmtShare(dcf.per_share_value)}
            </p>
            {dcf.current_market_price != null && dcf.upside_downside_pct != null && (
              <div className="mt-2">
                <p className="text-[10px] font-mono text-zinc-600">
                  CMP: {fmtShare(dcf.current_market_price)}
                </p>
                <p
                  className={`font-number text-sm font-semibold mt-0.5 ${
                    dcf.upside_downside_pct >= 0 ? "text-teal" : "text-negative"
                  }`}
                >
                  {dcf.upside_downside_pct >= 0 ? "+" : ""}
                  {dcf.upside_downside_pct.toFixed(1)}% upside
                </p>
              </div>
            )}
          </div>

          {/* EV Bridge waterfall chart */}
          <div className="mt-5">
            <EvBridgeWaterfall dcf={dcf} />
          </div>
        </div>
      </div>
    </div>
  );
};

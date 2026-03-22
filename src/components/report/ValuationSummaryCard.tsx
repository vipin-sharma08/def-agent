"use client";

// src/components/report/ValuationSummaryCard.tsx
// ═══════════════════════════════════════════════════════════════════
// Hero card: intrinsic value, upside/downside gauge, EV bridge,
// WACC/beta/TV key metrics.
// ═══════════════════════════════════════════════════════════════════

import { TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import type { DcfValuation, CompanyMetadata, UserAssumptions } from "@/lib/types";

// ─── Helpers ──────────────────────────────────────────────────────

function fmtCrore(v: number | null | undefined, decimals = 0): string {
  if (v == null || !isFinite(v)) return "—";
  const neg = v < 0;
  const abs = Math.abs(v);
  const fixed = abs.toFixed(decimals);
  const [intStr, dec] = fixed.split(".");
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
  const formatted = decimals > 0 && dec ? `₹${out}.${dec}` : `₹${out}`;
  return `${neg ? "−" : ""}${formatted} Cr`;
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

// ─── Sub-components ────────────────────────────────────────────────

const BridgeRow = ({
  label,
  value,
  isTotal,
  isSubtract,
}: {
  label: string;
  value: string;
  isTotal?: boolean;
  isSubtract?: boolean;
}) => (
  <div
    className={`flex items-center justify-between py-1 ${
      isTotal ? "border-t border-border mt-1 pt-2" : ""
    }`}
  >
    <span
      className={`text-xs ${
        isTotal ? "font-semibold text-zinc-100" : "text-zinc-500"
      }`}
    >
      {isSubtract ? "Less: " : ""}{label}
    </span>
    <span
      className={`font-number text-xs ${
        isTotal
          ? "font-bold text-teal"
          : isSubtract
          ? "text-negative"
          : "text-zinc-300"
      }`}
    >
      {value}
    </span>
  </div>
);

const KpiChip = ({ label, value }: { label: string; value: string }) => (
  <div className="text-center px-4 py-2 border-r border-border last:border-0">
    <p className="text-[9px] font-mono text-zinc-600 tracking-widest uppercase mb-0.5">
      {label}
    </p>
    <p className="font-number text-sm font-semibold text-zinc-300">{value}</p>
  </div>
);

// ─── Main component ────────────────────────────────────────────────

interface Props {
  dcf: DcfValuation;
  meta: CompanyMetadata;
  assumptions: UserAssumptions;
}

export const ValuationSummaryCard = ({ dcf, meta, assumptions }: Props) => {
  const upside = dcf.upside_downside_pct;
  const hasCmp = dcf.current_market_price != null && dcf.current_market_price > 0;
  const isUndervalued = !hasCmp || (upside != null && upside > 0);
  const accentColor = isUndervalued ? "text-teal" : "text-negative";
  const accentBg    = isUndervalued ? "bg-teal" : "bg-negative";

  // Gauge: cap at ±60 % for visual
  const gaugeMax = 60;
  const gaugeAbs = Math.min(Math.abs(upside ?? 0), gaugeMax);
  const gaugePct = (gaugeAbs / gaugeMax) * 100;

  const tvPct = dcf.terminal_value.tv_as_pct_of_ev;
  const tvWarning = tvPct > 75;

  return (
    <div className="card overflow-hidden">
      {/* ── Company header ── */}
      <div className="px-6 py-3 border-b border-border bg-surface flex items-center justify-between">
        <div>
          <span className="font-sans text-base font-semibold text-zinc-100">
            {meta.company_name}
          </span>
          <span className="ml-3 text-xs font-mono text-zinc-500">
            {meta.standalone_or_consolidated} · {meta.industry} · {meta.financial_year_end}
          </span>
        </div>
        <div className="flex items-center gap-3 text-[10px] font-mono text-zinc-500">
          {meta.nse_symbol && <span className="border border-border rounded px-2 py-0.5">NSE: {meta.nse_symbol}</span>}
          {meta.bse_code   && <span className="border border-border rounded px-2 py-0.5">BSE: {meta.bse_code}</span>}
        </div>
      </div>

      {/* ── Three-panel body ── */}
      <div className="grid grid-cols-3 divide-x divide-border">

        {/* Panel 1: Intrinsic Value */}
        <div className="px-6 py-5 flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-mono text-zinc-600 tracking-widest uppercase mb-1">
              Intrinsic Value
            </p>
            <p className={`font-sans text-4xl font-bold tracking-tight ${accentColor}`}>
              {fmtShare(dcf.per_share_value)}
            </p>
            <p className="text-xs text-zinc-600 mt-1">per share (diluted)</p>
          </div>
          <div
            className={`mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono font-bold self-start ${
              isUndervalued
                ? "bg-teal-surface border border-teal-border text-teal"
                : "bg-neg-surface border border-neg-border text-negative"
            }`}
          >
            {isUndervalued ? (
              <TrendingUp size={13} />
            ) : (
              <TrendingDown size={13} />
            )}
            {hasCmp
              ? isUndervalued
                ? "UNDERVALUED"
                : "OVERVALUED"
              : "INTRINSIC VALUE"}
          </div>
        </div>

        {/* Panel 2: CMP Comparison / Upside Gauge */}
        <div className="px-6 py-5">
          <p className="text-[10px] font-mono text-zinc-600 tracking-widest uppercase mb-3">
            {hasCmp ? "vs. Market Price" : "Target Range"}
          </p>

          {hasCmp ? (
            <>
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-xs text-zinc-500">CMP</span>
                <span className="font-number text-lg font-semibold text-zinc-100">
                  {fmtShare(dcf.current_market_price)}
                </span>
              </div>

              <div className="flex items-baseline justify-between mb-4">
                <span className="text-xs text-zinc-500">Upside / Downside</span>
                <span className={`font-number text-xl font-bold ${accentColor}`}>
                  {upside != null
                    ? `${upside >= 0 ? "+" : ""}${upside.toFixed(1)}%`
                    : "—"}
                </span>
              </div>

              {/* Gauge bar */}
              <div className="relative h-3 bg-elevated rounded-full overflow-hidden border border-border">
                {isUndervalued ? (
                  <div
                    className={`absolute left-0 top-0 h-full ${accentBg} rounded-full transition-all`}
                    style={{ width: `${gaugePct}%` }}
                  />
                ) : (
                  <div
                    className={`absolute right-0 top-0 h-full ${accentBg} rounded-full transition-all`}
                    style={{ width: `${gaugePct}%` }}
                  />
                )}
              </div>
              <div className="flex justify-between text-[9px] font-mono text-zinc-800 mt-1">
                <span>0%</span>
                <span>+{gaugeMax}%</span>
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-2 mt-2">
              <p className="text-xs text-zinc-600">
                No current market price provided. Enter CMP in assumptions to see upside/downside.
              </p>
              <p className="font-number text-sm text-zinc-400 mt-2">
                Intrinsic Value: {fmtShare(dcf.per_share_value)}
              </p>
              <p className="font-number text-xs text-zinc-600">
                Equity Value: {fmtCrore(dcf.equity_value, 0)}
              </p>
            </div>
          )}
        </div>

        {/* Panel 3: EV Bridge */}
        <div className="px-6 py-5">
          <p className="text-[10px] font-mono text-zinc-600 tracking-widest uppercase mb-3">
            Enterprise Value Bridge
          </p>
          <BridgeRow label="Sum PV of FCFFs"          value={fmtCrore(dcf.sum_pv_fcffs)} />
          <BridgeRow label="PV of Terminal Value"     value={fmtCrore(dcf.terminal_value.terminal_value_discounted)} />
          <BridgeRow label="Enterprise Value"         value={fmtCrore(dcf.enterprise_value)} isTotal />
          <BridgeRow label="Net Debt"                 value={fmtCrore(dcf.less_net_debt)} isSubtract />
          <BridgeRow label="Non-Operating Assets"     value={fmtCrore(dcf.plus_non_operating_assets)} />
          <BridgeRow label="Equity Value"             value={fmtCrore(dcf.equity_value)} isTotal />
          <div className="flex items-center justify-between py-1">
            <span className="text-xs text-zinc-500">Diluted Shares</span>
            <span className="font-number text-xs text-zinc-300">
              {dcf.diluted_shares?.toFixed(2)} Cr
            </span>
          </div>
          <BridgeRow label="Per Share Value" value={fmtShare(dcf.per_share_value)} isTotal />
        </div>
      </div>

      {/* ── KPI footer ── */}
      <div className="border-t border-border bg-surface flex divide-x divide-border">
        <KpiChip label="WACC" value={`${dcf.wacc.wacc.toFixed(2)}%`} />
        <KpiChip label="Terminal g" value={`${dcf.terminal_value.terminal_growth_rate.toFixed(1)}%`} />
        <KpiChip
          label="TV / EV"
          value={`${dcf.terminal_value.tv_as_pct_of_ev.toFixed(1)}%`}
        />
        <KpiChip label="Beta (β)" value={`${dcf.wacc.components.beta.toFixed(2)}`} />
        <KpiChip label="Cost of Equity (Ke)" value={`${dcf.wacc.cost_of_equity.toFixed(2)}%`} />
        <KpiChip label="Cost of Debt (Kd)" value={`${dcf.wacc.cost_of_debt_post_tax.toFixed(2)}%`} />
        <div className="flex-1 flex items-center justify-end px-4">
          {tvWarning && (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-mono text-amber-400">
              <AlertTriangle size={11} />
              TV &gt; 75% of EV — high terminal value dependency
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

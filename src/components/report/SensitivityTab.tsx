"use client";

// src/components/report/SensitivityTab.tsx
// ═══════════════════════════════════════════════════════════════════
// 5×5 (or N×N) sensitivity grid of intrinsic per-share values.
// Rows = terminal growth rates, Columns = WACC rates.
// Color-coded relative to CMP (or base case if no CMP).
// Base case cell is highlighted with a border.
// ═══════════════════════════════════════════════════════════════════

import { FootballField } from "@/components/charts/FootballField";
import type { SensitivityAnalysis, DcfValuation, Scenarios } from "@/lib/types";

interface Props {
  sensitivity: SensitivityAnalysis;
  dcf: DcfValuation;
  scenarios?: Scenarios;
}

function fmtShare(v: number): string {
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
  return `${neg ? "−" : ""}₹${out}`;
}

function getCellStyle(
  value: number,
  reference: number,
  isBase: boolean
): string {
  if (isBase) return "bg-profit border-2 border-profit text-profit font-semibold";

  const upside = ((value - reference) / Math.abs(reference)) * 100;

  if (upside > 40)   return "bg-profit text-profit";
  if (upside > 20)   return "bg-profit/80 text-profit";
  if (upside > 5)    return "bg-profit/50 text-profit";
  if (upside > -5)   return "bg-surface-alt text-secondary";
  if (upside > -20)  return "bg-loss/50 text-loss";
  if (upside > -40)  return "bg-loss/80 text-loss";
  return              "bg-loss text-loss";
}

export const SensitivityTab = ({ sensitivity, dcf, scenarios }: Props) => {
  const { wacc_range, growth_range, grid } = sensitivity;
  const cmp = dcf.current_market_price;
  const baseValue = dcf.per_share_value;
  const reference = cmp && cmp > 0 ? cmp : baseValue;

  // Find base case indices
  const baseWaccIdx = wacc_range.reduce(
    (best, w, i) =>
      Math.abs(w - dcf.wacc.wacc) < Math.abs(wacc_range[best] - dcf.wacc.wacc)
        ? i
        : best,
    0
  );
  const baseGrowthIdx = growth_range.reduce(
    (best, g, i) =>
      Math.abs(g - dcf.terminal_value.terminal_growth_rate) <
      Math.abs(growth_range[best] - dcf.terminal_value.terminal_growth_rate)
        ? i
        : best,
    0
  );

  return (
    <div className="p-6 space-y-6">
      {/* Legend */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-dense font-semibold text-primary mb-0.5">
            Sensitivity Analysis: Intrinsic Value per Share (₹)
          </p>
          <p className="text-caption text-muted">
            Rows = Terminal Growth Rate (g%) · Columns = WACC (%)
            {cmp && cmp > 0
              ? ` · Colors relative to CMP (₹${cmp.toFixed(0)})`
              : " · Colors relative to base case"}
          </p>
        </div>
        {/* Color scale legend */}
        <div className="flex items-center gap-1 text-[10px] font-mono">
          <div className="w-6 h-4 bg-profit rounded-sm" />
          <span className="text-muted mr-2">&gt;+40%</span>
          <div className="w-6 h-4 bg-profit/50 rounded-sm" />
          <span className="text-muted mr-2">&gt;+5%</span>
          <div className="w-6 h-4 bg-surface-alt rounded-sm border border-subtle" />
          <span className="text-muted mr-2">±5%</span>
          <div className="w-6 h-4 bg-loss/50 rounded-sm" />
          <span className="text-muted mr-2">&lt;−5%</span>
          <div className="w-6 h-4 bg-loss rounded-sm" />
          <span className="text-muted">&lt;−40%</span>
        </div>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto scrollbar-thin">
        <table className="border-collapse" style={{ minWidth: 500 }}>
          <thead>
            <tr>
              {/* Corner */}
              <th className="px-3 py-2 text-[10px] font-mono text-muted text-right w-20">
                g \ WACC
              </th>
              {wacc_range.map((w) => (
                <th
                  key={w}
                  className="px-4 py-2 text-center text-[11px] font-mono font-semibold text-secondary min-w-[90px]"
                >
                  {w.toFixed(1)}%
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {growth_range.map((g, gi) => (
              <tr key={g}>
                <td className="px-3 py-2 text-right text-[11px] font-mono font-semibold text-secondary border-r border-subtle">
                  {g.toFixed(1)}%
                </td>
                {wacc_range.map((_, wi) => {
                  const value = grid[gi]?.[wi] ?? 0;
                  const isBase = gi === baseGrowthIdx && wi === baseWaccIdx;
                  const cellStyle = getCellStyle(value, reference, isBase);
                  return (
                    <td
                      key={wi}
                      className={`px-3 py-2.5 text-center tabular-nums text-[13px] rounded-sm ${cellStyle}`}
                    >
                      <div>{fmtShare(value)}</div>
                      {isBase && (
                        <div className="text-[8px] font-mono text-profit/60 mt-0.5 uppercase tracking-wider">
                          base
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Football Field Chart */}
      {scenarios && (
        <div className="border-t border-subtle pt-5">
          <FootballField sensitivity={sensitivity} dcf={dcf} scenarios={scenarios} />
        </div>
      )}

      {/* Scenario cards */}
      <div className="border-t border-subtle pt-5">
        <p className="text-caption font-mono text-muted uppercase tracking-label-wide mb-3">
          Quick-Read Scenarios
        </p>
        <div className="grid grid-cols-3 gap-4">
          {[
            {
              label: "Bear Case",
              waccIdx: wacc_range.length - 1,
              growthIdx: 0,
              color: "loss",
            },
            {
              label: "Base Case",
              waccIdx: baseWaccIdx,
              growthIdx: baseGrowthIdx,
              color: "accent",
            },
            {
              label: "Bull Case",
              waccIdx: 0,
              growthIdx: growth_range.length - 1,
              color: "neutral",
            },
          ].map((s) => {
            const v = grid[s.growthIdx]?.[s.waccIdx] ?? 0;
            const upsidePct = cmp && cmp > 0 ? ((v - cmp) / cmp) * 100 : null;
            return (
              <div
                key={s.label}
                className={`card-elevated rounded-lg p-4 text-center border ${
                  s.color === "accent"
                    ? "border-accent"
                    : s.color === "loss"
                    ? "border-loss"
                    : "border-subtle"
                }`}
              >
                <p className="text-caption font-mono text-muted uppercase tracking-label-wide mb-1">
                  {s.label}
                </p>
                <p
                  className={`tabular-nums text-xl font-semibold ${
                    s.color === "accent"
                      ? "text-accent"
                      : s.color === "loss"
                      ? "text-loss"
                      : "text-secondary"
                  }`}
                >
                  {fmtShare(v)}
                </p>
                <p className="text-caption font-mono text-muted mt-0.5">
                  WACC {wacc_range[s.waccIdx]?.toFixed(1)}% / g {growth_range[s.growthIdx]?.toFixed(1)}%
                </p>
                {upsidePct != null && (
                  <p
                    className={`tabular-nums text-caption mt-1 ${
                      upsidePct >= 0 ? "text-profit" : "text-loss"
                    }`}
                  >
                    {upsidePct >= 0 ? "+" : ""}{upsidePct.toFixed(1)}% vs CMP
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

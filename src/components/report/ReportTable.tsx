"use client";

// src/components/report/ReportTable.tsx
// ═══════════════════════════════════════════════════════════════════
// Read-only financial table used across all report tabs.
// Supports historical vs projected column types with distinct styling,
// visual separator, checkmarks for balance/tie checks, and metric rows.
// ═══════════════════════════════════════════════════════════════════

import { CheckCircle2, XCircle } from "lucide-react";

export type ColumnType = "historical" | "projected";

export interface ReportRow {
  key: string;
  label: string;
  values: (number | null | undefined)[];
  isTotal?: boolean;
  isSubtotal?: boolean;
  isSectionHeader?: boolean;
  /** Metric rows (% rows) — italic mono, no ₹ suffix */
  isMetric?: boolean;
  indent?: 0 | 1 | 2;
  format?: "currency" | "percent" | "eps" | "days" | "times" | "factor" | "integer";
  /** Per-column boolean for balance / tie-to-BS checkmarks */
  checkmarks?: (boolean | null | undefined)[];
}

interface ReportTableProps {
  years: string[];
  columnTypes: ColumnType[];
  rows: ReportRow[];
}

// ─── Formatters ────────────────────────────────────────────────────

function fmtCurrency(v: number): string {
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

function fmtCell(val: number | null | undefined, fmt: ReportRow["format"] = "currency"): string {
  if (val === null || val === undefined || !isFinite(val)) return "—";
  switch (fmt) {
    case "currency": return fmtCurrency(val);
    case "percent":  return `${val >= 0 ? "+" : ""}${val.toFixed(1)}%`;
    case "eps":      return `₹ ${val.toFixed(2)}`;
    case "days":     return `${Math.round(val)}d`;
    case "times":    return `${val.toFixed(1)}x`;
    case "factor":   return val.toFixed(3);
    case "integer":  return Math.round(val).toLocaleString("en-IN");
    default:         return String(val);
  }
}

// ─── Component ─────────────────────────────────────────────────────

export const ReportTable = ({ years, columnTypes, rows }: ReportTableProps) => {
  const firstProjIdx = columnTypes.findIndex((t) => t === "projected");
  const COL_W = 118;
  const tableMinW = 240 + years.length * COL_W;

  return (
    <div className="overflow-x-auto scrollbar-thin">
      <table className="w-full border-collapse" style={{ minWidth: tableMinW }}>

        {/* ── Header row 1: type bands ── */}
        <thead>
          <tr>
            <th style={{ minWidth: 240, width: 240 }} className="sticky left-0 z-20 bg-surface" />
            {years.map((_, yi) => {
              const type = columnTypes[yi];
              const isFirst = yi === firstProjIdx;
              return (
                <th
                  key={`band-${yi}`}
                  style={{ minWidth: COL_W, width: COL_W }}
                  className={`px-2 pt-2 pb-0.5 text-[8px] font-mono tracking-[0.2em] uppercase text-center ${
                    isFirst ? "border-l-2 border-teal/20" : ""
                  } ${
                    type === "projected"
                      ? "text-teal/40 bg-base"
                      : "text-zinc-800 bg-surface"
                  }`}
                >
                  {type === "historical" && yi === 0 ? "◀ Historical" : ""}
                  {type === "projected" && isFirst ? "Projected ▶" : ""}
                </th>
              );
            })}
          </tr>

          {/* ── Header row 2: year labels ── */}
          <tr className="border-b-2 border-border">
            <th
              scope="col"
              style={{ minWidth: 240, width: 240 }}
              className="sticky left-0 z-20 bg-surface px-4 py-2.5 text-left text-[10px] font-mono text-zinc-600 tracking-widest uppercase"
            >
              Line Item
            </th>
            {years.map((yr, yi) => {
              const type = columnTypes[yi];
              const isFirst = yi === firstProjIdx;
              const projN = type === "projected" && firstProjIdx >= 0
                ? yi - firstProjIdx + 1
                : null;
              return (
                <th
                  key={`yr-${yi}`}
                  scope="col"
                  style={{ minWidth: COL_W, width: COL_W }}
                  className={`px-3 py-2.5 text-right text-[10px] font-mono font-semibold ${
                    isFirst ? "border-l-2 border-teal/20" : ""
                  } ${
                    type === "projected"
                      ? "text-zinc-400 bg-base"
                      : "text-zinc-600 bg-surface"
                  }`}
                >
                  <div>{yr}</div>
                  {projN && (
                    <div className="text-[8px] text-teal/50 mt-0.5 font-normal">
                      F+{projN}
                    </div>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>

        {/* ── Body ── */}
        <tbody>
          {rows.map((row, ri) => {
            // Section header — full-width label row
            if (row.isSectionHeader) {
              return (
                <tr key={row.key} className="border-t border-border">
                  <td
                    colSpan={years.length + 1}
                    className="px-4 pt-5 pb-2 bg-base text-[10px] font-mono font-bold tracking-[0.18em] text-zinc-600 uppercase"
                  >
                    {row.label}
                  </td>
                </tr>
              );
            }

            const rowBg =
              row.isTotal
                ? "bg-elevated"
                : row.isSubtotal
                ? "bg-surface"
                : row.isMetric
                ? "bg-base"
                : ri % 2 === 0
                ? "bg-base"
                : "bg-surface/50";

            const pl =
              row.indent === 2
                ? "pl-12"
                : row.indent === 1
                ? "pl-8"
                : "pl-4";

            return (
              <tr
                key={row.key}
                className={`${rowBg} border-b border-border/40`}
              >
                {/* Label — sticky */}
                <td
                  className={`sticky left-0 z-10 ${rowBg} ${pl} py-[7px] pr-3`}
                  style={{ minWidth: 240, width: 240 }}
                >
                  <span
                    className={`leading-snug ${
                      row.isTotal
                        ? "text-[13px] font-semibold text-zinc-100"
                        : row.isSubtotal
                        ? "text-[13px] font-medium text-zinc-300"
                        : row.isMetric
                        ? "text-[11px] font-mono text-zinc-600"
                        : "text-[13px] text-zinc-500"
                    }`}
                  >
                    {row.label}
                  </span>
                </td>

                {/* Value cells */}
                {years.map((_, yi) => {
                  const val = row.values[yi];
                  const type = columnTypes[yi];
                  const isFirst = yi === firstProjIdx;
                  const check = row.checkmarks?.[yi];
                  const missing = val === null || val === undefined || !isFinite(val as number);

                  // Per-cell projected tint
                  const projOverride =
                    type === "projected"
                      ? row.isTotal
                        ? "bg-elevated/80"
                        : row.isSubtotal
                        ? "bg-surface/80"
                        : row.isMetric
                        ? "bg-base/80"
                        : ri % 2 === 0
                        ? "bg-base/60"
                        : "bg-surface/30"
                      : "";

                  const valColor = () => {
                    if (missing) return "text-zinc-800";
                    const n = val as number;
                    if (row.isMetric) {
                      return n > 0 ? "text-teal" : n < 0 ? "text-negative" : "text-zinc-600";
                    }
                    if (row.isTotal) return "font-semibold text-zinc-100";
                    if (n < 0) return "text-negative";
                    return type === "projected" ? "text-zinc-300" : "text-zinc-400";
                  };

                  return (
                    <td
                      key={yi}
                      className={`px-3 py-[7px] text-right ${projOverride} ${
                        isFirst ? "border-l-2 border-teal/20" : ""
                      }`}
                    >
                      <span
                        className={`font-number text-[13px] inline-flex items-center justify-end gap-1 ${valColor()}`}
                      >
                        {missing ? "—" : fmtCell(val, row.format)}
                        {check === true && (
                          <CheckCircle2 size={10} className="text-teal shrink-0" />
                        )}
                        {check === false && (
                          <XCircle size={10} className="text-negative shrink-0" />
                        )}
                      </span>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

"use client";

// src/components/review/FinancialTable.tsx
// ═══════════════════════════════════════════════════════════════════
// Reusable financial data table — sticky first column, inline editing,
// amber highlights for missing values, monospace numbers.
// ═══════════════════════════════════════════════════════════════════

import { useState } from "react";
import { Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Public types ─────────────────────────────────────────────────

export interface TableRow {
  key: string;
  label: string;
  values: (number | null | undefined)[];
  isTotal?: boolean;
  isSubtotal?: boolean;
  isSectionHeader?: boolean;
  /** 0 = flush, 1 = 1 level in, 2 = 2 levels in */
  indent?: 0 | 1 | 2;
  editable?: boolean;
  format?: "currency" | "percent" | "eps" | "days" | "times";
}

interface FinancialTableProps {
  years: string[] | undefined;
  rows: TableRow[];
  onEdit?: (rowKey: string, yearIndex: number, value: number) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────

function fmtCurrency(v: number): string {
  const num = Number(v);
  const neg = num < 0;
  const abs = Math.abs(num);
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

function fmtCell(
  val: number | null | undefined,
  fmt: TableRow["format"] = "currency"
): string {
  if (val === null || val === undefined || !isFinite(Number(val))) return "—";
  const n = typeof val === "string" ? parseFloat(val as string) : val;
  switch (fmt) {
    case "currency": return fmtCurrency(n);
    case "percent":  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
    case "eps":      return `₹ ${n.toFixed(2)}`;
    case "days":     return `${Math.round(n)}d`;
    case "times":    return `${n.toFixed(1)}x`;
    default:         return String(n);
  }
}

const isMissing = (v: number | null | undefined): boolean =>
  v === null || v === undefined || !isFinite(v as number);

// ─── Row background helpers ────────────────────────────────────────

const rowBgClass = (row: TableRow, ri: number): string => {
  if (row.isTotal)    return "bg-elevated";
  if (row.isSubtotal) return "bg-surface";
  return ri % 2 === 0 ? "bg-base" : "bg-surface/50";
};

const labelClass = (row: TableRow): string => {
  if (row.isTotal)    return "font-semibold text-zinc-100";
  if (row.isSubtotal) return "font-medium text-zinc-300";
  return "font-normal text-zinc-500";
};

const valueClass = (row: TableRow, val: number | null | undefined): string => {
  if (row.isTotal)    return "font-semibold text-zinc-100";
  if (row.isSubtotal) return "font-medium text-zinc-300";
  if (typeof val === "number" && val < 0) return "text-negative";
  return "text-zinc-400";
};

// ─── Component ────────────────────────────────────────────────────

export const FinancialTable = ({
  years,
  rows,
  onEdit,
}: FinancialTableProps) => {
  const safeYears = years ?? [];

  const [activeCell, setActiveCell] = useState<{
    key: string;
    yi: number;
  } | null>(null);
  const [inputVal, setInputVal] = useState("");

  const beginEdit = (row: TableRow, yi: number) => {
    if (!row.editable || !onEdit) return;
    const cur = row.values[yi];
    setActiveCell({ key: row.key, yi });
    setInputVal(typeof cur === "number" ? String(cur) : "");
  };

  const commitEdit = (row: TableRow, yi: number) => {
    const n = parseFloat(inputVal);
    if (!isNaN(n) && onEdit) onEdit(row.key, yi, n);
    setActiveCell(null);
  };

  const COL_W = 134;
  const tableMinW = 240 + safeYears.length * COL_W;

  return (
    <div className="overflow-x-auto">
      <table
        className="w-full border-collapse"
        style={{ minWidth: `${tableMinW}px` }}
      >
        {/* ── Head ── */}
        <thead>
          <tr className="border-b border-border-strong">
            <th
              scope="col"
              className="sticky left-0 z-20 bg-surface px-4 py-3 text-left text-[9px] font-mono text-zinc-700 tracking-[0.22em] uppercase"
              style={{ minWidth: 240, width: 240 }}
            >
              Line Item
            </th>
            {safeYears.map((y) => (
              <th
                key={y}
                scope="col"
                className="px-4 py-3 text-right text-[10px] font-mono font-semibold text-zinc-500 tracking-wider"
                style={{ minWidth: COL_W, width: COL_W }}
              >
                {y}
              </th>
            ))}
          </tr>
        </thead>

        {/* ── Body ── */}
        <tbody>
          {rows.map((row, ri) => {
            // ── Section header row ──
            if (row.isSectionHeader) {
              return (
                <tr key={row.key} className="border-t border-border">
                  <td
                    colSpan={safeYears.length + 1}
                    className="px-4 pt-4 pb-1.5 bg-base text-[9px] font-mono font-bold tracking-[0.22em] text-zinc-800 uppercase"
                  >
                    {row.label}
                  </td>
                </tr>
              );
            }

            const bg  = rowBgClass(row, ri);
            const pl  = row.indent === 2 ? "pl-12" : row.indent === 1 ? "pl-8" : "pl-4";

            return (
              <tr
                key={row.key}
                className={cn(bg, "border-b border-border/40 group")}
              >
                {/* Label — sticky */}
                <td
                  className={cn("sticky left-0 z-10", bg, pl, "py-[7px] pr-3")}
                  style={{ minWidth: 240, width: 240 }}
                >
                  <span className={cn("text-[13px] leading-snug", labelClass(row))}>
                    {row.label}
                  </span>
                </td>

                {/* Value cells */}
                {safeYears.map((_, yi) => {
                  const val      = row.values[yi];
                  const missing  = isMissing(val);
                  const isActive = activeCell?.key === row.key && activeCell.yi === yi;
                  const canEdit  = !!row.editable && !!onEdit;

                  return (
                    <td
                      key={yi}
                      className={cn(
                        "px-3 py-[7px] text-right relative",
                        missing && "bg-amber-950/20",
                        canEdit && !isActive && "cursor-pointer hover:bg-teal-surface/60"
                      )}
                      onClick={() => !isActive && beginEdit(row, yi)}
                      title={canEdit ? "Click to override value" : undefined}
                    >
                      {isActive ? (
                        <input
                          autoFocus
                          type="number"
                          step="any"
                          value={inputVal}
                          onChange={(e) => setInputVal(e.target.value)}
                          onBlur={() => commitEdit(row, yi)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter")  commitEdit(row, yi);
                            if (e.key === "Escape") setActiveCell(null);
                          }}
                          className="w-full bg-base border border-teal rounded px-2 py-0.5 text-right font-mono text-teal text-xs focus:outline-none"
                        />
                      ) : missing ? (
                        <span className="inline-flex items-center justify-end gap-1.5 text-amber-400 font-mono text-xs font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                          N/A
                        </span>
                      ) : (
                        <span
                          className={cn(
                            "font-mono text-[13px] select-none",
                            valueClass(row, val)
                          )}
                        >
                          {fmtCell(val, row.format)}
                        </span>
                      )}

                      {/* Edit pencil hint */}
                      {canEdit && !isActive && !missing && (
                        <Pencil
                          size={9}
                          className="absolute top-1 right-1 text-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity"
                        />
                      )}
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

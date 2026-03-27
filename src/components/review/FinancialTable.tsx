"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { formatCell, formatFYLabel, getCellValueColor } from "@/lib/formatters";
import { cn } from "@/lib/utils";

export interface TableRow {
  key: string;
  label: string;
  values: (number | null | undefined)[];
  isTotal?: boolean;
  isSubtotal?: boolean;
  isSectionHeader?: boolean;
  indent?: 0 | 1 | 2;
  editable?: boolean;
  format?: "currency" | "percent" | "eps" | "days" | "times";
}

interface FinancialTableProps {
  years: string[] | undefined;
  rows: TableRow[];
  onEdit?: (rowKey: string, yearIndex: number, value: number) => void;
}

const FIRST_COLUMN_WIDTH = 280;
const COLUMN_WIDTH = 128;

function getRowSurface(row: TableRow, rowIndex: number): string {
  if (row.isTotal) return "bg-surface-alt";
  if (row.isSubtotal) return "bg-surface";
  return rowIndex % 2 === 0 ? "bg-surface" : "bg-surface-alt/60";
}

function getLabelTone(row: TableRow): string {
  if (row.isTotal) return "text-primary";
  if (row.isSubtotal) return "text-secondary";
  return "text-secondary";
}

function getValueTone(row: TableRow, value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "text-muted";
  if (row.format === "percent") return getCellValueColor(value);
  if (row.isTotal) return "text-primary";
  if (row.isSubtotal) return "text-secondary";
  if (value < 0) return "text-loss";
  return "text-primary";
}

export const FinancialTable = ({
  years,
  rows,
  onEdit,
}: FinancialTableProps) => {
  const safeYears = years ?? [];
  const [activeCell, setActiveCell] = useState<{ key: string; yearIndex: number } | null>(null);
  const [inputValue, setInputValue] = useState("");

  const beginEdit = (row: TableRow, yearIndex: number) => {
    if (!row.editable || !onEdit) return;
    const current = row.values[yearIndex];
    setActiveCell({ key: row.key, yearIndex });
    setInputValue(current == null || !Number.isFinite(current) ? "" : String(current));
  };

  const commitEdit = (row: TableRow, yearIndex: number) => {
    const next = Number.parseFloat(inputValue);
    if (!Number.isNaN(next) && onEdit) onEdit(row.key, yearIndex, next);
    setActiveCell(null);
  };

  return (
    <div className="relative overflow-auto scrollbar-thin">
      <div className="pointer-events-none sticky left-0 top-0 z-30 h-0 w-6 shadow-[12px_0_18px_var(--valk-bg-app)]" />
      <table
        className="w-full border-separate border-spacing-0"
        style={{ minWidth: FIRST_COLUMN_WIDTH + safeYears.length * COLUMN_WIDTH }}
      >
        <thead>
          <tr>
            <th
              scope="col"
              className="sticky left-0 top-0 z-30 border-b border-r border-subtle bg-surface-alt px-3 py-2 text-left text-body text-secondary"
              style={{ minWidth: FIRST_COLUMN_WIDTH, width: FIRST_COLUMN_WIDTH }}
            >
              Line Item
            </th>
            {safeYears.map((year) => (
              <th
                key={year}
                scope="col"
                className="sticky top-0 z-20 border-b border-subtle bg-surface-alt px-3 py-2 text-right text-body text-secondary"
                style={{ minWidth: COLUMN_WIDTH, width: COLUMN_WIDTH }}
              >
                <div className="space-y-1">
                  <p className="tabular-nums text-body text-secondary">
                    {formatFYLabel(year, /E$/i.test(year))}
                  </p>
                  <p className="text-caption uppercase text-muted">₹ Cr</p>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => {
            if (row.isSectionHeader) {
              return (
                <tr key={row.key}>
                  <td
                    colSpan={safeYears.length + 1}
                    className="border-b border-subtle bg-app px-3 py-3 text-caption uppercase text-muted"
                  >
                    {row.label}
                  </td>
                </tr>
              );
            }

            const rowSurface = getRowSurface(row, rowIndex);
            const labelPadding =
              row.indent === 2 ? "pl-9" : row.indent === 1 ? "pl-6" : "pl-3";

            return (
              <tr key={row.key} className="group">
                <td
                  className={cn(
                    "sticky left-0 z-10 border-b border-r border-subtle py-2 pr-3 text-dense",
                    rowSurface,
                    labelPadding,
                    getLabelTone(row)
                  )}
                  style={{ minWidth: FIRST_COLUMN_WIDTH, width: FIRST_COLUMN_WIDTH, height: 36 }}
                >
                  {row.label}
                </td>
                {safeYears.map((_, yearIndex) => {
                  const value = row.values[yearIndex];
                  const isMissing = value == null || !Number.isFinite(value);
                  const isActive =
                    activeCell?.key === row.key && activeCell.yearIndex === yearIndex;
                  const canEdit = Boolean(row.editable && onEdit);

                  return (
                    <td
                      key={`${row.key}-${yearIndex}`}
                      className={cn(
                        "border-b border-subtle px-3 py-2 text-right text-dense tabular-nums transition-colors duration-150",
                        rowSurface,
                        canEdit && !isActive && "cursor-pointer hover:bg-hover"
                      )}
                      style={{ minWidth: COLUMN_WIDTH, width: COLUMN_WIDTH, height: 36 }}
                      onClick={() => beginEdit(row, yearIndex)}
                    >
                      {isActive ? (
                        <input
                          autoFocus
                          type="number"
                          step="any"
                          value={inputValue}
                          onChange={(event) => setInputValue(event.target.value)}
                          onBlur={() => commitEdit(row, yearIndex)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") commitEdit(row, yearIndex);
                            if (event.key === "Escape") setActiveCell(null);
                          }}
                          className="w-full rounded-[var(--valk-radius-sm)] border border-strong bg-surface-alt px-2 py-1 text-right text-dense tabular-nums text-primary outline-none"
                        />
                      ) : (
                        <span className={cn("inline-flex items-center gap-1", getValueTone(row, value))}>
                          <span className="tabular-nums">
                            {isMissing ? "—" : formatCell(value, row.format ?? "currency")}
                          </span>
                          {canEdit && !isMissing ? (
                            <Pencil className="h-3 w-3 text-muted opacity-0 transition-opacity duration-150 group-hover:opacity-100" />
                          ) : null}
                        </span>
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

"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import { formatCell, formatFYLabel } from "@/lib/formatters";

export type ColumnType = "historical" | "projected";

export interface ReportRow {
  key: string;
  label: string;
  values: (number | null | undefined)[];
  isTotal?: boolean;
  isSubtotal?: boolean;
  isSectionHeader?: boolean;
  isMetric?: boolean;
  indent?: 0 | 1 | 2;
  format?: "currency" | "percent" | "eps" | "days" | "times" | "factor" | "integer";
  checkmarks?: (boolean | null | undefined)[];
}

interface ReportTableProps {
  years: string[];
  columnTypes: ColumnType[];
  rows: ReportRow[];
}

const FIRST_COLUMN_WIDTH = 280;
const COLUMN_WIDTH = 132;

export const ReportTable = ({ years, columnTypes, rows }: ReportTableProps) => {
  const firstProjectedIndex = columnTypes.findIndex((value) => value === "projected");

  return (
    <div className="overflow-auto scrollbar-thin">
      <table
        className="w-full border-separate border-spacing-0"
        style={{ minWidth: FIRST_COLUMN_WIDTH + years.length * COLUMN_WIDTH }}
      >
        <thead>
          <tr>
            <th
              className="sticky left-0 top-0 z-30 border-b border-r border-subtle bg-surface-alt px-3 py-2 text-left text-body text-secondary"
              style={{ minWidth: FIRST_COLUMN_WIDTH, width: FIRST_COLUMN_WIDTH }}
            >
              Line Item
            </th>
            {years.map((year, index) => {
              const isProjected = columnTypes[index] === "projected";
              return (
                <th
                  key={`${year}-${index}`}
                  className="sticky top-0 z-20 border-b border-subtle bg-surface-alt px-3 py-2 text-right text-body text-secondary"
                  style={{ minWidth: COLUMN_WIDTH, width: COLUMN_WIDTH }}
                >
                  <div className="space-y-1">
                    <p className="tabular-nums text-body text-secondary">
                      {formatFYLabel(year, isProjected || /E$/i.test(year))}
                    </p>
                    <p className="text-caption uppercase text-muted">
                      {isProjected && index === firstProjectedIndex ? "Projected" : "₹ Cr"}
                    </p>
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => {
            if (row.isSectionHeader) {
              return (
                <tr key={row.key}>
                  <td
                    colSpan={years.length + 1}
                    className="border-b border-subtle bg-app px-3 py-3 text-caption uppercase text-muted"
                  >
                    {row.label}
                  </td>
                </tr>
              );
            }

            const rowSurface = row.isTotal
              ? "bg-surface-alt"
              : row.isSubtotal
                ? "bg-surface"
                : rowIndex % 2 === 0
                  ? "bg-surface"
                  : "bg-surface-alt/60";

            const labelPadding =
              row.indent === 2 ? "pl-9" : row.indent === 1 ? "pl-6" : "pl-3";

            return (
              <tr key={row.key}>
                <td
                  className={`sticky left-0 z-10 border-b border-r border-subtle py-2 pr-3 text-dense ${rowSurface} ${labelPadding} ${
                    row.isTotal ? "text-primary" : row.isMetric ? "text-muted" : "text-secondary"
                  }`}
                  style={{ minWidth: FIRST_COLUMN_WIDTH, width: FIRST_COLUMN_WIDTH, height: 36 }}
                >
                  {row.label}
                </td>
                {years.map((_, index) => {
                  const value = row.values[index];
                  const check = row.checkmarks?.[index];
                  const textTone =
                    value == null || !Number.isFinite(value)
                      ? "text-muted"
                      : row.isMetric
                        ? value > 0
                          ? "text-profit"
                          : value < 0
                            ? "text-loss"
                            : "text-secondary"
                        : row.isTotal
                          ? "text-primary"
                          : value < 0
                            ? "text-loss"
                            : "text-primary";

                  return (
                    <td
                      key={`${row.key}-${index}`}
                      className={`border-b border-subtle px-3 py-2 text-right text-dense tabular-nums ${rowSurface} ${textTone}`}
                      style={{ minWidth: COLUMN_WIDTH, width: COLUMN_WIDTH, height: 36 }}
                    >
                      <span className="inline-flex items-center gap-1">
                        {formatCell(value, row.format ?? "currency")}
                        {check === true ? (
                          <CheckCircle2 className="h-3 w-3 text-profit" strokeWidth={1.8} />
                        ) : null}
                        {check === false ? (
                          <XCircle className="h-3 w-3 text-loss" strokeWidth={1.8} />
                        ) : null}
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

// src/lib/formatters.ts
// ═══════════════════════════════════════════════════════════════════
// PROJECT VALKYRIE — Canonical Display Formatters
//
// All formatting logic lives here.  Do NOT duplicate these helpers
// inline in components — import from this module instead.
// ═══════════════════════════════════════════════════════════════════

import { INDIAN_NUMBER_FORMAT, formatCrores } from "@/lib/constants";

// Re-export primitives so consumers only need one import
export { formatCrores, formatPercent, formatMultiple } from "@/lib/constants";

// ─── Core Indian number engine ─────────────────────────────────────

/**
 * Formats a raw number with Indian grouping and ₹ prefix.
 * Example: formatINR(1245678.5) → "₹12,45,678.50"
 */
export const formatINR = (value: number, decimals = 2): string => {
  if (!isFinite(value)) return "—";
  return INDIAN_NUMBER_FORMAT(value, decimals);
};

// ─── ₹ per share formatter ─────────────────────────────────────────

/**
 * Formats a per-share value with 2 decimal places.
 * Example: fmtShare(1234.56) → "₹1,234.56"
 *          fmtShare(-50)      → "−₹50.00"
 *          fmtShare(null)     → "—"
 */
export const fmtShare = (v: number | null | undefined): string => {
  if (v == null || !isFinite(v)) return "—";
  return INDIAN_NUMBER_FORMAT(v, 2);
};

// ─── ₹ Crore formatter ────────────────────────────────────────────

/**
 * Formats a value in ₹ Crores with optional decimals.
 * Example: fmtCrore(12345.6)   → "₹12,345.60 Cr"
 *          fmtCrore(-1000, 0)  → "−₹1,000 Cr"
 *          fmtCrore(null)      → "—"
 */
export const fmtCrore = (
  v: number | null | undefined,
  decimals = 0
): string => {
  if (v == null || !isFinite(v)) return "—";
  return formatCrores(v, decimals);
};

// ─── Table cell formatter ─────────────────────────────────────────

export type CellFormat = "currency" | "percent" | "eps" | "days" | "times";

/**
 * Formats a table cell value based on format type.
 * Used by FinancialTable and report tab components.
 */
export const fmtCell = (
  val: number | null | undefined,
  fmt: CellFormat = "currency"
): string => {
  if (val == null || !isFinite(val as number)) return "—";
  switch (fmt) {
    case "currency":
      return INDIAN_NUMBER_FORMAT(val, 2);
    case "percent":
      return `${val >= 0 ? "+" : ""}${val.toFixed(2)}%`;
    case "eps":
      return `₹ ${val.toFixed(2)}`;
    case "days":
      return `${Math.round(val)}d`;
    case "times":
      return `${val.toFixed(1)}x`;
    default:
      return String(val);
  }
};

// ─── Growth / direction ────────────────────────────────────────────

/**
 * Computes period-over-period growth and returns a directional string.
 * Example: fmtGrowth(120, 100) → "↑ 20.0%"
 */
export const fmtGrowth = (current: number, previous: number): string => {
  if (!isFinite(current) || !isFinite(previous) || previous === 0) return "—";
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  const abs = Math.abs(pct).toFixed(1);
  if (pct > 0) return `↑ ${abs}%`;
  if (pct < 0) return `↓ ${abs}%`;
  return `→ 0.0%`;
};

// ─── Tailwind colour helpers ───────────────────────────────────────

/**
 * Returns a Tailwind text-colour class for a positive/negative value.
 * Uses the new muted teal / rose palette.
 */
export const getValueColor = (value: number | null | undefined): string => {
  if (value == null || !isFinite(value) || value === 0)
    return "text-zinc-500";
  return value > 0 ? "text-teal" : "text-negative";
};

/** Same but for growth values (positive growth = good). */
export const getGrowthColor = (value: number | null | undefined): string =>
  getValueColor(value);

/**
 * Returns a Tailwind text-colour for a cell value relative to zero.
 * For income-statement cells: losses are negative, income is positive.
 */
export const getCellValueColor = (
  value: number | null | undefined,
  inverted = false
): string => {
  if (value == null || !isFinite(value as number)) return "text-zinc-500";
  const isPositive = inverted ? value < 0 : value > 0;
  if (value === 0) return "text-zinc-500";
  return isPositive ? "text-positive" : "text-negative";
};

// ─── Legacy aliases (keep until components are migrated) ──────────

/** @deprecated Use fmtGrowth */
export const formatGrowth = fmtGrowth;

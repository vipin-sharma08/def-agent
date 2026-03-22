// src/lib/constants.ts
// ═══════════════════════════════════════════════════════════════════
// PROJECT VALKYRIE — India-Specific Financial Modelling Constants
// ═══════════════════════════════════════════════════════════════════

// ─── WACC / Valuation Defaults ────────────────────────────────────

/** India 10-Year G-Sec yield as of FY2025-26 (%) */
export const DEFAULT_RISK_FREE_RATE = 7.1;

/**
 * Damodaran India Total Equity Risk Premium (%) — includes Country Risk Premium.
 * Source: Damodaran Online — Implied ERP for India (~8.2% as of Jan 2026)
 */
export const DEFAULT_EQUITY_RISK_PREMIUM = 8.2;

/**
 * Terminal growth rate (%) — proxy for India nominal GDP growth.
 * Conservative: real GDP ~6.5% + inflation ~3% → nominal ~9.5%, discounted to 4.5%
 * for perpetuity conservatism.
 */
export const DEFAULT_TERMINAL_GROWTH = 4.5;

/**
 * Statutory corporate tax rate — New Regime (%)
 * 22% base + 10% surcharge + 4% cess = 25.168%
 */
export const DEFAULT_TAX_RATE_NEW = 25.168;

/**
 * Statutory corporate tax rate — Old Regime (%)
 * 30% base + applicable surcharge + 4% cess = 34.944%
 */
export const DEFAULT_TAX_RATE_OLD = 34.944;

// ─── Sector Betas ─────────────────────────────────────────────────

/**
 * Typical levered equity betas by Indian sector.
 * Source: Damodaran India dataset conventions + NSE sector regression estimates.
 * These are starting-point betas — adjust for company-specific leverage.
 */
export const SECTOR_BETAS: Record<string, number> = {
  "IT Services":        0.85,
  "FMCG":               0.65,
  "Pharma":             0.78,
  "BFSI - Banks":       1.10,
  "NBFC":               1.20,
  "Auto":               1.05,
  "Auto Ancillaries":   1.15,
  "Infrastructure":     1.25,
  "Metals & Mining":    1.35,
  "Oil & Gas":          0.95,
  "Chemicals":          1.00,
  "Real Estate":        1.40,
  "Telecom":            0.90,
  "Capital Goods":      1.20,
  "Diversified":        1.00,
};

// ─── Default Working Capital Days ────────────────────────────────

export interface WorkingCapitalDays {
  receivable_days: number;
  inventory_days: number;
  payable_days: number;
}

/**
 * Sector-median working capital days based on BSE/NSE listed company analysis.
 * Receivable days: revenue-based; Inventory days: COGS-based; Payable days: COGS-based.
 */
export const DEFAULT_WORKING_CAPITAL_DAYS: Record<string, WorkingCapitalDays> = {
  "IT Services": {
    receivable_days: 75,
    inventory_days:  0,
    payable_days:    30,
  },
  "FMCG": {
    receivable_days: 20,
    inventory_days:  45,
    payable_days:    60,
  },
  "Pharma": {
    receivable_days: 60,
    inventory_days:  90,
    payable_days:    45,
  },
  "BFSI - Banks": {
    receivable_days: 0,
    inventory_days:  0,
    payable_days:    0,  // Banking — WC model does not apply
  },
  "NBFC": {
    receivable_days: 0,
    inventory_days:  0,
    payable_days:    0,  // NBFC — WC model does not apply
  },
  "Auto": {
    receivable_days: 25,
    inventory_days:  30,
    payable_days:    55,
  },
  "Auto Ancillaries": {
    receivable_days: 50,
    inventory_days:  45,
    payable_days:    50,
  },
  "Infrastructure": {
    receivable_days: 90,
    inventory_days:  30,
    payable_days:    60,
  },
  "Metals & Mining": {
    receivable_days: 35,
    inventory_days:  60,
    payable_days:    45,
  },
  "Oil & Gas": {
    receivable_days: 30,
    inventory_days:  25,
    payable_days:    35,
  },
  "Chemicals": {
    receivable_days: 55,
    inventory_days:  60,
    payable_days:    45,
  },
  "Real Estate": {
    receivable_days: 30,
    inventory_days:  180,
    payable_days:    90,
  },
  "Telecom": {
    receivable_days: 40,
    inventory_days:  15,
    payable_days:    60,
  },
  "Capital Goods": {
    receivable_days: 80,
    inventory_days:  60,
    payable_days:    60,
  },
  "Diversified": {
    receivable_days: 55,
    inventory_days:  45,
    payable_days:    50,
  },
};

// ─── Indian Number Formatting ─────────────────────────────────────

/**
 * Formats a number using the Indian numbering system (lakhs and crores).
 * Groups: units (3 digits), then pairs of 2 from right-to-left.
 *
 * Examples:
 *   INDIAN_NUMBER_FORMAT(1245678.5)  → "₹12,45,678.50"
 *   INDIAN_NUMBER_FORMAT(1000)       → "₹1,000.00"
 *   INDIAN_NUMBER_FORMAT(10000000)   → "₹1,00,00,000.00"
 *   INDIAN_NUMBER_FORMAT(-50000)     → "−₹50,000.00"
 */
export const INDIAN_NUMBER_FORMAT = (value: number, decimals = 2): string => {
  if (!isFinite(value)) return "—";

  const isNegative = value < 0;
  const abs = Math.abs(value);

  const fixed = abs.toFixed(decimals);
  const [intPart, decPart] = fixed.split(".");

  // Indian grouping: last 3 digits, then groups of 2 from the right
  let result = "";
  const len = intPart.length;

  if (len <= 3) {
    result = intPart;
  } else {
    // Last 3 digits
    result = intPart.slice(len - 3);
    let remaining = intPart.slice(0, len - 3);
    while (remaining.length > 2) {
      result = remaining.slice(remaining.length - 2) + "," + result;
      remaining = remaining.slice(0, remaining.length - 2);
    }
    result = remaining + "," + result;
  }

  const formatted = decimals > 0 ? `₹${result}.${decPart}` : `₹${result}`;
  return isNegative ? `−${formatted}` : formatted;
};

/**
 * Formats a value as Indian Crores with "Cr" suffix.
 * Example: formatCrores(12345.67) → "₹12,345.67 Cr"
 */
export const formatCrores = (value: number, decimals = 2): string => {
  if (!isFinite(value)) return "—";
  return `${INDIAN_NUMBER_FORMAT(value, decimals)} Cr`;
};

/**
 * Formats a number as a percentage.
 * Example: formatPercent(18.5) → "18.50%"
 */
export const formatPercent = (value: number, decimals = 2): string => {
  if (!isFinite(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(decimals)}%`;
};

/**
 * Formats a number as a valuation multiple.
 * Example: formatMultiple(2.3) → "2.3x"
 */
export const formatMultiple = (value: number, decimals = 1): string => {
  if (!isFinite(value)) return "—";
  return `${value.toFixed(decimals)}x`;
};

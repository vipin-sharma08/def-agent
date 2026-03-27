const INR_CURRENCY = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const INR_INTEGER = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const INR_DECIMAL = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export type CellFormat =
  | "currency"
  | "percent"
  | "eps"
  | "days"
  | "times"
  | "factor"
  | "integer";

export const formatIndianNumber = (
  value: number | null | undefined,
  decimals = 0
): string => {
  if (value == null || !Number.isFinite(value)) return "—";

  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};

export const formatINR = (
  value: number | null | undefined,
  decimals = 2
): string => {
  if (value == null || !Number.isFinite(value)) return "—";

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};

export const formatCrore = (
  value: number | null | undefined,
  decimals = 1
): string => {
  if (value == null || !Number.isFinite(value)) return "—";
  return `₹ ${new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value / 10000000)} Cr`;
};

export const formatLakh = (
  value: number | null | undefined,
  decimals = 1
): string => {
  if (value == null || !Number.isFinite(value)) return "—";
  return `₹ ${new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value / 100000)} L`;
};

export const fmtShare = (value: number | null | undefined): string => {
  if (value == null || !Number.isFinite(value)) return "—";
  return INR_CURRENCY.format(value);
};

export const fmtCrore = (
  value: number | null | undefined,
  decimals = 0
): string => {
  if (value == null || !Number.isFinite(value)) return "—";
  return `₹ ${new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)} Cr`;
};

export const formatPercent = (
  value: number | null | undefined,
  decimals = 1
): string => {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value.toFixed(decimals)}%`;
};

export const formatSignedPercent = (
  value: number | null | undefined,
  decimals = 1
): string => {
  if (value == null || !Number.isFinite(value)) return "—";
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value.toFixed(decimals)}%`;
};

export const formatMultiple = (
  value: number | null | undefined,
  decimals = 1
): string => {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value.toFixed(decimals)}x`;
};

export const formatFYLabel = (
  year: string | number | null | undefined,
  estimated = false
): string => {
  if (year == null) return "—";

  const raw = String(year).trim();
  if (raw.startsWith("FY")) return raw;

  const numeric = Number.parseInt(raw.replace(/[^\d]/g, ""), 10);
  if (!Number.isFinite(numeric)) return raw;

  const fy = `FY${String(numeric).slice(-2).padStart(2, "0")}`;
  return estimated ? `${fy}E` : fy;
};

export const formatCell = (
  value: number | null | undefined,
  format: CellFormat = "currency"
): string => {
  if (value == null || !Number.isFinite(value)) return "—";

  switch (format) {
    case "currency":
      return INR_INTEGER.format(value);
    case "percent":
      return formatPercent(value, 1);
    case "eps":
      return formatINR(value, 2);
    case "days":
      return `${Math.round(value)}d`;
    case "times":
      return formatMultiple(value, 1);
    case "factor":
      return INR_DECIMAL.format(value);
    case "integer":
      return INR_INTEGER.format(value);
    default:
      return INR_DECIMAL.format(value);
  }
};

export const fmtCell = formatCell;

export const fmtGrowth = (
  current: number | null | undefined,
  previous: number | null | undefined
): string => {
  if (
    current == null ||
    previous == null ||
    !Number.isFinite(current) ||
    !Number.isFinite(previous) ||
    previous === 0
  ) {
    return "—";
  }

  return formatSignedPercent(((current - previous) / Math.abs(previous)) * 100, 1);
};

export const getValueColor = (value: number | null | undefined): string => {
  if (value == null || !Number.isFinite(value) || value === 0) return "text-secondary";
  return value > 0 ? "text-profit" : "text-loss";
};

export const getGrowthColor = getValueColor;

export const getCellValueColor = (
  value: number | null | undefined,
  inverted = false
): string => {
  if (value == null || !Number.isFinite(value) || value === 0) return "text-secondary";
  const positive = inverted ? value < 0 : value > 0;
  return positive ? "text-profit" : "text-loss";
};

export const formatCompactINR = (
  value: number | null | undefined
): string => {
  if (value == null || !Number.isFinite(value)) return "—";

  const abs = Math.abs(value);
  if (abs >= 10000000) return formatCrore(value, 1);
  if (abs >= 100000) return formatLakh(value, 1);
  return INR_CURRENCY.format(value);
};

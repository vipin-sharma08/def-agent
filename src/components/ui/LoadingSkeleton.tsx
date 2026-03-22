"use client";

// src/components/ui/LoadingSkeleton.tsx
// ═══════════════════════════════════════════════════════════════════
// Shimmer skeleton loaders for tables and cards.
// Used in report tabs and the valuation summary card while the
// financial model is being generated.
// ═══════════════════════════════════════════════════════════════════

// ─── Shared primitive ─────────────────────────────────────────────

const Shimmer = ({
  className = "",
  width,
}: {
  className?: string;
  width?: string;
}) => (
  <div
    className={`animate-pulse rounded bg-elevated ${className}`}
    style={width ? { width } : undefined}
  />
);

// ─── Table skeleton ───────────────────────────────────────────────

interface TableSkeletonProps {
  /** Number of data rows to render (default 10) */
  rows?: number;
  /** Number of value columns — excludes the label column (default 8) */
  cols?: number;
  className?: string;
}

export const TableSkeleton = ({
  rows = 10,
  cols = 8,
  className = "",
}: TableSkeletonProps) => {
  return (
    <div className={`p-4 overflow-x-auto ${className}`}>
      {/* Column header row */}
      <div className="flex gap-2 mb-3 pb-2 border-b border-border">
        <Shimmer className="h-4 flex-shrink-0" width="140px" />
        {Array.from({ length: cols }).map((_, i) => (
          <Shimmer key={i} className="h-4 flex-1" />
        ))}
      </div>

      {/* Data rows */}
      {Array.from({ length: rows }).map((_, ri) => {
        // Every ~4th row mimics a section header (full-width, taller)
        const isSectionHeader = ri % 5 === 0;
        if (isSectionHeader) {
          return (
            <div key={ri} className="flex gap-2 mb-1 mt-3">
              <Shimmer className="h-3 rounded-sm" width="180px" />
            </div>
          );
        }
        // Alternate slightly different heights to look natural
        const h = ri % 3 === 0 ? "h-5" : "h-4";
        return (
          <div key={ri} className="flex gap-2 mb-1.5 items-center">
            {/* Label column */}
            <Shimmer
              className={`${h} flex-shrink-0`}
              width={`${110 + (ri % 3) * 20}px`}
            />
            {/* Value columns */}
            {Array.from({ length: cols }).map((_, ci) => (
              <Shimmer
                key={ci}
                className={`${h} flex-1 ${ci === 0 ? "opacity-50" : ""}`}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
};

// ─── Card skeleton (for ValuationSummaryCard) ─────────────────────

export const CardSkeleton = ({ className = "" }: { className?: string }) => (
  <div
    className={`rounded-xl border border-border bg-surface overflow-hidden ${className}`}
  >
    {/* Three panels */}
    <div className="grid grid-cols-3 divide-x divide-border">
      {/* Panel 1: main value */}
      <div className="p-8 flex flex-col gap-3">
        <Shimmer className="h-3 w-24" />
        <Shimmer className="h-10 w-36 mt-1" />
        <Shimmer className="h-4 w-20" />
        <Shimmer className="h-6 w-28 mt-2" />
      </div>

      {/* Panel 2: CMP gauge */}
      <div className="p-8 flex flex-col gap-3">
        <Shimmer className="h-3 w-20" />
        <Shimmer className="h-6 w-28" />
        <div className="h-2 rounded-full bg-elevated mt-2 overflow-hidden">
          <Shimmer className="h-full w-2/3" />
        </div>
        <Shimmer className="h-4 w-24 mt-1" />
      </div>

      {/* Panel 3: EV bridge */}
      <div className="p-8 flex flex-col gap-2">
        <Shimmer className="h-3 w-28 mb-1" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex justify-between items-center">
            <Shimmer className="h-3 w-32" />
            <Shimmer className="h-3 w-16" />
          </div>
        ))}
      </div>
    </div>

    {/* Footer KPIs */}
    <div className="border-t border-border px-6 py-3 flex gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-1">
          <Shimmer className="h-2.5 w-12" />
          <Shimmer className="h-4 w-14" />
        </div>
      ))}
    </div>
  </div>
);

// ─── Inline row skeleton (for single-section loading) ─────────────

export const RowSkeleton = ({ count = 3 }: { count?: number }) => (
  <div className="space-y-2 p-4">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="flex gap-3 items-center">
        <Shimmer className="h-4 w-40" />
        <Shimmer className="h-4 flex-1" />
        <Shimmer className="h-4 w-16" />
      </div>
    ))}
  </div>
);

"use client";

import { motion } from "framer-motion";
import { fmtShare, formatSignedPercent } from "@/lib/formatters";
import type { DcfValuation } from "@/lib/types";
import { cn } from "@/lib/utils";

const SEGMENTS = [
  "Significantly Undervalued",
  "Undervalued",
  "Fair Value",
  "Overvalued",
  "Significantly Overvalued",
] as const;

function getMarginOfSafety(dcf: DcfValuation): number | null {
  if (
    dcf.current_market_price == null ||
    !Number.isFinite(dcf.current_market_price) ||
    dcf.current_market_price <= 0 ||
    !Number.isFinite(dcf.per_share_value) ||
    dcf.per_share_value === 0
  ) {
    return null;
  }

  return ((dcf.per_share_value - dcf.current_market_price) / dcf.per_share_value) * 100;
}

function getZoneIndex(upside: number | null): number {
  if (upside == null) return 2;
  if (upside >= 30) return 0;
  if (upside >= 10) return 1;
  if (upside > -10) return 2;
  if (upside > -30) return 3;
  return 4;
}

export const ValuationHeroCard = ({ dcf }: { dcf: DcfValuation }) => {
  const upside = dcf.upside_downside_pct;
  const marginOfSafety = getMarginOfSafety(dcf);
  const zoneIndex = getZoneIndex(upside);
  const toneClass =
    upside == null ? "text-disabled" : upside >= 0 ? "text-profit" : "text-loss";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 26 }}
      className="hero-glow relative overflow-hidden rounded-[var(--valk-radius-xl)]"
    >
      <div className="glass relative space-y-6 p-6">
        <div className="space-y-2">
          <p className="text-caption uppercase tracking-label-wide text-muted">
            Intrinsic Value
          </p>
          <p className="text-display tabular-nums text-primary">{fmtShare(dcf.per_share_value)}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <p className="text-caption uppercase tracking-label text-muted">Margin of Safety</p>
            <p className={cn("text-heading tabular-nums", toneClass)}>
              {marginOfSafety == null ? "—" : formatSignedPercent(marginOfSafety, 1)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-caption uppercase tracking-label text-muted">Upside / Downside</p>
            <p className={cn("text-heading tabular-nums", toneClass)}>
              {upside == null ? "—" : formatSignedPercent(upside, 1)}
            </p>
          </div>
        </div>

        <div className="space-y-3 border-t border-subtle pt-4">
          <div className="flex items-center justify-between gap-4">
            <p className="text-caption uppercase tracking-label text-muted">Valuation Zone</p>
            <p className="text-caption text-muted">{SEGMENTS[zoneIndex]}</p>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {SEGMENTS.map((segment, index) => {
              const isActive = index === zoneIndex;
              const backgroundClass =
                index < 2 ? "bg-profit" : index === 2 ? "bg-surface-alt" : "bg-loss";

              return (
                <div
                  key={segment}
                  className={cn(
                    "relative h-3 rounded-full border border-subtle",
                    backgroundClass,
                    isActive && "border-accent"
                  )}
                >
                  {isActive ? (
                    <span className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--valk-glass-border)] bg-[var(--valk-text-primary)] shadow-[var(--valk-shadow-sm)]" />
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

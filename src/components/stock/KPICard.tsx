"use client";

import { motion } from "framer-motion";
import { formatSignedPercent } from "@/lib/formatters";
import { cn } from "@/lib/utils";

interface KPICardProps {
  label: string;
  value: string;
  delta?: number | null;
  helper?: string;
}

export const KPICard = ({ label, value, delta, helper }: KPICardProps) => {
  const deltaClass =
    delta == null
      ? "text-muted"
      : delta >= 0
        ? "text-profit"
        : "text-loss";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 26 }}
      whileHover={{ y: -2, scale: 1.01 }}
      className="card flex min-h-[132px] flex-col justify-between p-4"
    >
      <div className="space-y-2">
        <p className="text-caption uppercase tracking-label text-muted">{label}</p>
        <p className="text-heading tabular-nums text-primary">{value}</p>
      </div>
      <div className="space-y-1">
        {delta != null ? (
          <p className={cn("text-caption tabular-nums", deltaClass)}>
            {formatSignedPercent(delta, 1)} vs last run
          </p>
        ) : null}
        {helper ? <p className="text-caption text-muted">{helper}</p> : null}
      </div>
    </motion.div>
  );
};

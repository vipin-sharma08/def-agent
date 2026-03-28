"use client";

import { Building2, Landmark, Wallet } from "lucide-react";
import { KPICard } from "@/components/stock/KPICard";
import { ValuationHeroCard } from "@/components/stock/ValuationHeroCard";
import {
  fmtShare,
  formatIndianNumber,
  formatINR,
  formatPercent,
} from "@/lib/formatters";
import type { CompanyMetadata, DcfValuation, UserAssumptions } from "@/lib/types";

interface Props {
  dcf: DcfValuation;
  meta: CompanyMetadata;
  assumptions: UserAssumptions;
}

function MetaRow({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  if (!value || value === "—" || value === "₹0.00" || value === "0.00") return null;
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-caption uppercase tracking-label text-muted">{label}</span>
      <span className="text-dense tabular-nums text-primary">{value}</span>
    </div>
  );
}

export const ValuationSummaryCard = ({ dcf, meta, assumptions }: Props) => {
  const identifierRows = [
    { label: "NSE", value: meta.nse_symbol },
    { label: "BSE", value: meta.bse_code },
    { label: "CIN", value: meta.cin },
  ].filter((r) => r.value && r.value !== "—");

  const structureRows = [
    { label: "Reporting", value: meta.standalone_or_consolidated },
    { label: "FY End", value: meta.financial_year_end },
    { label: "Audit", value: meta.audit_opinion },
  ].filter((r) => r.value && r.value !== "—");

  const fv = meta.face_value_per_share;
  const basic = meta.shares_outstanding_basic;
  const diluted = meta.shares_outstanding_diluted;
  const perShareRows = [
    ...(fv && fv > 0 ? [{ label: "Face Value", value: formatINR(fv, 2) }] : []),
    ...(basic && basic > 0 ? [{ label: "Basic Shares", value: formatIndianNumber(basic, 2) }] : []),
    ...(diluted && diluted > 0 ? [{ label: "Diluted Shares", value: formatIndianNumber(diluted, 2) }] : []),
  ];

  const metaCards: { icon: React.ReactNode; title: string; rows: { label: string; value: string }[] }[] = [];

  if (identifierRows.length > 0) {
    metaCards.push({ icon: <Landmark className="h-4 w-4 text-muted" strokeWidth={1.8} />, title: "Identifiers", rows: identifierRows as { label: string; value: string }[] });
  }
  if (structureRows.length > 0) {
    metaCards.push({ icon: <Building2 className="h-4 w-4 text-muted" strokeWidth={1.8} />, title: "Structure", rows: structureRows as { label: string; value: string }[] });
  }
  if (perShareRows.length > 0) {
    metaCards.push({ icon: <Wallet className="h-4 w-4 text-muted" strokeWidth={1.8} />, title: "Per Share", rows: perShareRows });
  }

  const gridCols = metaCards.length === 1 ? "md:grid-cols-1" : metaCards.length === 2 ? "md:grid-cols-2" : "md:grid-cols-3";

  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)]">
      <div className="card p-5">
        <div className="space-y-5">
          <div className={metaCards.length > 0 ? "space-y-3 border-b border-subtle pb-4" : "space-y-3"}>
            <h1 className="text-display text-primary">{meta.company_name}</h1>
            {meta.industry ? (
              <span className="inline-flex items-center rounded-[var(--valk-radius-sm)] bg-tertiary px-2 py-1 text-caption text-secondary">
                {meta.industry}
              </span>
            ) : null}
          </div>

          {metaCards.length > 0 && (
            <div className={`grid gap-3 ${gridCols}`}>
              {metaCards.map((card) => (
                <div key={card.title} className="rounded-[var(--valk-radius-md)] border border-subtle bg-surface-alt p-3">
                  <div className="mb-3 flex items-center gap-2">
                    {card.icon}
                    <p className="text-caption uppercase tracking-label text-muted">{card.title}</p>
                  </div>
                  <div className="space-y-2">
                    {card.rows.map((row) => (
                      <MetaRow key={row.label} label={row.label} value={row.value} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4">
        <div className="grid gap-4 md:grid-cols-3">
          <KPICard
            label="Intrinsic Value"
            value={fmtShare(dcf.per_share_value)}
          />
          <KPICard
            label="WACC Used"
            value={formatPercent(dcf.wacc.wacc, 2)}
            helper={`${formatPercent(dcf.wacc.cost_of_equity, 2)} Ke / ${formatPercent(
              dcf.wacc.cost_of_debt_post_tax,
              2
            )} Kd`}
          />
          <KPICard
            label="Terminal Value %"
            value={formatPercent(dcf.terminal_value.tv_as_pct_of_ev, 1)}
            helper={`Terminal growth ${formatPercent(assumptions.terminal_growth_rate, 1)}`}
          />
        </div>
        <ValuationHeroCard dcf={dcf} />
      </div>
    </section>
  );
};

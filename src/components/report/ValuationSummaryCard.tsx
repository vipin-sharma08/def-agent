"use client";

import { Building2, Landmark, Wallet } from "lucide-react";
import { KPICard } from "@/components/stock/KPICard";
import { ValuationHeroCard } from "@/components/stock/ValuationHeroCard";
import {
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
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-caption uppercase tracking-label text-muted">{label}</span>
      <span className="text-dense tabular-nums text-primary">{value}</span>
    </div>
  );
}

export const ValuationSummaryCard = ({ dcf, meta, assumptions }: Props) => {
  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)]">
      <div className="card p-5">
        <div className="space-y-5">
          <div className="space-y-3 border-b border-subtle pb-4">
            <h1 className="text-display text-primary">{meta.company_name}</h1>
            <span className="inline-flex items-center rounded-[var(--valk-radius-sm)] bg-tertiary px-2 py-1 text-caption text-secondary">
              {meta.industry}
            </span>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-[var(--valk-radius-md)] border border-subtle bg-surface-alt p-3">
              <div className="mb-3 flex items-center gap-2">
                <Landmark className="h-4 w-4 text-muted" strokeWidth={1.8} />
                <p className="text-caption uppercase tracking-label text-muted">Identifiers</p>
              </div>
              <div className="space-y-2">
                <MetaRow label="NSE" value={meta.nse_symbol ?? "—"} />
                <MetaRow label="BSE" value={meta.bse_code ?? "—"} />
                <MetaRow label="CIN" value={meta.cin || "—"} />
              </div>
            </div>

            <div className="rounded-[var(--valk-radius-md)] border border-subtle bg-surface-alt p-3">
              <div className="mb-3 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted" strokeWidth={1.8} />
                <p className="text-caption uppercase tracking-label text-muted">Structure</p>
              </div>
              <div className="space-y-2">
                <MetaRow label="Reporting" value={meta.standalone_or_consolidated} />
                <MetaRow label="FY End" value={meta.financial_year_end} />
                <MetaRow label="Audit" value={meta.audit_opinion || "—"} />
              </div>
            </div>

            <div className="rounded-[var(--valk-radius-md)] border border-subtle bg-surface-alt p-3">
              <div className="mb-3 flex items-center gap-2">
                <Wallet className="h-4 w-4 text-muted" strokeWidth={1.8} />
                <p className="text-caption uppercase tracking-label text-muted">Per Share</p>
              </div>
              <div className="space-y-2">
                <MetaRow label="Face Value" value={formatINR(meta.face_value_per_share, 2)} />
                <MetaRow
                  label="Basic Shares"
                  value={formatIndianNumber(meta.shares_outstanding_basic, 2)}
                />
                <MetaRow
                  label="Diluted Shares"
                  value={formatIndianNumber(meta.shares_outstanding_diluted, 2)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        <ValuationHeroCard dcf={dcf} />
        <div className="grid gap-4 md:grid-cols-2">
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
      </div>
    </section>
  );
};

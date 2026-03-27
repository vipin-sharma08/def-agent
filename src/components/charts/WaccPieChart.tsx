"use client";

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { formatPercent } from "@/lib/formatters";
import type { WaccDetail } from "@/lib/types";
import { chartTheme } from "@/components/charts/ChartTheme";

interface Props {
  wacc: WaccDetail;
}

export const WaccPieChart = ({ wacc }: Props) => {
  const series = [
    {
      label: "Equity",
      value: wacc.equity_weight,
      rate: wacc.cost_of_equity,
      tone: chartTheme.accent,
    },
    {
      label: "Debt",
      value: wacc.debt_weight,
      rate: wacc.cost_of_debt_post_tax,
      tone: chartTheme.cyan,
    },
  ];

  return (
    <div className="space-y-3">
      <p className="text-caption uppercase tracking-[0.12em] text-muted">Capital Structure</p>
      <div className="flex items-center gap-4">
        <ResponsiveContainer width={120} height={120}>
          <PieChart>
            <Pie
              data={series}
              dataKey="value"
              innerRadius={34}
              outerRadius={52}
              paddingAngle={2}
              stroke="none"
            >
              {series.map((item) => (
                <Cell key={item.label} fill={item.tone} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="space-y-3">
          {series.map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: item.tone }}
              />
              <span className="text-dense text-secondary">{item.label}</span>
              <span className="text-dense tabular-nums text-primary">
                {formatPercent(item.value, 1)}
              </span>
              <span className="text-caption tabular-nums text-muted">
                @ {formatPercent(item.rate, 1)}
              </span>
            </div>
          ))}
          <div className="border-t border-subtle pt-3">
            <span className="text-caption uppercase tracking-[0.12em] text-muted">WACC </span>
            <span className="text-dense tabular-nums text-primary">
              {formatPercent(wacc.wacc, 2)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

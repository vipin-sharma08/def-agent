"use client";

import {
  Bar,
  BarChart,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fmtCrore } from "@/lib/formatters";
import type { DcfValuation } from "@/lib/types";
import { chartTheme } from "@/components/charts/ChartTheme";

interface Props {
  dcf: DcfValuation;
}

interface BridgePoint {
  label: string;
  value: number;
  base: number;
  size: number;
  isPositive: boolean;
  isTotal: boolean;
}

function buildBridgeData(dcf: DcfValuation): BridgePoint[] {
  const pvFcffs = dcf.sum_pv_fcffs ?? 0;
  const pvTv = dcf.terminal_value?.terminal_value_discounted ?? 0;
  const enterpriseValue = dcf.enterprise_value ?? 0;
  const netDebt = Math.abs(dcf.less_net_debt ?? 0);
  const nonOperatingAssets = dcf.plus_non_operating_assets ?? 0;
  const equityValue = dcf.equity_value ?? 0;

  const rows: BridgePoint[] = [
    {
      label: "PV FCFFs",
      value: pvFcffs,
      base: 0,
      size: Math.abs(pvFcffs),
      isPositive: pvFcffs >= 0,
      isTotal: false,
    },
    {
      label: "PV TV",
      value: pvTv,
      base: pvFcffs,
      size: Math.abs(pvTv),
      isPositive: pvTv >= 0,
      isTotal: false,
    },
    {
      label: "EV",
      value: enterpriseValue,
      base: 0,
      size: Math.abs(enterpriseValue),
      isPositive: enterpriseValue >= 0,
      isTotal: true,
    },
    {
      label: "−Net Debt",
      value: -netDebt,
      base: enterpriseValue - netDebt,
      size: netDebt,
      isPositive: false,
      isTotal: false,
    },
  ];

  if (nonOperatingAssets !== 0) {
    rows.push({
      label: "+Non-op",
      value: nonOperatingAssets,
      base: enterpriseValue - netDebt,
      size: Math.abs(nonOperatingAssets),
      isPositive: nonOperatingAssets >= 0,
      isTotal: false,
    });
  }

  rows.push({
    label: "Equity",
    value: equityValue,
    base: 0,
    size: Math.abs(equityValue),
    isPositive: equityValue >= 0,
    isTotal: true,
  });

  return rows;
}

export const EvBridgeWaterfall = ({ dcf }: Props) => {
  const data = buildBridgeData(dcf);

  return (
    <div className="space-y-3">
      <p className="text-caption uppercase tracking-[0.12em] text-muted">
        Enterprise Value to Equity
      </p>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fill: chartTheme.axis, fontSize: 12 }}
          />
          <YAxis hide />
          <ReferenceLine y={0} stroke={chartTheme.grid} />
          <Tooltip
            cursor={false}
            contentStyle={chartTheme.tooltip}
            formatter={(_value, _name, item) => {
              const payload = item.payload as BridgePoint;
              return [fmtCrore(payload.value, 0), payload.label];
            }}
            labelStyle={{ color: chartTheme.label }}
          />
          <Bar dataKey="base" stackId="bridge" fill="transparent" isAnimationActive={false} />
          <Bar dataKey="size" stackId="bridge" radius={[6, 6, 0, 0]}>
            {data.map((item) => (
              <Cell
                key={item.label}
                fill={
                  item.isTotal
                    ? chartTheme.accent
                    : item.isPositive
                      ? chartTheme.profit
                      : chartTheme.loss
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

"use client";

// EV-to-Equity Bridge Waterfall
// Shows: PV FCFFs + PV TV = EV − Net Debt + Non-Op = Equity Value

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { DcfValuation } from "@/lib/types";

interface Props {
  dcf: DcfValuation;
}

interface BridgeItem {
  name: string;
  value: number;
  base: number;
  bar: number;
  isTotal: boolean;
  isPositive: boolean;
}

function buildBridgeData(dcf: DcfValuation): BridgeItem[] {
  const pvFcffs   = dcf.sum_pv_fcffs;
  const pvTV      = dcf.terminal_value.terminal_value_discounted;
  const ev        = dcf.enterprise_value;
  const netDebt   = dcf.less_net_debt;
  const nonOp     = dcf.plus_non_operating_assets;
  const equity    = dcf.equity_value;

  const items: BridgeItem[] = [];

  // PV of FCFFs
  items.push({ name: "PV FCFFs", value: pvFcffs, base: 0, bar: pvFcffs, isTotal: false, isPositive: true });

  // PV of TV
  items.push({ name: "PV TV", value: pvTV, base: pvFcffs, bar: pvTV, isTotal: false, isPositive: true });

  // EV (total)
  items.push({ name: "EV", value: ev, base: 0, bar: ev, isTotal: true, isPositive: true });

  // Less Net Debt
  let running = ev;
  const debtAbs = Math.abs(netDebt);
  items.push({ name: "−Net Debt", value: -debtAbs, base: running - debtAbs, bar: debtAbs, isTotal: false, isPositive: false });
  running -= debtAbs;

  // Plus Non-Op Assets
  if (nonOp > 0) {
    items.push({ name: "+Non-Op", value: nonOp, base: running, bar: nonOp, isTotal: false, isPositive: true });
    running += nonOp;
  }

  // Equity Value (total)
  items.push({ name: "Equity", value: equity, base: 0, bar: Math.abs(equity), isTotal: true, isPositive: equity >= 0 });

  return items;
}

function fmtCr(v: number): string {
  if (!isFinite(v)) return "—";
  return `₹${Math.round(Math.abs(v)).toLocaleString("en-IN")} Cr`;
}

const COLORS = {
  positive: "#14B8A6",
  negative: "#F43F5E",
  total: "#3B82F6",
};

export const EvBridgeWaterfall = ({ dcf }: Props) => {
  const data = buildBridgeData(dcf);

  return (
    <div>
      <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-wider mb-3">
        Enterprise Value → Equity Bridge
      </p>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 12 }}>
          <XAxis
            dataKey="name"
            tick={{ fill: "#71717A", fontSize: 10, fontFamily: "var(--font-mono)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis hide />
          <Tooltip
            cursor={false}
            contentStyle={{
              background: "#162336",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 8,
              fontSize: 11,
              fontFamily: "var(--font-mono)",
            }}
            formatter={(_val, _name, props) => {
              const idx = (props as unknown as { index: number }).index ?? 0;
              const item = data[idx];
              return [fmtCr(item?.value ?? 0), ""];
            }}
            labelStyle={{ color: "#A1A1AA" }}
          />
          <ReferenceLine y={0} stroke="rgba(255,255,255,0.06)" />
          <Bar dataKey="base" stackId="a" fill="transparent" isAnimationActive={false} />
          <Bar dataKey="bar" stackId="a" radius={[3, 3, 0, 0]} isAnimationActive={false}>
            {data.map((d, i) => (
              <Cell
                key={i}
                fill={d.isTotal ? COLORS.total : d.isPositive ? COLORS.positive : COLORS.negative}
                opacity={d.isTotal ? 0.9 : 0.7}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

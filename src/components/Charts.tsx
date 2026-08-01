"use client";

import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { inrShort } from "@/lib/format";

const AXIS = { fontSize: 11, fill: "var(--muted)" };
const GRID = "var(--border)";
const PALETTE = ["#9a6d1f", "#2563eb", "#16a34a", "#f59e0b", "#8b5cf6", "#0891b2", "#e11d48", "#64748b"];

function Tip({
  active,
  payload,
  label,
  money = true,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number | string; color?: string }[];
  label?: string | number;
  money?: boolean;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 shadow-xl">
      {label !== undefined && (
        <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-muted">{label}</p>
      )}
      {payload.map((p, i) => (
        <p key={i} className="flex items-center gap-2 text-[12.5px] font-semibold text-ink">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          {p.name}: {money ? inrShort(Number(p.value)) : p.value}
        </p>
      ))}
    </div>
  );
}

/** Money collected against money billed, month by month. */
export function FlowChart({ data }: { data: { month: string; collected: number; due: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <defs>
          <linearGradient id="gCollected" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#16a34a" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#16a34a" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="gDue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#9a6d1f" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#9a6d1f" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="month" tick={AXIS} axisLine={false} tickLine={false} />
        <YAxis tick={AXIS} axisLine={false} tickLine={false} width={62} tickFormatter={(v) => inrShort(Number(v))} />
        <Tooltip content={<Tip />} />
        <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={8} />
        <Area type="monotone" dataKey="due" name="Billed" stroke="#9a6d1f" strokeWidth={2} fill="url(#gDue)" />
        <Area type="monotone" dataKey="collected" name="Collected" stroke="#16a34a" strokeWidth={2} fill="url(#gCollected)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/** A single money-per-category bar chart, used for upcoming months and ageing. */
export function MoneyBarChart({
  data,
  nameKey,
  label,
  colors = PALETTE,
  height = 220,
}: {
  data: Record<string, string | number>[];
  nameKey: string;
  label: string;
  colors?: string[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey={nameKey} tick={AXIS} axisLine={false} tickLine={false} />
        <YAxis tick={AXIS} axisLine={false} tickLine={false} width={62} tickFormatter={(v) => inrShort(Number(v))} />
        <Tooltip content={<Tip />} cursor={{ fill: "var(--surface-3)" }} />
        <Bar dataKey="amount" name={label} radius={[6, 6, 0, 0]} maxBarSize={54}>
          {data.map((_, i) => (
            <Cell key={i} fill={colors[i % colors.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DonutChart({
  data,
  height = 220,
  money = false,
}: {
  data: { name: string; value: number; color?: string }[];
  height?: number;
  money?: boolean;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius="56%"
          outerRadius="82%"
          paddingAngle={2}
          stroke="var(--surface)"
          strokeWidth={2}
        >
          {data.map((d, i) => (
            <Cell key={d.name} fill={d.color ?? PALETTE[i % PALETTE.length]} />
          ))}
        </Pie>
        <Tooltip content={<Tip money={money} />} />
        <Legend wrapperStyle={{ fontSize: 11.5 }} iconType="circle" iconSize={8} />
      </PieChart>
    </ResponsiveContainer>
  );
}

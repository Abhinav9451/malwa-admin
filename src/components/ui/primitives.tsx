"use client";

import React from "react";
import { hueOf, initials } from "@/lib/format";

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

/* ------------------------------- Card ------------------------------- */

export function Card({
  children,
  className,
  padded = true,
}: {
  children: React.ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return <div className={cx("card", padded && "p-4", className)}>{children}</div>;
}

export function CardHeader({
  title,
  subtitle,
  action,
  icon,
  className,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("flex items-start justify-between gap-3 border-b border-line px-4 py-3", className)}>
      <div className="flex items-start gap-2.5 min-w-0">
        {icon && <span className="mt-0.5 text-gold">{icon}</span>}
        <div className="min-w-0">
          <h3 className="section-title truncate">{title}</h3>
          {subtitle && <p className="mt-0.5 text-[12px] text-muted">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}

/* ------------------------------ Badges ------------------------------ */

export type Tone = "gray" | "green" | "amber" | "red" | "blue" | "violet" | "gold" | "teal";

const TONES: Record<Tone, string> = {
  gray: "bg-surface-3 text-ink-2",
  green: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400",
  amber: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  red: "bg-rose-500/12 text-rose-700 dark:text-rose-400",
  blue: "bg-blue-500/12 text-blue-700 dark:text-blue-400",
  violet: "bg-violet-500/12 text-violet-700 dark:text-violet-400",
  teal: "bg-teal-500/12 text-teal-700 dark:text-teal-400",
  gold: "bg-gold-soft text-gold",
};

export function Badge({
  children,
  tone = "gray",
  dot,
  className,
}: {
  children: React.ReactNode;
  tone?: Tone;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span className={cx("badge", TONES[tone], className)}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />}
      {children}
    </span>
  );
}

const STATUS_MAP: Record<string, { label: string; tone: Tone }> = {
  /* projects */
  upcoming: { label: "Upcoming", tone: "violet" },
  ongoing: { label: "Ongoing", tone: "blue" },
  on_hold: { label: "On Hold", tone: "amber" },
  completed: { label: "Completed", tone: "green" },
  /* instalments */
  pending: { label: "Pending", tone: "gray" },
  partial: { label: "Partial", tone: "amber" },
  paid: { label: "Paid", tone: "green" },
  overdue: { label: "Overdue", tone: "red" },
  /* vendor commitments */
  ordered: { label: "Ordered", tone: "violet" },
  delivered: { label: "Delivered", tone: "green" },
  cancelled: { label: "Cancelled", tone: "gray" },
  /* reminders */
  done: { label: "Done", tone: "green" },
};

export function StatusBadge({ status, override }: { status: string; override?: { label: string; tone: Tone } }) {
  const s = override ?? STATUS_MAP[status] ?? { label: status, tone: "gray" as Tone };
  return (
    <Badge tone={s.tone} dot>
      {s.label}
    </Badge>
  );
}

/* ----------------------------- Progress ----------------------------- */

export function Progress({
  value,
  className,
  showLabel = false,
  tone,
}: {
  value: number;
  className?: string;
  showLabel?: boolean;
  tone?: "gold" | "green" | "blue" | "red";
}) {
  const v = Math.max(0, Math.min(100, value));
  const color =
    tone === "green" ? "#16a34a"
    : tone === "blue" ? "#2563eb"
    : tone === "red" ? "#e11d48"
    : v >= 90 ? "#16a34a"
    : v >= 50 ? "var(--accent)"
    : v >= 20 ? "#f59e0b"
    : "#e11d48";
  return (
    <div className={cx("flex items-center gap-2", className)}>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${v}%`, background: color }}
        />
      </div>
      {showLabel && <span className="tabular w-9 shrink-0 text-right text-[11px] font-semibold text-muted">{Math.round(v)}%</span>}
    </div>
  );
}

/* ------------------------------ Avatar ------------------------------ */

export function Avatar({
  name,
  size = 32,
  className,
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const h = hueOf(name);
  return (
    <span
      className={cx("inline-flex shrink-0 items-center justify-center rounded-full font-bold", className)}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
        background: `hsl(${h} 62% 92%)`,
        color: `hsl(${h} 55% 30%)`,
      }}
      title={name}
    >
      {initials(name)}
    </span>
  );
}

/* ------------------------------- misc ------------------------------- */

export function EmptyState({
  icon,
  title,
  hint,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      {icon && <div className="mb-1 text-muted opacity-60">{icon}</div>}
      <p className="font-display text-[15px] font-semibold text-ink">{title}</p>
      {hint && <p className="max-w-sm text-[12.5px] text-muted">{hint}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function Field({
  label,
  children,
  hint,
  className,
  required,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
  className?: string;
  required?: boolean;
}) {
  return (
    <div className={className}>
      <label className="label">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-muted">{hint}</p>}
    </div>
  );
}

export function Tabs<T extends string>({
  tabs,
  active,
  onChange,
  className,
}: {
  tabs: { key: T; label: string; count?: number }[];
  active: T;
  onChange: (k: T) => void;
  className?: string;
}) {
  return (
    <div className={cx("flex gap-1 overflow-x-auto border-b border-line", className)}>
      {tabs.map((t) => {
        const on = t.key === active;
        return (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            className={cx(
              "relative cursor-pointer whitespace-nowrap px-3 py-2.5 text-[13px] font-semibold transition-colors",
              on ? "text-gold" : "text-muted hover:text-ink",
            )}
          >
            {t.label}
            {t.count !== undefined && (
              <span
                className={cx(
                  "tabular ml-1.5 rounded px-1.5 py-0.5 text-[10.5px]",
                  on ? "bg-gold-soft text-gold" : "bg-surface-3 text-muted",
                )}
              >
                {t.count}
              </span>
            )}
            {on && <span className="absolute inset-x-1 -bottom-px h-0.5 rounded-full bg-gold" />}
          </button>
        );
      })}
    </div>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: T; label: string }[];
  value: T;
  onChange: (k: T) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-line bg-surface-2 p-0.5">
      {options.map((o) => (
        <button
          key={o.key}
          onClick={() => onChange(o.key)}
          className={cx(
            "cursor-pointer rounded-md px-2.5 py-1 text-[12px] font-semibold transition",
            o.key === value ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Stat({
  label,
  value,
  sub,
  icon,
  tone = "gray",
  onClick,
  trend,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon?: React.ReactNode;
  tone?: Tone;
  onClick?: () => void;
  trend?: { value: string; up: boolean };
}) {
  return (
    <div
      onClick={onClick}
      className={cx(
        "card group relative overflow-hidden p-4 transition-all",
        onClick && "cursor-pointer hover:-translate-y-0.5 hover:border-line-strong",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted">{label}</p>
        {icon && <span className={cx("rounded-lg p-1.5", TONES[tone])}>{icon}</span>}
      </div>
      <p className="kpi-value tabular mt-2">{value}</p>
      <div className="mt-1 flex items-center gap-2">
        {sub && <p className="text-[12px] text-muted">{sub}</p>}
        {trend && (
          <span className={cx("text-[11px] font-bold", trend.up ? "text-emerald-600" : "text-rose-600")}>
            {trend.up ? "▲" : "▼"} {trend.value}
          </span>
        )}
      </div>
    </div>
  );
}

export function Divider({ label }: { label?: string }) {
  if (!label) return <div className="my-4 h-px bg-line" />;
  return (
    <div className="my-4 flex items-center gap-3">
      <div className="h-px flex-1 bg-line" />
      <span className="text-[11px] font-bold uppercase tracking-wider text-muted">{label}</span>
      <div className="h-px flex-1 bg-line" />
    </div>
  );
}

export function KeyVal({ k, v, className }: { k: string; v: React.ReactNode; className?: string }) {
  return (
    <div className={cx("flex items-baseline justify-between gap-3 py-1.5", className)}>
      <span className="text-[12px] text-muted">{k}</span>
      <span className="text-right text-[13px] font-semibold text-ink">{v}</span>
    </div>
  );
}

export function Toolbar({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cx("flex flex-wrap items-center gap-2", className)}>{children}</div>;
}

export function PageHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-[24px] font-bold tracking-tight text-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-[13px] text-muted">{subtitle}</p>}
      </div>
      {children && <Toolbar className="no-print">{children}</Toolbar>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx("relative overflow-hidden rounded-lg bg-surface-3", className)} />;
}

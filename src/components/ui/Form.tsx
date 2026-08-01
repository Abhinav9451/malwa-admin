"use client";

import React from "react";
import { cx } from "./primitives";

/** Two-column form body. Fields opt out with `full`. */
export function FormGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-3.5 sm:grid-cols-2">{children}</div>;
}

function Wrap({
  label,
  hint,
  full,
  children,
}: {
  label: string;
  hint?: string;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={cx(full && "sm:col-span-2")}>
      <label className="label">{label}</label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-muted">{hint}</p>}
    </div>
  );
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  hint,
  full,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
  full?: boolean;
  type?: "text" | "date" | "tel" | "email" | "url";
}) {
  return (
    <Wrap label={label} hint={hint} full={full}>
      <input
        className="input"
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </Wrap>
  );
}

export function NumberField({
  label,
  value,
  onChange,
  hint,
  full,
  prefix,
  suffix,
  min = 0,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  hint?: string;
  full?: boolean;
  prefix?: string;
  suffix?: string;
  min?: number;
  max?: number;
}) {
  return (
    <Wrap label={label} hint={hint} full={full}>
      <div className="relative">
        {prefix && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-muted">
            {prefix}
          </span>
        )}
        <input
          className={cx("input tabular", prefix && "pl-7", suffix && "pr-12")}
          type="number"
          min={min}
          max={max}
          value={Number.isFinite(value) ? value : 0}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        {suffix && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-muted">
            {suffix}
          </span>
        )}
      </div>
    </Wrap>
  );
}

export interface Option {
  value: string;
  label: string;
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  hint,
  full,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  hint?: string;
  full?: boolean;
  placeholder?: string;
}) {
  return (
    <Wrap label={label} hint={hint} full={full}>
      <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Wrap>
  );
}

export function TextAreaField({
  label,
  value,
  onChange,
  rows = 3,
  placeholder,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <Wrap label={label} hint={hint} full>
      <textarea
        className="input resize-y leading-relaxed"
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </Wrap>
  );
}

export function ToggleField({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 sm:col-span-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 cursor-pointer accent-[var(--accent)]"
      />
      <span>
        <span className="block text-[13px] font-semibold text-ink">{label}</span>
        {hint && <span className="block text-[11.5px] text-muted">{hint}</span>}
      </span>
    </label>
  );
}

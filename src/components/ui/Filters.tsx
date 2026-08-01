"use client";

import React from "react";
import { Download, Search, X } from "lucide-react";
import type { Option } from "./Form";

export interface FilterSpec {
  /** shown as the "all" option, e.g. "All statuses" */
  allLabel: string;
  value: string;
  onChange: (v: string) => void;
  options: Option[];
}

/**
 * Search + dropdown filters + Excel download, in one strip above a table.
 * Every list page uses this so filtering and exporting behave identically.
 */
export function FilterBar({
  search,
  onSearch,
  placeholder = "Search…",
  filters = [],
  onExport,
  children,
}: {
  search: string;
  onSearch: (v: string) => void;
  placeholder?: string;
  filters?: FilterSpec[];
  onExport?: () => void;
  children?: React.ReactNode;
}) {
  const dirty = search.length > 0 || filters.some((f) => f.value !== "");

  return (
    <div className="no-print flex flex-wrap items-center gap-2 border-b border-line px-3 py-2.5">
      <div className="relative min-w-[12rem] flex-1">
        <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
        <input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder={placeholder}
          className="input py-1.5 pl-8 text-[13px]"
        />
      </div>

      {filters.map((f) => (
        <select
          key={f.allLabel}
          value={f.value}
          onChange={(e) => f.onChange(e.target.value)}
          className="input w-auto min-w-[9rem] py-1.5 text-[12.5px]"
        >
          <option value="">{f.allLabel}</option>
          {f.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ))}

      {dirty && (
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => {
            onSearch("");
            filters.forEach((f) => f.onChange(""));
          }}
        >
          <X size={13} /> Clear
        </button>
      )}

      {children}

      {onExport && (
        <button className="btn btn-outline btn-sm" onClick={onExport} title="Download the filtered rows as Excel">
          <Download size={13} /> Excel
        </button>
      )}
    </div>
  );
}

/** Case-insensitive "does any of these fields contain the query" test. */
export function matches(query: string, ...fields: (string | number | undefined)[]): boolean {
  if (!query.trim()) return true;
  const q = query.trim().toLowerCase();
  return fields.some((f) => String(f ?? "").toLowerCase().includes(q));
}

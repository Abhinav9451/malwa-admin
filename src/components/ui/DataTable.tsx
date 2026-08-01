"use client";

import React, { useMemo, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from "lucide-react";
import { cx, EmptyState } from "./primitives";

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  render: (row: T, index: number) => React.ReactNode;
  /** value used for sorting; omit to make the column unsortable */
  sortValue?: (row: T) => string | number;
  align?: "left" | "right" | "center";
  className?: string;
  headClassName?: string;
  hideBelow?: "sm" | "md" | "lg" | "xl";
}

const HIDE: Record<string, string> = {
  sm: "hidden sm:table-cell",
  md: "hidden md:table-cell",
  lg: "hidden lg:table-cell",
  xl: "hidden xl:table-cell",
};

export function DataTable<T>({
  rows,
  columns,
  rowKey,
  onRowClick,
  emptyTitle = "Nothing here yet",
  emptyHint,
  emptyIcon,
  footer,
  pageSize,
  dense,
  selectable,
  selected,
  onSelectedChange,
  rowClassName,
  initialSort,
}: {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  emptyTitle?: string;
  emptyHint?: string;
  emptyIcon?: React.ReactNode;
  footer?: React.ReactNode;
  pageSize?: number;
  dense?: boolean;
  selectable?: boolean;
  selected?: string[];
  onSelectedChange?: (ids: string[]) => void;
  rowClassName?: (row: T) => string | undefined;
  initialSort?: { key: string; dir: "asc" | "desc" };
}) {
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(initialSort ?? null);
  const [page, setPage] = useState(0);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.sortValue) return rows;
    const out = [...rows].sort((a, b) => {
      const va = col.sortValue!(a);
      const vb = col.sortValue!(b);
      if (typeof va === "number" && typeof vb === "number") return va - vb;
      return String(va).localeCompare(String(vb), "en", { numeric: true });
    });
    return sort.dir === "desc" ? out.reverse() : out;
  }, [rows, sort, columns]);

  const pages = pageSize ? Math.ceil(sorted.length / pageSize) : 1;
  const current = pageSize ? sorted.slice(page * pageSize, page * pageSize + pageSize) : sorted;
  const visible = Math.min(page, Math.max(0, pages - 1));
  if (visible !== page) setPage(visible);

  const allIds = sorted.map(rowKey);
  const allSelected = selectable && allIds.length > 0 && allIds.every((id) => selected?.includes(id));

  const toggleSort = (key: string) => {
    setSort((prev) =>
      prev?.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" },
    );
  };

  return (
    <div className="w-full">
      <div className="w-full overflow-x-auto">
        <table className="w-full border-collapse">
          <thead className="border-b border-line bg-surface-2">
            <tr>
              {selectable && (
                <th className="w-9 px-3">
                  <input
                    type="checkbox"
                    checked={!!allSelected}
                    onChange={(e) => onSelectedChange?.(e.target.checked ? allIds : [])}
                    className="h-3.5 w-3.5 cursor-pointer accent-[var(--accent)]"
                    aria-label="Select all"
                  />
                </th>
              )}
              {columns.map((c) => {
                const active = sort?.key === c.key;
                return (
                  <th
                    key={c.key}
                    className={cx(
                      "th",
                      c.align === "right" && "text-right",
                      c.align === "center" && "text-center",
                      c.hideBelow && HIDE[c.hideBelow],
                      c.headClassName,
                      c.sortValue && "cursor-pointer select-none hover:text-ink",
                    )}
                    onClick={c.sortValue ? () => toggleSort(c.key) : undefined}
                  >
                    <span className={cx("inline-flex items-center gap-1", c.align === "right" && "flex-row-reverse")}>
                      {c.header}
                      {c.sortValue &&
                        (active ? (
                          sort!.dir === "asc" ? <ChevronUp size={12} className="text-gold" /> : <ChevronDown size={12} className="text-gold" />
                        ) : (
                          <ChevronDown size={12} className="opacity-25" />
                        ))}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {current.map((row, i) => {
              const id = rowKey(row);
              const isSel = selected?.includes(id);
              return (
                <tr
                  key={id}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cx(
                    "row-hover border-b border-line last:border-0",
                    onRowClick && "cursor-pointer",
                    isSel && "bg-gold-soft",
                    rowClassName?.(row),
                  )}
                >
                  {selectable && (
                    <td className="px-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={!!isSel}
                        onChange={(e) =>
                          onSelectedChange?.(
                            e.target.checked
                              ? [...(selected ?? []), id]
                              : (selected ?? []).filter((x) => x !== id),
                          )
                        }
                        className="h-3.5 w-3.5 cursor-pointer accent-[var(--accent)]"
                        aria-label="Select row"
                      />
                    </td>
                  )}
                  {columns.map((c) => (
                    <td
                      key={c.key}
                      className={cx(
                        "td",
                        dense && "py-1.5",
                        c.align === "right" && "text-right",
                        c.align === "center" && "text-center",
                        c.hideBelow && HIDE[c.hideBelow],
                        c.className,
                      )}
                    >
                      {c.render(row, i)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
          {footer && <tfoot className="border-t-2 border-line-strong bg-surface-2 font-semibold">{footer}</tfoot>}
        </table>
      </div>

      {!sorted.length && <EmptyState title={emptyTitle} hint={emptyHint} icon={emptyIcon} />}

      {pageSize && pages > 1 && (
        <div className="flex items-center justify-between gap-2 border-t border-line px-3 py-2.5">
          <p className="text-[12px] text-muted">
            Showing <span className="font-semibold text-ink">{page * pageSize + 1}</span>–
            <span className="font-semibold text-ink">{Math.min(sorted.length, (page + 1) * pageSize)}</span> of{" "}
            <span className="font-semibold text-ink">{sorted.length}</span>
          </p>
          <div className="flex items-center gap-1">
            <button
              className="btn btn-outline btn-xs"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              <ChevronLeft size={13} /> Prev
            </button>
            <span className="tabular px-2 text-[12px] font-semibold text-muted">
              {page + 1} / {pages}
            </span>
            <button
              className="btn btn-outline btn-xs"
              disabled={page >= pages - 1}
              onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}
            >
              Next <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Small search + filter bar used above tables. */
export function TableToolbar({
  search,
  onSearch,
  placeholder = "Search…",
  children,
}: {
  search: string;
  onSearch: (v: string) => void;
  placeholder?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="no-print flex flex-wrap items-center gap-2 border-b border-line px-3 py-2.5">
      <div className="relative min-w-[13rem] flex-1">
        <input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder={placeholder}
          className="input py-1.5 pl-8 text-[13px]"
        />
        <svg
          className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted"
          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
      </div>
      {children}
    </div>
  );
}

/* Excel / CSV download helpers — the "sheet nikaal do" button. */

import * as XLSX from "xlsx";
import { toISODate } from "./format";

export type Row = Record<string, string | number | undefined>;
export interface Sheet {
  name: string;
  rows: Row[];
}

function autoWidth(rows: Row[]): { wch: number }[] {
  if (!rows.length) return [];
  const keys = Object.keys(rows[0]);
  return keys.map((k) => {
    const longest = rows.reduce((max, r) => Math.max(max, String(r[k] ?? "").length), k.length);
    return { wch: Math.min(46, Math.max(10, longest + 2)) };
  });
}

export function downloadExcel(sheets: Sheet[], fileBase: string): void {
  const wb = XLSX.utils.book_new();
  sheets.forEach((s) => {
    const ws = XLSX.utils.json_to_sheet(s.rows.length ? s.rows : [{ Note: "No records" }]);
    ws["!cols"] = autoWidth(s.rows);
    // Excel sheet names: 31 chars, no []:*?/\
    const safe = s.name.replace(/[[\]:*?/\\]/g, " ").slice(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, safe);
  });
  XLSX.writeFile(wb, `${fileBase}-${toISODate(new Date())}.xlsx`);
}

export function downloadCSV(rows: Row[], fileBase: string): void {
  const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ Note: "No records" }]);
  const csv = XLSX.utils.sheet_to_csv(ws);
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${fileBase}-${toISODate(new Date())}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function printCurrentView(): void {
  window.print();
}

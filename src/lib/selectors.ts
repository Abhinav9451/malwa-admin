/* Derived numbers. Every "due / pending / upcoming" figure comes from here
   so the dashboard, the payments page and the reminders agree with each other. */

import { daysFromToday, monthLabel } from "./format";
import type { DB, Milestone } from "./types";

export interface DueRow {
  milestone: Milestone;
  projectId: string;
  projectName: string;
  customerName: string;
  customerPhone: string;
  balance: number;
  /** negative = overdue by N days */
  days: number;
  bucket: "overdue" | "due_soon" | "upcoming";
}

/** Every instalment with money still outstanding, nearest due date first. */
export function dueRows(db: DB, windowDays = 7): DueRow[] {
  return db.milestones
    .filter((m) => m.paidAmount < m.amount)
    .map((m) => {
      const project = db.projects.find((p) => p.id === m.projectId);
      const customer = db.customers.find((c) => c.id === project?.customerId);
      const days = daysFromToday(m.dueDate);
      return {
        milestone: m,
        projectId: m.projectId,
        projectName: project?.name ?? "—",
        customerName: customer?.name ?? "—",
        customerPhone: customer?.phone ?? "",
        balance: m.amount - m.paidAmount,
        days,
        bucket: days < 0 ? "overdue" : days <= windowDays ? "due_soon" : "upcoming",
      } as DueRow;
    })
    .sort((a, b) => a.days - b.days);
}

export interface Totals {
  contractValue: number;
  collected: number;
  outstanding: number;
  overdue: number;
  overdueCount: number;
  dueSoon: number;
  dueSoonCount: number;
  upcoming: number;
  upcomingCount: number;
  collectedThisMonth: number;
  vendorCommitted: number;
  vendorPending: number;
  activeProjects: number;
  lowStock: number;
  pendingReminders: number;
}

export function totals(db: DB): Totals {
  const rows = dueRows(db, db.settings.reminderWindowDays);
  const sum = (bucket: DueRow["bucket"]) =>
    rows.filter((r) => r.bucket === bucket).reduce((n, r) => n + r.balance, 0);
  const count = (bucket: DueRow["bucket"]) => rows.filter((r) => r.bucket === bucket).length;

  const now = new Date();
  const collectedThisMonth = db.payments
    .filter((p) => {
      const d = new Date(p.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((n, p) => n + p.amount, 0);

  return {
    contractValue: db.projects.reduce((n, p) => n + p.contractValue, 0),
    collected: db.payments.reduce((n, p) => n + p.amount, 0),
    outstanding: rows.reduce((n, r) => n + r.balance, 0),
    overdue: sum("overdue"),
    overdueCount: count("overdue"),
    dueSoon: sum("due_soon"),
    dueSoonCount: count("due_soon"),
    upcoming: sum("upcoming"),
    upcomingCount: count("upcoming"),
    collectedThisMonth,
    vendorCommitted: db.commitments.reduce((n, c) => n + c.amount, 0),
    vendorPending: db.commitments
      .filter((c) => c.status !== "cancelled")
      .reduce((n, c) => n + (c.amount - c.paidAmount), 0),
    activeProjects: db.projects.filter((p) => p.status === "ongoing").length,
    lowStock: db.materials.filter((m) => m.minStock > 0 && m.stock < m.minStock).length,
    pendingReminders: db.reminders.filter((r) => r.status === "pending").length,
  };
}

/** Money collected vs money still expected, month by month. */
export function monthlyFlow(db: DB, months = 6): { month: string; collected: number; due: number }[] {
  const out: { month: string; collected: number; due: number }[] = [];
  const now = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const ref = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const inMonth = (iso: string) => {
      const d = new Date(iso);
      return d.getMonth() === ref.getMonth() && d.getFullYear() === ref.getFullYear();
    };
    out.push({
      month: monthLabel(ref.toISOString()),
      collected: db.payments.filter((p) => inMonth(p.date)).reduce((n, p) => n + p.amount, 0),
      due: db.milestones.filter((m) => inMonth(m.dueDate)).reduce((n, m) => n + m.amount, 0),
    });
  }
  return out;
}

/** What is coming in over the next few months — the "upcoming payments" graph. */
export function upcomingByMonth(db: DB, months = 6): { month: string; amount: number }[] {
  const rows = dueRows(db).filter((r) => r.days >= 0);
  const now = new Date();
  const out: { month: string; amount: number }[] = [];

  for (let i = 0; i < months; i++) {
    const ref = new Date(now.getFullYear(), now.getMonth() + i, 1);
    out.push({
      month: monthLabel(ref.toISOString()),
      amount: rows
        .filter((r) => {
          const d = new Date(r.milestone.dueDate);
          return d.getMonth() === ref.getMonth() && d.getFullYear() === ref.getFullYear();
        })
        .reduce((n, r) => n + r.balance, 0),
    });
  }
  return out;
}

/** How long the overdue money has been sitting there. */
export function ageingBuckets(db: DB): { bucket: string; amount: number }[] {
  const overdue = dueRows(db).filter((r) => r.days < 0);
  const band = (min: number, max: number) =>
    overdue
      .filter((r) => {
        const late = Math.abs(r.days);
        return late >= min && late <= max;
      })
      .reduce((n, r) => n + r.balance, 0);

  return [
    { bucket: "1–15 days", amount: band(1, 15) },
    { bucket: "16–30 days", amount: band(16, 30) },
    { bucket: "31–60 days", amount: band(31, 60) },
    { bucket: "60+ days", amount: band(61, 99999) },
  ];
}

export function projectBalance(db: DB, projectId: string): { billed: number; collected: number; balance: number } {
  const ms = db.milestones.filter((m) => m.projectId === projectId);
  const billed = ms.reduce((n, m) => n + m.amount, 0);
  const collected = ms.reduce((n, m) => n + m.paidAmount, 0);
  return { billed, collected, balance: billed - collected };
}

export function vendorBalance(db: DB, vendorId: string): { committed: number; paid: number; pending: number } {
  const cs = db.commitments.filter((c) => c.vendorId === vendorId && c.status !== "cancelled");
  const committed = cs.reduce((n, c) => n + c.amount, 0);
  const paid = cs.reduce((n, c) => n + c.paidAmount, 0);
  return { committed, paid, pending: committed - paid };
}

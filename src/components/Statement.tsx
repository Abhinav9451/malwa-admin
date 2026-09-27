"use client";

import { Printer, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { fmtDate, inr, toISODate } from "@/lib/format";
import type { DB, Project } from "@/lib/types";
import { PROJECT_MODES, type ProjectMode } from "@/lib/types";
import { Portal, useDialogBehaviour } from "@/components/ui/Modal";
import { Letterhead } from "@/components/Letterhead";
import { printWithFilename } from "@/lib/printDoc";

const MODE_LABEL: Record<ProjectMode, string> = Object.fromEntries(
  PROJECT_MODES.map((m) => [m.key, m.label]),
) as Record<ProjectMode, string>;

type RowStatus = "paid" | "pending" | "overdue";

interface LedgerRow {
  id: string;
  sort: string; // raw ISO date, for merging across projects
  date: string;
  plan: string; // project name — shown only in the multi-project view
  reference: string;
  mode: string;
  amount: number;
  status: RowStatus;
  balance: string;
}

/** One project's full ledger: opening fee, every payment (paid) and every
 *  milestone still owed anything (pending, or overdue if past its due date),
 *  oldest first, with a running balance. */
function buildLedger(project: Project, db: DB): { rows: LedgerRow[]; finalBalance: number } {
  const payments = db.payments.filter((p) => p.projectId === project.id);
  const milestones = db.milestones.filter((m) => m.projectId === project.id);
  const today = toISODate(new Date());

  type Event = { sort: string; reference: string; mode: string; amount: number; status: RowStatus };
  const events: Event[] = [
    ...payments.map((p): Event => {
      const milestone = db.milestones.find((m) => m.id === p.milestoneId);
      return {
        sort: p.date,
        reference: milestone?.title ?? "Payment",
        mode: p.mode.toUpperCase(),
        amount: p.amount,
        status: "paid",
      };
    }),
    ...milestones
      .filter((m) => m.amount - m.paidAmount > 0)
      .map((m): Event => ({
        sort: m.dueDate,
        reference: m.title,
        mode: "—",
        amount: m.amount - m.paidAmount,
        status: m.dueDate < today ? "overdue" : "pending",
      })),
  ].sort((a, b) => a.sort.localeCompare(b.sort));

  let balance = project.contractValue;
  const rows = events.map((e, i) => {
    if (e.status === "paid") balance = Math.max(0, balance - e.amount);
    return {
      id: `${project.id}_${i}`,
      sort: e.sort,
      date: fmtDate(e.sort),
      plan: project.name,
      reference: e.reference,
      mode: e.mode,
      amount: e.amount,
      status: e.status,
      balance: balance <= 0 ? "Nil /-" : `${inr(balance)} /-`,
    };
  });

  return { rows, finalBalance: balance };
}

const STATUS_STYLE: Record<RowStatus, string> = {
  paid: "",
  pending: "text-amber-600",
  overdue: "text-red-600",
};
const STATUS_LABEL: Record<RowStatus, string | null> = {
  paid: null,
  pending: "Pending",
  overdue: "Overdue",
};

function LedgerTable({ rows, opening, showPlan }: { rows: LedgerRow[]; opening?: number; showPlan?: boolean }) {
  return (
    <table className="mt-2 w-full border-collapse text-[12px]">
      <thead>
        <tr className="border-b-2 border-neutral-900">
          <th className="py-2 pr-2 text-left font-semibold">Date</th>
          {showPlan && <th className="py-2 px-2 text-left font-semibold">Plan</th>}
          <th className="py-2 px-2 text-left font-semibold">References</th>
          <th className="py-2 px-2 text-left font-semibold">Cheque/cash</th>
          <th className="py-2 px-2 text-right font-semibold">Rece. Pending</th>
          <th className="py-2 pl-2 text-right font-semibold">Total/Balance</th>
        </tr>
      </thead>
      <tbody>
        {opening !== undefined && (
          <tr className="bg-neutral-100">
            <td className="py-2 pr-2">&nbsp;</td>
            {showPlan && <td className="py-2 px-2">&nbsp;</td>}
            <td className="py-2 px-2">Total fee</td>
            <td className="py-2 px-2">&nbsp;</td>
            <td className="py-2 px-2 text-right">&nbsp;</td>
            <td className="py-2 pl-2 text-right font-semibold">{inr(opening)}/-</td>
          </tr>
        )}
        {rows.map((r, i) => (
          <tr key={r.id} className={i % 2 === 0 ? "" : "bg-neutral-100"}>
            <td className="py-2 pr-2 font-semibold">{r.date}</td>
            {showPlan && <td className="py-2 px-2">{r.plan}</td>}
            <td className="py-2 px-2">
              {r.reference}
              {STATUS_LABEL[r.status] && (
                <span className={`ml-1.5 text-[10px] font-semibold uppercase ${STATUS_STYLE[r.status]}`}>
                  {STATUS_LABEL[r.status]}
                </span>
              )}
            </td>
            <td className="py-2 px-2">{r.mode}</td>
            <td className={`py-2 px-2 text-right ${STATUS_STYLE[r.status]}`}>{inr(r.amount)} /-</td>
            <td className="py-2 pl-2 text-right">{r.balance}</td>
          </tr>
        ))}
        {rows.length === 0 && (
          <tr>
            <td colSpan={showPlan ? 6 : 5} className="py-6 text-center text-neutral-400">No payments recorded yet.</td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

function StatementBody({ projectId, customerId }: { projectId?: string; customerId?: string }) {
  const { db } = useStore();
  const projects = customerId
    ? db.projects.filter((p) => p.customerId === customerId)
    : db.projects.filter((p) => p.id === projectId);
  const single = !customerId;
  const customer = db.customers.find((c) => c.id === (customerId ?? projects[0]?.customerId));

  const ledgers = projects.map((p) => ({ project: p, ...buildLedger(p, db) }));
  const totalBilled = projects.reduce((n, p) => n + p.contractValue, 0);
  const totalPending = ledgers.reduce((n, l) => n + l.finalBalance, 0);

  // Multi-project view: every row from every plan, merged into one date-wise list.
  const mergedRows = [...ledgers.flatMap((l) => l.rows)].sort((a, b) => a.sort.localeCompare(b.sort));

  return (
    <div className="bg-white p-8 text-neutral-900">
      <Letterhead />

      <div className="mt-6 flex items-start justify-between text-[12.5px]">
        <div>
          <p>Issued To :</p>
          <p>Name : {customer ? `Mr./Ms. ${customer.name}, ${customer.city}` : "—"}</p>
        </div>
        <div className="text-right">
          <p>
            {single ? "Project Code:" : "Plans:"}{" "}
            <span className="font-semibold">{projects.map((p) => p.code).join(", ") || "—"}</span>
          </p>
          <p>Date : <span className="font-semibold">{fmtDate(new Date().toISOString())}</span></p>
        </div>
      </div>

      {single && projects[0] && (
        <div className="mt-4 text-[12.5px] leading-relaxed">
          <p>The fee structure for a Residential building {MODE_LABEL[projects[0].mode]} only.</p>
          <p>Built-up area = {projects[0].builtUpArea.toLocaleString("en-IN")} Sqft.</p>
        </div>
      )}
      {!single && (
        <p className="mt-4 text-[12.5px] leading-relaxed">
          Every payment across {projects.length} plan{projects.length === 1 ? "" : "s"} for this customer, date-wise — paid, pending and overdue.
        </p>
      )}

      {single ? (
        <LedgerTable rows={ledgers[0]?.rows ?? []} opening={projects[0]?.contractValue} />
      ) : (
        <LedgerTable rows={mergedRows} showPlan />
      )}
      {projects.length === 0 && (
        <p className="mt-6 py-6 text-center text-[12.5px] text-neutral-400">No plans on record for this customer.</p>
      )}

      {!single && projects.length > 0 && (
        <div className="mt-5 flex justify-between border-t-2 border-neutral-900 pt-2 text-[13px] font-bold">
          <span>Total across all plans</span>
          <span>
            Billed {inr(totalBilled)}/- · {totalPending <= 0 ? "Nil pending" : `Pending ${inr(totalPending)}/-`}
          </span>
        </div>
      )}

      <p className="mt-6 font-semibold">Thank you!</p>
    </div>
  );
}

export function StatementModal({
  projectId,
  customerId,
  onClose,
}: {
  projectId?: string | null;
  customerId?: string | null;
  onClose: () => void;
}) {
  const { db } = useStore();
  const open = !!projectId || !!customerId;
  useDialogBehaviour(open, onClose);
  if (!open) return null;

  const project = projectId ? db.projects.find((p) => p.id === projectId) : undefined;
  const customer = db.customers.find((c) => c.id === (customerId ?? project?.customerId));
  const fileName = `Statement - ${customer?.name ?? "Customer"}`;

  return (
    <Portal>
      <div className="receipt-print-frame fixed inset-0 z-[80] flex items-center justify-center p-4">
        <div className="no-print absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        <div className="receipt-print-card relative z-10 flex max-h-full w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
          <div className="no-print flex items-center justify-between gap-3 border-b border-neutral-200 bg-white px-5 py-3.5">
            <h2 className="font-display text-[15px] font-semibold text-neutral-900">Statement preview</h2>
            <div className="flex items-center gap-2">
              <button className="btn btn-primary btn-sm" onClick={() => printWithFilename(fileName)}>
                <Printer size={14} /> Print / Save as PDF
              </button>
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
                aria-label="Close"
              >
                <X size={17} />
              </button>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <StatementBody projectId={projectId ?? undefined} customerId={customerId ?? undefined} />
          </div>
        </div>
      </div>
    </Portal>
  );
}

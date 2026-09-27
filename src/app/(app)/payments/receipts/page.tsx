"use client";

import { useMemo, useState } from "react";
import { FileText, Trash2, Wallet } from "lucide-react";
import { useStore } from "@/lib/store";
import { fmtDate, inr, inrShort } from "@/lib/format";
import { totals } from "@/lib/selectors";
import { type Payment } from "@/lib/types";
import { downloadExcel } from "@/lib/exporter";
import { Column, DataTable } from "@/components/ui/DataTable";
import { FilterBar, matches } from "@/components/ui/Filters";
import { Card, PageHeader, Stat } from "@/components/ui/primitives";
import { ConfirmDialog } from "@/components/ui/Modal";
import { ReceiptModal, type ReceiptData } from "@/components/Receipt";
import { ActionsMenu } from "@/components/ui/ActionsMenu";
import { useToast } from "@/components/ui/Toast";

export default function PaymentsReceiptsPage() {
  const { db, update } = useStore();
  const toast = useToast();
  const t = totals(db);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);

  const [search, setSearch] = useState("");
  const [project, setProject] = useState("");
  const [deleting, setDeleting] = useState<Payment | null>(null);

  const projectOptions = db.projects.map((p) => ({ value: p.id, label: p.name }));

  const receipts = useMemo(
    () =>
      db.payments
        .filter((p) => {
          const proj = db.projects.find((x) => x.id === p.projectId);
          return (
            (!project || p.projectId === project) &&
            matches(search, p.receiptNo, p.ref, proj?.name, p.mode)
          );
        })
        .sort((a, b) => b.date.localeCompare(a.date)),
    [db.payments, db.projects, project, search],
  );

  /* Deleting a receipt has to give the money back to its instalment. */
  const deletePayment = (payment: Payment) => {
    update((draft) => {
      const milestone = draft.milestones.find((m) => m.id === payment.milestoneId);
      if (milestone) {
        milestone.paidAmount = Math.max(0, milestone.paidAmount - payment.amount);
        milestone.status = milestone.paidAmount >= milestone.amount ? "paid" : milestone.paidAmount > 0 ? "partial" : "pending";
      }
      draft.payments = draft.payments.filter((p) => p.id !== payment.id);
    });
    toast.success("Receipt deleted", `${payment.receiptNo} was reversed.`);
  };

  const exportReceipts = () =>
    downloadExcel(
      [
        {
          name: "Receipts",
          rows: receipts.map((p) => ({
            Receipt: p.receiptNo,
            Date: p.date,
            Project: db.projects.find((x) => x.id === p.projectId)?.name ?? "",
            Instalment: db.milestones.find((m) => m.id === p.milestoneId)?.title ?? "",
            Amount: p.amount,
            Mode: p.mode.toUpperCase(),
            Reference: p.ref ?? "",
            Note: p.note ?? "",
          })),
        },
      ],
      "malwa-receipts",
    );

  const receiptColumns: Column<Payment>[] = [
    {
      key: "receipt",
      header: "Receipt",
      sortValue: (p) => p.receiptNo,
      render: (p) => (
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink">{p.receiptNo}</p>
          <p className="truncate text-[11.5px] text-muted">
            {db.projects.find((x) => x.id === p.projectId)?.name ?? "—"}
          </p>
        </div>
      ),
    },
    {
      key: "instalment",
      header: "Against",
      hideBelow: "md",
      sortValue: (p) => db.milestones.find((m) => m.id === p.milestoneId)?.title ?? "",
      render: (p) => (
        <span className="text-[12.5px]">{db.milestones.find((m) => m.id === p.milestoneId)?.title ?? "—"}</span>
      ),
    },
    { key: "date", header: "Date", hideBelow: "sm", sortValue: (p) => p.date, render: (p) => fmtDate(p.date) },
    {
      key: "mode",
      header: "Mode",
      hideBelow: "lg",
      sortValue: (p) => p.mode,
      render: (p) => (
        <div>
          <span className="text-[12.5px] uppercase">{p.mode}</span>
          {p.ref && <p className="text-[11px] text-muted">{p.ref}</p>}
        </div>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      sortValue: (p) => p.amount,
      render: (p) => <span className="tabular font-bold text-emerald-600">{inr(p.amount)}</span>,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (p) => {
        const project = db.projects.find((x) => x.id === p.projectId);
        const milestone = db.milestones.find((m) => m.id === p.milestoneId);
        return (
          <ActionsMenu
            items={[
              {
                label: "Download receipt",
                icon: <FileText size={13} />,
                onClick: () =>
                  setReceipt({
                    kind: "customer",
                    status: "paid",
                    receiptNo: p.receiptNo,
                    date: p.date,
                    amount: p.amount,
                    mode: p.mode,
                    ref: p.ref,
                    note: p.note,
                    partyLabel: "Received from",
                    partyName: project ? (db.customers.find((c) => c.id === project.customerId)?.name ?? "—") : "—",
                    referenceLabel: "Project / Instalment",
                    referenceValue: `${project?.name ?? "—"} — ${milestone?.title ?? "—"}`,
                  }),
              },
              {
                label: "Delete payment",
                icon: <Trash2 size={13} />,
                onClick: () => setDeleting(p),
                danger: true,
              },
            ]}
          />
        );
      },
    },
  ];

  return (
    <>
      <PageHeader title="Receipts" subtitle="Every payment collected against a project instalment" />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Overdue" value={inrShort(t.overdue)} sub={`${t.overdueCount} instalments`} tone="red" />
        <Stat label="Due soon" value={inrShort(t.dueSoon)} sub={`${t.dueSoonCount} instalments`} tone="amber" />
        <Stat label="Upcoming" value={inrShort(t.upcoming)} sub={`${t.upcomingCount} instalments`} tone="blue" />
        <Stat label="Collected" value={inrShort(t.collected)} sub={`${inrShort(t.collectedThisMonth)} this month`} tone="green" />
      </div>

      <Card className="mt-4" padded={false}>
        <FilterBar
          search={search}
          onSearch={setSearch}
          placeholder="Search receipt, reference or project…"
          onExport={exportReceipts}
          filters={[{ allLabel: "All projects", value: project, onChange: setProject, options: projectOptions }]}
        />

        <DataTable
          rows={receipts}
          columns={receiptColumns}
          rowKey={(p) => p.id}
          pageSize={12}
          emptyIcon={<Wallet size={30} />}
          emptyTitle="No receipts yet"
          emptyHint="Record a payment from the Outstanding dues page."
        />
      </Card>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && deletePayment(deleting)}
        title="Delete this receipt?"
        message={
          <>
            {deleting && inr(deleting.amount)} will be added back to the outstanding balance of its instalment.
          </>
        }
      />

      <ReceiptModal data={receipt} onClose={() => setReceipt(null)} />
    </>
  );
}

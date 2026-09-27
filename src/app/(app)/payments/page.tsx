"use client";

import { useMemo, useState } from "react";
import { Banknote, FileText, MessageCircle, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { dueRows, totals, type DueRow } from "@/lib/selectors";
import { fmtDate, inr, inrShort, relativeDue, toISODate, uid, waLink } from "@/lib/format";
import { PAYMENT_MODES, type PaymentMode } from "@/lib/types";
import { downloadExcel } from "@/lib/exporter";
import { Column, DataTable } from "@/components/ui/DataTable";
import { FilterBar, matches } from "@/components/ui/Filters";
import { Badge, Card, PageHeader, Stat, StatusBadge } from "@/components/ui/primitives";
import { ConfirmDialog, Modal } from "@/components/ui/Modal";
import { FormGrid, NumberField, SelectField, TextAreaField, TextField } from "@/components/ui/Form";
import { ReceiptModal, type ReceiptData } from "@/components/Receipt";
import { ActionsMenu } from "@/components/ui/ActionsMenu";
import { useToast } from "@/components/ui/Toast";

export default function PaymentsPage() {
  const { db, update } = useStore();
  const toast = useToast();
  const t = totals(db);

  const [search, setSearch] = useState("");
  const [bucket, setBucket] = useState("");
  const [project, setProject] = useState("");
  const [collecting, setCollecting] = useState<DueRow | null>(null);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [deleting, setDeleting] = useState<DueRow | null>(null);

  const projectOptions = db.projects.map((p) => ({ value: p.id, label: p.name }));

  const dues = useMemo(
    () =>
      dueRows(db, db.settings.reminderWindowDays).filter(
        (r) =>
          (!bucket || r.bucket === bucket) &&
          (!project || r.projectId === project) &&
          matches(search, r.customerName, r.projectName, r.milestone.title),
      ),
    [db, bucket, project, search],
  );

  /* Record a receipt and move the instalment's paid amount along with it. */
  const recordPayment = (row: DueRow, amount: number, mode: PaymentMode, date: string, ref: string, note: string) => {
    update((draft) => {
      const milestone = draft.milestones.find((m) => m.id === row.milestone.id);
      if (!milestone) return;
      milestone.paidAmount = Math.min(milestone.amount, milestone.paidAmount + amount);
      milestone.status = milestone.paidAmount >= milestone.amount ? "paid" : milestone.paidAmount > 0 ? "partial" : "pending";
      draft.payments.unshift({
        id: uid("pay"),
        receiptNo: `MB/RCP/${1000 + draft.payments.length + 1}`,
        projectId: row.projectId,
        milestoneId: milestone.id,
        amount,
        date,
        mode,
        ref: ref || undefined,
        note: note || undefined,
      });
    });
    toast.success("Payment recorded", `${inr(amount)} received from ${row.customerName}.`);
    setCollecting(null);
  };

  /* Permanently removes this due (and any receipts already recorded against
     it) — not a reversal, the instalment itself is gone for good. */
  const deleteMilestone = (row: DueRow) => {
    update((draft) => {
      draft.milestones = draft.milestones.filter((m) => m.id !== row.milestone.id);
      draft.payments = draft.payments.filter((p) => p.milestoneId !== row.milestone.id);
    });
    toast.success("Instalment deleted", `${row.milestone.title} was permanently removed.`);
    setDeleting(null);
  };

  const exportDues = () =>
    downloadExcel(
      [
        {
          name: "Outstanding Dues",
          rows: dues.map((r) => ({
            Customer: r.customerName,
            Phone: r.customerPhone,
            Project: r.projectName,
            Instalment: r.milestone.title,
            "Due Date": r.milestone.dueDate,
            Amount: r.milestone.amount,
            Received: r.milestone.paidAmount,
            Balance: r.balance,
            Bucket: r.bucket === "overdue" ? "Overdue" : r.bucket === "due_soon" ? "Due soon" : "Upcoming",
            "Days Late": r.days < 0 ? Math.abs(r.days) : 0,
          })),
        },
      ],
      "malwa-dues",
    );

  const dueColumns: Column<DueRow>[] = [
    {
      key: "customer",
      header: "Customer & instalment",
      sortValue: (r) => r.customerName,
      render: (r) => (
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink">{r.customerName}</p>
          <p className="truncate text-[11.5px] text-muted">
            {r.milestone.title} · {r.projectName}
          </p>
        </div>
      ),
    },
    {
      key: "due",
      header: "Due date",
      hideBelow: "sm",
      sortValue: (r) => r.milestone.dueDate,
      render: (r) => (
        <div>
          <p className="text-[12.5px]">{fmtDate(r.milestone.dueDate)}</p>
          <p
            className={`text-[11px] font-semibold ${
              r.days < 0 ? "text-rose-600" : r.bucket === "due_soon" ? "text-amber-600" : "text-muted"
            }`}
          >
            {relativeDue(r.milestone.dueDate)}
          </p>
        </div>
      ),
    },
    {
      key: "amount",
      header: "Instalment",
      align: "right",
      hideBelow: "md",
      sortValue: (r) => r.milestone.amount,
      render: (r) => <span className="tabular">{inrShort(r.milestone.amount)}</span>,
    },
    {
      key: "balance",
      header: "Balance",
      align: "right",
      sortValue: (r) => r.balance,
      render: (r) => <span className="tabular font-bold text-ink">{inr(r.balance)}</span>,
    },
    {
      key: "status",
      header: "Status",
      hideBelow: "lg",
      sortValue: (r) => r.bucket,
      render: (r) =>
        r.bucket === "overdue" ? (
          <Badge tone="red" dot>Overdue</Badge>
        ) : r.bucket === "due_soon" ? (
          <Badge tone="amber" dot>Due soon</Badge>
        ) : (
          <Badge tone="blue" dot>Upcoming</Badge>
        ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (r) => (
        <ActionsMenu
          items={[
            {
              label: "Send reminder",
              icon: <MessageCircle size={13} />,
              href: waLink(
                r.customerPhone,
                `Sat Sri Akal ${r.customerName.split(" ")[0]} ji,\n\nGentle reminder from Malwa Builders — ${inr(r.balance)} for "${r.milestone.title}" at ${r.projectName} is due on ${fmtDate(r.milestone.dueDate)}.\n\nKindly arrange the payment.\n\n— Malwa Builders, Jagraon`,
              ),
            },
            {
              label: "Download receipt",
              icon: <FileText size={13} />,
              onClick: () =>
                setReceipt({
                  kind: "customer",
                  status: "proforma",
                  receiptNo: "PROFORMA",
                  date: r.milestone.dueDate,
                  amount: r.balance,
                  partyLabel: "Received from",
                  partyName: r.customerName,
                  partyPhone: r.customerPhone,
                  referenceLabel: "Project / Instalment",
                  referenceValue: `${r.projectName} — ${r.milestone.title}`,
                }),
            },
            {
              label: "Record payment",
              icon: <Banknote size={13} />,
              onClick: () => setCollecting(r),
            },
            {
              label: "Delete",
              icon: <Trash2 size={13} />,
              onClick: () => setDeleting(r),
              danger: true,
            },
          ]}
        />
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Outstanding dues" subtitle="Track what is due, what is late and what is coming up" />

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
          placeholder="Search customer, project or instalment…"
          onExport={exportDues}
          filters={[
            {
              allLabel: "All buckets",
              value: bucket,
              onChange: setBucket,
              options: [
                { value: "overdue", label: "Overdue" },
                { value: "due_soon", label: "Due soon" },
                { value: "upcoming", label: "Upcoming" },
              ],
            },
            { allLabel: "All projects", value: project, onChange: setProject, options: projectOptions },
          ]}
        />

        <DataTable
          rows={dues}
          columns={dueColumns}
          rowKey={(r) => r.milestone.id}
          pageSize={12}
          initialSort={{ key: "due", dir: "asc" }}
          emptyIcon={<Banknote size={30} />}
          emptyTitle="Nothing outstanding here"
          emptyHint="Every instalment matching these filters is fully paid."
        />
      </Card>

      {collecting && (
        <RecordPaymentModal row={collecting} onClose={() => setCollecting(null)} onSave={recordPayment} />
      )}

      <ReceiptModal data={receipt} onClose={() => setReceipt(null)} />

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && deleteMilestone(deleting)}
        title="Permanently delete this instalment?"
        message={
          <>
            <strong>{deleting?.milestone.title}</strong> for {deleting?.customerName} will be removed for good,
            along with any receipts already recorded against it. This cannot be undone.
          </>
        }
        confirmLabel="Delete permanently"
      />
    </>
  );
}

function RecordPaymentModal({
  row,
  onClose,
  onSave,
}: {
  row: DueRow;
  onClose: () => void;
  onSave: (row: DueRow, amount: number, mode: PaymentMode, date: string, ref: string, note: string) => void;
}) {
  const [amount, setAmount] = useState(row.balance);
  const [mode, setMode] = useState<PaymentMode>("bank");
  const [date, setDate] = useState(toISODate(new Date()));
  const [ref, setRef] = useState("");
  const [note, setNote] = useState("");

  const valid = amount > 0 && amount <= row.balance;

  return (
    <Modal
      open
      onClose={onClose}
      title="Record payment"
      subtitle={`${row.customerName} · ${row.milestone.title}`}
      size="md"
      footer={
        <>
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={!valid} onClick={() => onSave(row, amount, mode, date, ref, note)}>
            Save receipt
          </button>
        </>
      }
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-surface-2 px-3 py-2.5">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted">Instalment</p>
          <p className="tabular text-[15px] font-semibold text-ink">{inr(row.milestone.amount)}</p>
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted">Already received</p>
          <p className="tabular text-[15px] font-semibold text-emerald-600">{inr(row.milestone.paidAmount)}</p>
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted">Balance</p>
          <p className="tabular text-[15px] font-semibold text-rose-600">{inr(row.balance)}</p>
        </div>
        <StatusBadge status={row.milestone.status} />
      </div>

      <FormGrid>
        <NumberField
          label="Amount received"
          value={amount}
          onChange={setAmount}
          prefix="₹"
          max={row.balance}
          hint={amount > row.balance ? "More than the outstanding balance" : `Up to ${inr(row.balance)}`}
        />
        <SelectField
          label="Mode"
          value={mode}
          onChange={(v) => setMode(v as PaymentMode)}
          options={PAYMENT_MODES.map((m) => ({ value: m, label: m.toUpperCase() }))}
        />
        <TextField label="Date" type="date" value={date} onChange={setDate} />
        <TextField label="Reference" value={ref} onChange={setRef} placeholder="Cheque / UPI / NEFT number" />
        <TextAreaField label="Note" value={note} onChange={setNote} rows={2} />
      </FormGrid>
    </Modal>
  );
}

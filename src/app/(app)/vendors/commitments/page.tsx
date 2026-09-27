"use client";

import { useMemo, useState } from "react";
import { HandCoins, Pencil, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { fmtDate, inr, inrShort, relativeDue, toISODate, uid } from "@/lib/format";
import type { Commitment, CommitmentStatus } from "@/lib/types";
import { downloadExcel } from "@/lib/exporter";
import { recordVendorPayment } from "@/lib/vendorPayments";
import { Column, DataTable } from "@/components/ui/DataTable";
import { FilterBar, matches } from "@/components/ui/Filters";
import { Card, PageHeader, Progress, Stat, StatusBadge } from "@/components/ui/primitives";
import { ConfirmDialog, Modal } from "@/components/ui/Modal";
import { FormGrid, NumberField, SelectField, TextAreaField, TextField } from "@/components/ui/Form";
import { VendorPaymentModal } from "@/components/VendorPaymentModal";
import { useToast } from "@/components/ui/Toast";

const COMMITMENT_STATUSES: { key: CommitmentStatus; label: string }[] = [
  { key: "ordered", label: "Ordered" },
  { key: "delivered", label: "Delivered" },
  { key: "cancelled", label: "Cancelled" },
];

function blankCommitment(): Commitment {
  return {
    id: uid("cm"),
    refNo: `MB/PO/${Math.floor(Math.random() * 9000) + 1000}`,
    vendorId: "",
    projectId: "",
    item: "",
    amount: 0,
    paidAmount: 0,
    date: toISODate(new Date()),
    dueDate: toISODate(new Date()),
    status: "ordered",
  };
}

export default function VendorsCommitmentsPage() {
  const { db, save, remove, update } = useStore();
  const toast = useToast();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [vendorFilter, setVendorFilter] = useState("");

  const [editCommitment, setEditCommitment] = useState<Commitment | null>(null);
  const [delCommitment, setDelCommitment] = useState<Commitment | null>(null);
  const [paying, setPaying] = useState<Commitment | null>(null);

  const commitments = useMemo(
    () =>
      db.commitments
        .filter((c) => {
          const v = db.vendors.find((x) => x.id === c.vendorId);
          const p = db.projects.find((x) => x.id === c.projectId);
          return (
            (!status || c.status === status) &&
            (!vendorFilter || c.vendorId === vendorFilter) &&
            matches(search, c.refNo, c.item, v?.name, p?.name)
          );
        })
        .sort((a, b) => b.date.localeCompare(a.date)),
    [db.commitments, db.vendors, db.projects, search, status, vendorFilter],
  );

  const totalCommitted = db.commitments
    .filter((c) => c.status !== "cancelled")
    .reduce((n, c) => n + c.amount, 0);
  const totalPending = db.commitments
    .filter((c) => c.status !== "cancelled")
    .reduce((n, c) => n + (c.amount - c.paidAmount), 0);

  const exportCommitments = () =>
    downloadExcel(
      [
        {
          name: "Vendor Commitments",
          rows: commitments.map((c) => ({
            Ref: c.refNo,
            Vendor: db.vendors.find((v) => v.id === c.vendorId)?.name ?? "",
            Project: db.projects.find((p) => p.id === c.projectId)?.name ?? "",
            Item: c.item,
            Amount: c.amount,
            Paid: c.paidAmount,
            Pending: c.amount - c.paidAmount,
            Date: c.date,
            "Payment Due": c.dueDate,
            Status: c.status,
            Note: c.note ?? "",
          })),
        },
      ],
      "malwa-commitments",
    );

  const commitmentColumns: Column<Commitment>[] = [
    {
      key: "item",
      header: "Commitment",
      sortValue: (c) => c.item,
      render: (c) => (
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink">{c.item}</p>
          <p className="truncate text-[11.5px] text-muted">
            {c.refNo} · {db.vendors.find((v) => v.id === c.vendorId)?.name ?? "—"}
          </p>
        </div>
      ),
    },
    {
      key: "project",
      header: "Project",
      hideBelow: "lg",
      sortValue: (c) => db.projects.find((p) => p.id === c.projectId)?.name ?? "",
      render: (c) => (
        <span className="line-clamp-1 text-[12.5px]">
          {db.projects.find((p) => p.id === c.projectId)?.name ?? "—"}
        </span>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      sortValue: (c) => c.amount,
      render: (c) => <span className="tabular">{inrShort(c.amount)}</span>,
    },
    {
      key: "paid",
      header: "Paid",
      hideBelow: "md",
      className: "w-36",
      sortValue: (c) => (c.amount ? c.paidAmount / c.amount : 0),
      render: (c) => (
        <div>
          <Progress value={c.amount ? (c.paidAmount / c.amount) * 100 : 0} tone="green" />
          <p className="tabular mt-1 text-[11px] text-muted">{inrShort(c.paidAmount)}</p>
        </div>
      ),
    },
    {
      key: "pending",
      header: "Pending",
      align: "right",
      sortValue: (c) => c.amount - c.paidAmount,
      render: (c) => {
        const p = c.amount - c.paidAmount;
        return <span className={`tabular font-semibold ${p > 0 ? "text-rose-600" : "text-emerald-600"}`}>{inrShort(p)}</span>;
      },
    },
    {
      key: "due",
      header: "Payment due",
      hideBelow: "xl",
      sortValue: (c) => c.dueDate,
      render: (c) => (
        <div>
          <p className="text-[12.5px]">{fmtDate(c.dueDate)}</p>
          <p className="text-[11px] text-muted">{relativeDue(c.dueDate)}</p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortValue: (c) => c.status,
      render: (c) => <StatusBadge status={c.status} />,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (c) => (
        <div className="flex justify-end gap-1">
          {c.status !== "cancelled" && c.paidAmount < c.amount && (
            <button className="btn btn-primary btn-xs" onClick={() => setPaying(c)}>
              Record
            </button>
          )}
          <button className="btn btn-ghost btn-xs" onClick={() => setEditCommitment(c)} title="Edit">
            <Pencil size={13} />
          </button>
          <button className="btn btn-ghost btn-xs text-rose-600" onClick={() => setDelCommitment(c)} title="Delete">
            <Trash2 size={13} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Commitments" subtitle="What we have promised vendors, and what is still pending">
        <button className="btn btn-primary btn-sm" onClick={() => setEditCommitment(blankCommitment())}>
          New commitment
        </button>
      </PageHeader>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat
          label="Vendors"
          value={db.vendors.length}
          sub={`${db.vendors.filter((v) => v.kind === "supplier").length} suppliers · ${db.vendors.filter((v) => v.kind === "contractor").length} contractors`}
          tone="gold"
        />
        <Stat label="Total committed" value={inrShort(totalCommitted)} sub={`${db.commitments.length} orders placed`} tone="blue" />
        <Stat
          label="Still to pay"
          value={inrShort(totalPending)}
          sub="Across all live commitments"
          icon={<HandCoins size={16} />}
          tone={totalPending > 0 ? "red" : "green"}
        />
      </div>

      <Card className="mt-4" padded={false}>
        <FilterBar
          search={search}
          onSearch={setSearch}
          placeholder="Search reference, item, vendor or project…"
          onExport={exportCommitments}
          filters={[
            {
              allLabel: "All statuses",
              value: status,
              onChange: setStatus,
              options: COMMITMENT_STATUSES.map((s) => ({ value: s.key, label: s.label })),
            },
            {
              allLabel: "All vendors",
              value: vendorFilter,
              onChange: setVendorFilter,
              options: db.vendors.map((v) => ({ value: v.id, label: v.name })),
            },
          ]}
        />
        <DataTable
          rows={commitments}
          columns={commitmentColumns}
          rowKey={(c) => c.id}
          pageSize={12}
          emptyIcon={<HandCoins size={30} />}
          emptyTitle="No commitments match these filters"
          emptyHint="Add a commitment to track what you have promised a vendor."
        />
      </Card>

      {editCommitment && (
        <CommitmentModal
          commitment={editCommitment}
          vendors={db.vendors.map((v) => ({ value: v.id, label: v.name }))}
          projects={db.projects.map((p) => ({ value: p.id, label: p.name }))}
          onClose={() => setEditCommitment(null)}
          onSave={(c) => {
            save("commitments", c);
            toast.success(db.commitments.some((x) => x.id === c.id) ? "Commitment updated" : "Commitment added", c.refNo);
            setEditCommitment(null);
          }}
        />
      )}

      {paying && (
        <VendorPaymentModal
          commitment={paying}
          vendorName={db.vendors.find((v) => v.id === paying.vendorId)?.name ?? ""}
          onClose={() => setPaying(null)}
          onSave={(amount, mode, date, ref, note) => {
            recordVendorPayment(update, paying, amount, mode, date, ref, note);
            toast.success("Payment recorded", `${inr(amount)} paid to ${db.vendors.find((v) => v.id === paying.vendorId)?.name ?? "vendor"}.`);
            setPaying(null);
          }}
        />
      )}

      <ConfirmDialog
        open={!!delCommitment}
        onClose={() => setDelCommitment(null)}
        onConfirm={() => {
          if (!delCommitment) return;
          remove("commitments", delCommitment.id);
          toast.success("Commitment deleted", delCommitment.refNo);
        }}
        title="Delete this commitment?"
        message={<><strong>{delCommitment?.refNo}</strong> will be removed from the vendor ledger.</>}
      />
    </>
  );
}

function CommitmentModal({
  commitment,
  vendors,
  projects,
  onClose,
  onSave,
}: {
  commitment: Commitment;
  vendors: { value: string; label: string }[];
  projects: { value: string; label: string }[];
  onClose: () => void;
  onSave: (c: Commitment) => void;
}) {
  const [form, setForm] = useState<Commitment>(commitment);
  const set = <K extends keyof Commitment>(key: K, value: Commitment[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const valid = form.item.trim() && form.vendorId && form.amount > 0 && form.paidAmount <= form.amount;

  return (
    <Modal
      open
      onClose={onClose}
      title={commitment.item ? "Edit commitment" : "New commitment"}
      subtitle={`Pending after this entry: ${inr(Math.max(0, form.amount - form.paidAmount))}`}
      footer={
        <>
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={!valid} onClick={() => onSave(form)}>
            Save commitment
          </button>
        </>
      }
    >
      <FormGrid>
        <TextField label="Reference no." value={form.refNo} onChange={(v) => set("refNo", v)} />
        <SelectField
          label="Status"
          value={form.status}
          onChange={(v) => set("status", v as CommitmentStatus)}
          options={COMMITMENT_STATUSES.map((s) => ({ value: s.key, label: s.label }))}
        />
        <SelectField label="Vendor" value={form.vendorId} onChange={(v) => set("vendorId", v)} options={vendors} placeholder="Select a vendor" />
        <SelectField label="Project" value={form.projectId} onChange={(v) => set("projectId", v)} options={projects} placeholder="Select a project" />
        <TextField label="Item / work" value={form.item} onChange={(v) => set("item", v)} full placeholder="320 bag — Cement OPC 43" />
        <NumberField label="Order value" value={form.amount} onChange={(v) => set("amount", v)} prefix="₹" />
        <NumberField label="Already paid" value={form.paidAmount} onChange={(v) => set("paidAmount", v)} prefix="₹" max={form.amount} />
        <TextField label="Order date" type="date" value={form.date} onChange={(v) => set("date", v)} />
        <TextField label="Payment due" type="date" value={form.dueDate} onChange={(v) => set("dueDate", v)} />
        <TextAreaField label="Note" value={form.note ?? ""} onChange={(v) => set("note", v)} rows={2} />
      </FormGrid>
    </Modal>
  );
}

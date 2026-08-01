"use client";

import { useMemo, useState } from "react";
import { HandCoins, MessageCircle, Pencil, Phone, Plus, Trash2, Truck } from "lucide-react";
import { useStore } from "@/lib/store";
import { vendorBalance } from "@/lib/selectors";
import { fmtDate, inr, inrShort, maskPhone, relativeDue, telLink, toISODate, uid, waLink } from "@/lib/format";
import type { Commitment, CommitmentStatus, Vendor } from "@/lib/types";
import { downloadExcel } from "@/lib/exporter";
import { Column, DataTable } from "@/components/ui/DataTable";
import { FilterBar, matches } from "@/components/ui/Filters";
import { Badge, Card, PageHeader, Progress, Stat, StatusBadge, Tabs } from "@/components/ui/primitives";
import { ConfirmDialog, Modal } from "@/components/ui/Modal";
import { FormGrid, NumberField, SelectField, TextAreaField, TextField } from "@/components/ui/Form";
import { useToast } from "@/components/ui/Toast";

type Tab = "vendors" | "commitments";

const COMMITMENT_STATUSES: { key: CommitmentStatus; label: string }[] = [
  { key: "ordered", label: "Ordered" },
  { key: "delivered", label: "Delivered" },
  { key: "cancelled", label: "Cancelled" },
];

function blankVendor(): Vendor {
  return {
    id: uid("v"),
    name: "",
    contactPerson: "",
    phone: "",
    city: "Jagraon",
    kind: "supplier",
    supplies: "",
    paymentTerms: "",
  };
}

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

export default function VendorsPage() {
  const { db, save, remove, update } = useStore();
  const toast = useToast();

  const [tab, setTab] = useState<Tab>("vendors");
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState("");
  const [city, setCity] = useState("");
  const [status, setStatus] = useState("");
  const [vendorFilter, setVendorFilter] = useState("");

  const [editVendor, setEditVendor] = useState<Vendor | null>(null);
  const [delVendor, setDelVendor] = useState<Vendor | null>(null);
  const [editCommitment, setEditCommitment] = useState<Commitment | null>(null);
  const [delCommitment, setDelCommitment] = useState<Commitment | null>(null);

  const cities = useMemo(() => Array.from(new Set(db.vendors.map((v) => v.city))).sort(), [db.vendors]);

  const vendors = useMemo(
    () =>
      db.vendors.filter(
        (v) =>
          (!kind || v.kind === kind) &&
          (!city || v.city === city) &&
          matches(search, v.name, v.contactPerson, v.phone, v.supplies, v.city),
      ),
    [db.vendors, search, kind, city],
  );

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

  const exportVendors = () =>
    downloadExcel(
      [
        {
          name: "Vendors",
          rows: vendors.map((v) => {
            const b = vendorBalance(db, v.id);
            return {
              Vendor: v.name,
              Contact: v.contactPerson,
              Phone: v.phone,
              Type: v.kind === "supplier" ? "Supplier" : "Contractor",
              City: v.city,
              Supplies: v.supplies,
              GSTIN: v.gstin ?? "",
              "Payment Terms": v.paymentTerms,
              Committed: b.committed,
              Paid: b.paid,
              Pending: b.pending,
            };
          }),
        },
      ],
      "malwa-vendors",
    );

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

  const deleteVendor = (vendor: Vendor) => {
    const linked = db.commitments.filter((c) => c.vendorId === vendor.id).length;
    if (linked > 0) {
      toast.error("Cannot delete this vendor", `${vendor.name} still has ${linked} commitment${linked > 1 ? "s" : ""} on record.`);
      return;
    }
    update((draft) => {
      draft.vendors = draft.vendors.filter((v) => v.id !== vendor.id);
      draft.materials.forEach((m) => {
        if (m.vendorId === vendor.id) m.vendorId = "";
      });
    });
    toast.success("Vendor deleted", vendor.name);
  };

  const vendorColumns: Column<Vendor>[] = [
    {
      key: "name",
      header: "Vendor",
      sortValue: (v) => v.name,
      render: (v) => (
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink">{v.name}</p>
          <p className="truncate text-[11.5px] text-muted">
            {v.contactPerson} · {maskPhone(v.phone)}
          </p>
        </div>
      ),
    },
    {
      key: "kind",
      header: "Type",
      sortValue: (v) => v.kind,
      hideBelow: "sm",
      render: (v) => (
        <Badge tone={v.kind === "supplier" ? "blue" : "violet"}>
          {v.kind === "supplier" ? "Supplier" : "Contractor"}
        </Badge>
      ),
    },
    {
      key: "supplies",
      header: "Supplies",
      hideBelow: "xl",
      render: (v) => <span className="line-clamp-1 text-[12.5px] text-muted">{v.supplies}</span>,
    },
    { key: "city", header: "City", sortValue: (v) => v.city, hideBelow: "lg", render: (v) => v.city },
    {
      key: "committed",
      header: "Committed",
      align: "right",
      hideBelow: "md",
      sortValue: (v) => vendorBalance(db, v.id).committed,
      render: (v) => <span className="tabular">{inrShort(vendorBalance(db, v.id).committed)}</span>,
    },
    {
      key: "pending",
      header: "We owe",
      align: "right",
      sortValue: (v) => vendorBalance(db, v.id).pending,
      render: (v) => {
        const p = vendorBalance(db, v.id).pending;
        return <span className={`tabular font-semibold ${p > 0 ? "text-rose-600" : "text-emerald-600"}`}>{inrShort(p)}</span>;
      },
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (v) => (
        <div className="flex justify-end gap-1">
          <a className="btn btn-ghost btn-xs" href={telLink(v.phone)} title="Call">
            <Phone size={13} />
          </a>
          <a
            className="btn btn-ghost btn-xs text-emerald-600"
            href={waLink(v.phone, `Sat Sri Akal ${v.contactPerson.split(" ")[0]} ji,`)}
            target="_blank"
            rel="noreferrer"
            title="WhatsApp"
          >
            <MessageCircle size={13} />
          </a>
          <button className="btn btn-ghost btn-xs" onClick={() => setEditVendor(v)} title="Edit">
            <Pencil size={13} />
          </button>
          <button className="btn btn-ghost btn-xs text-rose-600" onClick={() => setDelVendor(v)} title="Delete">
            <Trash2 size={13} />
          </button>
        </div>
      ),
    },
  ];

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
      <PageHeader title="Vendors" subtitle="Suppliers, contractors and everything we have committed to them">
        <button
          className="btn btn-primary btn-sm"
          onClick={() => (tab === "vendors" ? setEditVendor(blankVendor()) : setEditCommitment(blankCommitment()))}
        >
          <Plus size={14} /> {tab === "vendors" ? "New vendor" : "New commitment"}
        </button>
      </PageHeader>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat
          label="Vendors"
          value={db.vendors.length}
          sub={`${db.vendors.filter((v) => v.kind === "supplier").length} suppliers · ${db.vendors.filter((v) => v.kind === "contractor").length} contractors`}
          icon={<Truck size={16} />}
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
        <Tabs
          className="px-2"
          active={tab}
          onChange={(k) => {
            setTab(k);
            setSearch("");
          }}
          tabs={[
            { key: "vendors" as const, label: "Vendors", count: db.vendors.length },
            { key: "commitments" as const, label: "Commitments", count: db.commitments.length },
          ]}
        />

        {tab === "vendors" ? (
          <>
            <FilterBar
              search={search}
              onSearch={setSearch}
              placeholder="Search vendor, contact or what they supply…"
              onExport={exportVendors}
              filters={[
                {
                  allLabel: "All types",
                  value: kind,
                  onChange: setKind,
                  options: [
                    { value: "supplier", label: "Suppliers" },
                    { value: "contractor", label: "Contractors" },
                  ],
                },
                { allLabel: "All cities", value: city, onChange: setCity, options: cities.map((c) => ({ value: c, label: c })) },
              ]}
            />
            <DataTable
              rows={vendors}
              columns={vendorColumns}
              rowKey={(v) => v.id}
              pageSize={12}
              emptyIcon={<Truck size={30} />}
              emptyTitle="No vendors match these filters"
              emptyHint="Try clearing the search, or add a new vendor."
            />
          </>
        ) : (
          <>
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
          </>
        )}
      </Card>

      {editVendor && (
        <VendorModal
          vendor={editVendor}
          onClose={() => setEditVendor(null)}
          onSave={(v) => {
            save("vendors", v);
            toast.success(db.vendors.some((x) => x.id === v.id) ? "Vendor updated" : "Vendor added", v.name);
            setEditVendor(null);
          }}
        />
      )}

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

      <ConfirmDialog
        open={!!delVendor}
        onClose={() => setDelVendor(null)}
        onConfirm={() => delVendor && deleteVendor(delVendor)}
        title="Delete this vendor?"
        message={<><strong>{delVendor?.name}</strong> will be removed from the vendor list.</>}
      />

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

function VendorModal({
  vendor,
  onClose,
  onSave,
}: {
  vendor: Vendor;
  onClose: () => void;
  onSave: (v: Vendor) => void;
}) {
  const [form, setForm] = useState<Vendor>(vendor);
  const set = <K extends keyof Vendor>(key: K, value: Vendor[K]) => setForm((f) => ({ ...f, [key]: value }));
  const valid = form.name.trim().length > 1 && form.phone.trim().length >= 10;

  return (
    <Modal
      open
      onClose={onClose}
      title={vendor.name ? "Edit vendor" : "New vendor"}
      footer={
        <>
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={!valid} onClick={() => onSave(form)}>
            Save vendor
          </button>
        </>
      }
    >
      <FormGrid>
        <TextField label="Vendor name" value={form.name} onChange={(v) => set("name", v)} placeholder="Gill Sand & Grit Suppliers" />
        <TextField label="Contact person" value={form.contactPerson} onChange={(v) => set("contactPerson", v)} />
        <TextField label="Phone" type="tel" value={form.phone} onChange={(v) => set("phone", v)} />
        <TextField label="City" value={form.city} onChange={(v) => set("city", v)} />
        <SelectField
          label="Type"
          value={form.kind}
          onChange={(v) => set("kind", v as Vendor["kind"])}
          options={[
            { value: "supplier", label: "Supplier" },
            { value: "contractor", label: "Contractor" },
          ]}
        />
        <TextField label="Payment terms" value={form.paymentTerms} onChange={(v) => set("paymentTerms", v)} placeholder="15 days credit" />
        <TextField label="GSTIN" value={form.gstin ?? ""} onChange={(v) => set("gstin", v)} full />
        <TextAreaField
          label="What they supply"
          value={form.supplies}
          onChange={(v) => set("supplies", v)}
          rows={2}
          placeholder="Reta, Bajri, Crush, Filling Mitti"
        />
      </FormGrid>
    </Modal>
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

"use client";

import { useEffect, useMemo, useState } from "react";
import { MessageCircle, Pencil, Phone, Plus, Receipt as ReceiptIcon, Trash2, Truck } from "lucide-react";
import { useStore } from "@/lib/store";
import { vendorBalance } from "@/lib/selectors";
import { fmtDate, inr, inrShort, maskPhone, telLink, uid, waLink } from "@/lib/format";
import type { Commitment, Vendor } from "@/lib/types";
import { downloadExcel } from "@/lib/exporter";
import { recordVendorPayment, deleteVendorPayment } from "@/lib/vendorPayments";
import { Column, DataTable } from "@/components/ui/DataTable";
import { FilterBar, matches } from "@/components/ui/Filters";
import { Badge, Card, KeyVal, PageHeader, Progress, Stat, StatusBadge } from "@/components/ui/primitives";
import { ConfirmDialog, Drawer, Modal } from "@/components/ui/Modal";
import { FormGrid, SelectField, TextAreaField, TextField } from "@/components/ui/Form";
import { VendorPaymentModal } from "@/components/VendorPaymentModal";
import { ReceiptModal, type ReceiptData } from "@/components/Receipt";
import { useToast } from "@/components/ui/Toast";

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

export default function VendorsPage() {
  const { db, save, update } = useStore();
  const toast = useToast();

  const [search, setSearch] = useState("");
  const [kind, setKind] = useState("");
  const [city, setCity] = useState("");

  const [editVendor, setEditVendor] = useState<Vendor | null>(null);
  const [delVendor, setDelVendor] = useState<Vendor | null>(null);
  const [viewing, setViewing] = useState<string | null>(null);

  /* other pages link here with ?open=<vendorId> to jump straight to a vendor */
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("open");
    if (id) setViewing(id);
  }, []);

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

  const openVendor = db.vendors.find((v) => v.id === viewing) ?? null;

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
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
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

  return (
    <>
      <PageHeader title="Vendors" subtitle="Suppliers and contractors we work with">
        <button className="btn btn-primary btn-sm" onClick={() => setEditVendor(blankVendor())}>
          <Plus size={14} /> New vendor
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
          tone={totalPending > 0 ? "red" : "green"}
        />
      </div>

      <Card className="mt-4" padded={false}>
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
          onRowClick={(v) => setViewing(v.id)}
          pageSize={12}
          emptyIcon={<Truck size={30} />}
          emptyTitle="No vendors match these filters"
          emptyHint="Try clearing the search, or add a new vendor."
        />
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

      <ConfirmDialog
        open={!!delVendor}
        onClose={() => setDelVendor(null)}
        onConfirm={() => delVendor && deleteVendor(delVendor)}
        title="Delete this vendor?"
        message={<><strong>{delVendor?.name}</strong> will be removed from the vendor list.</>}
      />

      <Drawer
        open={!!openVendor}
        onClose={() => setViewing(null)}
        title={openVendor?.name ?? ""}
        subtitle={openVendor ? `${openVendor.kind === "supplier" ? "Supplier" : "Contractor"} · ${openVendor.city}` : ""}
        footer={
          openVendor && (
            <>
              <a
                className="btn btn-wa btn-sm"
                href={waLink(openVendor.phone, `Sat Sri Akal ${openVendor.contactPerson.split(" ")[0]} ji,`)}
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircle size={13} /> WhatsApp
              </a>
              <button className="btn btn-primary btn-sm" onClick={() => { setEditVendor(openVendor); setViewing(null); }}>
                <Pencil size={13} /> Edit
              </button>
            </>
          )
        }
      >
        {openVendor && <VendorDetail vendorId={openVendor.id} />}
      </Drawer>
    </>
  );
}

function VendorDetail({ vendorId }: { vendorId: string }) {
  const { db, update } = useStore();
  const toast = useToast();
  const vendor = db.vendors.find((v) => v.id === vendorId)!;
  const bal = vendorBalance(db, vendorId);
  const materials = db.materials.filter((m) => m.vendorId === vendorId);
  const commitments = db.commitments
    .filter((c) => c.vendorId === vendorId)
    .sort((a, b) => b.date.localeCompare(a.date));
  const vendorPayments = db.vendorPayments
    .filter((p) => p.vendorId === vendorId)
    .sort((a, b) => b.date.localeCompare(a.date));

  const [paying, setPaying] = useState<Commitment | null>(null);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-x-5">
        <KeyVal k="Contact" v={vendor.contactPerson || "—"} />
        <KeyVal k="Phone" v={maskPhone(vendor.phone)} />
        <KeyVal k="City" v={vendor.city} />
        <KeyVal k="Type" v={vendor.kind === "supplier" ? "Supplier" : "Contractor"} />
        <KeyVal k="GSTIN" v={vendor.gstin || "—"} />
        <KeyVal k="Payment terms" v={vendor.paymentTerms || "—"} />
        <KeyVal k="Committed" v={inr(bal.committed)} />
        <KeyVal k="Paid" v={<span className="text-emerald-600">{inr(bal.paid)}</span>} />
        <KeyVal k="Pending" v={<span className="text-rose-600">{inr(bal.pending)}</span>} />
      </div>

      <div>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted">Materials supplied</p>
        <div className="divide-y divide-line rounded-lg border border-line">
          {materials.map((m) => (
            <div key={m.id} className="flex items-center gap-3 px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12.5px] font-semibold text-ink">{m.name}</p>
                <p className="text-[11px] text-muted">{m.category}</p>
              </div>
              <span className="tabular shrink-0 text-[12.5px] font-semibold text-ink">
                {inr(m.rate + m.delivery)}/{m.unit}
              </span>
            </div>
          ))}
          {materials.length === 0 && (
            <p className="px-3 py-6 text-center text-[12.5px] text-muted">No materials on record.</p>
          )}
        </div>
      </div>

      <div>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted">Commitments</p>
        <div className="divide-y divide-line rounded-lg border border-line">
          {commitments.map((c) => (
            <div key={c.id} className="flex items-center gap-3 px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12.5px] font-semibold text-ink">{c.item}</p>
                <p className="truncate text-[11px] text-muted">
                  {c.refNo} · {db.projects.find((p) => p.id === c.projectId)?.name ?? "—"}
                </p>
                <Progress value={c.amount ? (c.paidAmount / c.amount) * 100 : 0} tone="green" className="mt-1.5" />
              </div>
              <div className="shrink-0 text-right">
                <span className="tabular block text-[12.5px] font-semibold text-ink">{inrShort(c.amount)}</span>
                <StatusBadge status={c.status} />
              </div>
              {c.status !== "cancelled" && c.paidAmount < c.amount && (
                <button className="btn btn-primary btn-xs shrink-0" onClick={() => setPaying(c)}>
                  Record
                </button>
              )}
            </div>
          ))}
          {commitments.length === 0 && (
            <p className="px-3 py-6 text-center text-[12.5px] text-muted">No commitments yet.</p>
          )}
        </div>
      </div>

      <div>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted">Payment history</p>
        <div className="divide-y divide-line rounded-lg border border-line">
          {vendorPayments.map((p) => (
            <div key={p.id} className="flex items-center gap-3 px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12.5px] font-semibold text-ink">{p.receiptNo}</p>
                <p className="truncate text-[11px] text-muted">
                  {fmtDate(p.date)} · {p.mode.toUpperCase()}
                </p>
              </div>
              <span className="tabular shrink-0 text-[12.5px] font-semibold text-emerald-600">{inr(p.amount)}</span>
              <button
                className="btn btn-ghost btn-xs shrink-0"
                title="Download receipt"
                onClick={() => {
                  const commitment = db.commitments.find((c) => c.id === p.commitmentId);
                  setReceipt({
                    kind: "vendor",
                    status: "paid",
                    receiptNo: p.receiptNo,
                    date: p.date,
                    amount: p.amount,
                    mode: p.mode,
                    ref: p.ref,
                    note: p.note,
                    partyLabel: "Paid to",
                    partyName: vendor.name,
                    partyPhone: vendor.phone,
                    referenceLabel: "Vendor / Commitment",
                    referenceValue: `${vendor.name} — ${commitment?.item ?? "—"}`,
                  });
                }}
              >
                <ReceiptIcon size={13} />
              </button>
              <button
                className="btn btn-ghost btn-xs text-rose-600 shrink-0"
                title="Delete payment"
                onClick={() => {
                  deleteVendorPayment(update, p);
                  toast.success("Payment deleted", `${p.receiptNo} was reversed.`);
                }}
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
          {vendorPayments.length === 0 && (
            <p className="px-3 py-6 text-center text-[12.5px] text-muted">No payments recorded yet.</p>
          )}
        </div>
      </div>

      {paying && (
        <VendorPaymentModal
          commitment={paying}
          vendorName={vendor.name}
          onClose={() => setPaying(null)}
          onSave={(amount, mode, date, ref, note) => {
            recordVendorPayment(update, paying, amount, mode, date, ref, note);
            toast.success("Payment recorded", `${inr(amount)} paid to ${vendor.name}.`);
            setPaying(null);
          }}
        />
      )}

      <ReceiptModal data={receipt} onClose={() => setReceipt(null)} />
    </div>
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

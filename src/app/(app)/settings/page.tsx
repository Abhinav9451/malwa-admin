"use client";

import { useState } from "react";
import { Building2, Database, Download, RotateCcw, Save } from "lucide-react";
import { useStore } from "@/lib/store";
import { downloadExcel } from "@/lib/exporter";
import { inr, inrShort } from "@/lib/format";
import { totals } from "@/lib/selectors";
import type { Settings } from "@/lib/types";
import { Card, CardHeader, KeyVal, PageHeader } from "@/components/ui/primitives";
import { ConfirmDialog } from "@/components/ui/Modal";
import { FormGrid, NumberField, TextAreaField, TextField } from "@/components/ui/Form";
import { useToast } from "@/components/ui/Toast";

export default function SettingsPage() {
  const { db, update, resetDemo, user } = useStore();
  const toast = useToast();
  const [form, setForm] = useState<Settings>(db.settings);
  const [confirmReset, setConfirmReset] = useState(false);

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const t = totals(db);

  const saveSettings = () => {
    update((draft) => {
      draft.settings = form;
    });
    toast.success("Settings saved", "Your firm details are up to date.");
  };

  /* One workbook with a sheet per module — the "everything" export. */
  const exportEverything = () =>
    downloadExcel(
      [
        {
          name: "Projects",
          rows: db.projects.map((p) => ({
            Code: p.code,
            Project: p.name,
            Customer: db.customers.find((c) => c.id === p.customerId)?.name ?? "",
            Mode: p.mode,
            Status: p.status,
            City: p.city,
            "Contract Value": p.contractValue,
            "Progress %": p.progress,
            Start: p.startDate,
            Target: p.targetDate,
          })),
        },
        {
          name: "Customers",
          rows: db.customers.map((c) => ({
            Name: c.name, Phone: c.phone, Email: c.email ?? "", City: c.city,
            Address: c.address, GSTIN: c.gstin ?? "", Since: c.since,
          })),
        },
        {
          name: "Instalments",
          rows: db.milestones.map((m) => ({
            Project: db.projects.find((p) => p.id === m.projectId)?.name ?? "",
            Instalment: m.title, Amount: m.amount, Received: m.paidAmount,
            Balance: m.amount - m.paidAmount, "Due Date": m.dueDate, Status: m.status,
          })),
        },
        {
          name: "Receipts",
          rows: db.payments.map((p) => ({
            Receipt: p.receiptNo, Date: p.date,
            Project: db.projects.find((x) => x.id === p.projectId)?.name ?? "",
            Amount: p.amount, Mode: p.mode.toUpperCase(), Reference: p.ref ?? "",
          })),
        },
        {
          name: "Materials",
          rows: db.materials.map((m) => ({
            Material: m.name, Category: m.category, Unit: m.unit, "Base Rate": m.rate,
            Delivery: m.delivery, "Rate at Site": m.rate + m.delivery,
            Vendor: db.vendors.find((v) => v.id === m.vendorId)?.name ?? "",
            Stock: m.stock, "Minimum Stock": m.minStock,
          })),
        },
        {
          name: "Vendors",
          rows: db.vendors.map((v) => ({
            Vendor: v.name, Contact: v.contactPerson, Phone: v.phone, Type: v.kind,
            City: v.city, Supplies: v.supplies, "Payment Terms": v.paymentTerms,
          })),
        },
        {
          name: "Commitments",
          rows: db.commitments.map((c) => ({
            Ref: c.refNo,
            Vendor: db.vendors.find((v) => v.id === c.vendorId)?.name ?? "",
            Project: db.projects.find((p) => p.id === c.projectId)?.name ?? "",
            Item: c.item, Amount: c.amount, Paid: c.paidAmount,
            Pending: c.amount - c.paidAmount, "Payment Due": c.dueDate, Status: c.status,
          })),
        },
        {
          name: "Reminders",
          rows: db.reminders.map((r) => ({
            Title: r.title, Type: r.kind, To: r.toName, Phone: r.toPhone,
            "Due Date": r.dueDate, Status: r.status,
          })),
        },
      ],
      "malwa-builders-full-backup",
    );

  return (
    <>
      <PageHeader title="Settings" subtitle="Firm details, reminder preferences and data export">
        <button className="btn btn-primary btn-sm" onClick={saveSettings}>
          <Save size={14} /> Save changes
        </button>
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2" padded={false}>
          <CardHeader title="Firm profile" subtitle="Shown on receipts and reminder messages" icon={<Building2 size={16} />} />
          <div className="p-4">
            <FormGrid>
              <TextField label="Firm name" value={form.firmName} onChange={(v) => set("firmName", v)} />
              <TextField label="Tagline" value={form.tagline} onChange={(v) => set("tagline", v)} />
              <TextField label="Phone" type="tel" value={form.phone} onChange={(v) => set("phone", v)} />
              <TextField label="Email" type="email" value={form.email} onChange={(v) => set("email", v)} />
              <TextField label="Website" type="url" value={form.website} onChange={(v) => set("website", v)} />
              <TextField label="GSTIN" value={form.gstin} onChange={(v) => set("gstin", v)} />
              <TextAreaField label="Address" value={form.address} onChange={(v) => set("address", v)} rows={2} />
              <NumberField
                label="Due soon window"
                value={form.reminderWindowDays}
                onChange={(v) => set("reminderWindowDays", v)}
                suffix="days"
                hint="A payment counts as “due soon” this many days before its due date"
              />
            </FormGrid>
          </div>
        </Card>

        <div className="space-y-4">
          <Card padded={false}>
            <CardHeader title="Signed in as" />
            <div className="px-4 py-3">
              <KeyVal k="Name" v={user?.name ?? "—"} />
              <KeyVal k="Role" v={user?.designation ?? "—"} />
              <KeyVal k="Email" v={user?.email ?? "—"} />
            </div>
          </Card>

          <Card padded={false}>
            <CardHeader title="What's in the panel" icon={<Database size={16} />} />
            <div className="px-4 py-3">
              <KeyVal k="Projects" v={db.projects.length} />
              <KeyVal k="Customers" v={db.customers.length} />
              <KeyVal k="Vendors" v={db.vendors.length} />
              <KeyVal k="Materials" v={db.materials.length} />
              <KeyVal k="Website media" v={db.media.length} />
              <KeyVal k="Total contract value" v={inrShort(t.contractValue)} />
              <KeyVal k="Outstanding" v={<span className="text-rose-600">{inr(t.outstanding)}</span>} />
            </div>
          </Card>

          <Card padded={false}>
            <CardHeader title="Data" />
            <div className="space-y-2 p-4">
              <button className="btn btn-outline w-full" onClick={exportEverything}>
                <Download size={14} /> Download everything as Excel
              </button>
              <button className="btn btn-outline w-full text-rose-600" onClick={() => setConfirmReset(true)}>
                <RotateCcw size={14} /> Restore sample data
              </button>
              <p className="pt-1 text-[11.5px] leading-relaxed text-muted">
                Everything is stored in this browser. Download the Excel backup before clearing your browser data.
              </p>
            </div>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={() => {
          resetDemo();
          setForm(db.settings);
          toast.success("Sample data restored");
        }}
        title="Restore sample data?"
        message="Every change you made will be replaced with the original sample data. Download the Excel backup first if you need it."
        confirmLabel="Restore"
        danger={false}
      />
    </>
  );
}

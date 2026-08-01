"use client";

import { useMemo, useState } from "react";
import { MessageCircle, Pencil, Phone, Plus, Trash2, Users2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { projectBalance } from "@/lib/selectors";
import { fmtDate, inr, inrShort, maskPhone, telLink, toISODate, uid, waLink } from "@/lib/format";
import type { Customer } from "@/lib/types";
import { downloadExcel } from "@/lib/exporter";
import { Column, DataTable } from "@/components/ui/DataTable";
import { FilterBar, matches } from "@/components/ui/Filters";
import { Avatar, Card, KeyVal, PageHeader, StatusBadge } from "@/components/ui/primitives";
import { ConfirmDialog, Drawer, Modal } from "@/components/ui/Modal";
import { FormGrid, TextAreaField, TextField } from "@/components/ui/Form";
import { useToast } from "@/components/ui/Toast";

function blank(): Customer {
  return {
    id: uid("c"),
    name: "",
    phone: "",
    address: "",
    city: "Jagraon",
    since: toISODate(new Date()),
  };
}

export default function CustomersPage() {
  const { db, save, update } = useStore();
  const toast = useToast();

  const [search, setSearch] = useState("");
  const [city, setCity] = useState("");
  const [editing, setEditing] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState<Customer | null>(null);
  const [viewing, setViewing] = useState<string | null>(null);

  const cities = useMemo(
    () => Array.from(new Set(db.customers.map((c) => c.city))).sort(),
    [db.customers],
  );

  /** projects + outstanding balance for one customer */
  const summary = (customerId: string) => {
    const projects = db.projects.filter((p) => p.customerId === customerId);
    const balance = projects.reduce((n, p) => n + projectBalance(db, p.id).balance, 0);
    const value = projects.reduce((n, p) => n + p.contractValue, 0);
    return { projects, balance, value };
  };

  const rows = useMemo(
    () =>
      db.customers.filter(
        (c) => (!city || c.city === city) && matches(search, c.name, c.phone, c.email, c.city, c.address),
      ),
    [db.customers, search, city],
  );

  const openCustomer = db.customers.find((c) => c.id === viewing) ?? null;

  const exportRows = () =>
    downloadExcel(
      [
        {
          name: "Customers",
          rows: rows.map((c) => {
            const s = summary(c.id);
            return {
              Name: c.name,
              Phone: c.phone,
              Email: c.email ?? "",
              City: c.city,
              Address: c.address,
              GSTIN: c.gstin ?? "",
              Projects: s.projects.length,
              "Total Value": s.value,
              Outstanding: s.balance,
              "Customer Since": c.since,
              Note: c.note ?? "",
            };
          }),
        },
      ],
      "malwa-customers",
    );

  const onDelete = (customer: Customer) => {
    const linked = db.projects.filter((p) => p.customerId === customer.id).length;
    if (linked > 0) {
      toast.error(
        "Cannot delete this customer",
        `${customer.name} still has ${linked} project${linked > 1 ? "s" : ""}. Delete or reassign those first.`,
      );
      return;
    }
    update((draft) => {
      draft.customers = draft.customers.filter((c) => c.id !== customer.id);
    });
    toast.success("Customer deleted", customer.name);
  };

  const columns: Column<Customer>[] = [
    {
      key: "name",
      header: "Customer",
      sortValue: (c) => c.name,
      render: (c) => (
        <div className="flex min-w-0 items-center gap-2.5">
          <Avatar name={c.name} size={30} />
          <div className="min-w-0">
            <p className="truncate font-semibold text-ink">{c.name}</p>
            <p className="truncate text-[11.5px] text-muted">{c.email ?? maskPhone(c.phone)}</p>
          </div>
        </div>
      ),
    },
    { key: "city", header: "City", sortValue: (c) => c.city, hideBelow: "sm", render: (c) => c.city },
    {
      key: "projects",
      header: "Projects",
      align: "center",
      hideBelow: "md",
      sortValue: (c) => summary(c.id).projects.length,
      render: (c) => <span className="tabular">{summary(c.id).projects.length}</span>,
    },
    {
      key: "value",
      header: "Total value",
      align: "right",
      hideBelow: "lg",
      sortValue: (c) => summary(c.id).value,
      render: (c) => <span className="tabular">{inrShort(summary(c.id).value)}</span>,
    },
    {
      key: "balance",
      header: "Outstanding",
      align: "right",
      sortValue: (c) => summary(c.id).balance,
      render: (c) => {
        const b = summary(c.id).balance;
        return (
          <span className={`tabular font-semibold ${b > 0 ? "text-rose-600" : "text-emerald-600"}`}>
            {inrShort(b)}
          </span>
        );
      },
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (c) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <a className="btn btn-ghost btn-xs" href={telLink(c.phone)} title="Call">
            <Phone size={13} />
          </a>
          <a
            className="btn btn-ghost btn-xs text-emerald-600"
            href={waLink(c.phone, `Namaste ${c.name.split(" ")[0]} ji,`)}
            target="_blank"
            rel="noreferrer"
            title="WhatsApp"
          >
            <MessageCircle size={13} />
          </a>
          <button className="btn btn-ghost btn-xs" onClick={() => setEditing(c)} title="Edit">
            <Pencil size={13} />
          </button>
          <button className="btn btn-ghost btn-xs text-rose-600" onClick={() => setDeleting(c)} title="Delete">
            <Trash2 size={13} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Customers" subtitle={`${rows.length} of ${db.customers.length} customers shown`}>
        <button className="btn btn-primary btn-sm" onClick={() => setEditing(blank())}>
          <Plus size={14} /> New customer
        </button>
      </PageHeader>

      <Card padded={false}>
        <FilterBar
          search={search}
          onSearch={setSearch}
          placeholder="Search by name, phone, email or address…"
          onExport={exportRows}
          filters={[
            { allLabel: "All cities", value: city, onChange: setCity, options: cities.map((c) => ({ value: c, label: c })) },
          ]}
        />
        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(c) => c.id}
          onRowClick={(c) => setViewing(c.id)}
          pageSize={12}
          emptyIcon={<Users2 size={30} />}
          emptyTitle="No customers match these filters"
          emptyHint="Try a different search, or add a new customer."
        />
      </Card>

      {editing && (
        <CustomerModal
          customer={editing}
          onClose={() => setEditing(null)}
          onSave={(c) => {
            save("customers", c);
            toast.success(db.customers.some((x) => x.id === c.id) ? "Customer updated" : "Customer added", c.name);
            setEditing(null);
          }}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && onDelete(deleting)}
        title="Delete this customer?"
        message={<><strong>{deleting?.name}</strong> will be removed from the customer list.</>}
      />

      <Drawer
        open={!!openCustomer}
        onClose={() => setViewing(null)}
        title={openCustomer?.name ?? ""}
        subtitle={openCustomer ? `${openCustomer.city} · customer since ${fmtDate(openCustomer.since)}` : ""}
        footer={
          openCustomer && (
            <>
              <a
                className="btn btn-wa btn-sm"
                href={waLink(openCustomer.phone, `Namaste ${openCustomer.name.split(" ")[0]} ji,`)}
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircle size={13} /> WhatsApp
              </a>
              <button className="btn btn-primary btn-sm" onClick={() => { setEditing(openCustomer); setViewing(null); }}>
                <Pencil size={13} /> Edit
              </button>
            </>
          )
        }
      >
        {openCustomer && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-x-5">
              <KeyVal k="Phone" v={maskPhone(openCustomer.phone)} />
              <KeyVal k="Email" v={openCustomer.email ?? "—"} />
              <KeyVal k="City" v={openCustomer.city} />
              <KeyVal k="GSTIN" v={openCustomer.gstin ?? "—"} />
              <KeyVal k="Total value" v={inr(summary(openCustomer.id).value)} />
              <KeyVal
                k="Outstanding"
                v={<span className="text-rose-600">{inr(summary(openCustomer.id).balance)}</span>}
              />
            </div>
            <p className="rounded-lg bg-surface-2 px-3 py-2 text-[12.5px] leading-relaxed text-ink-2">
              {openCustomer.address}
            </p>
            {openCustomer.note && (
              <p className="rounded-lg bg-gold-soft px-3 py-2 text-[12.5px] leading-relaxed text-ink-2">
                {openCustomer.note}
              </p>
            )}

            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted">Their projects</p>
              <div className="divide-y divide-line rounded-lg border border-line">
                {summary(openCustomer.id).projects.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12.5px] font-semibold text-ink">{p.name}</p>
                      <p className="text-[11px] text-muted">{p.code}</p>
                    </div>
                    <span className="tabular shrink-0 text-[12.5px] font-semibold">{inrShort(p.contractValue)}</span>
                    <StatusBadge status={p.status} />
                  </div>
                ))}
                {summary(openCustomer.id).projects.length === 0 && (
                  <p className="px-3 py-6 text-center text-[12.5px] text-muted">No projects yet.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </>
  );
}

function CustomerModal({
  customer,
  onClose,
  onSave,
}: {
  customer: Customer;
  onClose: () => void;
  onSave: (c: Customer) => void;
}) {
  const [form, setForm] = useState<Customer>(customer);
  const set = <K extends keyof Customer>(key: K, value: Customer[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const valid = form.name.trim().length > 1 && form.phone.trim().length >= 10;

  return (
    <Modal
      open
      onClose={onClose}
      title={customer.name ? "Edit customer" : "New customer"}
      footer={
        <>
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={!valid} onClick={() => onSave(form)}>
            Save customer
          </button>
        </>
      }
    >
      <FormGrid>
        <TextField label="Full name" value={form.name} onChange={(v) => set("name", v)} placeholder="Harpreet Singh Gill" />
        <TextField label="Phone" type="tel" value={form.phone} onChange={(v) => set("phone", v)} placeholder="98155 00112" hint="Used for calls and WhatsApp reminders" />
        <TextField label="Email" type="email" value={form.email ?? ""} onChange={(v) => set("email", v)} />
        <TextField label="City" value={form.city} onChange={(v) => set("city", v)} />
        <TextField label="GSTIN" value={form.gstin ?? ""} onChange={(v) => set("gstin", v)} />
        <TextField label="Customer since" type="date" value={form.since} onChange={(v) => set("since", v)} />
        <TextAreaField label="Address" value={form.address} onChange={(v) => set("address", v)} rows={2} />
        <TextAreaField label="Note" value={form.note ?? ""} onChange={(v) => set("note", v)} placeholder="Preferred call time, payment habits, anything useful…" />
      </FormGrid>
    </Modal>
  );
}

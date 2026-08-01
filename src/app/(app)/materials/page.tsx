"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Boxes, Pencil, Plus, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { fmtDate, inr, num, toISODate, uid } from "@/lib/format";
import { MATERIAL_CATEGORIES, UNITS, type Material, type MaterialCategory, type Unit } from "@/lib/types";
import { downloadExcel } from "@/lib/exporter";
import { Column, DataTable } from "@/components/ui/DataTable";
import { FilterBar, matches } from "@/components/ui/Filters";
import { Badge, Card, PageHeader, Stat } from "@/components/ui/primitives";
import { ConfirmDialog, Modal } from "@/components/ui/Modal";
import { FormGrid, NumberField, SelectField, TextField } from "@/components/ui/Form";
import { useToast } from "@/components/ui/Toast";

function blank(): Material {
  return {
    id: uid("m"),
    name: "",
    category: "Aggregate",
    unit: "trolley",
    rate: 0,
    delivery: 0,
    vendorId: "",
    stock: 0,
    minStock: 0,
    updatedAt: toISODate(new Date()),
  };
}

/** What the material actually costs once it reaches the site. */
const atSite = (m: Material) => m.rate + m.delivery;
const isLow = (m: Material) => m.minStock > 0 && m.stock < m.minStock;

export default function MaterialsPage() {
  const { db, save, remove } = useStore();
  const toast = useToast();

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [vendor, setVendor] = useState("");
  const [stockFilter, setStockFilter] = useState("");
  const [editing, setEditing] = useState<Material | null>(null);
  const [deleting, setDeleting] = useState<Material | null>(null);

  const rows = useMemo(
    () =>
      db.materials.filter((m) => {
        const v = db.vendors.find((x) => x.id === m.vendorId);
        return (
          (!category || m.category === category) &&
          (!vendor || m.vendorId === vendor) &&
          (!stockFilter || (stockFilter === "low" ? isLow(m) : !isLow(m))) &&
          matches(search, m.name, m.category, m.unit, v?.name)
        );
      }),
    [db.materials, db.vendors, search, category, vendor, stockFilter],
  );

  const lowCount = db.materials.filter(isLow).length;
  const stockValue = db.materials.reduce((n, m) => n + m.stock * atSite(m), 0);

  const exportRows = () =>
    downloadExcel(
      [
        {
          name: "Material Rates",
          rows: rows.map((m) => ({
            Material: m.name,
            Category: m.category,
            Unit: m.unit,
            "Base Rate": m.rate,
            "Delivery / Freight": m.delivery,
            "Rate at Site": atSite(m),
            Vendor: db.vendors.find((v) => v.id === m.vendorId)?.name ?? "",
            Stock: m.stock,
            "Minimum Stock": m.minStock,
            "Low Stock": isLow(m) ? "Yes" : "No",
            "Stock Value": Math.round(m.stock * atSite(m)),
            Updated: m.updatedAt,
          })),
        },
      ],
      "malwa-materials",
    );

  const columns: Column<Material>[] = [
    {
      key: "name",
      header: "Material",
      sortValue: (m) => m.name,
      render: (m) => (
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink">{m.name}</p>
          <p className="truncate text-[11.5px] text-muted">
            {m.category} · per {m.unit}
          </p>
        </div>
      ),
    },
    {
      key: "vendor",
      header: "Vendor",
      hideBelow: "lg",
      sortValue: (m) => db.vendors.find((v) => v.id === m.vendorId)?.name ?? "",
      render: (m) => (
        <span className="text-[12.5px]">{db.vendors.find((v) => v.id === m.vendorId)?.name ?? "—"}</span>
      ),
    },
    {
      key: "rate",
      header: "Base rate",
      align: "right",
      hideBelow: "md",
      sortValue: (m) => m.rate,
      render: (m) => <span className="tabular">{inr(m.rate)}</span>,
    },
    {
      key: "delivery",
      header: "Delivery",
      align: "right",
      hideBelow: "xl",
      sortValue: (m) => m.delivery,
      render: (m) => <span className="tabular text-muted">{m.delivery ? inr(m.delivery) : "—"}</span>,
    },
    {
      key: "atSite",
      header: "Rate at site",
      align: "right",
      sortValue: atSite,
      render: (m) => (
        <span className="tabular font-bold text-ink">
          {inr(atSite(m))}
          <span className="ml-1 text-[10.5px] font-normal text-muted">/{m.unit}</span>
        </span>
      ),
    },
    {
      key: "stock",
      header: "Stock",
      align: "right",
      sortValue: (m) => m.stock,
      render: (m) => (
        <div className="flex items-center justify-end gap-2">
          <span className={`tabular font-semibold ${isLow(m) ? "text-amber-600" : "text-ink"}`}>
            {num(m.stock)}
          </span>
          {isLow(m) && <Badge tone="amber">Low</Badge>}
        </div>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (m) => (
        <div className="flex justify-end gap-1">
          <button className="btn btn-ghost btn-xs" onClick={() => setEditing(m)} title="Edit">
            <Pencil size={13} />
          </button>
          <button className="btn btn-ghost btn-xs text-rose-600" onClick={() => setDeleting(m)} title="Delete">
            <Trash2 size={13} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Materials" subtitle="Rates at site and what is left in the store">
        <button className="btn btn-primary btn-sm" onClick={() => setEditing(blank())}>
          <Plus size={14} /> New material
        </button>
      </PageHeader>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Materials tracked" value={db.materials.length} sub={`${MATERIAL_CATEGORIES.length} categories`} tone="gold" />
        <Stat
          label="Below minimum"
          value={lowCount}
          sub={lowCount ? "Raise purchase orders" : "Stock levels are healthy"}
          icon={<AlertTriangle size={16} />}
          tone={lowCount ? "amber" : "green"}
        />
        <Stat label="Stock value at site rate" value={inr(stockValue)} tone="blue" />
      </div>

      <Card className="mt-4" padded={false}>
        <FilterBar
          search={search}
          onSearch={setSearch}
          placeholder="Search material, category or vendor…"
          onExport={exportRows}
          filters={[
            {
              allLabel: "All categories",
              value: category,
              onChange: setCategory,
              options: MATERIAL_CATEGORIES.map((c) => ({ value: c, label: c })),
            },
            {
              allLabel: "All vendors",
              value: vendor,
              onChange: setVendor,
              options: db.vendors.map((v) => ({ value: v.id, label: v.name })),
            },
            {
              allLabel: "Any stock level",
              value: stockFilter,
              onChange: setStockFilter,
              options: [
                { value: "low", label: "Below minimum" },
                { value: "ok", label: "Sufficient" },
              ],
            },
          ]}
        />
        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(m) => m.id}
          pageSize={15}
          dense
          rowClassName={(m) => (isLow(m) ? "bg-amber-500/[0.04]" : undefined)}
          emptyIcon={<Boxes size={30} />}
          emptyTitle="No materials match these filters"
          emptyHint="Try a different category or clear the search."
        />
      </Card>

      {editing && (
        <MaterialModal
          material={editing}
          vendors={db.vendors.map((v) => ({ value: v.id, label: v.name }))}
          onClose={() => setEditing(null)}
          onSave={(m) => {
            save("materials", { ...m, updatedAt: toISODate(new Date()) });
            toast.success(db.materials.some((x) => x.id === m.id) ? "Material updated" : "Material added", m.name);
            setEditing(null);
          }}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (!deleting) return;
          remove("materials", deleting.id);
          toast.success("Material deleted", deleting.name);
        }}
        title="Delete this material?"
        message={<><strong>{deleting?.name}</strong> will be removed from the rate list.</>}
      />
    </>
  );
}

function MaterialModal({
  material,
  vendors,
  onClose,
  onSave,
}: {
  material: Material;
  vendors: { value: string; label: string }[];
  onClose: () => void;
  onSave: (m: Material) => void;
}) {
  const [form, setForm] = useState<Material>(material);
  const set = <K extends keyof Material>(key: K, value: Material[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const valid = form.name.trim().length > 1 && form.rate >= 0;

  return (
    <Modal
      open
      onClose={onClose}
      title={material.name ? "Edit material" : "New material"}
      subtitle={`Rate at site works out to ${inr(form.rate + form.delivery)} per ${form.unit}`}
      footer={
        <>
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={!valid} onClick={() => onSave(form)}>
            Save material
          </button>
        </>
      }
    >
      <FormGrid>
        <TextField label="Material name" value={form.name} onChange={(v) => set("name", v)} full placeholder="Reta (River Sand)" />
        <SelectField
          label="Category"
          value={form.category}
          onChange={(v) => set("category", v as MaterialCategory)}
          options={MATERIAL_CATEGORIES.map((c) => ({ value: c, label: c }))}
        />
        <SelectField
          label="Unit"
          value={form.unit}
          onChange={(v) => set("unit", v as Unit)}
          options={UNITS.map((u) => ({ value: u, label: u }))}
        />
        <NumberField label="Base rate" value={form.rate} onChange={(v) => set("rate", v)} prefix="₹" hint="Ex-godown or ex-quarry" />
        <NumberField label="Delivery & unloading" value={form.delivery} onChange={(v) => set("delivery", v)} prefix="₹" hint="Freight to reach the site" />
        <SelectField label="Preferred vendor" value={form.vendorId} onChange={(v) => set("vendorId", v)} options={vendors} placeholder="Select a vendor" />
        <TextField label="Last updated" type="date" value={form.updatedAt} onChange={(v) => set("updatedAt", v)} />
        <NumberField label="Stock in hand" value={form.stock} onChange={(v) => set("stock", v)} suffix={form.unit} />
        <NumberField label="Minimum stock" value={form.minStock} onChange={(v) => set("minStock", v)} suffix={form.unit} hint="Below this, the material is flagged low" />
      </FormGrid>
    </Modal>
  );
}

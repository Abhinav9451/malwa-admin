"use client";

import { useEffect, useMemo, useState } from "react";
import { Building2, MessageCircle, Pencil, Plus, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { projectBalance } from "@/lib/selectors";
import { SCHEDULES } from "@/lib/seed";
import { addDays, fmtDate, inr, inrShort, toISODate, uid, waLink } from "@/lib/format";
import { PROJECT_MODES, PROJECT_STATUSES, type Milestone, type Project, type ProjectMode, type ProjectStatus } from "@/lib/types";
import { downloadExcel } from "@/lib/exporter";
import { Column, DataTable } from "@/components/ui/DataTable";
import { FilterBar, matches } from "@/components/ui/Filters";
import { Card, KeyVal, PageHeader, Progress, StatusBadge, Tabs } from "@/components/ui/primitives";
import { ConfirmDialog, Drawer, Modal } from "@/components/ui/Modal";
import { FormGrid, NumberField, SelectField, TextAreaField, TextField } from "@/components/ui/Form";
import { useToast } from "@/components/ui/Toast";

const MODE_LABEL: Record<ProjectMode, string> = Object.fromEntries(
  PROJECT_MODES.map((m) => [m.key, m.label]),
) as Record<ProjectMode, string>;

function blank(): Project {
  return {
    id: uid("p"),
    code: `MB-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900) + 100)}`,
    name: "",
    customerId: "",
    mode: "floor_plans",
    status: "upcoming",
    site: "",
    city: "Jagraon",
    builtUpArea: 0,
    contractValue: 0,
    startDate: toISODate(new Date()),
    targetDate: toISODate(addDays(new Date(), 45)),
    progress: 0,
  };
}

/** Build the instalment schedule for a brand new project from its service type. */
function scheduleFor(project: Project): Milestone[] {
  const plan = SCHEDULES[project.mode];
  const start = new Date(project.startDate);
  const span = Math.max(14, (new Date(project.targetDate).getTime() - start.getTime()) / 86400000);
  const step = span / plan.length;

  return plan.map((s, i) => ({
    id: `${project.id}_m${i + 1}`,
    projectId: project.id,
    title: s.title,
    amount: Math.round((project.contractValue * s.percent) / 100),
    dueDate: toISODate(addDays(start, Math.round(step * (i + 1) - step / 2))),
    paidAmount: 0,
    status: "pending" as const,
  }));
}

function shareMessage(project: Project, customerName: string): string {
  const first = customerName.replace(/^Dr\.\s*/, "").split(" ")[0] || "ji";
  const service = MODE_LABEL[project.mode];
  return (
    `Namaste ${first} ji,\n\n` +
    `Update from *Malwa Builders* on *${project.name}* (${service}).\n\n` +
    `Plans / drawings are ready — please check and confirm.\n\n` +
    `— Malwa Builders, Jagraon`
  );
}

export default function ProjectsPage() {
  const { db, save, update } = useStore();
  const toast = useToast();

  const [tab, setTab] = useState<"all" | ProjectMode>("all");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [city, setCity] = useState("");
  const [editing, setEditing] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState<Project | null>(null);
  const [viewing, setViewing] = useState<string | null>(null);

  /* the dashboard links here with ?open=<projectId> to jump straight to a site */
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("open");
    if (id) setViewing(id);
  }, []);

  const cities = useMemo(
    () => Array.from(new Set(db.projects.map((p) => p.city))).sort(),
    [db.projects],
  );

  const rows = useMemo(
    () =>
      db.projects.filter((p) => {
        const customer = db.customers.find((c) => c.id === p.customerId);
        return (
          (tab === "all" || p.mode === tab) &&
          (!status || p.status === status) &&
          (!city || p.city === city) &&
          matches(search, p.name, p.code, p.site, p.city, customer?.name)
        );
      }),
    [db.projects, db.customers, tab, status, city, search],
  );

  const openProject = db.projects.find((p) => p.id === viewing) ?? null;
  const openCustomer = openProject
    ? db.customers.find((c) => c.id === openProject.customerId)
    : undefined;

  const exportRows = () =>
    downloadExcel(
      [
        {
          name: "Projects",
          rows: rows.map((p) => {
            const bal = projectBalance(db, p.id);
            return {
              Code: p.code,
              Project: p.name,
              Customer: db.customers.find((c) => c.id === p.customerId)?.name ?? "",
              Service: MODE_LABEL[p.mode],
              Status: PROJECT_STATUSES.find((s) => s.key === p.status)?.label ?? p.status,
              City: p.city,
              Site: p.site,
              "Built-up (sqft)": p.builtUpArea,
              "Contract Value": p.contractValue,
              Collected: bal.collected,
              Balance: bal.balance,
              "Progress %": p.progress,
              Start: p.startDate,
              Target: p.targetDate,
            };
          }),
        },
      ],
      "malwa-projects",
    );

  const onSave = (project: Project) => {
    const isNew = !db.projects.some((p) => p.id === project.id);
    if (isNew) {
      const milestones = scheduleFor(project);
      update((draft) => {
        draft.projects.unshift(project);
        draft.milestones.push(...milestones);
      });
      toast.success("Project added", `${milestones.length} instalments created from the ${MODE_LABEL[project.mode]} schedule.`);
    } else {
      save("projects", project);
      toast.success("Project updated", project.name);
    }
    setEditing(null);
  };

  const onDelete = (project: Project) => {
    update((draft) => {
      draft.projects = draft.projects.filter((p) => p.id !== project.id);
      draft.milestones = draft.milestones.filter((m) => m.projectId !== project.id);
      draft.payments = draft.payments.filter((p) => p.projectId !== project.id);
    });
    toast.success("Project deleted", `${project.name} and its payment schedule were removed.`);
  };

  const columns: Column<Project>[] = [
    {
      key: "name",
      header: "Project",
      sortValue: (p) => p.name,
      render: (p) => (
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink">{p.name}</p>
          <p className="truncate text-[11.5px] text-muted">
            {p.code} · {db.customers.find((c) => c.id === p.customerId)?.name ?? "No customer"}
          </p>
        </div>
      ),
    },
    {
      key: "mode",
      header: "Service",
      sortValue: (p) => MODE_LABEL[p.mode],
      hideBelow: "md",
      render: (p) => <span className="text-[12.5px]">{MODE_LABEL[p.mode]}</span>,
    },
    {
      key: "city",
      header: "City",
      sortValue: (p) => p.city,
      hideBelow: "lg",
      render: (p) => p.city,
    },
    {
      key: "value",
      header: "Value",
      align: "right",
      sortValue: (p) => p.contractValue,
      render: (p) => <span className="tabular font-semibold text-ink">{inrShort(p.contractValue)}</span>,
    },
    {
      key: "balance",
      header: "Balance",
      align: "right",
      hideBelow: "sm",
      sortValue: (p) => projectBalance(db, p.id).balance,
      render: (p) => {
        const bal = projectBalance(db, p.id).balance;
        return <span className={`tabular font-semibold ${bal > 0 ? "text-rose-600" : "text-emerald-600"}`}>{inrShort(bal)}</span>;
      },
    },
    {
      key: "progress",
      header: "Progress",
      sortValue: (p) => p.progress,
      hideBelow: "lg",
      className: "w-40",
      render: (p) => <Progress value={p.progress} showLabel />,
    },
    {
      key: "status",
      header: "Status",
      sortValue: (p) => p.status,
      render: (p) => <StatusBadge status={p.status} />,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (p) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <button className="btn btn-ghost btn-xs" onClick={() => setEditing(p)} title="Edit">
            <Pencil size={13} />
          </button>
          <button className="btn btn-ghost btn-xs text-rose-600" onClick={() => setDeleting(p)} title="Delete">
            <Trash2 size={13} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Projects" subtitle={`${rows.length} of ${db.projects.length} jobs shown`}>
        <button className="btn btn-primary btn-sm" onClick={() => setEditing(blank())}>
          <Plus size={14} /> New project
        </button>
      </PageHeader>

      <Card padded={false}>
        <Tabs
          className="px-2"
          active={tab}
          onChange={setTab}
          tabs={[
            { key: "all" as const, label: "All", count: db.projects.length },
            ...PROJECT_MODES.map((m) => ({
              key: m.key,
              label: m.label,
              count: db.projects.filter((p) => p.mode === m.key).length,
            })),
          ]}
        />
        <FilterBar
          search={search}
          onSearch={setSearch}
          placeholder="Search by project, code, site or customer…"
          onExport={exportRows}
          filters={[
            {
              allLabel: "All statuses",
              value: status,
              onChange: setStatus,
              options: PROJECT_STATUSES.map((s) => ({ value: s.key, label: s.label })),
            },
            {
              allLabel: "All cities",
              value: city,
              onChange: setCity,
              options: cities.map((c) => ({ value: c, label: c })),
            },
          ]}
        />
        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(p) => p.id}
          onRowClick={(p) => setViewing(p.id)}
          pageSize={12}
          emptyIcon={<Building2 size={30} />}
          emptyTitle="No projects match these filters"
          emptyHint="Try clearing the search or filters, or add a new project."
        />
      </Card>

      {editing && (
        <ProjectModal
          project={editing}
          onClose={() => setEditing(null)}
          onSave={onSave}
          customers={db.customers.map((c) => ({ value: c.id, label: c.name }))}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && onDelete(deleting)}
        title="Delete this project?"
        message={
          <>
            <strong>{deleting?.name}</strong> will be removed along with its payment schedule and recorded receipts.
            This cannot be undone.
          </>
        }
      />

      <Drawer
        open={!!openProject}
        onClose={() => setViewing(null)}
        title={openProject?.name ?? ""}
        subtitle={openProject ? `${openProject.code} · ${MODE_LABEL[openProject.mode]} · ${openProject.site}` : ""}
        footer={
          openProject && (
            <>
              {openCustomer?.phone && (
                <a
                  className="btn btn-outline btn-sm"
                  href={waLink(openCustomer.phone, shareMessage(openProject, openCustomer.name))}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MessageCircle size={13} /> Send on WhatsApp
                </a>
              )}
              <button className="btn btn-primary btn-sm" onClick={() => { setEditing(openProject); setViewing(null); }}>
                <Pencil size={13} /> Edit project
              </button>
            </>
          )
        }
      >
        {openProject && <ProjectDetail projectId={openProject.id} />}
      </Drawer>
    </>
  );
}

function ProjectModal({
  project,
  customers,
  onClose,
  onSave,
}: {
  project: Project;
  customers: { value: string; label: string }[];
  onClose: () => void;
  onSave: (p: Project) => void;
}) {
  const [form, setForm] = useState<Project>(project);
  const set = <K extends keyof Project>(key: K, value: Project[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const valid = form.name.trim() && form.customerId && form.contractValue > 0;
  const isNew = !project.name;

  return (
    <Modal
      open
      onClose={onClose}
      title={isNew ? "New project" : "Edit project"}
      subtitle={
        isNew
          ? "Payment steps are created from the service type (visit, floor plans, elevation, turnkey…)."
          : "Edit job details. Payment schedule amounts can be adjusted from Payments."
      }
      footer={
        <>
          <button className="btn btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" disabled={!valid} onClick={() => onSave(form)}>
            Save project
          </button>
        </>
      }
    >
      <FormGrid>
        <TextField label="Project name" value={form.name} onChange={(v) => set("name", v)} full placeholder="Brar Kothi — Floor Plans" />
        <TextField label="Project code" value={form.code} onChange={(v) => set("code", v)} />
        <SelectField label="Customer" value={form.customerId} onChange={(v) => set("customerId", v)} options={customers} placeholder="Select a customer" />
        <SelectField
          label="Service"
          value={form.mode}
          onChange={(v) => set("mode", v as ProjectMode)}
          options={PROJECT_MODES.map((m) => ({ value: m.key, label: m.label }))}
        />
        <SelectField
          label="Status"
          value={form.status}
          onChange={(v) => set("status", v as ProjectStatus)}
          options={PROJECT_STATUSES.map((s) => ({ value: s.key, label: s.label }))}
        />
        <TextField label="Site address" value={form.site} onChange={(v) => set("site", v)} full />
        <TextField label="City" value={form.city} onChange={(v) => set("city", v)} />
        <NumberField label="Built-up / plot area" value={form.builtUpArea} onChange={(v) => set("builtUpArea", v)} suffix="sqft" />
        <NumberField label="Job value" value={form.contractValue} onChange={(v) => set("contractValue", v)} prefix="₹" />
        <NumberField label="Progress" value={form.progress} onChange={(v) => set("progress", v)} suffix="%" max={100} />
        <TextField label="Start date" type="date" value={form.startDate} onChange={(v) => set("startDate", v)} />
        <TextField label="Target date" type="date" value={form.targetDate} onChange={(v) => set("targetDate", v)} />
        <TextAreaField label="Note" value={form.note ?? ""} onChange={(v) => set("note", v)} placeholder="Visit fee, floors, WhatsApp notes…" />
      </FormGrid>
    </Modal>
  );
}

function ProjectDetail({ projectId }: { projectId: string }) {
  const { db } = useStore();
  const project = db.projects.find((p) => p.id === projectId)!;
  const customer = db.customers.find((c) => c.id === project.customerId);
  const bal = projectBalance(db, projectId);
  const milestones = db.milestones.filter((m) => m.projectId === projectId);
  const commitments = db.commitments.filter((c) => c.projectId === projectId);

  return (
    <div className="space-y-5">
      <div>
        <Progress value={project.progress} showLabel />
        <div className="mt-3 grid grid-cols-2 gap-x-5">
          <KeyVal k="Customer" v={customer?.name ?? "—"} />
          <KeyVal k="Service" v={MODE_LABEL[project.mode]} />
          <KeyVal k="Status" v={<StatusBadge status={project.status} />} />
          <KeyVal k="City" v={project.city} />
          <KeyVal k="Area" v={`${project.builtUpArea.toLocaleString("en-IN")} sqft`} />
          <KeyVal k="Job value" v={inr(project.contractValue)} />
          <KeyVal k="Collected" v={<span className="text-emerald-600">{inr(bal.collected)}</span>} />
          <KeyVal k="Balance" v={<span className="text-rose-600">{inr(bal.balance)}</span>} />
          <KeyVal k="Started" v={fmtDate(project.startDate)} />
          <KeyVal k="Target" v={fmtDate(project.targetDate)} />
        </div>
        {project.note && (
          <p className="mt-3 rounded-lg bg-surface-2 px-3 py-2 text-[12.5px] leading-relaxed text-ink-2">
            {project.note}
          </p>
        )}
        {customer?.phone && (
          <a
            className="btn btn-outline btn-sm mt-3 w-full sm:w-auto"
            href={waLink(customer.phone, shareMessage(project, customer.name))}
            target="_blank"
            rel="noreferrer"
          >
            <MessageCircle size={14} /> Send update on WhatsApp
          </a>
        )}
      </div>

      <div>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted">Payment schedule</p>
        <div className="divide-y divide-line rounded-lg border border-line">
          {milestones.map((m) => (
            <div key={m.id} className="flex items-center gap-3 px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12.5px] font-semibold text-ink">{m.title}</p>
                <p className="text-[11px] text-muted">Due {fmtDate(m.dueDate)}</p>
              </div>
              <span className="tabular shrink-0 text-[12.5px] font-semibold text-ink">{inrShort(m.amount)}</span>
              <StatusBadge status={m.status} />
            </div>
          ))}
        </div>
      </div>

      {commitments.length > 0 && (
        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted">Vendor commitments</p>
          <div className="divide-y divide-line rounded-lg border border-line">
            {commitments.map((c) => (
              <div key={c.id} className="flex items-center gap-3 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] font-semibold text-ink">{c.item}</p>
                  <p className="truncate text-[11px] text-muted">
                    {db.vendors.find((v) => v.id === c.vendorId)?.name} · {c.refNo}
                  </p>
                </div>
                <span className="tabular shrink-0 text-[12.5px] font-semibold text-ink">{inrShort(c.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

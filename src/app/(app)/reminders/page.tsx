"use client";

import { useMemo, useState } from "react";
import { BellRing, Check, MessageCircle, Pencil, Plus, RotateCcw, Trash2, Wand2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { dueRows } from "@/lib/selectors";
import { fmtDate, inr, maskPhone, relativeDue, toISODate, uid, waLink } from "@/lib/format";
import type { Reminder, ReminderKind } from "@/lib/types";
import { downloadExcel } from "@/lib/exporter";
import { Column, DataTable } from "@/components/ui/DataTable";
import { FilterBar, matches } from "@/components/ui/Filters";
import { Badge, Card, PageHeader, Stat, StatusBadge } from "@/components/ui/primitives";
import { ConfirmDialog, Modal } from "@/components/ui/Modal";
import { FormGrid, SelectField, TextAreaField, TextField } from "@/components/ui/Form";
import { useToast } from "@/components/ui/Toast";

const KINDS: { key: ReminderKind; label: string; tone: "gold" | "blue" | "violet" | "gray" }[] = [
  { key: "payment", label: "Payment", tone: "gold" },
  { key: "vendor", label: "Vendor", tone: "blue" },
  { key: "site", label: "Site", tone: "violet" },
  { key: "custom", label: "Custom", tone: "gray" },
];

function blank(): Reminder {
  return {
    id: uid("rem"),
    kind: "custom",
    title: "",
    message: "",
    toName: "",
    toPhone: "",
    dueDate: toISODate(new Date()),
    status: "pending",
  };
}

export default function RemindersPage() {
  const { db, save, remove, update } = useStore();
  const toast = useToast();

  const [search, setSearch] = useState("");
  const [kind, setKind] = useState("");
  const [status, setStatus] = useState("pending");
  const [editing, setEditing] = useState<Reminder | null>(null);
  const [deleting, setDeleting] = useState<Reminder | null>(null);

  const rows = useMemo(
    () =>
      db.reminders
        .filter(
          (r) =>
            (!kind || r.kind === kind) &&
            (!status || r.status === status) &&
            matches(search, r.title, r.toName, r.toPhone, r.message),
        )
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    [db.reminders, search, kind, status],
  );

  const pending = db.reminders.filter((r) => r.status === "pending");
  const dueToday = pending.filter((r) => r.dueDate <= toISODate(new Date())).length;

  /* Build a payment reminder for every overdue instalment that has none yet. */
  const generateFromOverdue = () => {
    const overdue = dueRows(db).filter((r) => r.days < 0);
    const created: Reminder[] = [];

    overdue.forEach((r) => {
      const exists = db.reminders.some(
        (x) => x.kind === "payment" && x.status === "pending" && x.title.includes(r.milestone.title) && x.toPhone === r.customerPhone,
      );
      if (exists) return;
      created.push({
        id: uid("rem"),
        kind: "payment",
        title: `Overdue — ${r.milestone.title}`,
        message:
          `Namaste ${r.customerName.split(" ")[0]} ji,\n\n` +
          `Gentle reminder from *Malwa Builders* — ${inr(r.balance)} for _${r.milestone.title}_ at ` +
          `${r.projectName} was due on ${fmtDate(r.milestone.dueDate)} and is now ${Math.abs(r.days)} days overdue.\n\n` +
          `Kindly clear it at the earliest.\n\n— Malwa Builders, Jagraon`,
        toName: r.customerName,
        toPhone: r.customerPhone,
        dueDate: toISODate(new Date()),
        status: "pending",
        projectId: r.projectId,
      });
    });

    if (!created.length) {
      toast.info("Nothing to create", "Every overdue payment already has a pending reminder.");
      return;
    }
    update((draft) => {
      draft.reminders.unshift(...created);
    });
    toast.success(`${created.length} reminders created`, "Open each one to send it on WhatsApp.");
  };

  const toggleStatus = (reminder: Reminder) =>
    save("reminders", { ...reminder, status: reminder.status === "done" ? "pending" : "done" });

  const exportRows = () =>
    downloadExcel(
      [
        {
          name: "Reminders",
          rows: rows.map((r) => ({
            Title: r.title,
            Type: KINDS.find((k) => k.key === r.kind)?.label ?? r.kind,
            To: r.toName,
            Phone: r.toPhone,
            "Due Date": r.dueDate,
            Status: r.status === "done" ? "Done" : "Pending",
            Project: db.projects.find((p) => p.id === r.projectId)?.name ?? "",
            Message: r.message,
          })),
        },
      ],
      "malwa-reminders",
    );

  const columns: Column<Reminder>[] = [
    {
      key: "title",
      header: "Reminder",
      sortValue: (r) => r.title,
      render: (r) => (
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink">{r.title}</p>
          <p className="line-clamp-1 text-[11.5px] text-muted">{r.message}</p>
        </div>
      ),
    },
    {
      key: "kind",
      header: "Type",
      hideBelow: "md",
      sortValue: (r) => r.kind,
      render: (r) => {
        const k = KINDS.find((x) => x.key === r.kind);
        return <Badge tone={k?.tone ?? "gray"}>{k?.label ?? r.kind}</Badge>;
      },
    },
    {
      key: "to",
      header: "Send to",
      hideBelow: "sm",
      sortValue: (r) => r.toName,
      render: (r) => (
        <div className="min-w-0">
          <p className="truncate text-[12.5px] font-medium text-ink">{r.toName}</p>
          <p className="text-[11px] text-muted">{maskPhone(r.toPhone)}</p>
        </div>
      ),
    },
    {
      key: "due",
      header: "When",
      hideBelow: "lg",
      sortValue: (r) => r.dueDate,
      render: (r) => (
        <div>
          <p className="text-[12.5px]">{fmtDate(r.dueDate)}</p>
          <p className={`text-[11px] font-semibold ${r.dueDate < toISODate(new Date()) && r.status === "pending" ? "text-rose-600" : "text-muted"}`}>
            {relativeDue(r.dueDate)}
          </p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortValue: (r) => r.status,
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (r) => (
        <div className="flex justify-end gap-1">
          <a
            className="btn btn-wa btn-xs"
            href={waLink(r.toPhone, r.message)}
            target="_blank"
            rel="noreferrer"
            title="Open in WhatsApp"
          >
            <MessageCircle size={13} /> Send
          </a>
          <button
            className={`btn btn-ghost btn-xs ${r.status === "done" ? "text-muted" : "text-emerald-600"}`}
            onClick={() => toggleStatus(r)}
            title={r.status === "done" ? "Mark as pending" : "Mark as done"}
          >
            {r.status === "done" ? <RotateCcw size={13} /> : <Check size={13} />}
          </button>
          <button className="btn btn-ghost btn-xs" onClick={() => setEditing(r)} title="Edit">
            <Pencil size={13} />
          </button>
          <button className="btn btn-ghost btn-xs text-rose-600" onClick={() => setDeleting(r)} title="Delete">
            <Trash2 size={13} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Reminders" subtitle="Follow-ups to send on WhatsApp, in one list">
        <button className="btn btn-outline btn-sm" onClick={generateFromOverdue}>
          <Wand2 size={14} /> Build from overdue
        </button>
        <button className="btn btn-primary btn-sm" onClick={() => setEditing(blank())}>
          <Plus size={14} /> New reminder
        </button>
      </PageHeader>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Pending" value={pending.length} sub="Waiting to be sent" icon={<BellRing size={16} />} tone="gold" />
        <Stat label="Due today or earlier" value={dueToday} sub="Send these first" tone={dueToday ? "red" : "green"} />
        <Stat label="Done" value={db.reminders.filter((r) => r.status === "done").length} sub="Already followed up" tone="green" />
      </div>

      <Card className="mt-4" padded={false}>
        <FilterBar
          search={search}
          onSearch={setSearch}
          placeholder="Search title, person or message…"
          onExport={exportRows}
          filters={[
            { allLabel: "All types", value: kind, onChange: setKind, options: KINDS.map((k) => ({ value: k.key, label: k.label })) },
            {
              allLabel: "All statuses",
              value: status,
              onChange: setStatus,
              options: [
                { value: "pending", label: "Pending" },
                { value: "done", label: "Done" },
              ],
            },
          ]}
        />
        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(r) => r.id}
          pageSize={12}
          emptyIcon={<BellRing size={30} />}
          emptyTitle="No reminders here"
          emptyHint="Use “Build from overdue” to create payment follow-ups automatically."
        />
      </Card>

      {editing && (
        <ReminderModal
          reminder={editing}
          projects={db.projects.map((p) => ({ value: p.id, label: p.name }))}
          onClose={() => setEditing(null)}
          onSave={(r) => {
            save("reminders", r);
            toast.success(db.reminders.some((x) => x.id === r.id) ? "Reminder updated" : "Reminder added", r.title);
            setEditing(null);
          }}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (!deleting) return;
          remove("reminders", deleting.id);
          toast.success("Reminder deleted", deleting.title);
        }}
        title="Delete this reminder?"
        message={<><strong>{deleting?.title}</strong> will be removed from the list.</>}
      />
    </>
  );
}

function ReminderModal({
  reminder,
  projects,
  onClose,
  onSave,
}: {
  reminder: Reminder;
  projects: { value: string; label: string }[];
  onClose: () => void;
  onSave: (r: Reminder) => void;
}) {
  const [form, setForm] = useState<Reminder>(reminder);
  const set = <K extends keyof Reminder>(key: K, value: Reminder[K]) => setForm((f) => ({ ...f, [key]: value }));
  const valid = form.title.trim() && form.toPhone.trim().length >= 10 && form.message.trim();

  return (
    <Modal
      open
      onClose={onClose}
      title={reminder.title ? "Edit reminder" : "New reminder"}
      subtitle="The message opens pre-filled in WhatsApp when you press Send."
      footer={
        <>
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={!valid} onClick={() => onSave(form)}>
            Save reminder
          </button>
        </>
      }
    >
      <FormGrid>
        <TextField label="Title" value={form.title} onChange={(v) => set("title", v)} full placeholder="Payment due — Ground Floor Slab" />
        <SelectField
          label="Type"
          value={form.kind}
          onChange={(v) => set("kind", v as ReminderKind)}
          options={KINDS.map((k) => ({ value: k.key, label: k.label }))}
        />
        <SelectField
          label="Status"
          value={form.status}
          onChange={(v) => set("status", v as Reminder["status"])}
          options={[
            { value: "pending", label: "Pending" },
            { value: "done", label: "Done" },
          ]}
        />
        <TextField label="Send to" value={form.toName} onChange={(v) => set("toName", v)} placeholder="Harpreet Singh Gill" />
        <TextField label="Phone" type="tel" value={form.toPhone} onChange={(v) => set("toPhone", v)} />
        <TextField label="Remind on" type="date" value={form.dueDate} onChange={(v) => set("dueDate", v)} />
        <SelectField label="Project" value={form.projectId ?? ""} onChange={(v) => set("projectId", v)} options={projects} placeholder="Not linked to a project" />
        <TextAreaField
          label="Message"
          value={form.message}
          onChange={(v) => set("message", v)}
          rows={7}
          placeholder="Namaste ji, gentle reminder from Malwa Builders…"
        />
      </FormGrid>
    </Modal>
  );
}

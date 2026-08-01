"use client";

import Link from "next/link";
import {
  AlertTriangle, ArrowRight, Banknote, Building2, CalendarClock, Clock, Wallet,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { ageingBuckets, dueRows, monthlyFlow, totals, upcomingByMonth } from "@/lib/selectors";
import { fmtDate, inr, inrShort, relativeDue } from "@/lib/format";
import { DonutChart, FlowChart, MoneyBarChart } from "@/components/Charts";
import { Card, CardHeader, PageHeader, Progress, Stat, StatusBadge } from "@/components/ui/primitives";
import { PROJECT_STATUSES } from "@/lib/types";

export default function DashboardPage() {
  const { db } = useStore();
  const t = totals(db);
  const rows = dueRows(db, db.settings.reminderWindowDays);

  const overdue = rows.filter((r) => r.bucket === "overdue").slice(0, 6);
  const dueSoon = rows.filter((r) => r.bucket === "due_soon").slice(0, 6);

  const statusSplit = PROJECT_STATUSES.map((s) => ({
    name: s.label,
    value: db.projects.filter((p) => p.status === s.key).length,
  })).filter((s) => s.value > 0);

  const ongoing = db.projects
    .filter((p) => p.status === "ongoing")
    .sort((a, b) => b.progress - a.progress)
    .slice(0, 6);

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={`${t.activeProjects} projects running · ${inrShort(t.outstanding)} still to be collected`}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Overdue"
          value={inrShort(t.overdue)}
          sub={`${t.overdueCount} instalment${t.overdueCount === 1 ? "" : "s"} past the due date`}
          icon={<AlertTriangle size={16} />}
          tone="red"
        />
        <Stat
          label={`Due in ${db.settings.reminderWindowDays} days`}
          value={inrShort(t.dueSoon)}
          sub={`${t.dueSoonCount} payment${t.dueSoonCount === 1 ? "" : "s"} to follow up`}
          icon={<Clock size={16} />}
          tone="amber"
        />
        <Stat
          label="Upcoming"
          value={inrShort(t.upcoming)}
          sub={`${t.upcomingCount} instalment${t.upcomingCount === 1 ? "" : "s"} scheduled later`}
          icon={<CalendarClock size={16} />}
          tone="blue"
        />
        <Stat
          label="Collected this month"
          value={inrShort(t.collectedThisMonth)}
          sub={`${inrShort(t.collected)} received in total`}
          icon={<Wallet size={16} />}
          tone="green"
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2" padded={false}>
          <CardHeader
            title="Billed vs collected"
            subtitle="Last six months"
            icon={<Banknote size={16} />}
          />
          <div className="p-3">
            <FlowChart data={monthlyFlow(db)} />
          </div>
        </Card>

        <Card padded={false}>
          <CardHeader title="Projects by status" icon={<Building2 size={16} />} />
          <div className="p-3">
            <DonutChart data={statusSplit} height={250} />
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card padded={false}>
          <CardHeader
            title="Upcoming payments"
            subtitle="What is scheduled to come in, month by month"
          />
          <div className="p-3">
            <MoneyBarChart data={upcomingByMonth(db)} nameKey="month" label="Expected" />
          </div>
        </Card>

        <Card padded={false}>
          <CardHeader title="How old is the overdue money" subtitle="Days past the due date" />
          <div className="p-3">
            <MoneyBarChart
              data={ageingBuckets(db)}
              nameKey="bucket"
              label="Overdue"
              colors={["#f59e0b", "#f97316", "#ef4444", "#b91c1c"]}
            />
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <DueList
          title="Overdue payments"
          hint="Chase these first"
          rows={overdue}
          tone="text-rose-600"
          empty="Nothing is overdue. Well collected."
        />
        <DueList
          title="Due soon"
          hint={`Next ${db.settings.reminderWindowDays} days`}
          rows={dueSoon}
          tone="text-amber-600"
          empty="No payment falls due this week."
        />
      </div>

      <Card className="mt-4" padded={false}>
        <CardHeader
          title="Site progress"
          subtitle="Projects currently running"
          action={
            <Link href="/projects" className="btn btn-outline btn-sm">
              All projects <ArrowRight size={13} />
            </Link>
          }
        />
        <div className="divide-y divide-line">
          {ongoing.map((p) => (
            <Link
              key={p.id}
              href={`/projects?open=${p.id}`}
              className="flex items-center gap-4 px-4 py-3 transition hover:bg-surface-2"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-ink">{p.name}</p>
                <p className="truncate text-[11.5px] text-muted">
                  {p.code} · {p.city} · target {fmtDate(p.targetDate)}
                </p>
              </div>
              <div className="hidden w-40 sm:block">
                <Progress value={p.progress} showLabel />
              </div>
              <span className="tabular hidden w-24 text-right text-[12.5px] font-semibold text-ink md:block">
                {inrShort(p.contractValue)}
              </span>
              <StatusBadge status={p.status} />
            </Link>
          ))}
        </div>
      </Card>
    </>
  );
}

function DueList({
  title,
  hint,
  rows,
  tone,
  empty,
}: {
  title: string;
  hint: string;
  rows: ReturnType<typeof dueRows>;
  tone: string;
  empty: string;
}) {
  return (
    <Card padded={false}>
      <CardHeader
        title={title}
        subtitle={hint}
        action={
          <Link href="/payments" className="btn btn-ghost btn-sm">
            View all <ArrowRight size={13} />
          </Link>
        }
      />
      {rows.length === 0 ? (
        <p className="px-4 py-10 text-center text-[13px] text-muted">{empty}</p>
      ) : (
        <div className="divide-y divide-line">
          {rows.map((r) => (
            <div key={r.milestone.id} className="flex items-center gap-3 px-4 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-ink">{r.customerName}</p>
                <p className="truncate text-[11.5px] text-muted">
                  {r.milestone.title} · {r.projectName}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="tabular text-[13px] font-bold text-ink">{inr(r.balance)}</p>
                <p className={`text-[11px] font-semibold ${tone}`}>{relativeDue(r.milestone.dueDate)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

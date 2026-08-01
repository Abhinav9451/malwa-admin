"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ExternalLink, LogOut, X } from "lucide-react";
import { Logo } from "./Logo";
import { cx } from "./ui/primitives";
import { NAV } from "@/lib/nav";
import { useStore } from "@/lib/store";
import { totals } from "@/lib/selectors";
import { initials } from "@/lib/format";

export function Sidebar({ mobileOpen, onClose }: { mobileOpen: boolean; onClose: () => void }) {
  const { db, user, logout } = useStore();
  const pathname = usePathname();
  const t = totals(db);

  const badge = (key: string): { text: string; tone: string } | null => {
    if (key === "payments" && t.overdueCount) return { text: String(t.overdueCount), tone: "bg-rose-500 text-white" };
    if (key === "reminders" && t.pendingReminders) return { text: String(t.pendingReminders), tone: "bg-[var(--accent)] text-black" };
    if (key === "materials" && t.lowStock) return { text: String(t.lowStock), tone: "bg-amber-500 text-black" };
    return null;
  };

  const body = (
    <div className="flex h-full flex-col" style={{ background: "var(--sidebar)" }}>
      <div className="flex items-center justify-between gap-2 px-4 py-4">
        <Logo size="sm" onDark showTagline={false} />
        <button
          onClick={onClose}
          className="cursor-pointer rounded-lg p-1 text-white/50 hover:bg-white/10 hover:text-white lg:hidden"
          aria-label="Close menu"
        >
          <X size={18} />
        </button>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2.5 pb-3">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const b = badge(item.key);
          return (
            <Link
              key={item.key}
              href={item.href}
              onClick={onClose}
              className={cx(
                "relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-all",
                active ? "text-white" : "text-[var(--sidebar-text)] hover:bg-white/[0.06] hover:text-white",
              )}
              style={active ? { background: "var(--sidebar-2)" } : undefined}
            >
              {active && (
                <span className="absolute inset-y-1.5 left-0 w-[3px] rounded-r" style={{ background: "var(--accent)" }} />
              )}
              <item.icon size={16.5} className={cx("shrink-0", active ? "text-[var(--accent)]" : "opacity-70")} />
              <span className="flex-1 truncate">{item.label}</span>
              {b && (
                <span className={cx("tabular rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none", b.tone)}>
                  {b.text}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/[0.07] p-2.5">
        <a
          href={db.settings.website}
          target="_blank"
          rel="noreferrer"
          className="mb-2 flex items-center gap-2 rounded-lg px-2.5 py-2 text-[12px] text-white/45 transition hover:bg-white/[0.06] hover:text-white"
        >
          <ExternalLink size={14} /> View live website
        </a>
        <div className="flex items-center gap-2.5 rounded-lg p-2" style={{ background: "var(--sidebar-2)" }}>
          <span
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-bold"
            style={{ background: "var(--accent)", color: "#17130a" }}
          >
            {initials(user?.name ?? "MB")}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[12.5px] font-semibold text-white">{user?.name}</span>
            <span className="block truncate text-[11px] text-white/40">{user?.designation}</span>
          </span>
          <button
            onClick={logout}
            title="Sign out"
            className="cursor-pointer rounded-md p-1.5 text-white/40 transition hover:bg-white/10 hover:text-rose-400"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside className="no-print sticky top-0 hidden h-screen w-[236px] shrink-0 border-r border-black/20 lg:block">
        {body}
      </aside>

      {mobileOpen && (
        <div className="no-print fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/55" onClick={onClose} />
          <div className="anim-slide absolute inset-y-0 left-0 w-[260px]">{body}</div>
        </div>
      )}
    </>
  );
}

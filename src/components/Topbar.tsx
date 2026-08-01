"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AlertTriangle, Menu, Moon, RotateCcw, Sun } from "lucide-react";
import { useStore } from "@/lib/store";
import { useTheme } from "@/lib/theme";
import { NAV } from "@/lib/nav";
import { totals } from "@/lib/selectors";
import { inrShort } from "@/lib/format";
import { ConfirmDialog } from "./ui/Modal";
import { useToast } from "./ui/Toast";

export function Topbar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const { db, resetDemo } = useStore();
  const { theme, toggle } = useTheme();
  const pathname = usePathname();
  const toast = useToast();
  const [confirmReset, setConfirmReset] = useState(false);

  const t = totals(db);
  const current = NAV.find((n) => pathname === n.href || pathname.startsWith(`${n.href}/`));

  return (
    <>
      <header className="no-print sticky top-0 z-40 border-b border-line bg-surface/85 backdrop-blur-md">
        <div className="flex h-14 items-center gap-3 px-4 lg:px-6">
          <button
            onClick={onOpenMenu}
            className="cursor-pointer rounded-lg p-1.5 text-ink-2 hover:bg-surface-3 lg:hidden"
            aria-label="Open menu"
          >
            <Menu size={19} />
          </button>

          <div className="min-w-0">
            <p className="truncate font-display text-[15px] font-semibold tracking-tight text-ink">
              {current?.label ?? "Malwa Builders"}
            </p>
            <p className="hidden truncate text-[11.5px] text-muted sm:block">{current?.desc}</p>
          </div>

          <div className="flex-1" />

          <button
            onClick={() => setConfirmReset(true)}
            className="cursor-pointer rounded-lg p-2 text-ink-2 transition hover:bg-surface-3"
            title="Restore the sample data"
          >
            <RotateCcw size={17} />
          </button>
          <button
            onClick={toggle}
            className="cursor-pointer rounded-lg p-2 text-ink-2 transition hover:bg-surface-3"
            title={theme === "dark" ? "Switch to light" : "Switch to dark"}
          >
            {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
          </button>
        </div>

        {t.overdueCount > 0 && (
          <Link
            href="/payments"
            className="flex items-center justify-center gap-2 bg-rose-500/10 px-4 py-1.5 text-[12px] font-semibold text-rose-700 transition hover:bg-rose-500/15 dark:text-rose-400"
          >
            <AlertTriangle size={13} />
            {t.overdueCount} payment{t.overdueCount > 1 ? "s" : ""} overdue — {inrShort(t.overdue)} to collect.
            <span className="underline">Open payments</span>
          </Link>
        )}
      </header>

      <ConfirmDialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={() => {
          resetDemo();
          toast.success("Sample data restored", "Everything is back to the original demo set.");
        }}
        title="Restore sample data?"
        message="Every change you made — new projects, recorded payments, uploaded media — will be replaced with the original sample data."
        confirmLabel="Restore"
        danger={false}
      />
    </>
  );
}

"use client";

import React, { createContext, useCallback, useContext, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import { cx } from "./primitives";

type Kind = "success" | "error" | "info" | "warn";
interface Toast {
  id: number;
  kind: Kind;
  title: string;
  message?: string;
  action?: { label: string; onClick: () => void };
}

const ToastCtx = createContext<{
  toast: (t: Omit<Toast, "id">) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
} | null>(null);

let counter = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (t: Omit<Toast, "id">) => {
      const id = ++counter;
      setItems((prev) => [...prev.slice(-3), { ...t, id }]);
      window.setTimeout(() => dismiss(id), t.action ? 8000 : 4200);
    },
    [dismiss],
  );

  const api = {
    toast,
    success: (title: string, message?: string) => toast({ kind: "success", title, message }),
    error: (title: string, message?: string) => toast({ kind: "error", title, message }),
    info: (title: string, message?: string) => toast({ kind: "info", title, message }),
  };

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="no-print pointer-events-none fixed bottom-4 right-4 z-[70] flex w-[min(94vw,25rem)] flex-col gap-2">
        {items.map((t) => {
          const Icon =
            t.kind === "success" ? CheckCircle2 : t.kind === "error" ? XCircle : t.kind === "warn" ? AlertTriangle : Info;
          const tone =
            t.kind === "success" ? "text-emerald-600"
            : t.kind === "error" ? "text-rose-600"
            : t.kind === "warn" ? "text-amber-600"
            : "text-blue-600";
          return (
            <div
              key={t.id}
              className="anim-slide pointer-events-auto flex items-start gap-3 rounded-xl border border-line bg-surface p-3 shadow-xl"
            >
              <Icon size={18} className={cx("mt-0.5 shrink-0", tone)} />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-ink">{t.title}</p>
                {t.message && <p className="mt-0.5 text-[12px] leading-snug text-muted">{t.message}</p>}
                {t.action && (
                  <button
                    onClick={() => {
                      t.action?.onClick();
                      dismiss(t.id);
                    }}
                    className="mt-1.5 cursor-pointer text-[12px] font-bold text-gold hover:underline"
                  >
                    {t.action.label}
                  </button>
                )}
              </div>
              <button onClick={() => dismiss(t.id)} className="cursor-pointer text-muted hover:text-ink">
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

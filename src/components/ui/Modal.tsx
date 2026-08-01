"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cx } from "./primitives";

/**
 * Renders into <body>.
 *
 * A `position: fixed` child is positioned against the nearest ancestor that has
 * a transform, filter or perspective rather than against the viewport — and a
 * CSS animation touching `transform` counts even after it finishes. Portalling
 * keeps dialogs pinned to the viewport no matter what the page wrapper does.
 */
function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}

/** Close on Escape and stop the page behind from scrolling while open. */
function useDialogBehaviour(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);

    const { overflow, paddingRight } = document.body.style;
    // compensate for the scrollbar so the page doesn't jump sideways
    const gap = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (gap > 0) document.body.style.paddingRight = `${gap}px`;

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      document.body.style.paddingRight = paddingRight;
    };
  }, [open, onClose]);
}

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  useDialogBehaviour(open, onClose);

  if (!open) return null;

  const width = { sm: "max-w-md", md: "max-w-2xl", lg: "max-w-4xl", xl: "max-w-6xl" }[size];

  return (
    <Portal>
      <div className="no-print fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-6">
        <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
        <div
          role="dialog"
          aria-modal="true"
          className={cx(
            "anim-scale relative z-10 flex max-h-full w-full flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl",
            width,
          )}
        >
          <div className="flex shrink-0 items-start justify-between gap-4 border-b border-line px-5 py-3.5">
            <div className="min-w-0">
              <h2 className="font-display text-[17px] font-semibold tracking-tight text-ink">{title}</h2>
              {subtitle && <p className="mt-0.5 text-[12px] text-muted">{subtitle}</p>}
            </div>
            <button
              onClick={onClose}
              className="-mr-1 cursor-pointer rounded-lg p-1.5 text-muted transition hover:bg-surface-3 hover:text-ink"
              aria-label="Close"
            >
              <X size={17} />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>

          {footer && (
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-line bg-surface-2 px-5 py-3">
              {footer}
            </div>
          )}
        </div>
      </div>
    </Portal>
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Delete",
  danger = true,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  danger?: boolean;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <button className="btn btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button
            className={cx("btn", danger ? "btn-danger" : "btn-primary")}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-[13px] leading-relaxed text-ink-2">{message}</p>
    </Modal>
  );
}

/** Right-side panel for detail views. */
export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = "max-w-xl",
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: string;
}) {
  useDialogBehaviour(open, onClose);

  if (!open) return null;

  return (
    <Portal>
      <div className="no-print fixed inset-0 z-[60] flex justify-end">
        <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
        <aside
          role="dialog"
          aria-modal="true"
          className={cx(
            "anim-slide relative z-10 flex h-full w-full flex-col border-l border-line bg-surface shadow-2xl",
            width,
          )}
        >
          <div className="flex shrink-0 items-start justify-between gap-4 border-b border-line px-5 py-3.5">
            <div className="min-w-0">
              <h2 className="font-display text-[17px] font-semibold tracking-tight text-ink">{title}</h2>
              {subtitle && <p className="mt-0.5 text-[12px] text-muted">{subtitle}</p>}
            </div>
            <button
              onClick={onClose}
              className="cursor-pointer rounded-lg p-1.5 text-muted hover:bg-surface-3 hover:text-ink"
              aria-label="Close"
            >
              <X size={17} />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>

          {footer && (
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-line bg-surface-2 px-5 py-3">
              {footer}
            </div>
          )}
        </aside>
      </div>
    </Portal>
  );
}

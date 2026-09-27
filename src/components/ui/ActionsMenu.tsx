"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cx } from "./primitives";

export interface ActionItem {
  label: string;
  icon: React.ReactNode;
  onClick?: () => void;
  /** For a link-style action (e.g. WhatsApp) instead of a button. */
  href?: string;
  danger?: boolean;
}

/** One labelled "Actions" button per row that opens a small dropdown —
 *  replaces a row of separate icon buttons with a single consistent control.
 *  Portaled to <body> and positioned from the button's real screen
 *  coordinates, so it can never get clipped by a scrolling table/card. */
export function ActionsMenu({ items }: { items: ActionItem[] }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  const openMenu = () => {
    const rect = btnRef.current?.getBoundingClientRect();
    if (rect) setPos({ top: rect.bottom + 4, right: Math.max(8, window.innerWidth - rect.right) });
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (menuRef.current?.contains(t)) return;
      if (btnRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onReposition = () => setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onReposition, true);
    window.addEventListener("resize", onReposition);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onReposition, true);
      window.removeEventListener("resize", onReposition);
    };
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        className="btn btn-outline btn-xs"
        onClick={(e) => {
          e.stopPropagation();
          open ? setOpen(false) : openMenu();
        }}
      >
        Actions
      </button>
      {open &&
        pos &&
        mounted &&
        createPortal(
          <div
            ref={menuRef}
            style={{ position: "fixed", top: pos.top, right: pos.right }}
            className="z-[100] w-48 overflow-hidden rounded-lg border border-line bg-surface py-1 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {items.map((item, i) =>
              item.href ? (
                <a
                  key={i}
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 text-[12.5px] text-ink-2 hover:bg-surface-2"
                >
                  {item.icon} {item.label}
                </a>
              ) : (
                <button
                  key={i}
                  onClick={() => {
                    item.onClick?.();
                    setOpen(false);
                  }}
                  className={cx(
                    "flex w-full items-center gap-2.5 px-3 py-2 text-left text-[12.5px] hover:bg-surface-2",
                    item.danger ? "text-rose-600" : "text-ink-2",
                  )}
                >
                  {item.icon} {item.label}
                </button>
              ),
            )}
          </div>,
          document.body,
        )}
    </>
  );
}

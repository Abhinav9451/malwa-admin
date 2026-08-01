"use client";

import { cx } from "./ui/primitives";

/** Wordmark that matches the malwa-builder.vercel.app brand. */
export function Logo({
  size = "md",
  onDark = false,
  showTagline = true,
  className,
}: {
  size?: "sm" | "md" | "lg";
  onDark?: boolean;
  showTagline?: boolean;
  className?: string;
}) {
  const box = size === "lg" ? 46 : size === "sm" ? 30 : 36;
  const title = size === "lg" ? "text-[20px]" : size === "sm" ? "text-[13px]" : "text-[15px]";

  return (
    <div className={cx("flex items-center gap-2.5", className)}>
      <span
        className="relative grid shrink-0 place-items-center rounded-[10px] font-display font-bold"
        style={{
          width: box,
          height: box,
          fontSize: box * 0.38,
          background: "linear-gradient(145deg, #1b222c 0%, #0d1116 100%)",
          color: "var(--accent)",
          boxShadow: "inset 0 0 0 1px rgba(224,177,88,0.35)",
        }}
      >
        MB
      </span>
      <span className="min-w-0 leading-none">
        <span
          className={cx(
            "block font-display font-bold tracking-[0.16em]",
            title,
            onDark ? "text-white" : "text-ink",
          )}
        >
          MALWA
        </span>
        <span
          className={cx(
            "mt-1 block font-display font-semibold tracking-[0.3em]",
            size === "lg" ? "text-[11px]" : "text-[9px]",
          )}
          style={{ color: "var(--accent)" }}
        >
          BUILDERS
        </span>
        {showTagline && size === "lg" && (
          <span className="mt-1.5 block text-[11px] tracking-normal text-muted">Jagraon, Punjab</span>
        )}
      </span>
    </div>
  );
}

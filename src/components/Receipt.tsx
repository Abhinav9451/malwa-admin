"use client";

import { Printer, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { fmtDate, inr } from "@/lib/format";
import type { PaymentMode } from "@/lib/types";
import { Portal, useDialogBehaviour } from "@/components/ui/Modal";
import { Letterhead } from "@/components/Letterhead";
import { printWithFilename } from "@/lib/printDoc";

export interface ReceiptData {
  kind: "customer" | "vendor";
  /** "paid" = a real transaction already recorded. "proforma" = a preview of an amount still due. */
  status: "paid" | "proforma";
  receiptNo: string;
  date: string;
  amount: number;
  mode?: PaymentMode;
  ref?: string;
  note?: string;
  partyLabel: string;
  partyName: string;
  partyPhone?: string;
  referenceLabel: string;
  referenceValue: string;
}

function ReceiptBody({ data }: { data: ReceiptData }) {
  const { db } = useStore();
  const s = db.settings;
  const title =
    data.status === "proforma"
      ? "AMOUNT DUE"
      : data.kind === "vendor"
        ? "VENDOR PAYMENT RECEIPT"
        : "PAYMENT RECEIPT";

  return (
    <div className="bg-white p-8 text-neutral-900">
      <Letterhead />
      <p className="mt-2 text-center text-[11.5px] leading-relaxed text-neutral-500">
        {s.address}
        {s.phone && <> · {s.phone}</>}
        {s.gstin && <> · GSTIN {s.gstin}</>}
      </p>

      <div className="mt-5 flex items-start justify-between">
        <h1 className="text-[16px] font-bold tracking-wide">{title}</h1>
        <div className="text-right">
          <p className="text-[11px] uppercase tracking-wider text-neutral-500">Receipt no.</p>
          <p className="text-[13px] font-semibold">{data.receiptNo}</p>
        </div>
      </div>

      {data.status === "proforma" && (
        <p className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-[12px] font-medium text-amber-800">
          This is a preview of the amount due — not an official payment receipt.
        </p>
      )}

      <div className="mt-5 grid grid-cols-2 gap-4 text-[12.5px]">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-neutral-500">{data.partyLabel}</p>
          <p className="font-semibold">{data.partyName}</p>
          {data.partyPhone && <p className="text-neutral-500">{data.partyPhone}</p>}
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wider text-neutral-500">Date</p>
          <p className="font-semibold">{fmtDate(data.date)}</p>
        </div>
        <div className="col-span-2">
          <p className="text-[11px] uppercase tracking-wider text-neutral-500">{data.referenceLabel}</p>
          <p className="font-semibold">{data.referenceValue}</p>
        </div>
      </div>

      <div className="mt-5 rounded-xl border-2 border-neutral-900 px-5 py-4 text-center">
        <p className="text-[11px] uppercase tracking-wider text-neutral-500">
          {data.status === "proforma" ? "Amount due" : data.kind === "vendor" ? "Amount paid" : "Amount received"}
        </p>
        <p className="tabular text-[28px] font-bold">{inr(data.amount)}</p>
      </div>

      {(data.mode || data.ref || data.note) && (
        <div className="mt-4 space-y-1 text-[12px] text-neutral-600">
          {data.mode && <p>Mode: <span className="font-medium text-neutral-900">{data.mode.toUpperCase()}</span></p>}
          {data.ref && <p>Reference: <span className="font-medium text-neutral-900">{data.ref}</span></p>}
          {data.note && <p>Note: <span className="font-medium text-neutral-900">{data.note}</span></p>}
        </div>
      )}

      <div className="mt-10 flex items-end justify-between">
        <p className="text-[11px] text-neutral-400">Generated {fmtDate(new Date().toISOString())}</p>
        <div className="text-right">
          <p className="mb-6 text-[12px] text-neutral-500">For {s.firmName}</p>
          <p className="border-t border-neutral-400 pt-1 text-[11px] text-neutral-500">Authorised signatory</p>
        </div>
      </div>
    </div>
  );
}

export function ReceiptModal({ data, onClose }: { data: ReceiptData | null; onClose: () => void }) {
  useDialogBehaviour(!!data, onClose);
  if (!data) return null;

  return (
    <Portal>
      <div className="receipt-print-frame fixed inset-0 z-[80] flex items-center justify-center p-4">
        <div className="no-print absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        <div className="receipt-print-card relative z-10 flex max-h-full w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
          <div className="no-print flex items-center justify-between gap-3 border-b border-neutral-200 bg-white px-5 py-3.5">
            <h2 className="font-display text-[15px] font-semibold text-neutral-900">Receipt preview</h2>
            <div className="flex items-center gap-2">
              <button
                className="btn btn-primary btn-sm"
                onClick={() => printWithFilename(`${data.status === "paid" ? "Receipt" : "Amount Due"} - ${data.partyName} - ${data.receiptNo}`)}
              >
                <Printer size={14} /> Print / Save as PDF
              </button>
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
                aria-label="Close"
              >
                <X size={17} />
              </button>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <ReceiptBody data={data} />
          </div>
        </div>
      </div>
    </Portal>
  );
}

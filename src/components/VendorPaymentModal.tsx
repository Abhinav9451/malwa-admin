"use client";

import { useState } from "react";
import { inr } from "@/lib/format";
import { PAYMENT_MODES, type Commitment, type PaymentMode } from "@/lib/types";
import { Modal } from "@/components/ui/Modal";
import { FormGrid, NumberField, SelectField, TextAreaField, TextField } from "@/components/ui/Form";
import { StatusBadge } from "@/components/ui/primitives";

/** Record a payment WE make to a vendor against one Commitment — mirrors
 *  payments/page.tsx's RecordPaymentModal exactly, just for money going out. */
export function VendorPaymentModal({
  commitment,
  vendorName,
  onClose,
  onSave,
}: {
  commitment: Commitment;
  vendorName: string;
  onClose: () => void;
  onSave: (amount: number, mode: PaymentMode, date: string, ref: string, note: string) => void;
}) {
  const pending = Math.max(0, commitment.amount - commitment.paidAmount);
  const [amount, setAmount] = useState(pending);
  const [mode, setMode] = useState<PaymentMode>("bank");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [ref, setRef] = useState("");
  const [note, setNote] = useState("");

  const valid = amount > 0 && amount <= pending;

  return (
    <Modal
      open
      onClose={onClose}
      title="Record payment"
      subtitle={`${vendorName} · ${commitment.item}`}
      size="md"
      footer={
        <>
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={!valid} onClick={() => onSave(amount, mode, date, ref, note)}>
            Save payment
          </button>
        </>
      }
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-surface-2 px-3 py-2.5">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted">Order value</p>
          <p className="tabular text-[15px] font-semibold text-ink">{inr(commitment.amount)}</p>
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted">Already paid</p>
          <p className="tabular text-[15px] font-semibold text-emerald-600">{inr(commitment.paidAmount)}</p>
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted">Pending</p>
          <p className="tabular text-[15px] font-semibold text-rose-600">{inr(pending)}</p>
        </div>
        <StatusBadge status={commitment.status} />
      </div>

      <FormGrid>
        <NumberField
          label="Amount paid"
          value={amount}
          onChange={setAmount}
          prefix="₹"
          max={pending}
          hint={amount > pending ? "More than what's pending" : `Up to ${inr(pending)}`}
        />
        <SelectField
          label="Mode"
          value={mode}
          onChange={(v) => setMode(v as PaymentMode)}
          options={PAYMENT_MODES.map((m) => ({ value: m, label: m.toUpperCase() }))}
        />
        <TextField label="Date" type="date" value={date} onChange={setDate} />
        <TextField label="Reference" value={ref} onChange={setRef} placeholder="Cheque / UPI / NEFT number" />
        <TextAreaField label="Note" value={note} onChange={setNote} rows={2} />
      </FormGrid>
    </Modal>
  );
}

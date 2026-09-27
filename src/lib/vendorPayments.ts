/* ------------------------------------------------------------------
   Recording/reversing a payment WE make to a vendor against a Commitment.
   Mirrors payments/page.tsx's recordPayment/deletePayment exactly, except
   Commitment.status (ordered/delivered/cancelled) is delivery status and
   is never touched here — only paidAmount moves.
-------------------------------------------------------------------*/

import type { Commitment, DB, PaymentMode, VendorPayment } from "./types";
import { uid } from "./format";

type Update = (fn: (draft: DB) => void) => void;

export function recordVendorPayment(
  update: Update,
  commitment: Commitment,
  amount: number,
  mode: PaymentMode,
  date: string,
  ref: string,
  note: string,
) {
  update((draft) => {
    const c = draft.commitments.find((x) => x.id === commitment.id);
    if (!c) return;
    c.paidAmount = Math.min(c.amount, c.paidAmount + amount);
    draft.vendorPayments.unshift({
      id: uid("vp"),
      receiptNo: `MB/PAY/${1000 + draft.vendorPayments.length + 1}`,
      commitmentId: c.id,
      vendorId: c.vendorId,
      amount,
      date,
      mode,
      ref: ref || undefined,
      note: note || undefined,
    });
  });
}

export function deleteVendorPayment(update: Update, payment: VendorPayment) {
  update((draft) => {
    const c = draft.commitments.find((x) => x.id === payment.commitmentId);
    if (c) c.paidAmount = Math.max(0, c.paidAmount - payment.amount);
    draft.vendorPayments = draft.vendorPayments.filter((p) => p.id !== payment.id);
  });
}

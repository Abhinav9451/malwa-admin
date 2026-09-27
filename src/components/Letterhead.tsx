/* eslint-disable @next/next/no-img-element */

/** The real Malwa Builders logo (wordmark included), used on every printable
 *  document (receipts, statements). A plain <img>, not next/image — this
 *  only ever renders inside a fixed-light print view, never needs
 *  responsive/optimised variants. */
export function Letterhead() {
  return (
    <div className="flex justify-center">
      <img src="/logo-print.png" alt="Malwa Builders" className="h-20 w-auto" />
    </div>
  );
}

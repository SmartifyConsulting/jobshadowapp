import type { ReactNode } from "react";

export function BookingInvoice({ career, date, location, arrival, collection, amount, paid, preview = false, reference, children }: {
  career: string; date?: string | undefined; location?: string | undefined; amount: number; paid: boolean;
  arrival?: string | undefined; collection?: string | undefined;
  preview?: boolean; reference?: string; children?: ReactNode;
}) {
  return (
    <section aria-label="Booking Invoice" className="relative overflow-hidden rounded-lg border border-border bg-[#FFFDF5] p-3 text-sm sm:p-4">
      <header className="flex items-start justify-between gap-3 border-b border-teal/30 pb-2">
        <div><p className="font-display text-lg text-teal">Job Shadow</p><p className="text-xs">Job Shadow (Pty) Ltd</p></div>
        <div className="min-w-0 text-right"><h3 className="font-display text-base">{preview ? "Invoice Preview" : "Booking Invoice"}</h3>
          <p className="break-all text-xs text-muted-foreground">{preview ? "Test booking" : `Booking ${reference ?? ""}`}</p>
          <p className="text-xs font-semibold">{paid ? (preview ? "Test Payment Passed" : "Paid") : "Awaiting Payment"}</p>
        </div>
      </header>
      <dl className="my-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">
        <div><dt className="font-semibold">Date</dt><dd>{date || "Not selected"}</dd></div>
        <div><dt className="font-semibold">Location</dt><dd>{location || "Not recorded"}</dd></div>
        {arrival && <div><dt className="font-semibold">Arrival Time</dt><dd>{arrival}</dd></div>}
        {collection && <div><dt className="font-semibold">Collection Time</dt><dd>{collection}</dd></div>}
      </dl>
      <div className="flex justify-between gap-4 bg-teal/10 px-2 py-1 text-xs font-semibold"><span>Description</span><span>Amount</span></div>
      <div className="flex items-center justify-between gap-4 border-b border-border px-2 py-2"><span><span aria-label={`Selected Career: ${career}`} className="inline-block rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground">{career}</span><span className="mt-0.5 block text-xs text-muted-foreground">Job Shadow Experience</span></span><span className="whitespace-nowrap tabular-nums">R{amount.toFixed(2)}</span></div>
      <div className="flex flex-wrap items-center justify-end gap-x-5 gap-y-2 pt-2">
        <span className="font-bold">Total</span><span className="text-base font-bold tabular-nums">R{amount.toFixed(2)}</span>
        {paid && <span aria-label={preview ? "Paid stamp — test only" : "Paid stamp"} className="my-1 inline-block -rotate-12 rounded border-2 border-green-700 px-3 py-0.5 text-center font-display text-xl uppercase tracking-widest text-green-700">Paid{preview && <span className="block text-[10px] tracking-normal">Test Only</span>}</span>}
      </div>
      {children && <footer className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2 [&>p]:text-xs [&>button]:h-8">{children}</footer>}
    </section>
  );
}

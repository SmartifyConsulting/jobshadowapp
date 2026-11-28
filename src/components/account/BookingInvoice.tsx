import type { ReactNode } from "react";

export function BookingInvoice({ career, date, location, arrival, collection, amount, paid, preview = false, reference, children }: {
  career: string; date?: string | undefined; location?: string | undefined; amount: number; paid: boolean;
  arrival?: string | undefined; collection?: string | undefined;
  preview?: boolean; reference?: string; children?: ReactNode;
}) {
  return (
    <section aria-label="Booking Invoice" className="relative overflow-hidden rounded-lg border border-border bg-[#FFFDF5] p-5 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-teal/30 pb-4">
        <div><p className="font-display text-xl text-teal">Job Shadow</p><p className="mt-1 text-sm">Job Shadow (Pty) Ltd</p></div>
        <div className="text-right"><h3 className="font-display text-xl">{preview ? "Invoice Preview" : "Booking Invoice"}</h3>
          <p className="mt-1 text-sm">{preview ? "Test booking" : `Booking ${reference ?? ""}`}</p>
          <p className="mt-1 text-sm font-semibold">{paid ? (preview ? "Test Payment Passed" : "Paid") : "Awaiting Payment"}</p>
        </div>
      </header>
      <dl className="my-4 grid gap-4 text-sm sm:grid-cols-2">
        <div><dt className="font-semibold">Date</dt><dd>{date || "Not selected"}</dd></div>
        <div><dt className="font-semibold">Location</dt><dd>{location || "Not recorded"}</dd></div>
        {arrival && <div><dt className="font-semibold">Arrival Time</dt><dd>{arrival}</dd></div>}
        {collection && <div><dt className="font-semibold">Collection Time</dt><dd>{collection}</dd></div>}
      </dl>
      <div className="flex justify-between gap-4 bg-teal/10 px-3 py-2 text-sm font-semibold"><span>Description</span><span>Amount</span></div>
      <div className="flex justify-between gap-4 border-b border-border px-3 py-4"><span><span aria-label={`Selected Career: ${career}`} className="inline-block rounded-full bg-primary px-3 py-1 text-sm font-semibold text-primary-foreground">{career}</span><span className="mt-1 block text-sm">Job Shadow Experience</span></span><span className="whitespace-nowrap">R{amount.toFixed(2)}</span></div>
      <div className="flex justify-end gap-8 py-4 text-lg font-bold"><span>Total</span><span>R{amount.toFixed(2)}</span></div>
      {paid && <div className="mb-3 flex justify-end pr-2 pt-3"><span aria-label={preview ? "Paid stamp — test only" : "Paid stamp"} className="inline-block -rotate-12 rounded border-4 border-green-700 px-5 py-2 text-center font-display text-3xl uppercase tracking-widest text-green-700">Paid{preview && <span className="block text-xs tracking-normal">Test Only</span>}</span></div>}
      {children && <footer className="mt-3 space-y-3 border-t border-border pt-4">{children}</footer>}
    </section>
  );
}

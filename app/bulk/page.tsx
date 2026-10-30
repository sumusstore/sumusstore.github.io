import type { Metadata } from "next";
import { EnquiryForm } from "@/components/enquiry-form";

export const metadata: Metadata = {
  title: "Bulk sales",
  description:
    "Buying for an office, school, estate, event or business? Tell us what you need and we'll send you options.",
};

export default function BulkPage() {
  return (
    <>
      <section className="bg-blue-700 text-white">
        <div className="mx-auto max-w-3xl px-4 py-10 md:py-14">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-100">Bulk sales</p>
          <h1 className="mt-2 text-3xl font-bold md:text-4xl">Buying in quantity?</h1>
          <p className="mt-3 max-w-2xl text-blue-50">
            Buying for an office, school, estate, event or business? We work with organisations that
            need several units of the same product, or a mix of products delivered to more than one
            address.
          </p>
          <span aria-hidden="true" className="mt-4 block h-1 w-16 rounded bg-gold" />
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-8">
        <div className="rounded-xl border border-slate-200 border-t-4 border-t-gold bg-white p-6 md:p-8">
          <p className="text-slate-700">
            Tell us what you need and how many. Once we&apos;ve reviewed your enquiry, we&apos;ll confirm
            availability, pricing and delivery with you before anything is ordered.
          </p>
          <div className="relative mt-6">
            <EnquiryForm kind="bulk" />
          </div>
        </div>
      </section>
    </>
  );
}

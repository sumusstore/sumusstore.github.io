import type { Metadata } from "next";
import { EnquiryForm } from "@/components/enquiry-form";

export const metadata: Metadata = {
  title: "Bulk sales",
  description:
    "Buying for an office, school, estate, event or business? Tell us what you need and we'll send you options.",
};

export default function BulkPage() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-bold text-slate-900">Bulk sales</h1>
      <div className="mt-4 space-y-4 leading-relaxed text-slate-700">
        <p>
          Buying for an office, school, estate, event or business? We work with organisations that need
          several units of the same product, or a mix of products delivered to more than one address.
        </p>
        <p>
          Tell us what you need and how many. Once we've reviewed your enquiry, we'll confirm availability,
          pricing and delivery with you before anything is ordered.
        </p>
      </div>

      <div className="relative mt-8">
        <EnquiryForm kind="bulk" />
      </div>
    </section>
  );
}

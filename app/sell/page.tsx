import type { Metadata } from "next";
import { SellView } from "@/components/sell-view";

export const metadata: Metadata = {
  title: "Sell on Sumus",
  description: "Apply to sell on Sumus. Sumus reviews every application before a seller can list products.",
};

export default function SellPage() {
  return (
    <>
      <section className="bg-blue-700 text-white">
        <div className="mx-auto max-w-4xl px-4 py-10 md:py-14">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-100">Seller applications</p>
          <h1 className="mt-2 text-3xl font-bold md:text-4xl">Sell on Sumus</h1>
          <p className="mt-3 max-w-2xl text-blue-50">
            Businesses and individuals can apply to sell. We review every application before a seller can
            list products. Approved sellers keep 90% of each sale, and deliver their own orders.
          </p>
          <span aria-hidden="true" className="mt-4 block h-1 w-16 rounded bg-gold" />
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-8">
        <SellView />
      </section>
    </>
  );
}

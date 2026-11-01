import type { Metadata } from "next";
import { SellersIndex } from "@/components/sellers-index";

export const metadata: Metadata = {
  title: "Sellers on Sumus",
  description: "Shops selling on Sumus. Every seller is approved before listing products.",
};

export default function SellersPage() {
  return (
    <>
      <section className="bg-blue-700 text-white">
        <div className="mx-auto max-w-6xl px-4 py-10 md:py-14">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-100">Marketplace</p>
          <h1 className="mt-2 text-3xl font-bold md:text-4xl">Sellers on Sumus</h1>
          <p className="mt-2 max-w-2xl text-blue-50">
            Every seller is approved by Sumus before they can list products.
          </p>
          <span aria-hidden="true" className="mt-4 block h-1 w-16 rounded bg-gold" />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8">
        <SellersIndex />
      </section>
    </>
  );
}

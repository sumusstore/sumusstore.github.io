import type { Metadata } from "next";
import { StoreLocator } from "@/components/store-locator";

export const metadata: Metadata = {
  title: "Store locator",
  description: "Find a Sumus store near you, with addresses, opening hours and directions.",
};

export default function StoresPage() {
  return (
    <>
      <section className="bg-blue-700 text-white">
        <div className="mx-auto max-w-6xl px-4 py-10 md:py-14">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-100">Store locator</p>
          <h1 className="mt-2 text-3xl font-bold md:text-4xl">Find a store</h1>
          <p className="mt-2 max-w-2xl text-blue-50">
            Visit a branch to see products in person, or collect an order you placed online.
          </p>
          <span aria-hidden="true" className="mt-4 block h-1 w-16 rounded bg-gold" />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8">
        <StoreLocator />
      </section>
    </>
  );
}

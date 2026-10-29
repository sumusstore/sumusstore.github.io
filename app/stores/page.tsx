import type { Metadata } from "next";
import { StoreLocator } from "@/components/store-locator";

export const metadata: Metadata = {
  title: "Store locator",
  description: "Find a Sumus store near you, with addresses, opening hours and directions.",
};

export default function StoresPage() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold text-slate-900">Find a store</h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-600">
        Visit a branch to see products in person, or collect an order you placed online.
      </p>
      <div className="mt-8">
        <StoreLocator />
      </div>
    </section>
  );
}

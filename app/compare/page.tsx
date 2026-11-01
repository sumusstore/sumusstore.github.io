import type { Metadata } from "next";
import { CompareView } from "@/components/compare-view";

export const metadata: Metadata = {
  title: "Compare products",
  robots: { index: false, follow: false },
};

export default function ComparePage() {
  return (
    <>
      <section className="bg-blue-700 text-white">
        <div className="mx-auto max-w-6xl px-4 py-10 md:py-14">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-100">Compare</p>
          <h1 className="mt-2 text-3xl font-bold md:text-4xl">Compare products</h1>
          <p className="mt-2 max-w-2xl text-blue-50">
            Put up to four products side by side to see the differences.
          </p>
          <span aria-hidden="true" className="mt-4 block h-1 w-16 rounded bg-gold" />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8">
        <CompareView />
      </section>
    </>
  );
}

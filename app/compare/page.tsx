import type { Metadata } from "next";
import { CompareView } from "@/components/compare-view";

export const metadata: Metadata = {
  title: "Compare products",
  robots: { index: false, follow: false },
};

export default function ComparePage() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold text-slate-900">Compare products</h1>
      <div className="mt-6">
        <CompareView />
      </div>
    </section>
  );
}

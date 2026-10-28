"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CatalogueView } from "@/components/catalogue-view";

function SearchResults() {
  const params = useSearchParams();
  const query = (params.get("q") ?? "").trim();

  if (!query) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Search our products</h1>
        <p className="mt-2 text-sm text-slate-600">
          Type a product name, brand or model in the search bar at the top of the page.
        </p>
        <Link href="/shop/" className="mt-6 inline-block font-semibold text-blue-700 hover:underline">
          Or browse all products
        </Link>
      </section>
    );
  }

  return <CatalogueView title={`Results for "${query}"`} query={query} />;
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={<p className="mx-auto max-w-6xl px-4 py-8 text-sm text-slate-600">Loading…</p>}
    >
      <SearchResults />
    </Suspense>
  );
}

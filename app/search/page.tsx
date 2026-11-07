"use client";

import Link from "next/link";
import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { CatalogueView } from "@/components/catalogue-view";
import { SaveSearchButton } from "@/components/save-search-button";
import { useCategoryTree, type CategoryNode } from "@/hooks/use-category-tree";

function findCategory(nodes: CategoryNode[], slug: string): CategoryNode | null {
  for (const node of nodes) {
    if (node.slug === slug) return node;
    const found = findCategory(node.children, slug);
    if (found) return found;
  }
  return null;
}

/** The category's own id plus every subcategory id beneath it. */
function collectIds(node: CategoryNode): string[] {
  return [node.id, ...node.children.flatMap(collectIds)];
}

function SearchResults() {
  const params = useSearchParams();
  const query = (params.get("q") ?? "").trim();
  const categorySlug = (params.get("cat") ?? "").trim();
  const { tree, status } = useCategoryTree();

  const category = useMemo(
    () => (categorySlug ? findCategory(tree, categorySlug) : null),
    [tree, categorySlug]
  );
  const categoryIds = useMemo(() => (category ? collectIds(category) : null), [category]);

  if (!query && !categorySlug) {
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

  if (categorySlug && status === "loading") {
    return <p className="mx-auto max-w-6xl px-4 py-8 text-sm text-slate-600">Loading…</p>;
  }

  if (categorySlug && status === "error") {
    return (
      <p className="mx-auto max-w-6xl px-4 py-8 text-sm text-slate-600">
        Categories are unavailable right now. Please refresh the page shortly.
      </p>
    );
  }

  if (categorySlug && !category) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Category not found</h1>
        <Link href="/shop/" className="mt-4 inline-block font-semibold text-blue-700 hover:underline">
          Browse all products
        </Link>
      </section>
    );
  }

  const title = query
    ? `Results for "${query}"${category ? ` in ${category.name}` : ""}`
    : (category?.name ?? "Search");

  // Builds the label shown in the Saved feed, such as "laptop in Computers".
  const searchLabel = [query ? `"${query}"` : null, category ? `in ${category.name}` : null]
    .filter(Boolean)
    .join(" ");

  // The address the shopper returns to after logging in.
  const returnTo = `/search/?${new URLSearchParams(
    [
      ...(query ? [["q", query]] : []),
      ...(categorySlug ? [["cat", categorySlug]] : []),
    ] as [string, string][]
  ).toString()}`;

  return (
    <>
      <div className="mx-auto max-w-6xl px-4 pt-6">
        <SaveSearchButton
          label={searchLabel}
          query={query}
          categoryId={category?.id ?? null}
          returnTo={returnTo}
        />
      </div>
      <CatalogueView title={title} query={query} categoryIds={categoryIds} />
    </>
  );
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

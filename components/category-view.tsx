"use client";

import Link from "next/link";
import { useMemo } from "react";
import { CatalogueView } from "@/components/catalogue-view";
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

export function CategoryView({ slug }: { slug: string }) {
  const { tree, status } = useCategoryTree();
  const node = useMemo(() => findCategory(tree, slug), [tree, slug]);
  const categoryIds = useMemo(() => (node ? collectIds(node) : []), [node]);

  if (status === "loading") {
    return <p className="mx-auto max-w-6xl px-4 py-8 text-sm text-slate-600">Loading category…</p>;
  }

  if (status === "error") {
    return (
      <p className="mx-auto max-w-6xl px-4 py-8 text-sm text-slate-600">
        Categories are unavailable right now. Please refresh the page shortly.
      </p>
    );
  }

  if (!node) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Category not found</h1>
        <Link href="/shop/" className="mt-4 inline-block font-semibold text-blue-700 hover:underline">
          Browse all products
        </Link>
      </div>
    );
  }

  return (
    <CatalogueView
      title={node.name}
      categoryIds={categoryIds}
      breadcrumb={
        <nav aria-label="Breadcrumb" className="mb-3 text-sm text-slate-500">
          <Link href="/" className="hover:text-blue-700">
            Home
          </Link>
          <span className="mx-2" aria-hidden="true">
            /
          </span>
          <Link href="/shop/" className="hover:text-blue-700">
            Shop
          </Link>
          <span className="mx-2" aria-hidden="true">
            /
          </span>
          <span className="text-slate-800">{node.name}</span>
        </nav>
      }
    >
      {node.children.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-2">
          {node.children.map((child) => (
            <li key={child.id}>
              <Link
                href={`/category/${child.slug}/`}
                className="rounded-full border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-blue-600 hover:text-blue-700"
              >
                {child.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </CatalogueView>
  );
}

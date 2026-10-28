"use client";

import { useMemo, useState, type ReactNode } from "react";
import { FilterPanel } from "@/components/catalogue-filters";
import { ProductCard } from "@/components/product-card";
import { useCatalogue } from "@/hooks/use-catalogue";
import {
  EMPTY_FILTERS,
  SORT_OPTIONS,
  buildCards,
  buildFacets,
  countActiveFilters,
  scopeProducts,
  type CatalogueFilters,
  type SortOption,
} from "@/lib/catalogue";

const PAGE_SIZE = 12;

type CatalogueViewProps = {
  title: string;
  subtitle?: string;
  /** Only these categories. null means every category. */
  categoryIds?: string[] | null;
  /** Search text. Empty means no search. */
  query?: string;
  /** Shown above the title, such as breadcrumbs. */
  breadcrumb?: ReactNode;
  /** Shown below the subtitle, such as subcategory links. */
  children?: ReactNode;
};

export function CatalogueView({
  title,
  subtitle,
  categoryIds = null,
  query = "",
  breadcrumb,
  children,
}: CatalogueViewProps) {
  const { products, status } = useCatalogue();
  const [filters, setFilters] = useState<CatalogueFilters>(EMPTY_FILTERS);
  const [sort, setSort] = useState<SortOption>("featured");
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [panelOpen, setPanelOpen] = useState(false);

  const scoped = useMemo(
    () => scopeProducts(products, categoryIds, query),
    [products, categoryIds, query]
  );
  const facets = useMemo(() => buildFacets(scoped), [scoped]);
  const cards = useMemo(() => buildCards(scoped, filters, sort), [scoped, filters, sort]);
  const shown = cards.slice(0, visible);
  const activeCount = countActiveFilters(filters);

  // Changing filters or sorting starts again from the first page of results.
  function changeFilters(next: CatalogueFilters) {
    setFilters(next);
    setVisible(PAGE_SIZE);
  }

  function changeSort(next: SortOption) {
    setSort(next);
    setVisible(PAGE_SIZE);
  }

  function clearFilters() {
    changeFilters(EMPTY_FILTERS);
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-8">
      {breadcrumb}
      <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-slate-600">{subtitle}</p>}
      {children}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setPanelOpen((open) => !open)}
          aria-expanded={panelOpen}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium md:hidden"
        >
          Filters{activeCount > 0 ? ` (${activeCount})` : ""}
        </button>

        <p className="text-sm text-slate-600" aria-live="polite">
          {status === "ready" && `${cards.length} ${cards.length === 1 ? "product" : "products"}`}
        </p>

        <label className="flex items-center gap-2 text-sm text-slate-700">
          Sort by
          <select
            value={sort}
            onChange={(event) => changeSort(event.target.value as SortOption)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-6 md:flex md:gap-8">
        <aside
          className={`${panelOpen ? "block" : "hidden"} mb-8 md:mb-0 md:block md:w-56 md:shrink-0`}
        >
          <FilterPanel facets={facets} filters={filters} onChange={changeFilters} />
          {activeCount > 0 && (
            <button
              type="button"
              onClick={clearFilters}
              className="mt-6 text-sm font-medium text-blue-700 hover:underline"
            >
              Clear all filters
            </button>
          )}
        </aside>

        <div className="min-w-0 flex-1">
          {status === "loading" && (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }, (_, index) => (
                <div key={index} className="aspect-[3/4] animate-pulse rounded-xl bg-slate-100" />
              ))}
            </div>
          )}

          {status === "error" && (
            <p className="text-sm text-slate-600">
              Products are unavailable right now. Please refresh the page shortly.
            </p>
          )}

          {status === "ready" && cards.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center">
              <p className="font-semibold text-slate-900">No products match these choices.</p>
              <p className="mt-1 text-sm text-slate-600">
                Try removing a filter or searching for something else.
              </p>
              {activeCount > 0 && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-4 rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
                >
                  Clear all filters
                </button>
              )}
            </div>
          )}

          {status === "ready" && shown.length > 0 && (
            <>
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
                {shown.map((card) => (
                  <ProductCard key={card.variantId} product={card} />
                ))}
              </div>

              {visible < cards.length && (
                <div className="mt-8 text-center">
                  <p className="text-sm text-slate-600">
                    Showing {shown.length} of {cards.length}
                  </p>
                  <button
                    type="button"
                    onClick={() => setVisible((count) => count + PAGE_SIZE)}
                    className="mt-3 rounded-lg border border-slate-300 px-6 py-2.5 text-sm font-semibold hover:border-blue-600 hover:text-blue-700"
                  >
                    Load more
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}

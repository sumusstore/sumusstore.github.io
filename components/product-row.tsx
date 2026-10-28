import type { ReactNode } from "react";
import { ProductCard } from "@/components/product-card";
import type { LoadStatus, ProductCardData } from "@/hooks/use-home-products";

type ProductRowProps = {
  title: string;
  subtitle?: string;
  products: ProductCardData[];
  status: LoadStatus;
  headerAction?: ReactNode;
  emptyText?: string;
};

/** A titled row of product cards. Swipes sideways on phones, shows a grid on larger screens. */
export function ProductRow({
  title,
  subtitle,
  products,
  status,
  headerAction,
  emptyText,
}: ProductRowProps) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-slate-600">{subtitle}</p>}
        </div>
        {headerAction}
      </div>

      {status === "loading" && (
        <div className="mt-6 flex gap-4 overflow-hidden md:grid md:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div
              key={index}
              className="aspect-[3/4] w-44 shrink-0 animate-pulse rounded-xl bg-slate-100 md:w-auto"
            />
          ))}
        </div>
      )}

      {status === "error" && (
        <p className="mt-6 text-sm text-slate-600">
          Products are unavailable right now. Please refresh the page shortly.
        </p>
      )}

      {status === "ready" && products.length === 0 && (
        <p className="mt-6 text-sm text-slate-600">
          {emptyText ?? "Nothing here yet. Check back soon."}
        </p>
      )}

      {status === "ready" && products.length > 0 && (
        <div className="-mx-4 mt-6 flex snap-x gap-4 overflow-x-auto px-4 pb-3 md:mx-0 md:grid md:grid-cols-4 md:overflow-visible md:px-0">
          {products.map((product) => (
            <div key={product.variantId} className="w-44 shrink-0 snap-start md:w-auto">
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

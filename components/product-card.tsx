"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useState } from "react";
import { QuickView } from "@/components/quick-view";
import { HeartIcon } from "@/components/icons";
import type { ProductCardData } from "@/hooks/use-home-products";
import { useHydrated } from "@/hooks/use-hydrated";
import { formatNaira } from "@/lib/format";
import { SITE } from "@/lib/site-config";
import { useCartStore } from "@/stores/cart-store";
import { MAX_COMPARE, selectIsCompared, useCompareStore } from "@/stores/compare-store";
import { selectIsWishlisted, useWishlistStore } from "@/stores/wishlist-store";

function stockLabel(stock: number): { text: string; className: string } {
  if (stock <= 0) return { text: "Sold out", className: "text-red-600" };
  if (stock <= 5) return { text: `Only ${stock} left`, className: "text-amber-700" };
  return { text: "In stock", className: "text-green-700" };
}

export function ProductCard({ product }: { product: ProductCardData }) {
  const hydrated = useHydrated();
  const [justAdded, setJustAdded] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [compareNote, setCompareNote] = useState<string | null>(null);

  const addToCart = useCartStore((state) => state.addItem);
  const toggleWishlist = useWishlistStore((state) => state.toggleItem);
  const inWishlist = useWishlistStore(selectIsWishlisted(product.variantId));
  const wished = hydrated && inWishlist;

  const toggleCompare = useCompareStore((state) => state.toggle);
  const inCompare = useCompareStore(selectIsCompared(product.productId));
  const compared = hydrated && inCompare;

  const closeQuickView = useCallback(() => setQuickOpen(false), []);

  const soldOut = product.stock <= 0;
  const compareAt = product.compareAtKobo;
  const onSale = compareAt !== null && compareAt > product.priceKobo;
  const discountPercent =
    onSale && compareAt !== null
      ? Math.round(((compareAt - product.priceKobo) / compareAt) * 100)
      : 0;
  const stock = stockLabel(product.stock);

  function handleAddToCart() {
    addToCart({
      variantId: product.variantId,
      productId: product.productId,
      slug: product.slug,
      name: product.name,
      variantLabel: product.variantLabel,
      imageUrl: product.imageUrl,
      unitPriceKobo: product.priceKobo,
      stock: product.stock,
    });
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1500);
  }

  function handleWishlist() {
    toggleWishlist({
      variantId: product.variantId,
      productId: product.productId,
      slug: product.slug,
      name: product.name,
      variantLabel: product.variantLabel,
      imageUrl: product.imageUrl,
      priceKobo: product.priceKobo,
    });
  }

  function handleCompare() {
    const result = toggleCompare(product.productId);
    setCompareNote(
      result === "full" ? `Compare holds up to ${MAX_COMPARE} products. Remove one first.` : null
    );
  }

  return (
    <article className="group relative flex h-full flex-col rounded-xl border border-slate-200 bg-white p-3 transition hover:shadow-md">
      <button
        type="button"
        onClick={handleWishlist}
        aria-pressed={wished}
        aria-label={wished ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
        className="absolute right-4 top-4 z-10 rounded-full bg-white p-1.5 shadow ring-1 ring-slate-200 hover:text-red-600"
      >
        <HeartIcon className={`h-4 w-4 ${wished ? "fill-red-600 text-red-600" : ""}`} />
      </button>

      {discountPercent > 0 && (
        <span className="absolute left-4 top-4 z-10 rounded bg-red-600 px-2 py-0.5 text-xs font-bold text-white">
          -{discountPercent}%
        </span>
      )}

      <Link href={`/product/${product.slug}/`} className="block">
        <div className="relative aspect-square overflow-hidden rounded-lg bg-slate-50">
          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              sizes="(min-width: 768px) 33vw, 50vw"
              className="object-contain p-3"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-slate-400">
              Photo coming soon
            </div>
          )}
        </div>

        <div className="mt-3">
          {product.brand && (
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {product.brand}
            </p>
          )}
          <h3 className="mt-0.5 line-clamp-2 min-h-[2.5rem] text-sm font-medium text-slate-900 group-hover:text-blue-700">
            {product.name}
          </h3>
          {product.variantLabel && (
            <p className="mt-0.5 text-xs text-slate-500">{product.variantLabel}</p>
          )}
        </div>
      </Link>

      <div className="mt-2 flex flex-wrap items-baseline gap-x-2">
        <span className="text-lg font-bold text-slate-900">{formatNaira(product.priceKobo)}</span>
        {onSale && compareAt !== null && (
          <span className="text-xs text-slate-500 line-through">{formatNaira(compareAt)}</span>
        )}
      </div>
      <p className={`mt-1 text-xs font-medium ${stock.className}`}>{stock.text}</p>
      <p className="mt-1 text-xs text-slate-500">Sold by {SITE.name}</p>

      <button
        type="button"
        onClick={handleAddToCart}
        disabled={soldOut}
        className="mt-3 w-full rounded-full bg-blue-700 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {soldOut ? "Sold out" : justAdded ? "Added to cart" : "Add to cart"}
      </button>

      <div className="mt-3 flex items-center justify-between gap-2 text-xs">
        <button
          type="button"
          onClick={() => setQuickOpen(true)}
          className="font-semibold text-blue-700 hover:underline"
        >
          Quick view
        </button>
        <label className="flex cursor-pointer items-center gap-1.5 text-slate-600">
          <input
            type="checkbox"
            checked={compared}
            onChange={handleCompare}
            className="h-3.5 w-3.5 accent-blue-700"
          />
          Compare
        </label>
      </div>
      {compareNote && (
        <p role="status" className="mt-1 text-xs text-amber-700">
          {compareNote}
        </p>
      )}

      {quickOpen && (
        <QuickView
          slug={product.slug}
          preferredVariantId={product.variantId}
          onClose={closeQuickView}
        />
      )}
    </article>
  );
}

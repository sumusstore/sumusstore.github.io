"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { ProductCardData } from "@/hooks/use-home-products";
import { useHydrated } from "@/hooks/use-hydrated";
import { formatNaira } from "@/lib/format";
import { useCartStore } from "@/stores/cart-store";
import { selectIsWishlisted, useWishlistStore } from "@/stores/wishlist-store";
import { HeartIcon } from "@/components/icons";

function stockLabel(stock: number): { text: string; className: string } {
  if (stock <= 0) return { text: "Out of stock", className: "text-red-600" };
  if (stock <= 5) return { text: `Only ${stock} left`, className: "text-amber-600" };
  return { text: "In stock", className: "text-green-700" };
}

export function ProductCard({ product }: { product: ProductCardData }) {
  const hydrated = useHydrated();
  const [justAdded, setJustAdded] = useState(false);

  const addToCart = useCartStore((state) => state.addItem);
  const toggleWishlist = useWishlistStore((state) => state.toggleItem);
  const inWishlist = useWishlistStore(selectIsWishlisted(product.variantId));

  // Wait for the browser to load saved data, so the server and browser render the same.
  const wished = hydrated && inWishlist;

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

  return (
    <article className="relative flex h-full flex-col rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-blue-600 hover:shadow-md">
      <button
        type="button"
        onClick={handleWishlist}
        aria-pressed={wished}
        aria-label={wished ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
        className="absolute right-3 top-3 z-10 rounded-full bg-white p-1.5 shadow ring-1 ring-slate-200 hover:text-red-600"
      >
        <HeartIcon className={`h-4 w-4 ${wished ? "fill-red-600 text-red-600" : ""}`} />
      </button>

      {discountPercent > 0 && (
        <span className="absolute left-3 top-3 z-10 rounded bg-red-600 px-2 py-0.5 text-xs font-bold text-white">
          -{discountPercent}%
        </span>
      )}

      <Link href={`/product/${product.slug}/`} className="block">
        <div className="relative aspect-square overflow-hidden rounded-lg bg-slate-100">
          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              sizes="(min-width: 768px) 25vw, 45vw"
              className="object-contain p-4"
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
          <h3 className="mt-1 line-clamp-2 min-h-[2.5rem] text-sm font-medium text-slate-900">
            {product.name}
          </h3>
          {product.variantLabel && (
            <p className="mt-0.5 text-xs text-slate-500">{product.variantLabel}</p>
          )}
        </div>
      </Link>

      <div className="mt-2 flex flex-wrap items-baseline gap-x-2">
        <span className="font-bold text-slate-900">{formatNaira(product.priceKobo)}</span>
        {onSale && compareAt !== null && (
          <span className="text-xs text-slate-400 line-through">{formatNaira(compareAt)}</span>
        )}
      </div>
      <p className={`mt-1 text-xs font-medium ${stock.className}`}>{stock.text}</p>

      <button
        type="button"
        onClick={handleAddToCart}
        disabled={soldOut}
        className="mt-3 w-full rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {soldOut ? "Sold out" : justAdded ? "Added to cart" : "Add to cart"}
      </button>
    </article>
  );
}

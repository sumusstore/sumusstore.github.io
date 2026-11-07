"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ProductCard } from "@/components/product-card";
import type { ProductCardData } from "@/hooks/use-home-products";
import { formatNaira } from "@/lib/format";
import { SITE } from "@/lib/site-config";
import { useCartStore } from "@/stores/cart-store";
import { selectIsWishlisted, useWishlistStore } from "@/stores/wishlist-store";

export type FeedView = "grid" | "list";

type SavedFeedItemProps = {
  card: ProductCardData;
  reason: string;
  view: FeedView;
};

const MENU_ITEM = "block w-full px-4 py-2.5 text-left text-sm text-ink hover:bg-slate-50 disabled:text-slate-400";

/** One product in the saved feed, in grid or list view, with a three-dot menu. */
export function SavedFeedItem({ card, reason, view }: SavedFeedItemProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const addItem = useCartStore((state) => state.addItem);
  const removeFromWishlist = useWishlistStore((state) => state.removeItem);
  const saved = useWishlistStore(selectIsWishlisted(card.variantId));

  const soldOut = card.stock <= 0;

  function handleAddToCart() {
    setMenuOpen(false);
    if (soldOut) {
      setNote("Sold out");
      return;
    }
    addItem({
      variantId: card.variantId,
      productId: card.productId,
      slug: card.slug,
      name: card.name,
      variantLabel: card.variantLabel,
      imageUrl: card.imageUrl,
      unitPriceKobo: card.priceKobo,
      stock: card.stock,
    });
    setNote("Added to cart");
  }

  function handleRemove() {
    setMenuOpen(false);
    removeFromWishlist(card.variantId);
    setNote("Removed from saved");
  }

  function handleShare() {
    setMenuOpen(false);
    const url = `${window.location.origin}/product/${card.slug}/`;
    const text = `${card.name} at ${SITE.name}: ${url}`;
    window.open(
      `https://wa.me/?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  const menu = (
    <div className="relative">
      <button
        type="button"
        onClick={() => setMenuOpen((open) => !open)}
        aria-label={`More options for ${card.name}`}
        aria-expanded={menuOpen}
        className="flex h-9 w-9 items-center justify-center rounded-full text-xl font-bold text-ink hover:bg-slate-100"
      >
        ⋮
      </button>

      {menuOpen && (
        <div className="absolute right-0 top-full z-30 mt-1 w-48 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
          <button type="button" onClick={handleAddToCart} disabled={soldOut} className={MENU_ITEM}>
            {soldOut ? "Sold out" : "Add to cart"}
          </button>
          {saved && (
            <button type="button" onClick={handleRemove} className={MENU_ITEM}>
              Remove from saved
            </button>
          )}
          <button type="button" onClick={handleShare} className={MENU_ITEM}>
            Share
          </button>
        </div>
      )}
    </div>
  );

  const message = note && (
    <p role="status" className="mt-1 text-xs text-slate-600">
      {note}
    </p>
  );

  if (view === "grid") {
    return (
      <div>
        <p className="mb-1 truncate text-xs font-semibold text-blue-700">{reason}</p>
        <ProductCard product={card} />
        <div className="mt-1 flex justify-end">{menu}</div>
        {message}
      </div>
    );
  }

  return (
    <div className="flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-3">
      <Link
        href={`/product/${card.slug}/`}
        className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-slate-50"
      >
        {card.imageUrl ? (
          <Image src={card.imageUrl} alt="" fill sizes="96px" className="object-contain p-2" />
        ) : (
          <span className="flex h-full items-center justify-center text-[10px] text-slate-400">
            No photo
          </span>
        )}
      </Link>

      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-blue-700">{reason}</p>
        {card.brand && (
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{card.brand}</p>
        )}
        <Link
          href={`/product/${card.slug}/`}
          className="line-clamp-2 font-medium text-ink hover:text-blue-700"
        >
          {card.name}
        </Link>
        {card.variantLabel && <p className="text-sm text-slate-500">{card.variantLabel}</p>}
        <p className="mt-1 font-bold text-ink">{formatNaira(card.priceKobo)}</p>
        <p className={`text-xs font-medium ${soldOut ? "text-red-600" : "text-green-700"}`}>
          {soldOut ? "Sold out" : "In stock"}
        </p>
        {message}
      </div>

      <div className="shrink-0">{menu}</div>
    </div>
  );
}

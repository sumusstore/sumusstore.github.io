"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useHydrated } from "@/hooks/use-hydrated";
import { formatNaira } from "@/lib/format";
import { SITE } from "@/lib/site-config";
import { supabase } from "@/lib/supabase";
import { useCartStore } from "@/stores/cart-store";
import { useWishlistStore, type WishlistItem } from "@/stores/wishlist-store";

type LiveInfo = { stock: number; priceKobo: number; available: boolean };

type LiveRow = {
  id: string;
  price_kobo: number;
  stock_qty: number;
  is_active: boolean;
  products: { is_active: boolean } | null;
};

function toCartItem(item: WishlistItem, info: LiveInfo) {
  return {
    variantId: item.variantId,
    productId: item.productId,
    slug: item.slug,
    name: item.name,
    variantLabel: item.variantLabel,
    imageUrl: item.imageUrl,
    unitPriceKobo: info.priceKobo,
    stock: info.stock,
  };
}

export function WishlistView() {
  const hydrated = useHydrated();
  const items = useWishlistStore((state) => state.items);
  const removeItem = useWishlistStore((state) => state.removeItem);
  const addItem = useCartStore((state) => state.addItem);

  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [live, setLive] = useState<Record<string, LiveInfo>>({});

  // Changes only when the saved items change.
  const idList = items.map((item) => item.variantId).sort().join(",");

  useEffect(() => {
    if (!hydrated) return;
    if (!idList) {
      setLive({});
      setStatus("ready");
      return;
    }

    let active = true;
    setStatus("loading");

    async function loadLive() {
      const { data, error } = await supabase
        .from("product_variants")
        .select("id, price_kobo, stock_qty, is_active, products(is_active)")
        .in("id", idList.split(","));
      if (!active) return;
      if (error) {
        setStatus("error");
        return;
      }

      const map: Record<string, LiveInfo> = {};
      for (const row of (data ?? []) as unknown as LiveRow[]) {
        map[row.id] = {
          stock: row.stock_qty,
          priceKobo: row.price_kobo,
          available: row.is_active && row.products?.is_active === true,
        };
      }
      setLive(map);
      setStatus("ready");
    }

    loadLive();
    return () => {
      active = false;
    };
  }, [hydrated, idList]);

  if (!hydrated) {
    return <p className="text-sm text-slate-600">Loading your wishlist…</p>;
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
        <p className="font-semibold text-ink">Your wishlist is empty</p>
        <p className="mt-1 text-sm text-slate-600">Tap the heart on any product to save it here.</p>
        <Link
          href="/shop/"
          className="mt-4 inline-block font-semibold text-blue-700 hover:underline"
        >
          Browse products
        </Link>
      </div>
    );
  }

  const readyCount = items.filter((item) => {
    const info = live[item.variantId];
    return status === "ready" && info && info.available && info.stock > 0;
  }).length;

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start lg:gap-8">
      <ul className="space-y-4">
        {items.map((item) => {
          const info = live[item.variantId];
          const ready = status === "ready";
          const unavailable = ready && (!info || !info.available);
          const soldOut = ready && !!info && info.available && info.stock <= 0;
          const canBuy = ready && !!info && info.available && info.stock > 0;
          const price = info?.priceKobo ?? item.priceKobo;

          return (
            <li
              key={item.variantId}
              className="flex gap-4 rounded-xl border border-slate-200 border-t-4 border-t-gold bg-white p-4"
            >
              <Link
                href={`/product/${item.slug}/`}
                className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-paper sm:h-28 sm:w-28"
              >
                {item.imageUrl ? (
                  <Image src={item.imageUrl} alt="" fill sizes="112px" className="object-contain p-2" />
                ) : (
                  <span className="flex h-full items-center justify-center text-[10px] text-slate-400">
                    No photo
                  </span>
                )}
              </Link>

              <div className="flex min-w-0 flex-1 flex-col">
                <Link href={`/product/${item.slug}/`} className="font-semibold text-ink hover:text-blue-700">
                  {item.name}
                </Link>
                {item.variantLabel && <p className="text-sm text-slate-500">{item.variantLabel}</p>}
                <p className="mt-1 font-bold text-ink">{formatNaira(price)}</p>

                <p className="mt-1 text-sm">
                  {status === "loading" && <span className="text-slate-500">Checking availability…</span>}
                  {status === "error" && (
                    <span className="text-slate-500">Availability can&apos;t be checked right now</span>
                  )}
                  {unavailable && <span className="text-red-600">No longer available</span>}
                  {soldOut && <span className="text-red-600">Sold out</span>}
                  {canBuy && <span className="font-medium text-green-700">In stock</span>}
                </p>

                <div className="mt-auto flex flex-wrap items-center gap-4 pt-3">
                  <button
                    type="button"
                    disabled={!canBuy}
                    onClick={() => {
                      if (info) addItem(toCartItem(item, info));
                    }}
                    className="rounded-full bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:bg-slate-300"
                  >
                    Add to cart
                  </button>
                  <button
                    type="button"
                    onClick={() => removeItem(item.variantId)}
                    className="text-sm font-semibold text-slate-600 hover:text-red-600 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {/* Summary panel: beside the list on laptops, stays in view while scrolling */}
      <aside className="mt-6 rounded-xl border border-slate-200 bg-white p-5 lg:sticky lg:top-40 lg:mt-0">
        <p className="text-base font-bold text-ink">Saved items</p>
        <p className="mt-2 text-sm text-slate-700">
          {items.length} {items.length === 1 ? "item" : "items"} saved on this device.
        </p>
        {status === "ready" && (
          <p className="mt-1 text-sm text-slate-700">
            {readyCount} ready to add to your cart.
          </p>
        )}
        <Link
          href="/cart/"
          className="mt-5 block rounded-full bg-blue-700 px-6 py-3 text-center font-semibold text-white hover:bg-blue-800"
        >
          View cart
        </Link>
        <a
          href={SITE.whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 block rounded-full border border-blue-700 px-6 py-3 text-center font-semibold text-blue-700 hover:bg-blue-50"
        >
          Ask us on WhatsApp
        </a>
      </aside>
    </div>
  );
}

"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useHydrated } from "@/hooks/use-hydrated";
import { formatNaira } from "@/lib/format";
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
      <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center">
        <p className="font-semibold text-slate-900">Your wishlist is empty</p>
        <p className="mt-1 text-sm text-slate-600">Tap the heart on any product to save it here.</p>
        <Link href="/shop/" className="mt-4 inline-block font-semibold text-blue-700 hover:underline">
          Browse products
        </Link>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200">
      {items.map((item) => {
        const info = live[item.variantId];
        const ready = status === "ready";
        const unavailable = ready && (!info || !info.available);
        const soldOut = ready && !!info && info.available && info.stock <= 0;
        const canBuy = ready && !!info && info.available && info.stock > 0;
        const price = info?.priceKobo ?? item.priceKobo;

        return (
          <li key={item.variantId} className="flex gap-4 p-4">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-slate-100">
              {item.imageUrl && (
                <Image src={item.imageUrl} alt="" fill sizes="80px" className="object-contain p-2" />
              )}
            </div>

            <div className="flex min-w-0 flex-1 flex-col">
              <Link href={`/product/${item.slug}/`} className="font-semibold text-slate-900 hover:text-blue-700">
                {item.name}
              </Link>
              {item.variantLabel && <p className="text-sm text-slate-500">{item.variantLabel}</p>}
              <p className="mt-1 font-semibold text-slate-900">{formatNaira(price)}</p>

              <p className="mt-1 text-sm">
                {status === "loading" && <span className="text-slate-500">Checking availability…</span>}
                {status === "error" && (
                  <span className="text-slate-500">Availability can't be checked right now</span>
                )}
                {unavailable && <span className="text-red-600">No longer available</span>}
                {soldOut && <span className="text-red-600">Sold out</span>}
                {canBuy && <span className="text-green-700">In stock</span>}
              </p>

              <div className="mt-auto flex flex-wrap items-center gap-4 pt-3">
                <button
                  type="button"
                  disabled={!canBuy}
                  onClick={() => {
                    if (info) addItem(toCartItem(item, info));
                  }}
                  className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:bg-slate-300"
                >
                  Add to cart
                </button>
                <button
                  type="button"
                  onClick={() => removeItem(item.variantId)}
                  className="text-sm font-medium text-slate-600 hover:text-red-600"
                >
                  Remove
                </button>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

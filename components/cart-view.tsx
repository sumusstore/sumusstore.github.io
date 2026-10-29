"use client";

import Image from "next/image";
import Link from "next/link";
import { useHydrated } from "@/hooks/use-hydrated";
import { formatNaira } from "@/lib/format";
import { SITE } from "@/lib/site-config";
import { selectSubtotalKobo, useCartStore } from "@/stores/cart-store";

export function CartView() {
  const hydrated = useHydrated();
  const items = useCartStore((state) => state.items);
  const subtotalKobo = useCartStore(selectSubtotalKobo);
  const setQuantity = useCartStore((state) => state.setQuantity);
  const removeItem = useCartStore((state) => state.removeItem);

  // Wait for the browser to load the saved cart, so the page doesn't flash "empty".
  if (!hydrated) {
    return <p className="mx-auto max-w-6xl px-4 py-12 text-sm text-slate-600">Loading your cart…</p>;
  }

  if (items.length === 0) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Your cart is empty</h1>
        <p className="mt-2 text-sm text-slate-600">Add a product to see it here.</p>
        <Link
          href="/shop/"
          className="mt-6 inline-block rounded-lg bg-blue-700 px-6 py-3 font-semibold text-white hover:bg-blue-800"
        >
          Shop all products
        </Link>
      </section>
    );
  }

  const hasSoldOutItem = items.some((item) => item.stock <= 0);

  return (
    <section className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-3xl font-bold text-slate-900">Your cart</h1>

      <div className="mt-6 lg:grid lg:grid-cols-3 lg:gap-8">
        <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 lg:col-span-2">
          {items.map((item) => {
            const atLimit = item.quantity >= item.stock;

            return (
              <li key={item.variantId} className="flex gap-4 p-4">
                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                  {item.imageUrl && (
                    <Image src={item.imageUrl} alt="" fill sizes="96px" className="object-contain p-2" />
                  )}
                </div>

                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/product/${item.slug}/`}
                        className="font-semibold text-slate-900 hover:text-blue-700"
                      >
                        {item.name}
                      </Link>
                      {item.variantLabel && (
                        <p className="text-sm text-slate-500">{item.variantLabel}</p>
                      )}
                    </div>
                    <p className="shrink-0 font-semibold text-slate-900">
                      {formatNaira(item.unitPriceKobo * item.quantity)}
                    </p>
                  </div>

                  <p className="mt-1 text-sm text-slate-600">{formatNaira(item.unitPriceKobo)} each</p>

                  {item.stock <= 0 ? (
                    <p className="mt-1 text-sm font-medium text-red-600">
                      Sold out. Remove this item to check out.
                    </p>
                  ) : item.stock <= 5 ? (
                    <p className="mt-1 text-sm font-medium text-amber-600">Only {item.stock} left</p>
                  ) : null}

                  <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-3">
                    <div className="flex items-center rounded-lg border border-slate-300">
                      <button
                        type="button"
                        aria-label="Decrease quantity"
                        disabled={item.quantity <= 1}
                        onClick={() => setQuantity(item.variantId, item.quantity - 1)}
                        className="px-3 py-1.5 font-semibold disabled:text-slate-300"
                      >
                        −
                      </button>
                      <span className="min-w-8 px-2 text-center text-sm font-semibold">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        aria-label="Increase quantity"
                        disabled={atLimit}
                        onClick={() => setQuantity(item.variantId, item.quantity + 1)}
                        className="px-3 py-1.5 font-semibold disabled:text-slate-300"
                      >
                        +
                      </button>
                    </div>

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

        <aside className="mt-6 h-fit rounded-xl border border-slate-200 p-5 lg:mt-0">
          <div className="flex justify-between text-sm text-slate-700">
            <span>Subtotal</span>
            <span className="font-semibold text-slate-900">{formatNaira(subtotalKobo)}</span>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Delivery and the final total are shown at checkout.
          </p>

          {hasSoldOutItem ? (
            <button
              type="button"
              disabled
              className="mt-5 block w-full rounded-lg bg-slate-300 px-6 py-3 text-center font-semibold text-white"
            >
              Remove sold out items to continue
            </button>
          ) : (
            <Link
              href="/checkout/"
              className="mt-5 block rounded-lg bg-blue-700 px-6 py-3 text-center font-semibold text-white hover:bg-blue-800"
            >
              Checkout
            </Link>
          )}

          <a
            href={SITE.whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 block rounded-lg border border-slate-300 px-6 py-3 text-center font-semibold text-slate-800 hover:border-slate-500"
          >
            Order on WhatsApp instead
          </a>
        </aside>
      </div>
    </section>
  );
}

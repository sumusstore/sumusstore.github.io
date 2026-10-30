"use client";

import Image from "next/image";
import Link from "next/link";
import { useHydrated } from "@/hooks/use-hydrated";
import { formatNaira } from "@/lib/format";
import { SITE } from "@/lib/site-config";
import { selectSubtotalKobo, useCartStore, type CartItem } from "@/stores/cart-store";
import { useWishlistStore } from "@/stores/wishlist-store";

function stockNote(stock: number): { text: string; className: string } | null {
  if (stock <= 0) return { text: "Sold out. Remove this item to check out.", className: "text-red-600" };
  if (stock <= 5) return { text: `Only ${stock} left`, className: "text-amber-700" };
  return null;
}

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
        <h1 className="text-2xl font-bold text-ink">Your cart is empty</h1>
        <p className="mt-2 text-sm text-slate-600">Add a product to see it here.</p>
        <Link
          href="/shop/"
          className="mt-6 inline-block rounded-full bg-blue-700 px-6 py-3 font-semibold text-white hover:bg-blue-800"
        >
          Shop all products
        </Link>
      </section>
    );
  }

  const itemCount = items.reduce((total, item) => total + item.quantity, 0);
  const itemWord = itemCount === 1 ? "item" : "items";
  const hasSoldOutItem = items.some((item) => item.stock <= 0);

  // Moves an item to the wishlist, then takes it out of the cart. Skips the wishlist if it's already there.
  function saveForLater(item: CartItem) {
    const wishlist = useWishlistStore.getState();
    const alreadySaved = wishlist.items.some((saved) => saved.variantId === item.variantId);
    if (!alreadySaved) {
      wishlist.toggleItem({
        variantId: item.variantId,
        productId: item.productId,
        slug: item.slug,
        name: item.name,
        variantLabel: item.variantLabel,
        imageUrl: item.imageUrl,
        priceKobo: item.unitPriceKobo,
      });
    }
    removeItem(item.variantId);
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="text-2xl font-bold text-ink md:text-3xl">Shopping cart</h1>
      <p className="mt-1 text-sm text-slate-600">
        {itemCount} {itemWord}
      </p>

      <div className="mt-6 lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-8">
        <ul className="space-y-4">
          {items.map((item) => {
            const note = stockNote(item.stock);
            const atLimit = item.quantity >= item.stock;

            return (
              <li key={item.variantId} className="flex gap-4 rounded-xl border border-slate-200 bg-white p-4">
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
                  <div className="flex justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/product/${item.slug}/`}
                        className="font-semibold text-ink hover:text-blue-700"
                      >
                        {item.name}
                      </Link>
                      {item.variantLabel && (
                        <p className="text-sm text-slate-500">{item.variantLabel}</p>
                      )}
                      <p className="mt-1 text-xs text-slate-500">Sold by {SITE.name}</p>
                    </div>

                    <p className="shrink-0 text-right">
                      <span className="block font-bold text-ink">
                        {formatNaira(item.unitPriceKobo * item.quantity)}
                      </span>
                      {item.quantity > 1 && (
                        <span className="block text-xs text-slate-500">
                          {formatNaira(item.unitPriceKobo)} each
                        </span>
                      )}
                    </p>
                  </div>

                  {note && <p className={`mt-1 text-sm font-medium ${note.className}`}>{note.text}</p>}

                  <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-3">
                    <div className="flex items-center rounded-md border border-slate-300">
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

                    <div className="flex gap-4 text-sm font-semibold">
                      <button
                        type="button"
                        onClick={() => saveForLater(item)}
                        className="text-blue-700 hover:underline"
                      >
                        Save for later
                      </button>
                      <button
                        type="button"
                        onClick={() => removeItem(item.variantId)}
                        className="text-slate-600 hover:text-red-600 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <aside className="mt-6 rounded-xl border border-slate-200 bg-white p-5 lg:sticky lg:top-40 lg:mt-0">
          <p className="text-base font-bold text-ink">Summary</p>

          <div className="mt-4 flex justify-between text-sm text-slate-700">
            <span>
              Subtotal ({itemCount} {itemWord})
            </span>
            <span className="font-semibold text-ink">{formatNaira(subtotalKobo)}</span>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Delivery is calculated at checkout, where you choose your option.
          </p>

          {hasSoldOutItem ? (
            <button
              type="button"
              disabled
              className="mt-5 block w-full rounded-full bg-slate-300 px-6 py-3 text-center font-semibold text-white"
            >
              Remove sold out items to continue
            </button>
          ) : (
            <Link
              href="/checkout/"
              className="mt-5 block rounded-full bg-blue-700 px-6 py-3 text-center font-semibold text-white hover:bg-blue-800"
            >
              Checkout
            </Link>
          )}

          <a
            href={SITE.whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 block rounded-full border border-slate-300 px-6 py-3 text-center font-semibold text-ink hover:border-slate-500"
          >
            Order on WhatsApp instead
          </a>
        </aside>
      </div>
    </section>
  );
}

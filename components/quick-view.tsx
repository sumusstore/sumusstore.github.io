"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useProductDetail, type DetailVariant } from "@/hooks/use-product-detail";
import { formatNaira } from "@/lib/format";
import { useCartStore } from "@/stores/cart-store";

type QuickViewProps = {
  slug: string;
  /** The version shown on the card, so the quick view opens on the same one. */
  preferredVariantId: string;
  onClose: () => void;
};

export function QuickView({ slug, preferredVariantId, onClose }: QuickViewProps) {
  const { product, status } = useProductDetail(slug);
  const addItem = useCartStore((state) => state.addItem);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [justAdded, setJustAdded] = useState(false);

  // Escape closes the dialog.
  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const variants = useMemo(() => product?.variants ?? [], [product]);
  const images = useMemo(
    () => (product ? [...product.images].sort((a, b) => a.position - b.position) : []),
    [product]
  );

  const variant: DetailVariant | null = useMemo(
    () =>
      variants.find((v) => v.id === selectedId) ??
      variants.find((v) => v.id === preferredVariantId) ??
      variants.find((v) => v.stock > 0) ??
      variants[0] ??
      null,
    [variants, selectedId, preferredVariantId]
  );

  const imageUrl =
    images.find((image) => image.variantId === variant?.id)?.url ??
    images.find((image) => image.variantId === null)?.url ??
    null;

  function handleAddToCart() {
    if (!product || !variant) return;
    addItem({
      variantId: variant.id,
      productId: product.id,
      slug: product.slug,
      name: product.name,
      variantLabel: variant.label,
      imageUrl,
      unitPriceKobo: variant.priceKobo,
      stock: variant.stock,
    });
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1500);
  }

  const soldOut = !variant || variant.stock <= 0;
  const onSale = variant !== null && variant.compareAtKobo !== null && variant.compareAtKobo > variant.priceKobo;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Quick view"
        onClick={(event) => event.stopPropagation()}
        className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:max-w-3xl sm:rounded-2xl sm:p-6"
      >
        <div className="mb-3 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-3 py-1 text-sm font-semibold text-slate-600 hover:bg-slate-100"
          >
            Close
          </button>
        </div>

        {status === "loading" && <p className="text-sm text-slate-600">Loading…</p>}
        {status === "error" && (
          <p className="text-sm text-slate-600">This product couldn&apos;t load. Try again shortly.</p>
        )}
        {status === "ready" && !product && (
          <p className="text-sm text-slate-600">This product is no longer available.</p>
        )}
        {product && !variant && (
          <p className="text-sm text-slate-600">No versions are available right now.</p>
        )}

        {product && variant && (
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="relative aspect-square overflow-hidden rounded-xl bg-slate-100">
              {imageUrl ? (
                <Image
                  src={imageUrl}
                  alt={product.name}
                  fill
                  sizes="(min-width: 640px) 360px, 90vw"
                  className="object-contain p-4"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-slate-400">
                  Photo coming soon
                </div>
              )}
            </div>

            <div>
              {product.brand && (
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {product.brand}
                </p>
              )}
              <h2 className="mt-1 text-xl font-bold text-slate-900">{product.name}</h2>

              <p className="mt-3 text-2xl font-bold text-slate-900">{formatNaira(variant.priceKobo)}</p>
              {onSale && variant.compareAtKobo !== null && (
                <p className="text-sm text-slate-400 line-through">{formatNaira(variant.compareAtKobo)}</p>
              )}

              <p className="mt-2 text-sm font-medium text-slate-700">
                {variant.stock <= 0
                  ? "Out of stock"
                  : variant.stock <= 5
                    ? `Only ${variant.stock} left`
                    : "In stock"}
              </p>

              {variants.length > 1 && (
                <div className="mt-4">
                  <p className="text-sm font-semibold text-slate-900">Choose a version</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {variants.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setSelectedId(option.id)}
                        aria-pressed={option.id === variant.id}
                        disabled={option.stock <= 0}
                        className={`rounded-lg border px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:text-slate-400 ${
                          option.id === variant.id
                            ? "border-blue-700 bg-blue-50 text-blue-700"
                            : "border-slate-300 text-slate-700 hover:border-slate-500"
                        }`}
                      >
                        {option.label || "Standard"}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handleAddToCart}
                disabled={soldOut}
                className="mt-6 w-full rounded-lg bg-blue-700 px-6 py-3 font-semibold text-white hover:bg-blue-800 disabled:bg-slate-300"
              >
                {soldOut ? "Sold out" : justAdded ? "Added to cart" : "Add to cart"}
              </button>

              <Link
                href={`/product/${product.slug}/`}
                className="mt-3 block text-center text-sm font-semibold text-blue-700 hover:underline"
              >
                View full details
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

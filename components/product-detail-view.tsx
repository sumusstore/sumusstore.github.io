"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Countdown } from "@/components/countdown";
import { HeartIcon } from "@/components/icons";
import { ProductGallery } from "@/components/product-gallery";
import { ProductRow } from "@/components/product-row";
import { useCatalogue } from "@/hooks/use-catalogue";
import { useHydrated } from "@/hooks/use-hydrated";
import { useProductDetail, type DetailVariant } from "@/hooks/use-product-detail";
import { EMPTY_FILTERS, buildCards, scopeProducts } from "@/lib/catalogue";
import { formatNaira } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import { useCartStore } from "@/stores/cart-store";
import { selectIsWishlisted, useWishlistStore } from "@/stores/wishlist-store";

type Tab = "description" | "specs" | "reviews";

const TABS: { value: Tab; label: string }[] = [
  { value: "description", label: "Description" },
  { value: "specs", label: "Specifications" },
  { value: "reviews", label: "Reviews" },
];

type DeliveryZone = {
  name: string;
  fee_kobo: number;
  min_days: number;
  max_days: number;
};

const byPosition = (a: { position: number }, b: { position: number }) => a.position - b.position;

function unique(values: (string | null)[]): string[] {
  return [...new Set(values.filter((value): value is string => value !== null))];
}

// Sorts storage sizes by number, so 128GB comes before 256GB.
function sortStorage(values: string[]): string[] {
  return [...values].sort((a, b) => (parseInt(a, 10) || 0) - (parseInt(b, 10) || 0));
}

function stockStatus(stock: number): { text: string; className: string } {
  if (stock <= 0) return { text: "Out of stock", className: "text-red-600" };
  if (stock <= 5) return { text: `Only ${stock} left`, className: "text-amber-600" };
  return { text: "In stock", className: "text-green-700" };
}

function deliveryTimeline(zone: DeliveryZone): string {
  if (zone.min_days === 0 && zone.max_days <= 1) return "Same day or next working day";
  return `${zone.min_days} to ${zone.max_days} working days`;
}

/** Starts on the first in-stock variant, so shoppers see something they can buy. */
function defaultVariant(variants: DetailVariant[]): DetailVariant | null {
  return variants.find((v) => v.stock > 0) ?? variants[0] ?? null;
}

type OptionGroupProps = {
  title: string;
  options: string[];
  selected: string | null;
  onSelect: (value: string) => void;
};

function OptionGroup({ title, options, selected, onSelect }: OptionGroupProps) {
  return (
    <div className="mt-5">
      <p className="text-sm font-semibold text-slate-900">
        {title}: <span className="font-normal text-slate-600">{selected ?? "Choose"}</span>
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((option) => {
          const isSelected = option === selected;
          return (
            <button
              key={option}
              type="button"
              onClick={() => onSelect(option)}
              aria-pressed={isSelected}
              className={`rounded-lg border px-4 py-2 text-sm font-medium ${
                isSelected
                  ? "border-blue-700 bg-blue-50 text-blue-700"
                  : "border-slate-300 text-slate-700 hover:border-slate-500"
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ProductDetailView({ slug }: { slug: string }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const { product, status } = useProductDetail(slug);
  const { products: catalogue, status: catalogueStatus } = useCatalogue();

  const addItem = useCartStore((state) => state.addItem);
  const toggleWishlist = useWishlistStore((state) => state.toggleItem);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [tab, setTab] = useState<Tab>("description");
  const [justAdded, setJustAdded] = useState(false);
  const [zones, setZones] = useState<DeliveryZone[]>([]);

  useEffect(() => {
    let active = true;

    async function loadZones() {
      const { data } = await supabase
        .from("delivery_zones")
        .select("name, fee_kobo, min_days, max_days")
        .eq("is_active", true)
        .order("fee_kobo", { ascending: true });
      if (active && data) setZones(data as DeliveryZone[]);
    }

    loadZones();
    return () => {
      active = false;
    };
  }, []);

  const variants = useMemo(() => product?.variants ?? [], [product]);

  const variant = useMemo(
    () => variants.find((v) => v.id === selectedId) ?? defaultVariant(variants),
    [variants, selectedId]
  );

  const storages = useMemo(
    () => sortStorage(unique(variants.map((v) => v.storage))),
    [variants]
  );
  const colours = useMemo(() => unique(variants.map((v) => v.colour)), [variants]);

  // Photos for the chosen variant come first, then photos shared by the whole product.
  const images = useMemo(() => {
    if (!product) return [];
    const forVariant = variant
      ? product.images.filter((image) => image.variantId === variant.id).sort(byPosition)
      : [];
    const shared = product.images
      .filter((image) => image.variantId === null)
      .sort(byPosition);
    return [...forVariant, ...shared].map((image) => image.url);
  }, [product, variant]);

  const related = useMemo(() => {
    if (!product || !product.categoryId) return [];
    const scoped = scopeProducts(catalogue, [product.categoryId], "");
    return buildCards(scoped, EMPTY_FILTERS, "featured")
      .filter((card) => card.productId !== product.id)
      .slice(0, 4);
  }, [catalogue, product]);

  const reviewSummary = useMemo(() => {
    if (!product || product.reviews.length === 0) return null;
    const total = product.reviews.reduce((sum, review) => sum + review.rating, 0);
    return { average: total / product.reviews.length, count: product.reviews.length };
  }, [product]);

  const wishlisted = useWishlistStore(selectIsWishlisted(variant?.id ?? ""));
  const wished = hydrated && wishlisted;

  // All hooks are above this line. The checks below only decide what to show.
  if (status === "loading") {
    return (
      <section className="mx-auto max-w-6xl px-4 py-8">
        <div className="md:grid md:grid-cols-2 md:gap-10">
          <div className="aspect-square animate-pulse rounded-xl bg-slate-100" />
          <div className="mt-6 space-y-4 md:mt-0">
            <div className="h-8 w-3/4 animate-pulse rounded bg-slate-100" />
            <div className="h-6 w-1/3 animate-pulse rounded bg-slate-100" />
            <div className="h-12 w-full animate-pulse rounded bg-slate-100" />
          </div>
        </div>
      </section>
    );
  }

  if (status === "error") {
    return (
      <p className="mx-auto max-w-6xl px-4 py-16 text-sm text-slate-600">
        Product details are unavailable right now. Please refresh the page shortly.
      </p>
    );
  }

  if (!product) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Product not found</h1>
        <p className="mt-2 text-sm text-slate-600">
          It may have been removed, or the link may be wrong.
        </p>
        <Link href="/shop/" className="mt-6 inline-block font-semibold text-blue-700 hover:underline">
          Browse all products
        </Link>
      </section>
    );
  }

  // Changing storage or colour picks the matching variant, or the closest one that exists.
  function choose(next: { storage?: string | null; colour?: string | null }) {
    const storage = next.storage !== undefined ? next.storage : (variant?.storage ?? null);
    const colour = next.colour !== undefined ? next.colour : (variant?.colour ?? null);

    const match =
      variants.find((v) => v.storage === storage && v.colour === colour) ??
      variants.find((v) => v.storage === storage) ??
      variants.find((v) => v.colour === colour);

    if (match) {
      setSelectedId(match.id);
      setQuantity(1);
    }
  }

  const priceKobo = variant?.priceKobo ?? 0;
  const compareAt = variant?.compareAtKobo ?? null;
  const onSale = compareAt !== null && compareAt > priceKobo;
  const percent =
    onSale && compareAt !== null ? Math.round(((compareAt - priceKobo) / compareAt) * 100) : 0;
  const stock = variant?.stock ?? 0;
  const soldOut = !variant || stock <= 0;
  const maxQuantity = Math.max(1, stock);
  const safeQuantity = Math.min(quantity, maxQuantity);
  const stockInfo = stockStatus(stock);
  const saleEnds = variant?.saleEndsAt ?? null;
  const timerActive = saleEnds !== null && new Date(saleEnds).getTime() > Date.now();

  function buildCartItem() {
    if (!variant) return null;
    return {
      variantId: variant.id,
      productId: product!.id,
      slug: product!.slug,
      name: product!.name,
      variantLabel: variant.label,
      imageUrl: images[0] ?? null,
      unitPriceKobo: variant.priceKobo,
      stock: variant.stock,
      quantity: safeQuantity,
    };
  }

  function handleAddToCart() {
    const item = buildCartItem();
    if (!item) return;
    addItem(item);
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1500);
  }

  function handleBuyNow() {
    const item = buildCartItem();
    if (!item) return;
    addItem(item);
    router.push("/checkout/");
  }

  function handleWishlist() {
    if (!variant) return;
    toggleWishlist({
      variantId: variant.id,
      productId: product!.id,
      slug: product!.slug,
      name: product!.name,
      variantLabel: variant.label,
      imageUrl: images[0] ?? null,
      priceKobo: variant.priceKobo,
    });
  }

  return (
    <div className="pb-28 md:pb-0">
      <section className="mx-auto max-w-6xl px-4 py-8">
        <nav aria-label="Breadcrumb" className="mb-4 text-sm text-slate-500">
          <Link href="/" className="hover:text-blue-700">
            Home
          </Link>
          {product.categorySlug && product.categoryName && (
            <>
              <span className="mx-2" aria-hidden="true">/</span>
              <Link href={`/category/${product.categorySlug}/`} className="hover:text-blue-700">
                {product.categoryName}
              </Link>
            </>
          )}
          <span className="mx-2" aria-hidden="true">/</span>
          <span className="text-slate-800">{product.name}</span>
        </nav>

        <div className="md:grid md:grid-cols-2 md:gap-10">
          <ProductGallery urls={images} alt={product.name} />

          <div className="mt-6 md:mt-0">
            {product.brand && (
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                {product.brand}
              </p>
            )}
            <h1 className="mt-1 text-2xl font-bold text-slate-900 md:text-3xl">{product.name}</h1>

            {reviewSummary && (
              <p className="mt-2 text-sm text-slate-600">
                {reviewSummary.average.toFixed(1)} out of 5 · {reviewSummary.count}{" "}
                {reviewSummary.count === 1 ? "review" : "reviews"}
              </p>
            )}

            <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-3xl font-bold text-slate-900">
                {variant ? formatNaira(priceKobo) : "Not available"}
              </span>
              {onSale && compareAt !== null && (
                <>
                  <span className="text-slate-400 line-through">{formatNaira(compareAt)}</span>
                  <span className="rounded bg-red-600 px-2 py-0.5 text-xs font-bold text-white">
                    -{percent}%
                  </span>
                </>
              )}
            </div>

            {saleEnds && timerActive && (
              <div className="mt-2">
                <Countdown endsAt={saleEnds} />
              </div>
            )}

            <p className={`mt-2 text-sm font-semibold ${stockInfo.className}`}>{stockInfo.text}</p>

            {storages.length > 0 && (
              <OptionGroup
                title="Storage"
                options={storages}
                selected={variant?.storage ?? null}
                onSelect={(value) => choose({ storage: value })}
              />
            )}

            {colours.length > 0 && (
              <OptionGroup
                title="Colour"
                options={colours}
                selected={variant?.colour ?? null}
                onSelect={(value) => choose({ colour: value })}
              />
            )}

            <div className="mt-6 flex items-center gap-4">
              <span className="text-sm font-semibold text-slate-900">Quantity</span>
              <div className="flex items-center rounded-lg border border-slate-300">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, safeQuantity - 1))}
                  disabled={soldOut || safeQuantity <= 1}
                  aria-label="Decrease quantity"
                  className="px-3 py-2 font-semibold disabled:text-slate-300"
                >
                  -
                </button>
                <span aria-live="polite" className="min-w-10 px-2 text-center font-semibold">
                  {soldOut ? 0 : safeQuantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity(Math.min(maxQuantity, safeQuantity + 1))}
                  disabled={soldOut || safeQuantity >= maxQuantity}
                  aria-label="Increase quantity"
                  className="px-3 py-2 font-semibold disabled:text-slate-300"
                >
                  +
                </button>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={soldOut}
                className="flex-1 rounded-lg bg-blue-700 px-6 py-3 font-semibold text-white hover:bg-blue-800 disabled:bg-slate-300"
              >
                {soldOut ? "Sold out" : justAdded ? "Added to cart" : "Add to cart"}
              </button>
              <button
                type="button"
                onClick={handleBuyNow}
                disabled={soldOut}
                className="flex-1 rounded-lg border border-blue-700 px-6 py-3 font-semibold text-blue-700 hover:bg-blue-50 disabled:border-slate-300 disabled:text-slate-400"
              >
                Buy now
              </button>
              <button
                type="button"
                onClick={handleWishlist}
                aria-pressed={wished}
                aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
                className="flex items-center justify-center rounded-lg border border-slate-300 px-4 py-3 hover:border-red-600 hover:text-red-600"
              >
                <HeartIcon className={`h-5 w-5 ${wished ? "fill-red-600 text-red-600" : ""}`} />
              </button>
            </div>

            <div className="mt-6 rounded-xl border border-slate-200 p-4">
              <p className="font-semibold text-slate-900">Delivery</p>
              {zones.length === 0 ? (
                <p className="mt-2 text-sm text-slate-600">Delivery options are loading.</p>
              ) : (
                <ul className="mt-2 space-y-2 text-sm text-slate-700">
                  {zones.map((zone) => (
                    <li key={zone.name} className="flex flex-wrap justify-between gap-2">
                      <span>{zone.name}</span>
                      <span className="text-right">
                        {zone.fee_kobo === 0 ? "Free" : formatNaira(zone.fee_kobo)} ·{" "}
                        {deliveryTimeline(zone)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-3 text-xs text-slate-500">
                The final delivery fee is confirmed at checkout.{" "}
                <Link href="/stores/" className="font-medium text-blue-700 hover:underline">
                  Find a store for pickup
                </Link>
              </p>
            </div>

            <ul className="mt-4 space-y-1 text-sm text-slate-700">
              <li>✓ Genuine product</li>
              <li>
                ✓ Warranty on every item.{" "}
                <Link href="/warranty/" className="font-medium text-blue-700 hover:underline">
                  Warranty details
                </Link>
              </li>
              <li>
                ✓ Returns policy.{" "}
                <Link href="/returns/" className="font-medium text-blue-700 hover:underline">
                  Read more
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12">
          <div role="tablist" className="flex gap-6 border-b border-slate-200">
            {TABS.map((item) => (
              <button
                key={item.value}
                type="button"
                role="tab"
                aria-selected={tab === item.value}
                onClick={() => setTab(item.value)}
                className={`-mb-px border-b-2 pb-3 text-sm font-semibold ${
                  tab === item.value
                    ? "border-blue-700 text-blue-700"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="py-6">
            {tab === "description" && (
              <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">
                {product.description ?? "A full description will be added soon."}
              </p>
            )}

            {tab === "specs" &&
              (Object.keys(product.specifications).length === 0 ? (
                <p className="text-sm text-slate-600">Specifications will be added soon.</p>
              ) : (
                <dl className="divide-y divide-slate-200 rounded-xl border border-slate-200">
                  {Object.entries(product.specifications).map(([key, value]) => (
                    <div key={key} className="grid grid-cols-2 gap-4 px-4 py-3 text-sm">
                      <dt className="font-medium text-slate-900">{key}</dt>
                      <dd className="text-slate-700">{String(value)}</dd>
                    </div>
                  ))}
                </dl>
              ))}

            {tab === "reviews" && (
              <div>
                {product.reviews.length === 0 ? (
                  <p className="text-sm text-slate-600">No reviews yet.</p>
                ) : (
                  <ul className="space-y-4">
                    {product.reviews.map((review) => (
                      <li key={review.id} className="rounded-xl border border-slate-200 p-4">
                        <p className="text-amber-500">
                          {"★".repeat(review.rating)}
                          <span className="text-slate-300">{"★".repeat(5 - review.rating)}</span>
                        </p>
                        {review.comment && (
                          <p className="mt-2 text-sm text-slate-700">{review.comment}</p>
                        )}
                        <p className="mt-2 text-xs text-slate-500">
                          {new Date(review.createdAt).toLocaleDateString("en-NG", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mt-6 text-sm text-slate-600">
                  Reviews appear after we check them. Writing a review needs an account, which
                  comes with the account pages.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {(related.length > 0 || catalogueStatus === "loading") && (
        <div className="border-t border-slate-200">
          <ProductRow
            title="You may also like"
            subtitle={product.categoryName ? `More from ${product.categoryName}` : undefined}
            products={related}
            status={catalogueStatus}
          />
        </div>
      )}

      {/* Mobile buy bar: price and Add to cart stay visible while scrolling. */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white px-4 py-3 shadow-lg md:hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-xs text-slate-500">{variant?.label || product.name}</p>
            <p className="font-bold text-slate-900">
              {variant ? formatNaira(priceKobo) : "Not available"}
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={soldOut}
            className="shrink-0 rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white disabled:bg-slate-300"
          >
            {soldOut ? "Sold out" : justAdded ? "Added" : "Add to cart"}
          </button>
        </div>
      </div>
    </div>
  );
}

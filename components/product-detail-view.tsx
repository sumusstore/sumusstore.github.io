"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Countdown } from "@/components/countdown";
import { ChevronDownIcon, HeartIcon } from "@/components/icons";
import { Modal } from "@/components/modal";
import { ProductGallery } from "@/components/product-gallery";
import { ProductRow } from "@/components/product-row";
import { VariantPicker, type PickerOption } from "@/components/variant-picker";
import { useCatalogue } from "@/hooks/use-catalogue";
import { useHydrated } from "@/hooks/use-hydrated";
import { useProductDetail, type DetailVariant } from "@/hooks/use-product-detail";
import { EMPTY_FILTERS, buildCards, scopeProducts } from "@/lib/catalogue";
import { formatNaira } from "@/lib/format";
import { SITE } from "@/lib/site-config";
import { supabase } from "@/lib/supabase";
import { useCartStore } from "@/stores/cart-store";
import { selectIsWishlisted, useWishlistStore } from "@/stores/wishlist-store";

type DeliveryZone = {
  name: string;
  fee_kobo: number;
  min_days: number;
  max_days: number;
};

type ModalName = "condition" | "delivery" | "item" | "description" | null;

// The most a shopper can pick in the quantity box at once.
const MAX_QUANTITY = 10;

const byPosition = (a: { position: number }, b: { position: number }) => a.position - b.position;

function unique(values: (string | null)[]): string[] {
  return [...new Set(values.filter((value): value is string => value !== null))];
}

// Sorts storage sizes by number, so 128GB comes before 256GB.
function sortStorage(values: string[]): string[] {
  return [...values].sort((a, b) => (parseInt(a, 10) || 0) - (parseInt(b, 10) || 0));
}

function stockStatus(stock: number): { text: string; className: string } {
  if (stock <= 0) return { text: "Sold out", className: "text-red-600" };
  if (stock <= 5) return { text: `Only ${stock} left`, className: "text-amber-700" };
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

/** One line in a details pop-up: a label on the left, the value on the right. */
function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[9rem_minmax(0,1fr)] gap-4 py-3 text-sm">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-ink">{value}</dd>
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
  const [justAdded, setJustAdded] = useState(false);
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [modal, setModal] = useState<ModalName>(null);

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
      <section className="mx-auto max-w-6xl px-4 py-6">
        <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 border-t-4 border-t-gold bg-white px-6 py-16 text-center">
          <span
            aria-hidden="true"
            className="h-10 w-10 animate-spin rounded-full border-4 border-blue-100 border-t-blue-700"
          />
          <p className="mt-4 font-semibold text-ink">Loading product…</p>
          <p className="mt-1 text-sm text-slate-500">This usually takes a moment.</p>
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
        <h1 className="text-2xl font-bold text-ink">Product not found</h1>
        <p className="mt-2 text-sm text-slate-600">
          It may have been removed, or the link may be wrong.
        </p>
        <Link
          href="/shop/"
          className="mt-6 inline-block rounded-full bg-blue-700 px-6 py-3 font-semibold text-white hover:bg-blue-800"
        >
          Browse all products
        </Link>
      </section>
    );
  }

  function closeModal() {
    setModal(null);
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

  const storages = sortStorage(unique(variants.map((v) => v.storage)));
  const colours = unique(variants.map((v) => v.colour));

  const storageOptions: PickerOption[] = storages.map((storage) => {
    const inStock = variants.some((v) => v.storage === storage && v.stock > 0);
    return { value: storage, label: inStock ? storage : `${storage} (sold out)`, disabled: !inStock };
  });

  const colourOptions: PickerOption[] = colours.map((colour) => {
    const inStock = variants.some((v) => v.colour === colour && v.stock > 0);
    return { value: colour, label: inStock ? colour : `${colour} (sold out)`, disabled: !inStock };
  });

  const priceKobo = variant?.priceKobo ?? 0;
  const compareAt = variant?.compareAtKobo ?? null;
  const onSale = compareAt !== null && compareAt > priceKobo;
  const percent =
    onSale && compareAt !== null ? Math.round(((compareAt - priceKobo) / compareAt) * 100) : 0;
  const stock = variant?.stock ?? 0;
  const soldOut = !variant || stock <= 0;
  const maxQuantity = Math.max(1, Math.min(stock, MAX_QUANTITY));
  const safeQuantity = Math.min(quantity, maxQuantity);
  const stockInfo = stockStatus(stock);
  const saleEnds = variant?.saleEndsAt ?? null;
  const timerActive = saleEnds !== null && new Date(saleEnds).getTime() > Date.now();

  const quantityOptions: PickerOption[] = soldOut
    ? []
    : Array.from({ length: maxQuantity }, (_, index) => ({
        value: String(index + 1),
        label: String(index + 1),
      }));

  const deliverySummary =
    zones.length === 0
      ? "Loading delivery options…"
      : zones
          .filter((zone) => zone.name !== "Store Pickup")
          .map((zone) => `${zone.name}: ${deliveryTimeline(zone)}`)
          .join(" · ");

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

  // The heart sits on the photo, as in the screenshot.
  const heartButton = (
    <button
      type="button"
      onClick={handleWishlist}
      aria-pressed={wished}
      aria-label={wished ? "Remove from wishlist" : "Save to wishlist"}
      className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-md ring-1 ring-slate-200 hover:scale-105"
    >
      <HeartIcon className={`h-5 w-5 ${wished ? "fill-red-600 text-red-600" : "text-ink"}`} />
    </button>
  );

  return (
    <div>
      <section className="mx-auto max-w-6xl px-4 py-6">
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
          <span className="text-ink">{product.name}</span>
        </nav>

        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start lg:gap-10">
          <ProductGallery urls={images} alt={product.name} action={heartButton} />

          {/* Buying panel: in the same order as the screenshot. It stays in view on a computer. */}
          <aside className="mt-5 lg:sticky lg:top-40 lg:mt-0">
            <h1 className="text-2xl font-bold leading-snug text-ink md:text-3xl">{product.name}</h1>

            <div className="mt-4 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span
                  aria-hidden="true"
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-700 text-lg font-extrabold text-white"
                >
                  {SITE.name.charAt(0)}
                </span>
                <div className="min-w-0">
                  <Link href="/about/" className="font-bold text-ink hover:text-blue-700 hover:underline">
                    {SITE.name}
                  </Link>
                  <p className="text-sm text-slate-600">Genuine products · Warranty on every item</p>
                </div>
              </div>
              <a
                href={SITE.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 rounded-full border border-slate-400 px-5 py-2 text-sm font-semibold text-ink hover:border-slate-700"
              >
                Message
              </a>
            </div>

            <div className="mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-3xl font-bold text-ink">
                {variant ? formatNaira(priceKobo) : "Not available"}
              </span>
              {onSale && compareAt !== null && (
                <>
                  <span className="text-slate-500 line-through">{formatNaira(compareAt)}</span>
                  <span className="rounded bg-gold px-2 py-0.5 text-xs font-bold text-ink">-{percent}%</span>
                </>
              )}
            </div>

            {saleEnds && timerActive && (
              <div className="mt-2">
                <Countdown endsAt={saleEnds} />
              </div>
            )}

            <p className={`mt-2 text-sm font-semibold ${stockInfo.className}`}>{stockInfo.text}</p>

            <button
              type="button"
              onClick={() => setModal("delivery")}
              className="mt-5 flex w-full items-center justify-between gap-4 border-t border-slate-200 pt-4 text-left"
            >
              <span className="min-w-0">
                <span className="block font-semibold text-ink">Delivery</span>
                <span className="mt-1 block text-sm text-slate-700">{deliverySummary}</span>
              </span>
              <ChevronDownIcon className="h-5 w-5 shrink-0 -rotate-90 text-ink" />
            </button>

            <p className="mt-4 flex flex-wrap items-center gap-2 text-sm text-slate-600">
              Condition <span className="font-bold text-ink">New</span>
              <button
                type="button"
                onClick={() => setModal("condition")}
                aria-label="What new condition means"
                className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-500 text-xs font-bold text-slate-600 hover:border-ink hover:text-ink"
              >
                i
              </button>
            </p>

            {storageOptions.length > 0 && (
              <div className="mt-4">
                <VariantPicker
                  label="Storage"
                  options={storageOptions}
                  value={variant?.storage ?? null}
                  onChange={(value) => choose({ storage: value })}
                />
              </div>
            )}

            {colourOptions.length > 0 && (
              <div className="mt-4">
                <VariantPicker
                  label="Colour"
                  options={colourOptions}
                  value={variant?.colour ?? null}
                  onChange={(value) => choose({ colour: value })}
                />
              </div>
            )}

            <div className="mt-4">
              <VariantPicker
                label="Quantity"
                options={quantityOptions}
                value={soldOut ? null : String(safeQuantity)}
                onChange={(value) => setQuantity(Number(value))}
                placeholder="0"
              />
            </div>

            <div className="mt-5 space-y-3">
              <button
                type="button"
                onClick={handleBuyNow}
                disabled={soldOut}
                className="w-full rounded-full bg-blue-700 px-6 py-3 font-semibold text-white hover:bg-blue-800 disabled:bg-slate-300"
              >
                Buy it now
              </button>
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={soldOut}
                className="w-full rounded-full border border-blue-700 px-6 py-3 font-semibold text-blue-700 hover:bg-blue-50 disabled:border-slate-300 disabled:text-slate-400"
              >
                {soldOut ? "Sold out" : justAdded ? "Added to cart" : "Add to cart"}
              </button>
              <button
                type="button"
                onClick={handleWishlist}
                aria-pressed={wished}
                className="flex w-full items-center justify-center gap-2 rounded-full border border-blue-700 px-6 py-3 font-semibold text-blue-700 hover:bg-blue-50"
              >
                <HeartIcon className={`h-5 w-5 ${wished ? "fill-red-600 text-red-600" : ""}`} />
                {wished ? "Saved to wishlist" : "Save to wishlist"}
              </button>
            </div>

            <ul className="mt-5 space-y-2 rounded-xl bg-paper p-4 text-sm text-slate-700">
              <li>✓ Genuine product</li>
              <li>
                ✓ Warranty on every item.{" "}
                <Link href="/warranty/" className="font-semibold text-blue-700 hover:underline">
                  Details
                </Link>
              </li>
              <li>
                ✓ Returns policy.{" "}
                <Link href="/returns/" className="font-semibold text-blue-700 hover:underline">
                  Read more
                </Link>
              </li>
            </ul>
          </aside>
        </div>

        {/* About this item: two rows that open pop-up boxes */}
        <section className="mt-10 border-t border-slate-200 pt-8">
          <h2 className="text-xl font-bold text-ink">About this item</h2>

          <div className="mt-4 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
            <button
              type="button"
              onClick={() => setModal("item")}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left hover:bg-slate-50"
            >
              <span className="min-w-0">
                <span className="block font-semibold text-ink">Item description</span>
                <span className="mt-1 block truncate text-sm text-slate-600">
                  Condition, brand and specifications
                </span>
              </span>
              <ChevronDownIcon className="h-5 w-5 shrink-0 -rotate-90 text-ink" />
            </button>

            <button
              type="button"
              onClick={() => setModal("description")}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left hover:bg-slate-50"
            >
              <span className="min-w-0">
                <span className="block font-semibold text-ink">Description from {SITE.name}</span>
                <span className="mt-1 block truncate text-sm text-slate-600">
                  {product.description ?? "A full description will be added soon."}
                </span>
              </span>
              <ChevronDownIcon className="h-5 w-5 shrink-0 -rotate-90 text-ink" />
            </button>
          </div>
        </section>

        {/* Reviews */}
        <section className="mt-10 border-t border-slate-200 pt-8">
          <h2 className="text-xl font-bold text-ink">Reviews</h2>
          {reviewSummary ? (
            <p className="mt-2 text-sm text-slate-600">
              {reviewSummary.average.toFixed(1)} out of 5 · {reviewSummary.count}{" "}
              {reviewSummary.count === 1 ? "review" : "reviews"}
            </p>
          ) : (
            <p className="mt-2 text-sm text-slate-600">No reviews yet.</p>
          )}

          {product.reviews.length > 0 && (
            <ul className="mt-4 space-y-4">
              {product.reviews.map((review) => (
                <li
                  key={review.id}
                  className="rounded-xl border border-slate-200 border-t-4 border-t-gold bg-white p-4"
                >
                  <p className="text-gold">
                    {"★".repeat(review.rating)}
                    <span className="text-slate-300">{"★".repeat(5 - review.rating)}</span>
                  </p>
                  {review.comment && <p className="mt-2 text-sm text-slate-700">{review.comment}</p>}
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
            Reviews appear after we check them. Writing a review needs an account, which comes with
            the account pages.
          </p>
        </section>
      </section>

      {(related.length > 0 || catalogueStatus === "loading") && (
        <div className="border-t border-slate-200 bg-white">
          <ProductRow
            title="You may also like"
            subtitle={product.categoryName ? `More from ${product.categoryName}` : undefined}
            products={related}
            status={catalogueStatus}
          />
        </div>
      )}

      {/* Pop-up boxes */}
      <Modal title="Item description" open={modal === "item"} onClose={closeModal}>
        <dl className="divide-y divide-slate-200">
          <DetailRow label="Condition" value="New" />
          <DetailRow label="Brand" value={product.brand ?? "Not listed"} />
          {Object.entries(product.specifications).map(([key, value]) => (
            <DetailRow key={key} label={key} value={String(value)} />
          ))}
        </dl>
        {Object.keys(product.specifications).length === 0 && (
          <p className="mt-3 text-sm text-slate-600">More specifications will be added soon.</p>
        )}
      </Modal>

      <Modal title={`Description from ${SITE.name}`} open={modal === "description"} onClose={closeModal}>
        <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">
          {product.description ?? "A full description will be added soon."}
        </p>
      </Modal>

      <Modal title="Delivery" open={modal === "delivery"} onClose={closeModal}>
        {zones.length === 0 ? (
          <p className="text-sm text-slate-600">Delivery options are loading.</p>
        ) : (
          <ul className="divide-y divide-slate-200">
            {zones.map((zone) => (
              <li key={zone.name} className="flex justify-between gap-4 py-3 text-sm">
                <span className="font-semibold text-ink">{zone.name}</span>
                <span className="text-right text-slate-700">
                  {zone.fee_kobo === 0 ? "Free" : formatNaira(zone.fee_kobo)} · {deliveryTimeline(zone)}
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 text-xs text-slate-500">
          The final delivery fee is confirmed at checkout.{" "}
          <Link href="/stores/" className="font-semibold text-blue-700 hover:underline">
            Find a store for pickup
          </Link>
        </p>
      </Modal>

      <Modal title="Condition" open={modal === "condition"} onClose={closeModal}>
        <p className="text-sm leading-relaxed text-slate-700">
          New means brand-new and unused. Anything that differs from new is stated on the product
          page.
        </p>
      </Modal>
    </div>
  );
                                           }

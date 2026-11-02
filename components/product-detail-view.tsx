"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Countdown } from "@/components/countdown";
import { ChevronDownIcon, HeartIcon } from "@/components/icons";
import { Modal } from "@/components/modal";
import { ProductCard } from "@/components/product-card";
import { ProductGallery } from "@/components/product-gallery";
import { VariantPicker, type PickerOption } from "@/components/variant-picker";
import { useCatalogue } from "@/hooks/use-catalogue";
import { useHydrated } from "@/hooks/use-hydrated";
import { useProductDetail, type DetailVariant } from "@/hooks/use-product-detail";
import { EMPTY_FILTERS, buildCards, scopeProducts } from "@/lib/catalogue";
import { formatNaira } from "@/lib/format";
import { SITE } from "@/lib/site-config";
import { POLICY_NUMBERS } from "@/lib/store-policies";
import { supabase } from "@/lib/supabase";
import { useCartStore } from "@/stores/cart-store";
import { selectIsWishlisted, useWishlistStore } from "@/stores/wishlist-store";

type DeliveryZone = {
  name: string;
  fee_kobo: number;
  min_days: number;
  max_days: number;
};

type ModalName = "condition" | "delivery" | "item" | "description" | "offer" | null;

// The most a shopper can pick in the quantity box at once.
const MAX_QUANTITY = 10;

const WHATSAPP_BASE = SITE.whatsappUrl.split("?")[0];

function whatsappLink(message: string): string {
  return `${WHATSAPP_BASE}?text=${encodeURIComponent(message)}`;
}

function whatsappShareLink(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

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

function feeText(zone: DeliveryZone): string {
  return zone.fee_kobo === 0 ? "Free" : formatNaira(zone.fee_kobo);
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

function ShareIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 2v13" />
      <path d="m16 6-4-4-4 4" />
      <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
    </svg>
  );
}

const PAYMENT_METHODS = ["Paystack", "Bank transfer", "Visa", "Mastercard", "USSD"];

export function ProductDetailView({ slug }: { slug: string }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const { product, status } = useProductDetail(slug);
  const [catalogue, setCatalogue] = useState<ReturnType<typeof useCatalogue>["products"]>([]);
  const { products: catalogueProducts, status: catalogueStatus } = useCatalogue();

  const addItem = useCartStore((state) => state.addItem);
  const toggleWishlist = useWishlistStore((state) => state.toggleItem);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [modal, setModal] = useState<ModalName>(null);

  useEffect(() => {
    setCatalogue(catalogueProducts);
  }, [catalogueProducts]);

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
      .slice(0, 8);
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

  const topPicks = related.slice(0, 3);
  const similar = related.slice(3, 7);
  const lagosZone = zones.find((zone) => zone.name === "Lagos");
  const outsideZone = zones.find((zone) => zone.name === "Outside Lagos");

  // Sumus's own products show Sumus. Seller products show the seller, with a link to their shop.
  const sellerName = product.sellerName ?? SITE.name;
  const sellerHref = product.sellerSlug ? `/seller/${product.sellerSlug}/` : "/about/";

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

  const variantText = variant && variant.label ? ` (${variant.label})` : "";
  const offerLink = whatsappLink(
    `Hello, I'd like to make an offer on ${product.name}${variantText}. Could we talk about the price?`
  );
  const messageLink = whatsappLink(`Hello, I have a question about ${product.name}.`);

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

  function handleShare() {
    const url = window.location.href;
    window.open(
      whatsappShareLink(`${product!.name} at ${SITE.name}: ${url}`),
      "_blank",
      "noopener,noreferrer"
    );
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

  // The buying panel is written once and placed in two spots: under the photo on phones,
  // and beside the photo on laptops. The `lg:` classes decide which one shows.
  const buyingPanel = (
    <>
      <h1 className="text-2xl font-bold leading-snug text-ink md:text-3xl">{product.name}</h1>

      <div className="mt-4 flex items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden="true"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-700 text-lg font-extrabold text-white"
          >
            {sellerName.charAt(0)}
          </span>
          <div className="min-w-0">
            <Link href={sellerHref} className="block font-bold text-ink hover:text-blue-700 hover:underline">
              {sellerName}
            </Link>
            <p className="text-sm text-slate-600">
              {reviewSummary
                ? `${reviewSummary.average.toFixed(1)} out of 5 · ${reviewSummary.count} ${
                    reviewSummary.count === 1 ? "review" : "reviews"
                  }`
                : product.sellerSlug
                  ? "Seller on Sumus"
                  : "Genuine products · Sold by Sumus"}
            </p>
          </div>
        </div>
        <a
          href={messageLink}
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

      <div className="mt-6 space-y-3">
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
          onClick={() => setModal("offer")}
          className="w-full rounded-full border border-blue-700 px-6 py-3 font-semibold text-blue-700 hover:bg-blue-50"
        >
          Make offer
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

      <section className="mt-6 border-t border-slate-200 pt-5">
        <h2 className="text-base font-bold text-ink">Shipping, returns, and payments</h2>
        <dl className="mt-3 divide-y divide-slate-200 text-sm">
          <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-3 py-3">
            <dt className="text-slate-500">Shipping</dt>
            <dd className="text-ink">
              {zones.length === 0 && <p>Loading delivery options…</p>}
              {lagosZone && (
                <p>
                  Lagos: {feeText(lagosZone)} · {deliveryTimeline(lagosZone)}
                </p>
              )}
              {outsideZone && (
                <p>
                  Outside Lagos: {feeText(outsideZone)} · {deliveryTimeline(outsideZone)}
                </p>
              )}
              <button
                type="button"
                onClick={() => setModal("delivery")}
                className="mt-1 font-semibold text-blue-700 hover:underline"
              >
                See delivery details
              </button>
            </dd>
          </div>

          <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-3 py-3">
            <dt className="text-slate-500">Returns</dt>
            <dd className="text-ink">
              Faulty or wrong items: contact us within {POLICY_NUMBERS.returnWindowDays} days of
              delivery.{" "}
              <Link href="/returns/" className="font-semibold text-blue-700 hover:underline">
                See details
              </Link>
            </dd>
          </div>

          <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-3 py-3">
            <dt className="text-slate-500">Payments</dt>
            <dd>
              <ul className="flex flex-wrap gap-2">
                {PAYMENT_METHODS.map((method) => (
                  <li
                    key={method}
                    className="rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-ink"
                  >
                    {method}
                  </li>
                ))}
              </ul>
            </dd>
          </div>
        </dl>
      </section>

      <section className="mt-6 rounded-xl border border-slate-200 border-t-4 border-t-gold bg-white p-5">
        <h2 className="text-base font-bold text-ink">Shop with confidence</h2>
        <ul className="mt-3 space-y-2 text-sm text-slate-700">
          <li>
            ✓{" "}
            {product.sellerSlug
              ? `Sold by ${sellerName}`
              : `Genuine products, sold by ${SITE.name}`}
          </li>
          <li>
            ✓ {product.warrantyPeriod ? `Warranty: ${product.warrantyPeriod}.` : "Warranty information."}{" "}
            <Link href="/warranty/" className="font-semibold text-blue-700 hover:underline">
              Details
            </Link>
          </li>
          <li>✓ Support by phone and WhatsApp after you buy</li>
        </ul>
      </section>
    </>
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

        {/* People who viewed this item also viewed: desktop only. Hidden on phones. */}
        {topPicks.length > 0 && (
          <section className="hidden rounded-xl border border-slate-200 bg-white p-5 md:block">
            <h2 className="text-base font-bold text-ink">People who viewed this item also viewed</h2>
            <ul className="mt-3 grid gap-3 md:grid-cols-3">
              {topPicks.map((card) => (
                <li key={card.productId}>
                  <Link
                    href={`/product/${card.slug}/`}
                    className="flex gap-3 rounded-lg p-2 hover:bg-paper"
                  >
                    <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md bg-paper">
                      {card.imageUrl && (
                        <Image src={card.imageUrl} alt="" fill sizes="64px" className="object-contain p-1" />
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="line-clamp-2 block text-sm font-medium text-ink">{card.name}</span>
                      <span className="mt-1 block text-sm font-bold text-ink">
                        {formatNaira(card.priceKobo)}
                      </span>
                      {card.compareAtKobo !== null && card.compareAtKobo > card.priceKobo && (
                        <span className="block text-xs text-slate-500 line-through">
                          {formatNaira(card.compareAtKobo)}
                        </span>
                      )}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Phones: one column, photo first, then the buying panel.
            Laptops (lg and up): photo on the left, buying panel on the right. */}
        <div className="mt-6 lg:grid lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-start lg:gap-10">
          <div className="min-w-0">
            <ProductGallery urls={images} alt={product.name} action={heartButton} />

            <button
              type="button"
              onClick={handleShare}
              aria-label="Share this product"
              className="mt-4 flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 text-ink hover:border-slate-700"
            >
              <ShareIcon className="h-5 w-5" />
            </button>

            {/* On phones the buying panel follows the photo here. */}
            <div className="mt-6 lg:hidden">{buyingPanel}</div>

            {/* Similar items: shows on phones and laptops */}
            {similar.length > 0 && (
              <section className="mt-10 border-t border-slate-200 pt-8">
                <h2 className="text-xl font-bold text-ink">Similar items</h2>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  {similar.map((card) => (
                    <ProductCard key={card.variantId} product={card} />
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* On laptops the buying panel sits beside the photo, and stays in view. */}
          <aside className="hidden lg:sticky lg:top-40 lg:block">{buyingPanel}</aside>
        </div>

        {/* About this item: two rows that open pop-up boxes */}
        <section className="mt-12 border-t border-slate-200 pt-8">
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
                  Condition, brand, warranty and specifications
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
                <span className="block font-semibold text-ink">Description from {sellerName}</span>
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

      {/* Pop-up boxes */}
      <Modal title="Item description" open={modal === "item"} onClose={closeModal}>
        <dl className="divide-y divide-slate-200">
          <DetailRow label="Condition" value="New" />
          <DetailRow label="Brand" value={product.brand ?? "Not listed"} />
          <DetailRow label="Sold by" value={sellerName} />
          <DetailRow label="Warranty" value={product.warrantyPeriod ?? "Not listed"} />
          {Object.entries(product.specifications).map(([key, value]) => (
            <DetailRow key={key} label={key} value={String(value)} />
          ))}
        </dl>
        {Object.keys(product.specifications).length === 0 && (
          <p className="mt-3 text-sm text-slate-600">More specifications will be added soon.</p>
        )}
      </Modal>

      <Modal title={`Description from ${sellerName}`} open={modal === "description"} onClose={closeModal}>
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
                  {feeText(zone)} · {deliveryTimeline(zone)}
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

      <Modal title="Make an offer" open={modal === "offer"} onClose={closeModal}>
        <p className="text-sm leading-relaxed text-slate-700">
          Tell us the price you&apos;d like to pay for {product.name}. We&apos;ll reply on WhatsApp to
          confirm whether we can agree.
        </p>
        <a
          href={offerLink}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 block rounded-full bg-green-600 px-6 py-3 text-center font-semibold text-white hover:bg-green-700"
        >
          Send offer on WhatsApp
        </a>
      </Modal>
    </div>
  );
}

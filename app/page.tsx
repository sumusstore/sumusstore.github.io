"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { Countdown } from "@/components/countdown";
import { NewsletterForm } from "@/components/newsletter-form";
import { ProductRow } from "@/components/product-row";
import { useCategoryTree } from "@/hooks/use-category-tree";
import { useHomeProducts, type LoadStatus, type ProductCardData } from "@/hooks/use-home-products";
import { formatNaira } from "@/lib/format";
import { SITE } from "@/lib/site-config";

// Emoji stand in for category photos until you upload images.
const CATEGORY_ICONS: Record<string, string> = {
  phones: "📱",
  "tv-audio": "📺",
  "home-appliances": "🧊",
  "power-solar": "☀️",
  "smart-home": "🏠",
  accessories: "🔌",
};

// Placeholder wording. Check it matches your real warranty and delivery terms before launch.
const TRUST_POINTS = [
  { title: "Genuine products", text: "Original stock with clear product details." },
  { title: "Nationwide delivery", text: "Lagos in 1 to 3 working days, elsewhere in 2 to 7." },
  { title: "Warranty", text: "Warranty details on every product page." },
  { title: "After-sales support", text: "Reach us by phone or WhatsApp after you buy." },
  { title: "Secure payment", text: "Pay by card or USSD through Paystack, or by bank transfer." },
];

/** A small product tile for the desktop deal cards. Tapping it opens the product page. */
function MiniTile({ product }: { product: ProductCardData }) {
  const onSale = product.compareAtKobo !== null && product.compareAtKobo > product.priceKobo;

  return (
    <Link href={`/product/${product.slug}/`} className="group block">
      <div className="relative aspect-square overflow-hidden rounded-xl bg-paper">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            sizes="(min-width: 768px) 16vw, 45vw"
            className="object-contain p-3"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-slate-400">
            Photo coming soon
          </div>
        )}
      </div>
      {product.brand && (
        <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          {product.brand}
        </p>
      )}
      <p className="line-clamp-2 min-h-[2.5rem] text-sm font-medium text-ink group-hover:text-blue-700">
        {product.name}
      </p>
      <p className="mt-1 text-sm font-bold text-ink">{formatNaira(product.priceKobo)}</p>
      {onSale && product.compareAtKobo !== null && (
        <p className="text-xs text-slate-500 line-through">{formatNaira(product.compareAtKobo)}</p>
      )}
    </Link>
  );
}

type DealCardProps = {
  title: string;
  subtitle: string;
  seeAllLabel: string;
  products: ProductCardData[];
  status: LoadStatus;
  headerAction?: ReactNode;
};

/** A desktop card showing two products and a link to the full list. */
function DealCard({ title, subtitle, seeAllLabel, products, status, headerAction }: DealCardProps) {
  return (
    <section className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="text-lg font-bold text-ink">{title}</h2>
      <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
      {headerAction && <div className="mt-2">{headerAction}</div>}

      <div className="mt-4 grid flex-1 grid-cols-2 gap-4">
        {status === "loading" &&
          [0, 1].map((index) => (
            <div key={index} className="aspect-square animate-pulse rounded-xl bg-slate-100" />
          ))}
        {status === "error" && (
          <p className="col-span-2 text-sm text-slate-600">Products are unavailable right now.</p>
        )}
        {status === "ready" && products.length === 0 && (
          <p className="col-span-2 text-sm text-slate-600">Nothing here yet. Check back soon.</p>
        )}
        {status === "ready" &&
          products.slice(0, 2).map((product) => <MiniTile key={product.variantId} product={product} />)}
      </div>

      <Link href="/shop/" className="mt-5 text-sm font-semibold text-blue-700 hover:underline">
        {seeAllLabel} →
      </Link>
    </section>
  );
}

export default function HomePage() {
  const { tree: categories } = useCategoryTree();
  const { products, status: productStatus } = useHomeProducts();
  const soonestEnd = products.flashSales[0]?.saleEndsAt ?? null;

  return (
    <main>
      {/* Hero: centred headline and search, as on the desktop layout */}
      <section className="bg-white">
        <div className="mx-auto max-w-4xl px-4 py-8 text-center md:py-14">
          <h1 className="text-3xl font-bold leading-tight text-ink md:text-5xl">
            Find your next phone or appliance
          </h1>
          <span aria-hidden="true" className="mx-auto mt-4 block h-1 w-16 rounded bg-gold" />
          <p className="mt-4 text-sm text-slate-600">{SITE.deliveryNote}</p>

          <form
            action="/search/"
            method="get"
            role="search"
            className="mx-auto mt-6 flex max-w-3xl overflow-hidden rounded-full border-2 border-blue-700"
          >
            <label htmlFor="home-category" className="sr-only">
              Category
            </label>
            <select
              id="home-category"
              name="cat"
              className="hidden shrink-0 border-r border-slate-300 bg-slate-100 px-4 text-sm text-ink md:block"
            >
              <option value="">All categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.slug}>
                  {category.name}
                </option>
              ))}
            </select>

            <label htmlFor="home-search" className="sr-only">
              Search products
            </label>
            <input
              id="home-search"
              type="search"
              name="q"
              placeholder="Search for phones, TVs, appliances and more"
              className="min-w-0 flex-1 px-5 py-3 text-base focus:outline-none"
            />
            <button
              type="submit"
              className="bg-blue-700 px-6 text-sm font-semibold text-white hover:bg-blue-800"
            >
              Search
            </button>
          </form>

          {/* Desktop: category links under the search */}
          <ul className="mt-5 hidden flex-wrap items-center justify-center gap-x-4 gap-y-2 md:flex">
            {categories.map((category, index) => (
              <li key={category.id} className="flex items-center gap-4">
                <Link
                  href={`/category/${category.slug}/`}
                  className="text-sm font-medium text-blue-700 hover:underline"
                >
                  {category.name}
                </Link>
                {index < categories.length - 1 && (
                  <span aria-hidden="true" className="text-slate-400">
                    •
                  </span>
                )}
              </li>
            ))}
          </ul>

          <Link
            href="/shop/"
            className="mt-6 inline-block rounded-full bg-gold px-6 py-2.5 text-sm font-semibold text-ink hover:bg-gold/90"
          >
            Shop all products
          </Link>
        </div>
      </section>

      {/* Mobile: scrolling category icons */}
      <section className="border-y border-slate-200 bg-white md:hidden">
        <div className="flex gap-5 overflow-x-auto px-4 py-4">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/category/${category.slug}/`}
              className="flex w-20 shrink-0 flex-col items-center gap-2 text-center text-xs font-medium text-ink"
            >
              <span
                aria-hidden="true"
                className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-2xl"
              >
                {CATEGORY_ICONS[category.slug] ?? "🛒"}
              </span>
              {category.name}
            </Link>
          ))}
        </div>
      </section>

      {/* Mobile: rows you swipe through */}
      <div className="md:hidden">
        <ProductRow
          title="Today's deals"
          subtitle="Limited-time offers. Items leave this row when their timer ends."
          products={products.flashSales}
          status={productStatus}
          headerAction={soonestEnd ? <Countdown endsAt={soonestEnd} /> : null}
          emptyText="No flash sales are running right now."
          seeAllHref="/shop/"
        />
        <ProductRow
          title="Price drops"
          subtitle="Items marked down from their original price."
          products={products.priceDrops}
          status={productStatus}
          emptyText="No price drops right now."
          seeAllHref="/shop/"
        />
        <ProductRow
          title="New arrivals"
          subtitle="The latest additions to our range."
          products={products.newArrivals}
          status={productStatus}
          seeAllHref="/shop/"
        />
      </div>

      {/* Desktop: three cards side by side */}
      <section className="mx-auto hidden max-w-6xl grid-cols-3 gap-6 px-4 py-10 md:grid">
        <DealCard
          title="Today's deals"
          subtitle="Limited-time offers. Items leave when their timer ends."
          seeAllLabel="See all deals"
          products={products.flashSales}
          status={productStatus}
          headerAction={soonestEnd ? <Countdown endsAt={soonestEnd} /> : null}
        />
        <DealCard
          title="Price drops"
          subtitle="Marked down from their original price."
          seeAllLabel="See all price drops"
          products={products.priceDrops}
          status={productStatus}
        />
        <DealCard
          title="New arrivals"
          subtitle="Fresh finds added recently."
          seeAllLabel="See all new arrivals"
          products={products.newArrivals}
          status={productStatus}
        />
      </section>

      {/* Shop by category */}
      <section className="mx-auto max-w-6xl px-4 py-8">
        <h2 className="text-xl font-bold text-ink md:text-2xl">Shop by category</h2>
        <span aria-hidden="true" className="mt-2 block h-1 w-12 rounded bg-gold" />
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/category/${category.slug}/`}
              className="group rounded-xl border border-slate-200 bg-white p-5 hover:border-blue-600"
            >
              <h3 className="text-lg font-semibold text-ink group-hover:text-blue-700">
                {category.name}
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                {category.children.length > 0
                  ? category.children.map((child) => child.name).join(" · ")
                  : "Browse all"}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* Trust strip */}
      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 sm:grid-cols-2 lg:grid-cols-5">
          {TRUST_POINTS.map((point) => (
            <div key={point.title}>
              <p className="font-semibold text-ink">
                <span className="mr-2 text-blue-700">✓</span>
                {point.title}
              </p>
              <p className="mt-1 text-sm text-slate-600">{point.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Newsletter */}
      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid gap-6 rounded-2xl bg-blue-50 p-6 md:grid-cols-2 md:items-center md:p-10">
          <div>
            <h2 className="text-2xl font-bold text-ink">Get deals first</h2>
            <p className="mt-2 text-sm text-slate-600">
              Sign up for new arrivals and sale alerts.
            </p>
          </div>
          <NewsletterForm />
        </div>
      </section>
    </main>
  );
}

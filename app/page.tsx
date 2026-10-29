"use client";

import Link from "next/link";
import { useCategoryTree } from "@/hooks/use-category-tree";
import { useHomeProducts } from "@/hooks/use-home-products";
import { Countdown } from "@/components/countdown";
import { NewsletterForm } from "@/components/newsletter-form";
import { ProductRow } from "@/components/product-row";
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

export default function HomePage() {
  const { tree: categories } = useCategoryTree();
  const { products, status: productStatus } = useHomeProducts();
  const soonestEnd = products.flashSales[0]?.saleEndsAt ?? null;
  const featuredCategories = categories.slice(0, 4);

  return (
    <main className="bg-slate-50">
      {/* Hero: a promotional banner beside category tiles */}
      <section className="bg-white">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 md:grid-cols-2 md:py-10">
          <div className="flex flex-col justify-center rounded-2xl bg-blue-700 p-6 text-white md:p-10">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-100">
              Genuine products, delivered
            </p>
            <h1 className="mt-3 text-3xl font-bold leading-tight md:text-4xl">
              Phones, electronics and home appliances for Nigeria
            </h1>
            <p className="mt-4 text-sm text-blue-50">{SITE.deliveryNote}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/shop/"
                className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-blue-700 hover:bg-blue-50"
              >
                Shop all products
              </Link>
              <a
                href={SITE.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-white/70 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10"
              >
                Order on WhatsApp
              </a>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {featuredCategories.map((category) => (
              <Link
                key={category.id}
                href={`/category/${category.slug}/`}
                className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 hover:border-blue-600 hover:shadow-md"
              >
                <span aria-hidden="true" className="text-3xl">
                  {CATEGORY_ICONS[category.slug] ?? "🛒"}
                </span>
                <span className="mt-6 font-semibold text-slate-900">{category.name}</span>
                <span className="mt-1 text-xs font-semibold text-blue-700">Shop now →</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Quick category icons */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-5">
          <div className="flex gap-5 overflow-x-auto pb-1 md:grid md:grid-cols-6 md:overflow-visible">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/category/${category.slug}/`}
                className="flex w-20 shrink-0 flex-col items-center gap-2 text-center text-xs font-medium text-slate-800 hover:text-blue-700 md:w-auto"
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
        </div>
      </section>

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

      {/* Shop by category */}
      <section className="mx-auto max-w-6xl px-4 py-8">
        <h2 className="text-xl font-bold text-slate-900 md:text-2xl">Shop by category</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/category/${category.slug}/`}
              className="group rounded-xl border border-slate-200 bg-white p-5 hover:border-blue-600"
            >
              <h3 className="text-lg font-semibold text-slate-900 group-hover:text-blue-700">
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
              <p className="font-semibold text-slate-900">
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
            <h2 className="text-2xl font-bold text-slate-900">Get deals first</h2>
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

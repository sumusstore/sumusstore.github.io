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

  return (
    <main>
      {/* Hero */}
      <section className="bg-blue-700 text-white">
        <div className="mx-auto max-w-6xl px-4 py-14 md:py-20">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-100">
            Genuine products · Nationwide delivery
          </p>
          <h1 className="mt-3 max-w-2xl text-3xl font-bold leading-tight md:text-5xl">
            Phones, electronics and home appliances for Nigeria
          </h1>
          <p className="mt-4 max-w-xl text-blue-50">{SITE.deliveryNote}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/shop/"
              className="rounded-lg bg-white px-6 py-3 font-semibold text-blue-700 hover:bg-blue-50"
            >
              Shop now
            </Link>
            <a
              href={SITE.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-white/60 px-6 py-3 font-semibold text-white hover:bg-white/10"
            >
              Order on WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* Quick category icons */}
      <section className="mx-auto max-w-6xl px-4 pt-8">
        <div className="flex gap-5 overflow-x-auto pb-2 md:grid md:grid-cols-6 md:overflow-visible">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/category/${category.slug}/`}
              className="flex w-20 shrink-0 flex-col items-center gap-2 text-center text-xs font-medium text-slate-800 hover:text-blue-700 md:w-auto"
            >
              <span
                aria-hidden="true"
                className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-2xl"
              >
                {CATEGORY_ICONS[category.slug] ?? "🛒"}
              </span>
              {category.name}
            </Link>
          ))}
        </div>
      </section>

      <ProductRow
        title="Flash sales"
        subtitle="Limited-time offers. Items leave this row when their timer ends."
        products={products.flashSales}
        status={productStatus}
        headerAction={soonestEnd ? <Countdown endsAt={soonestEnd} /> : null}
        emptyText="No flash sales are running right now."
      />

      <ProductRow
        title="Price drops"
        subtitle="Items marked down from their original price."
        products={products.priceDrops}
        status={productStatus}
        emptyText="No price drops right now."
      />

      <ProductRow
        title="New arrivals"
        subtitle="The latest additions to our range."
        products={products.newArrivals}
        status={productStatus}
      />

      {/* Featured categories */}
      <section className="mx-auto max-w-6xl px-4 py-10">
        <h2 className="text-2xl font-bold text-slate-900">Shop by category</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/category/${category.slug}/`}
              className="group rounded-xl border border-slate-200 p-5 hover:border-blue-600"
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

      {/* Trust */}
      <section className="bg-slate-50">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-12 sm:grid-cols-2 lg:grid-cols-5">
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
      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-6 md:grid-cols-2 md:items-center">
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

import type { Metadata } from "next";
import Link from "next/link";
import { SITE } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "About us",
  description:
    "About Sumus: genuine phones, electronics, home appliances, and power and solar products for Nigeria.",
};

const WHY_US = [
  {
    title: "Genuine products",
    text: "We sell original products. Each product page shows the brand, model and warranty details.",
  },
  {
    title: "Warranty on every item",
    text: "Warranty details are on the product page, and we help you make a claim.",
  },
  {
    title: "After-sales support",
    text: "Reach us by phone or WhatsApp after you buy. We stay with you until the issue is sorted.",
  },
  {
    title: "Delivery nationwide",
    text: "Lagos and beyond, with store pickup where you need it.",
  },
];

export default function AboutPage() {
  return (
    <>
      <section className="bg-blue-700 text-white">
        <div className="mx-auto max-w-4xl px-4 py-12 md:py-16">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-100">About us</p>
          <h1 className="mt-2 text-3xl font-bold md:text-4xl">About {SITE.name}</h1>
          <span aria-hidden="true" className="mt-4 block h-1 w-16 rounded bg-gold" />
        </div>
      </section>

      <article className="mx-auto max-w-4xl px-4 py-10">
        <div className="space-y-4 leading-relaxed text-slate-700">
          <p>
            {SITE.name} sells phones, electronics, home appliances, power and solar products, and smart
            home devices to customers across Nigeria.
          </p>
          <p>
            We think buying electronics should feel simple and safe. That means clear prices in naira,
            honest product details, and people you can reach when something needs fixing.
          </p>
          <p>
            Our team is here to help you choose, order and get support, whether you shop online or visit
            one of our stores.
          </p>
        </div>

        <h2 className="mt-12 text-xl font-bold text-ink">Why shop with us</h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          {WHY_US.map((point) => (
            <div
              key={point.title}
              className="rounded-xl border border-slate-200 border-t-4 border-t-gold bg-white p-5"
            >
              <p className="font-semibold text-ink">{point.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{point.text}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap gap-3 text-sm font-semibold">
          <Link
            href="/stores/"
            className="rounded-full bg-blue-700 px-5 py-2.5 text-white hover:bg-blue-800"
          >
            Find a store
          </Link>
          <Link
            href="/contact/"
            className="rounded-full border border-blue-700 px-5 py-2.5 text-blue-700 hover:bg-blue-50"
          >
            Contact us
          </Link>
          <Link
            href="/bulk/"
            className="rounded-full border border-blue-700 px-5 py-2.5 text-blue-700 hover:bg-blue-50"
          >
            Bulk sales
          </Link>
        </div>
      </article>
    </>
  );
}

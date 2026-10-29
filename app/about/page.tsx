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
    <article className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-bold text-slate-900">About {SITE.name}</h1>

      <div className="mt-6 space-y-4 leading-relaxed text-slate-700">
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

      <h2 className="mt-12 text-xl font-bold text-slate-900">Why shop with us</h2>
      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        {WHY_US.map((point) => (
          <div key={point.title} className="rounded-xl border border-slate-200 p-5">
            <p className="font-semibold text-slate-900">{point.title}</p>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{point.text}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 flex flex-wrap gap-6 text-sm font-semibold">
        <Link href="/stores/" className="text-blue-700 hover:underline">
          Find a store
        </Link>
        <Link href="/contact/" className="text-blue-700 hover:underline">
          Contact us
        </Link>
        <Link href="/bulk/" className="text-blue-700 hover:underline">
          Bulk sales
        </Link>
      </div>
    </article>
  );
}

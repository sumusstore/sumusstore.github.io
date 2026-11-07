// app/sitemap/page.tsx
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Sitemap",
  description: "Every main page on Sumus, in one place.",
};

type SitemapLink = { label: string; href: string };
type SitemapGroup = { title: string; links: SitemapLink[] };

// Category links match the categories set up in the admin. Add a line here when you add a category.
const GROUPS: SitemapGroup[] = [
  {
    title: "Shop",
    links: [
      { label: "All products", href: "/shop/" },
      { label: "Phones", href: "/category/phones/" },
      { label: "TVs and audio", href: "/category/tv-audio/" },
      { label: "Home appliances", href: "/category/home-appliances/" },
      { label: "Power and solar", href: "/category/power-solar/" },
      { label: "Smart home", href: "/category/smart-home/" },
      { label: "Accessories", href: "/category/accessories/" },
      { label: "Search", href: "/search/" },
      { label: "Compare products", href: "/compare/" },
      { label: "Sellers", href: "/sellers/" },
    ],
  },
  {
    title: "My account",
    links: [
      { label: "My Sumus", href: "/account/" },
      { label: "Purchases", href: "/account/orders/" },
      { label: "Addresses", href: "/account/addresses/" },
      { label: "Account settings", href: "/account/profile/" },
      { label: "Wishlist", href: "/wishlist/" },
      { label: "Messages", href: "/messages/" },
      { label: "Cart", href: "/cart/" },
      { label: "Log in", href: "/login/" },
      { label: "Create an account", href: "/register/" },
    ],
  },
  {
    title: "Selling on Sumus",
    links: [
      { label: "Sell on Sumus", href: "/sell/" },
      { label: "My shop", href: "/my-shop/" },
    ],
  },
  {
    title: "Help and contact",
    links: [
      { label: "Help and contact", href: "/help/" },
      { label: "Frequently asked questions", href: "/faq/" },
      { label: "Track an order", href: "/track/" },
      { label: "Contact us", href: "/contact/" },
      { label: "Shipping and delivery", href: "/shipping/" },
      { label: "Returns and refunds", href: "/returns/" },
      { label: "Warranty", href: "/warranty/" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About us", href: "/about/" },
      { label: "Store locator", href: "/stores/" },
      { label: "Bulk sales", href: "/bulk/" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy policy", href: "/privacy/" },
      { label: "Terms and conditions", href: "/terms/" },
    ],
  },
];

export default function SitemapPage() {
  return (
    <>
      <section className="bg-blue-700 text-white">
        <div className="mx-auto max-w-6xl px-4 py-10 md:py-14">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-100">Site navigation</p>
          <h1 className="mt-2 text-3xl font-bold md:text-4xl">Sitemap</h1>
          <p className="mt-2 max-w-2xl text-blue-50">Every main page on Sumus, in one place.</p>
          <span aria-hidden="true" className="mt-4 block h-1 w-16 rounded bg-gold" />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {GROUPS.map((group) => (
            <div
              key={group.title}
              className="rounded-xl border border-slate-200 border-t-4 border-t-gold bg-white p-5"
            >
              <h2 className="text-base font-bold text-ink">{group.title}</h2>
              <ul className="mt-3 space-y-2.5">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-slate-700 hover:text-blue-700 hover:underline"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

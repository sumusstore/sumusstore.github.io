import type { Metadata } from "next";
import Link from "next/link";
import { RequireAuth } from "@/components/require-auth";

export const metadata: Metadata = {
  title: "My account",
  robots: { index: false, follow: false },
};

type MenuItem = {
  label: string;
  href?: string;
  badge?: string;
};

// Rows without an href are not built yet and show "Coming soon".
const MENU: MenuItem[] = [
  { label: "Messages", href: "/messages/" },
  { label: "Watchlist", href: "/wishlist/" },
  { label: "Saved feed", badge: "NEW" },
  { label: "Saved" },
  { label: "Buy again" },
  { label: "Purchases" },
  { label: "Bids & offers", href: "/messages/" },
  { label: "Recently viewed" },
  { label: "Selling", href: "/my-shop/" },
  { label: "Payments", badge: "NEW" },
  { label: "Account settings" },
];

function MenuRow({ item }: { item: MenuItem }) {
  const content = (
    <>
      <span className="text-lg text-ink">{item.label}</span>
      {item.badge && (
        <span className="rounded-full border border-green-700 px-3 py-0.5 text-xs font-bold tracking-wide text-green-700">
          {item.badge}
        </span>
      )}
    </>
  );

  if (item.href) {
    return (
      <li>
        <Link href={item.href} className="flex items-center gap-4 py-1 hover:text-blue-700">
          {content}
        </Link>
      </li>
    );
  }

  return (
    <li className="flex items-center gap-4 py-1">
      {content}
      <span className="ml-auto text-xs text-slate-500">Coming soon</span>
    </li>
  );
}

export default function AccountPage() {
  return (
    <RequireAuth>
      <section className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-3xl font-bold text-ink md:text-4xl">My Sumus</h1>

        <ul className="mt-8 space-y-5">
          {MENU.map((item) => (
            <MenuRow key={item.label} item={item} />
          ))}
        </ul>
      </section>
    </RequireAuth>
  );
}

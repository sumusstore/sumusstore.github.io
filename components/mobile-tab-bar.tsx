"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import { useHydrated } from "@/hooks/use-hydrated";
import { CartIcon, HeartIcon, SearchIcon, UserIcon } from "@/components/icons";
import { selectCartCount, useCartStore } from "@/stores/cart-store";
import { useWishlistStore } from "@/stores/wishlist-store";

type IconProps = { className?: string };

function HomeIcon({ className }: IconProps) {
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
      <path d="m3 10 9-7 9 7" />
      <path d="M5 9.5V20h14V9.5" />
      <path d="M10 20v-6h4v6" />
    </svg>
  );
}

const TABS: { label: string; href: string; Icon: ComponentType<IconProps> }[] = [
  { label: "Home", href: "/", Icon: HomeIcon },
  { label: "Search", href: "/search/", Icon: SearchIcon },
  { label: "Saved", href: "/wishlist/", Icon: HeartIcon },
  { label: "Account", href: "/account/", Icon: UserIcon },
  { label: "Cart", href: "/cart/", Icon: CartIcon },
];

/** A fixed bar of main destinations along the bottom of the screen, shown on phones only. */
export function MobileTabBar() {
  const pathname = usePathname() ?? "/";
  const hydrated = useHydrated();
  const cartCount = useCartStore(selectCartCount);
  const wishlistCount = useWishlistStore((state) => state.items.length);

  // Product pages have their own buy bar at the bottom, so the tab bar steps aside there.
  if (pathname.startsWith("/product/")) return null;

  const counts: Record<string, number> = {
    "/wishlist/": hydrated ? wishlistCount : 0,
    "/cart/": hydrated ? cartCount : 0,
  };

  return (
    <nav
      aria-label="Main navigation"
      className="fixed inset-x-0 bottom-0 z-30 border-t-2 border-gold bg-white md:hidden"
    >
      <ul className="grid grid-cols-5">
        {TABS.map(({ label, href, Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          const count = counts[href] ?? 0;

          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`relative flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${
                  active ? "text-blue-700" : "text-slate-600"
                }`}
              >
                <Icon className="h-6 w-6" />
                {label}
                {count > 0 && (
                  <span className="absolute right-[26%] top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-bold text-ink">
                    {count > 99 ? "99+" : count}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

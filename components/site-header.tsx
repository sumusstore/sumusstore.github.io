"use client";

import Link from "next/link";
import { useState } from "react";
import { useCategoryTree } from "@/hooks/use-category-tree";
import { useHydrated } from "@/hooks/use-hydrated";
import { SITE } from "@/lib/site-config";
import { selectCartCount, useCartStore } from "@/stores/cart-store";
import { useWishlistStore } from "@/stores/wishlist-store";
import {
  CartIcon,
  ChevronDownIcon,
  HeartIcon,
  MenuIcon,
  SearchIcon,
  UserIcon,
} from "@/components/icons";
import { MobileMenu } from "@/components/mobile-menu";

function CountBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="absolute -right-0.5 top-0 flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1 text-xs font-bold text-ink">
      {count > 99 ? "99+" : count}
    </span>
  );
}

export function SiteHeader() {
  const { tree, status } = useCategoryTree();
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const hydrated = useHydrated();

  const cartCount = useCartStore(selectCartCount);
  const wishlistCount = useWishlistStore((state) => state.items.length);

  // Counts show 0 until the browser has loaded saved data, so server and browser match.
  const shownCartCount = hydrated ? cartCount : 0;
  const shownWishlistCount = hydrated ? wishlistCount : 0;

  const activeNode = tree.find((node) => node.id === activeId);

  return (
    <header className="sticky top-0 z-40 bg-white shadow-sm">
      {/* Top strip: sign in and helpful links */}
      <div className="border-b border-slate-200 bg-paper text-xs text-ink">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-1.5">
          <p>
            Hi!{" "}
            <Link href="/login/" className="font-semibold text-blue-700 hover:underline">
              Sign in
            </Link>{" "}
            or{" "}
            <Link href="/register/" className="font-semibold text-blue-700 hover:underline">
              register
            </Link>
          </p>
          <div className="hidden items-center gap-5 md:flex">
            <Link href="/track/" className="hover:text-blue-700">
              Track an order
            </Link>
            <Link href="/stores/" className="hover:text-blue-700">
              Store locator
            </Link>
            <Link href="/contact/" className="hover:text-blue-700">
              Help and contact
            </Link>
            <a href={SITE.phoneLink} className="font-semibold text-ink">
              {SITE.phoneDisplay}
            </a>
          </div>
        </div>
      </div>

      {/* Main row: menu, logo, icons, and search with a category picker */}
      <div className="border-b border-slate-200">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-3 px-4 py-3 md:flex-nowrap md:gap-6">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            aria-expanded={menuOpen}
            className="-ml-2 p-2 md:hidden"
          >
            <MenuIcon className="h-6 w-6" />
          </button>

          <Link href="/" className="shrink-0 text-2xl font-extrabold tracking-tight text-blue-700">
            <span className="border-b-4 border-gold pb-0.5">{SITE.name}</span>
          </Link>

          <form
            action="/search/"
            method="get"
            role="search"
            className="order-last flex w-full overflow-hidden rounded-full border-2 border-blue-700 focus-within:ring-2 focus-within:ring-blue-200 md:order-none md:w-auto md:flex-1"
          >
            <label htmlFor="header-category" className="sr-only">
              Category
            </label>
            <select
              id="header-category"
              name="cat"
              className="hidden max-w-40 shrink-0 border-r border-slate-300 bg-slate-100 px-3 text-sm text-ink md:block"
            >
              <option value="">All categories</option>
              {tree.map((node) => (
                <option key={node.id} value={node.slug}>
                  {node.name}
                </option>
              ))}
            </select>

            <label htmlFor="header-search" className="sr-only">
              Search products
            </label>
            <input
              id="header-search"
              type="search"
              name="q"
              placeholder="Search for phones, TVs, appliances and more"
              className="min-w-0 flex-1 bg-white px-4 py-2.5 text-sm focus:outline-none"
            />
            <button
              type="submit"
              aria-label="Search"
              className="flex shrink-0 items-center justify-center bg-blue-700 px-5 text-white hover:bg-blue-800"
            >
              <SearchIcon className="h-5 w-5" />
            </button>
          </form>

          <nav
            aria-label="Account, wishlist and cart"
            className="ml-auto flex shrink-0 items-center gap-1 md:ml-0 md:gap-4"
          >
            <Link
              href="/account/"
              aria-label="My account"
              className="flex flex-col items-center gap-0.5 p-1 text-xs text-ink hover:text-blue-700"
            >
              <UserIcon className="h-6 w-6" />
              <span className="hidden lg:block">Account</span>
            </Link>
            <Link
              href="/wishlist/"
              aria-label={`Wishlist, ${shownWishlistCount} items`}
              className="relative flex flex-col items-center gap-0.5 p-1 text-xs text-ink hover:text-blue-700"
            >
              <HeartIcon className="h-6 w-6" />
              <span className="hidden lg:block">Wishlist</span>
              <CountBadge count={shownWishlistCount} />
            </Link>
            <Link
              href="/cart/"
              aria-label={`Cart, ${shownCartCount} items`}
              className="relative flex flex-col items-center gap-0.5 p-1 text-xs text-ink hover:text-blue-700"
            >
              <CartIcon className="h-6 w-6" />
              <span className="hidden lg:block">Cart</span>
              <CountBadge count={shownCartCount} />
            </Link>
          </nav>
        </div>
      </div>

      {/* Category row, with subcategories on hover */}
      <nav
        aria-label="Categories"
        className="relative hidden border-b border-slate-200 bg-white md:block"
        onMouseLeave={() => setActiveId(null)}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setActiveId(null);
          }
        }}
      >
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-4">
          <span className="flex shrink-0 items-center gap-1 py-3 text-sm font-semibold text-ink">
            Shop by category
            <ChevronDownIcon className="h-4 w-4" />
          </span>

          <ul className="flex min-w-0 flex-1 items-center gap-5 overflow-x-auto">
            {status === "loading" && (
              <li className="py-3 text-sm text-slate-500">Loading categories…</li>
            )}
            {status === "error" && (
              <li className="py-3 text-sm text-slate-500">Categories are unavailable.</li>
            )}
            {status === "ready" &&
              tree.map((node) => (
                <li
                  key={node.id}
                  className="shrink-0"
                  onMouseEnter={() => setActiveId(node.id)}
                  onFocus={() => setActiveId(node.id)}
                >
                  <Link
                    href={`/category/${node.slug}/`}
                    className="block py-3 text-sm text-ink hover:text-blue-700 focus:text-blue-700"
                  >
                    {node.name}
                  </Link>
                </li>
              ))}
          </ul>

          <Link href="/shop/" className="shrink-0 py-3 text-sm font-semibold text-blue-700 hover:underline">
            All products
          </Link>
        </div>

        {activeNode && activeNode.children.length > 0 && (
          <div className="absolute inset-x-0 top-full z-50 border-t border-slate-200 bg-white shadow-lg">
            <div className="mx-auto grid max-w-6xl grid-cols-4 gap-8 px-4 py-6">
              {activeNode.children.map((child) => (
                <div key={child.id}>
                  <Link
                    href={`/category/${child.slug}/`}
                    className="font-semibold text-ink hover:text-blue-700"
                  >
                    {child.name}
                  </Link>
                  {child.children.length > 0 && (
                    <ul className="mt-2 space-y-1.5">
                      {child.children.map((grand) => (
                        <li key={grand.id}>
                          <Link
                            href={`/category/${grand.slug}/`}
                            className="text-sm text-slate-600 hover:text-blue-700"
                          >
                            {grand.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
              <Link
                href={`/category/${activeNode.slug}/`}
                className="col-span-4 text-sm font-semibold text-blue-700 hover:underline"
              >
                Shop all {activeNode.name} →
              </Link>
            </div>
          </div>
        )}
      </nav>

      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} tree={tree} status={status} />
    </header>
  );
}

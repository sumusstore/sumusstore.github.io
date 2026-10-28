"use client";

import Link from "next/link";
import { useState } from "react";
import { useCategoryTree } from "@/hooks/use-category-tree";
import { useHydrated } from "@/hooks/use-hydrated";
import { selectCartCount, useCartStore } from "@/stores/cart-store";
import { useWishlistStore } from "@/stores/wishlist-store";
import { SITE } from "@/lib/site-config";
import { CartIcon, HeartIcon, MenuIcon, SearchIcon, UserIcon } from "@/components/icons";
import { MobileMenu } from "@/components/mobile-menu";

function CountBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1 text-xs font-bold text-white">
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
      {/* Top strip: delivery promise, store locator, WhatsApp, phone */}
      <div className="bg-slate-900 text-xs text-slate-100">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2">
          <p className="hidden md:block">{SITE.deliveryNote}</p>
          <div className="flex w-full items-center justify-between gap-4 md:w-auto md:justify-end md:gap-5">
            <Link href="/stores/" className="hidden hover:text-white md:block">
              Store locator
            </Link>
            <a
              href={SITE.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white"
            >
              WhatsApp
            </a>
            <a href={SITE.phoneLink} className="font-semibold hover:text-white">
              {SITE.phoneDisplay}
            </a>
          </div>
        </div>
      </div>

      {/* Main row: menu, logo, search, account, wishlist, cart */}
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

          <Link href="/" className="shrink-0 text-xl font-bold text-blue-700">
            {SITE.name}
          </Link>

          <form
            action="/search/"
            method="get"
            role="search"
            className="order-last w-full md:order-none md:w-auto md:flex-1"
          >
            <div className="relative">
              <input
                type="search"
                name="q"
                placeholder="Search phones, TVs, appliances and more"
                aria-label="Search products"
                className="w-full rounded-lg border border-slate-300 py-2.5 pl-4 pr-12 text-sm focus:border-blue-600 focus:outline-none"
              />
              <button
                type="submit"
                aria-label="Search"
                className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md bg-blue-700 p-2 text-white hover:bg-blue-800"
              >
                <SearchIcon className="h-4 w-4" />
              </button>
            </div>
          </form>

          <nav aria-label="Account, wishlist and cart" className="ml-auto flex items-center gap-1 md:gap-5">
            <Link
              href="/account/"
              aria-label="My account"
              className="flex items-center gap-1.5 p-2 text-sm font-medium text-slate-800 hover:text-blue-700"
            >
              <UserIcon className="h-5 w-5" />
              <span className="hidden lg:inline">Account</span>
            </Link>
            <Link
              href="/wishlist/"
              aria-label={`Wishlist, ${shownWishlistCount} items`}
              className="relative p-2 text-slate-800 hover:text-blue-700"
            >
              <HeartIcon className="h-5 w-5" />
              <CountBadge count={shownWishlistCount} />
            </Link>
            <Link
              href="/cart/"
              aria-label={`Cart, ${shownCartCount} items`}
              className="relative p-2 text-slate-800 hover:text-blue-700"
            >
              <CartIcon className="h-5 w-5" />
              <CountBadge count={shownCartCount} />
            </Link>
          </nav>
        </div>
      </div>

      {/* Desktop category bar with mega menu */}
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
        <ul className="mx-auto flex max-w-6xl items-center gap-6 px-4">
          {status === "loading" && (
            <li className="py-3 text-sm text-slate-500">Loading categories…</li>
          )}
          {status === "error" && (
            <li className="py-3 text-sm text-slate-500">
              Categories are unavailable.{" "}
              <Link href="/shop/" className="font-medium text-blue-700">
                Browse all products
              </Link>
            </li>
          )}
          {status === "ready" &&
            tree.map((node) => (
              <li
                key={node.id}
                onMouseEnter={() => setActiveId(node.id)}
                onFocus={() => setActiveId(node.id)}
              >
                <Link
                  href={`/category/${node.slug}/`}
                  className="block py-3 text-sm font-semibold text-slate-800 hover:text-blue-700 focus:text-blue-700"
                >
                  {node.name}
                </Link>
              </li>
            ))}
        </ul>

        {activeNode && activeNode.children.length > 0 && (
          <div className="absolute inset-x-0 top-full z-50 border-t border-slate-200 bg-white shadow-lg">
            <div className="mx-auto grid max-w-6xl grid-cols-4 gap-8 px-4 py-6">
              {activeNode.children.map((child) => (
                <div key={child.id}>
                  <Link
                    href={`/category/${child.slug}/`}
                    className="font-semibold text-slate-900 hover:text-blue-700"
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

      <MobileMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        tree={tree}
        status={status}
      />
    </header>
  );
}

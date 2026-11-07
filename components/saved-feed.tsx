"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Field, Notice } from "@/components/form-field";
import { SavedFeedItem, type FeedView } from "@/components/saved-feed-item";
import type { ProductCardData } from "@/hooks/use-home-products";
import { useAuth } from "@/hooks/use-auth";
import { useCatalogue } from "@/hooks/use-catalogue";
import { useCategoryTree, type CategoryNode } from "@/hooks/use-category-tree";
import { useHydrated } from "@/hooks/use-hydrated";
import { buildCards, EMPTY_FILTERS, scopeProducts } from "@/lib/catalogue";
import { supabase } from "@/lib/supabase";
import { useWishlistStore } from "@/stores/wishlist-store";

type SavedSearch = {
  id: string;
  label: string;
  query: string;
  category_id: string | null;
};

type SellerRef = { slug: string; display_name: string };

type Item = { card: ProductCardData; reason: string };

type Section = { key: string; title: string; subtitle: string; items: Item[] };

type Message = { tone: "error" | "info"; text: string } | null;

const PER_SECTION = 8;

const INPUT =
  "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-blue-600 focus:outline-none";

const BUTTON =
  "rounded-full bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:bg-slate-300";

const GHOST =
  "rounded-full border border-blue-700 px-5 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-50";

const TOGGLE =
  "rounded-full border px-4 py-2 text-sm font-semibold";

function findNode(nodes: CategoryNode[], id: string): CategoryNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    const found = findNode(node.children, id);
    if (found) return found;
  }
  return null;
}

/** The chosen category plus every subcategory beneath it. */
function idsUnder(node: CategoryNode): string[] {
  return [node.id, ...node.children.flatMap(idsUnder)];
}

/** Lists every category with its subcategories indented, for the category choice. */
function flatten(nodes: CategoryNode[], depth = 0): { id: string; label: string }[] {
  return nodes.flatMap((node) => [
    { id: node.id, label: `${"— ".repeat(depth)}${node.name}` },
    ...flatten(node.children, depth + 1),
  ]);
}

/** Pulls the seller out of each joined row, skipping any row without one. */
function sellersFrom(rows: unknown): SellerRef[] {
  return ((rows ?? []) as { sellers: SellerRef | null }[])
    .map((row) => row.sellers)
    .filter((seller): seller is SellerRef => seller !== null);
}

/** Adds up to a fixed number of products that no earlier section has shown. */
function takeFresh(
  cards: ProductCardData[],
  seen: Set<string>,
  reasonOf: (card: ProductCardData) => string
): Item[] {
  const items: Item[] = [];
  for (const card of cards) {
    if (items.length >= PER_SECTION) break;
    if (seen.has(card.productId)) continue;
    seen.add(card.productId);
    items.push({ card, reason: reasonOf(card) });
  }
  return items;
}

export function SavedFeed() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const hydrated = useHydrated();
  const wishlistItems = useWishlistStore((state) => state.items);
  const { products, status: catalogueStatus } = useCatalogue();
  const { tree, status: categoryStatus } = useCategoryTree();

  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [followed, setFollowed] = useState<SellerRef[]>([]);
  const [contacted, setContacted] = useState<SellerRef[]>([]);
  const [viewedIds, setViewedIds] = useState<string[]>([]);
  const [personalReady, setPersonalReady] = useState(false);
  const [version, setVersion] = useState(0);
  const [message, setMessage] = useState<Message>(null);
  const [busy, setBusy] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [view, setView] = useState<FeedView>("grid");

  const [newLabel, setNewLabel] = useState("");
  const [newQuery, setNewQuery] = useState("");
  const [newCategory, setNewCategory] = useState("");

  // Loads the signed-in customer's saved searches, followed sellers, contacted sellers and recent views.
  useEffect(() => {
    if (!userId) return;
    let active = true;

    async function load() {
      const [searchResult, followResult, conversationResult, viewResult] = await Promise.all([
        supabase
          .from("saved_searches")
          .select("id, label, query, category_id")
          .eq("user_id", userId)
          .order("created_at", { ascending: false }),
        supabase.from("seller_follows").select("sellers(slug, display_name)").eq("user_id", userId),
        supabase
          .from("conversations")
          .select("sellers(slug, display_name)")
          .eq("buyer_id", userId)
          .eq("hidden_by_admin", false),
        supabase
          .from("product_views")
          .select("product_id")
          .eq("user_id", userId)
          .order("viewed_at", { ascending: false })
          .limit(20),
      ]);

      if (!active) return;
      setSearches((searchResult.data ?? []) as SavedSearch[]);
      setFollowed(sellersFrom(followResult.data));
      setContacted(sellersFrom(conversationResult.data));
      setViewedIds(
        ((viewResult.data ?? []) as { product_id: string }[]).map((row) => row.product_id)
      );
      setPersonalReady(true);
    }

    void load();
    return () => {
      active = false;
    };
  }, [userId, version]);

  const sections = useMemo<Section[]>(() => {
    const seen = new Set<string>();
    const result: Section[] = [];

    // 1. Products matching each saved search.
    const searchItems: Item[] = [];
    for (const search of searches) {
      const category = search.category_id ? findNode(tree, search.category_id) : null;
      const categoryIds = category ? idsUnder(category) : null;
      const matches = buildCards(
        scopeProducts(products, categoryIds, search.query),
        EMPTY_FILTERS,
        "newest"
      );
      searchItems.push(
        ...takeFresh(matches, seen, () => `Matches your saved search "${search.label}"`)
      );
    }
    result.push({
      key: "searches",
      title: "From your saved searches",
      subtitle: "New products that match the searches you asked us to watch.",
      items: searchItems,
    });

    // 2. Newest products from sellers you follow.
    const followSlugs = new Set(followed.map((seller) => seller.slug));
    const followCards = buildCards(
      products.filter((product) => product.sellerSlug !== null && followSlugs.has(product.sellerSlug)),
      EMPTY_FILTERS,
      "newest"
    );
    result.push({
      key: "follows",
      title: "From sellers you follow",
      subtitle: "The latest products from the shops you follow.",
      items: takeFresh(followCards, seen, (card) => `From ${card.sellerName ?? "a seller you follow"}`),
    });

    // 3. Products from sellers you have messaged.
    const contactSlugs = new Set(contacted.map((seller) => seller.slug));
    const contactCards = buildCards(
      products.filter((product) => product.sellerSlug !== null && contactSlugs.has(product.sellerSlug)),
      EMPTY_FILTERS,
      "newest"
    );
    result.push({
      key: "contacted",
      title: "From sellers you've been in touch with",
      subtitle: "Shops you have messaged on Sumus.",
      items: takeFresh(
        contactCards,
        seen,
        (card) => `You've been in touch with ${card.sellerName ?? "this seller"}`
      ),
    });

    // 4. Similar items: other products in the same categories as your saved or viewed items.
    const sourceIds = new Set([
      ...(hydrated ? wishlistItems.map((item) => item.productId) : []),
      ...viewedIds,
    ]);
    const sourceCategories = new Set(
      products
        .filter((product) => sourceIds.has(product.productId) && product.categoryId !== null)
        .map((product) => product.categoryId as string)
    );
    const similarCards = buildCards(
      products.filter(
        (product) =>
          product.categoryId !== null &&
          sourceCategories.has(product.categoryId) &&
          !sourceIds.has(product.productId)
      ),
      EMPTY_FILTERS,
      "featured"
    );
    result.push({
      key: "similar",
      title: "Similar to your wishlist and recent views",
      subtitle: "Other products in the categories you have saved or looked at.",
      items: takeFresh(similarCards, seen, () => "Similar to something you saved or viewed"),
    });

    return result.filter((section) => section.items.length > 0);
  }, [products, tree, searches, followed, contacted, viewedIds, wishlistItems, hydrated]);

  function closeForm() {
    setFormOpen(false);
    setNewLabel("");
    setNewQuery("");
    setNewCategory("");
    setMessage(null);
  }

  async function addSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!userId) return;
    setMessage(null);

    const label = newLabel.trim();
    const query = newQuery.trim();

    if (!label) {
      setMessage({ tone: "error", text: "Give this search a name, such as Laptops under 300k." });
      return;
    }
    if (!query && !newCategory) {
      setMessage({ tone: "error", text: "Enter a word to search for, or choose a category." });
      return;
    }

    setBusy(true);
    const { error } = await supabase.from("saved_searches").insert({
      user_id: userId,
      label,
      query,
      category_id: newCategory || null,
    });
    setBusy(false);

    if (error) {
      setMessage({ tone: "error", text: "That search couldn't be saved. Try again." });
      return;
    }

    setNewLabel("");
    setNewQuery("");
    setNewCategory("");
    setFormOpen(false);
    setMessage({ tone: "info", text: "Saved. Your feed now checks this search." });
    setVersion((current) => current + 1);
  }

  async function removeSearch(id: string) {
    setMessage(null);
    const { error } = await supabase.from("saved_searches").delete().eq("id", id);
    if (error) {
      setMessage({ tone: "error", text: "That search couldn't be removed. Try again." });
      return;
    }
    setVersion((current) => current + 1);
  }

  function describeSearch(search: SavedSearch): string {
    const category = search.category_id ? findNode(tree, search.category_id) : null;
    return [search.query ? `"${search.query}"` : null, category ? `in ${category.name}` : null]
      .filter(Boolean)
      .join(" ");
  }

  if (catalogueStatus === "error" || categoryStatus === "error") {
    return (
      <p className="text-sm text-slate-600">
        Your feed is unavailable right now. Please refresh the page shortly.
      </p>
    );
  }

  if (!hydrated || !personalReady || catalogueStatus === "loading" || categoryStatus === "loading") {
    return <p className="text-sm text-slate-600">Loading your feed…</p>;
  }

  return (
    <div className="space-y-10">
      <section className="rounded-xl border border-slate-200 border-t-4 border-t-gold bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-ink">Your saved searches</h2>
            <p className="mt-1 text-sm text-slate-600">
              Each search checks the shop for new products and shows them in your feed.
            </p>
          </div>
          {!formOpen && (
            <button
              type="button"
              onClick={() => {
                setMessage(null);
                setFormOpen(true);
              }}
              className={BUTTON}
            >
              Add a saved search
            </button>
          )}
        </div>

        {message && !formOpen && (
          <div className="mt-4">
            <Notice tone={message.tone}>{message.text}</Notice>
          </div>
        )}

        {searches.length === 0 ? (
          <p className="mt-4 text-sm text-slate-600">No saved searches yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-200">
            {searches.map((search) => (
              <li key={search.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-semibold text-ink">{search.label}</p>
                  <p className="text-sm text-slate-600">{describeSearch(search)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => removeSearch(search.id)}
                  className="text-sm font-semibold text-red-600 hover:underline"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}

        {formOpen && (
          <form onSubmit={addSearch} className="mt-6 space-y-4 rounded-lg bg-paper p-4">
            <p className="text-sm font-bold text-ink">Add a saved search</p>
            <Field
              id="saved-search-label"
              label="Name for this search"
              maxLength={120}
              value={newLabel}
              onChange={(event) => setNewLabel(event.target.value)}
            />
            <Field
              id="saved-search-query"
              label="Word to search for (optional)"
              maxLength={120}
              value={newQuery}
              onChange={(event) => setNewQuery(event.target.value)}
            />
            <label htmlFor="saved-search-category" className="block text-sm font-medium text-ink">
              Category (optional)
              <select
                id="saved-search-category"
                value={newCategory}
                onChange={(event) => setNewCategory(event.target.value)}
                className={INPUT}
              >
                <option value="">All categories</option>
                {flatten(tree).map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            {message && <Notice tone={message.tone}>{message.text}</Notice>}
            <div className="flex flex-wrap gap-3">
              <button type="submit" disabled={busy} className={BUTTON}>
                {busy ? "Saving…" : "Save search"}
              </button>
              <button type="button" onClick={closeForm} className={GHOST}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </section>

      {sections.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="font-semibold text-ink">Your feed is empty for now.</p>
          <p className="mt-1 text-sm text-slate-600">
            It fills in as you save searches, follow sellers, message sellers or look at products.
          </p>
          <Link href="/shop/" className="mt-4 inline-block font-semibold text-blue-700 hover:underline">
            Browse products
          </Link>
        </div>
      ) : (
        <>
          <div className="flex justify-end gap-2">
            {(["grid", "list"] as FeedView[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setView(option)}
                aria-pressed={view === option}
                className={`${TOGGLE} ${
                  view === option
                    ? "border-blue-700 bg-blue-700 text-white"
                    : "border-slate-300 text-ink hover:border-slate-500"
                }`}
              >
                {option === "grid" ? "Grid" : "List"}
              </button>
            ))}
          </div>

          {sections.map((section) => (
            <section key={section.key}>
              <h2 className="text-xl font-bold text-ink">{section.title}</h2>
              <p className="mt-1 text-sm text-slate-600">{section.subtitle}</p>
              <div
                className={
                  view === "grid"
                    ? "mt-4 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4"
                    : "mt-4 space-y-3"
                }
              >
                {section.items.map((item) => (
                  <SavedFeedItem
                    key={item.card.productId}
                    card={item.card}
                    reason={item.reason}
                    view={view}
                  />
                ))}
              </div>
            </section>
          ))}
        </>
      )}
    </div>
  );
}

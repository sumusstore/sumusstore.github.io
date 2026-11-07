"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Field, Notice } from "@/components/form-field";
import { ProductCard } from "@/components/product-card";
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

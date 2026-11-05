"use client";

import { useEffect, useState } from "react";
import type { LoadStatus } from "@/hooks/use-home-products";
import type { CatalogueProduct } from "@/lib/catalogue";
import { supabase } from "@/lib/supabase";

type VariantRow = {
  id: string;
  storage: string | null;
  colour: string | null;
  price_kobo: number;
  compare_at_kobo: number | null;
  sale_ends_at: string | null;
  stock_qty: number;
  products: {
    id: string;
    name: string;
    slug: string;
    created_at: string;
    category_id: string | null;
    specifications: Record<string, unknown> | null;
    brands: { name: string } | null;
    product_images: { image_url: string; position: number }[];
    sellers: { slug: string; display_name: string } | null;
  } | null;
};

type CategoryRow = { id: string; name: string; parent_id: string | null };

// Every active variant with its product, brand, photos, seller and saved details, in one request.
const CATALOGUE_SELECT =
  "id, storage, colour, price_kobo, compare_at_kobo, sale_ends_at, stock_qty, products!inner(id, name, slug, created_at, category_id, specifications, brands(name), product_images(image_url, position), sellers(slug, display_name))";

/** The words a shopper can search by: the category and its parent, plus the values filled in for the product. */
function buildSearchText(
  categoryId: string | null,
  categories: Map<string, CategoryRow>,
  specifications: Record<string, unknown> | null
): string {
  const words: string[] = [];

  const own = categoryId ? categories.get(categoryId) : undefined;
  if (own) {
    words.push(own.name);
    const parent = own.parent_id ? categories.get(own.parent_id) : undefined;
    if (parent) words.push(parent.name);
  }

  for (const value of Object.values(specifications ?? {})) words.push(String(value));
  return words.join(" ");
}

/** Groups variant rows under their product, so each product appears once with all its variants. */
function groupByProduct(rows: VariantRow[], categories: Map<string, CategoryRow>): CatalogueProduct[] {
  const byId = new Map<string, CatalogueProduct>();

  for (const row of rows) {
    const product = row.products;
    if (!product) continue;

    let entry = byId.get(product.id);
    if (!entry) {
      const firstImage = [...product.product_images].sort((a, b) => a.position - b.position)[0];
      entry = {
        productId: product.id,
        slug: product.slug,
        name: product.name,
        brand: product.brands?.name ?? null,
        categoryId: product.category_id,
        imageUrl: firstImage?.image_url ?? null,
        createdAt: product.created_at,
        sellerSlug: product.sellers?.slug ?? null,
        sellerName: product.sellers?.display_name ?? null,
        searchText: buildSearchText(product.category_id, categories, product.specifications),
        variants: [],
      };
      byId.set(product.id, entry);
    }

    entry.variants.push({
      variantId: row.id,
      storage: row.storage,
      colour: row.colour,
      label: [row.storage, row.colour].filter(Boolean).join(" · "),
      priceKobo: row.price_kobo,
      compareAtKobo: row.compare_at_kobo,
      stock: row.stock_qty,
      saleEndsAt: row.sale_ends_at,
    });
  }

  return [...byId.values()];
}

/** Loads the whole active catalogue. The catalogue is small, so filtering happens in the browser. */
export function useCatalogue() {
  const [products, setProducts] = useState<CatalogueProduct[]>([]);
  const [status, setStatus] = useState<LoadStatus>("loading");

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const [variantResult, categoryResult] = await Promise.all([
          supabase
            .from("product_variants")
            .select(CATALOGUE_SELECT)
            .eq("products.is_active", true)
            .limit(1000),
          supabase.from("categories").select("id, name, parent_id"),
        ]);

        if (!active) return;
        if (variantResult.error || !variantResult.data) {
          setStatus("error");
          return;
        }

        // If the category names don't load, search still works on the product details.
        const categories = new Map<string, CategoryRow>(
          ((categoryResult.data ?? []) as CategoryRow[]).map((row) => [row.id, row])
        );

        setProducts(groupByProduct(variantResult.data as unknown as VariantRow[], categories));
        setStatus("ready");
      } catch {
        if (active) setStatus("error");
      }
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  return { products, status };
}

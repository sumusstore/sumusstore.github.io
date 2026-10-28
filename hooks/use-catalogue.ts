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
    brands: { name: string } | null;
    product_images: { image_url: string; position: number }[];
  } | null;
};

// Every active variant with its product, brand and photos, in one request.
const CATALOGUE_SELECT =
  "id, storage, colour, price_kobo, compare_at_kobo, sale_ends_at, stock_qty, products!inner(id, name, slug, created_at, category_id, brands(name), product_images(image_url, position))";

/** Groups variant rows under their product, so each product appears once with all its variants. */
function groupByProduct(rows: VariantRow[]): CatalogueProduct[] {
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
        const { data, error } = await supabase
          .from("product_variants")
          .select(CATALOGUE_SELECT)
          .eq("products.is_active", true)
          .limit(1000);

        if (!active) return;
        if (error || !data) {
          setStatus("error");
          return;
        }

        setProducts(groupByProduct(data as unknown as VariantRow[]));
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

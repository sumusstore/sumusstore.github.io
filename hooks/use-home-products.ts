"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

/** One card per product. The variant decides price, stock and the cart item. */
export type ProductCardData = {
  productId: string;
  variantId: string;
  slug: string;
  name: string;
  brand: string | null;
  variantLabel: string;
  imageUrl: string | null;
  priceKobo: number;
  compareAtKobo: number | null;
  stock: number;
  saleEndsAt: string | null;
  createdAt: string;
};

export type HomeProducts = {
  flashSales: ProductCardData[];
  priceDrops: ProductCardData[];
  newArrivals: ProductCardData[];
};

export type LoadStatus = "loading" | "ready" | "error";

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
    brands: { name: string } | null;
    product_images: { image_url: string; position: number }[];
  } | null;
};

// One query loads every active variant with its product, brand and images.
// The catalogue is small for now. We can move this to server-side paging later.
const VARIANT_SELECT =
  "id, storage, colour, price_kobo, compare_at_kobo, sale_ends_at, stock_qty, products!inner(id, name, slug, created_at, brands(name), product_images(image_url, position))";

function toCard(row: VariantRow): ProductCardData | null {
  const product = row.products;
  if (!product) return null;

  const firstImage = [...product.product_images].sort((a, b) => a.position - b.position)[0];

  return {
    productId: product.id,
    variantId: row.id,
    slug: product.slug,
    name: product.name,
    brand: product.brands?.name ?? null,
    variantLabel: [row.storage, row.colour].filter(Boolean).join(" · "),
    imageUrl: firstImage?.image_url ?? null,
    priceKobo: row.price_kobo,
    compareAtKobo: row.compare_at_kobo,
    stock: row.stock_qty,
    saleEndsAt: row.sale_ends_at,
    createdAt: product.created_at,
  };
}

function endTime(card: ProductCardData): number {
  return card.saleEndsAt ? new Date(card.saleEndsAt).getTime() : 0;
}

/** Keeps the first card for each product, so every product appears once per row. */
function onePerProduct(cards: ProductCardData[]): ProductCardData[] {
  const seen = new Set<string>();
  return cards.filter((card) => {
    if (seen.has(card.productId)) return false;
    seen.add(card.productId);
    return true;
  });
}

export function useHomeProducts() {
  const [products, setProducts] = useState<HomeProducts>({
    flashSales: [],
    priceDrops: [],
    newArrivals: [],
  });
  const [status, setStatus] = useState<LoadStatus>("loading");

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const { data, error } = await supabase
          .from("product_variants")
          .select(VARIANT_SELECT)
          .eq("products.is_active", true)
          .limit(500);

        if (!active) return;
        if (error || !data) {
          setStatus("error");
          return;
        }

        const cards = (data as unknown as VariantRow[])
          .map(toCard)
          .filter((card): card is ProductCardData => card !== null);

        // In-stock variants first, so each product shows a variant the customer can buy.
        const inStockFirst = [...cards].sort((a, b) => Number(b.stock > 0) - Number(a.stock > 0));
        const now = Date.now();

        const flashSales = onePerProduct(
          inStockFirst
            .filter((card) => endTime(card) > now)
            .sort((a, b) => endTime(a) - endTime(b))
        ).slice(0, 8);

        const priceDrops = onePerProduct(
          inStockFirst.filter(
            (card) => card.compareAtKobo !== null && card.compareAtKobo > card.priceKobo
          )
        ).slice(0, 8);

        const newArrivals = onePerProduct(
          [...inStockFirst].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
        ).slice(0, 8);

        setProducts({ flashSales, priceDrops, newArrivals });
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

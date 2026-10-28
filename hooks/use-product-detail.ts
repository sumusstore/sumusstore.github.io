"use client";

import { useEffect, useState } from "react";
import type { LoadStatus } from "@/hooks/use-home-products";
import { supabase } from "@/lib/supabase";

export type DetailVariant = {
  id: string;
  storage: string | null;
  colour: string | null;
  label: string;
  priceKobo: number;
  compareAtKobo: number | null;
  saleEndsAt: string | null;
  stock: number;
};

export type DetailImage = {
  url: string;
  variantId: string | null;
  position: number;
};

export type DetailReview = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
};

export type ProductDetail = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  specifications: Record<string, unknown>;
  brand: string | null;
  categoryId: string | null;
  categoryName: string | null;
  categorySlug: string | null;
  images: DetailImage[];
  variants: DetailVariant[];
  reviews: DetailReview[];
};

type ProductRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  specifications: Record<string, unknown> | null;
  brands: { name: string } | null;
  categories: { id: string; name: string; slug: string } | null;
  product_images: { image_url: string; variant_id: string | null; position: number }[];
  product_variants: {
    id: string;
    storage: string | null;
    colour: string | null;
    price_kobo: number;
    compare_at_kobo: number | null;
    sale_ends_at: string | null;
    stock_qty: number;
    is_active: boolean;
  }[];
  reviews: { id: string; rating: number; comment: string | null; created_at: string }[];
};

// One request loads the product with its brand, category, photos, variants and reviews.
// The database rules only return approved reviews to shoppers.
const PRODUCT_SELECT =
  "id, name, slug, description, specifications, brands(name), categories(id, name, slug), product_images(image_url, variant_id, position), product_variants(id, storage, colour, price_kobo, compare_at_kobo, sale_ends_at, stock_qty, is_active), reviews(id, rating, comment, created_at)";

function toDetail(row: ProductRow): ProductDetail {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    specifications: row.specifications ?? {},
    brand: row.brands?.name ?? null,
    categoryId: row.categories?.id ?? null,
    categoryName: row.categories?.name ?? null,
    categorySlug: row.categories?.slug ?? null,
    images: row.product_images.map((image) => ({
      url: image.image_url,
      variantId: image.variant_id,
      position: image.position,
    })),
    variants: row.product_variants
      .filter((variant) => variant.is_active)
      .map((variant) => ({
        id: variant.id,
        storage: variant.storage,
        colour: variant.colour,
        label: [variant.storage, variant.colour].filter(Boolean).join(" · "),
        priceKobo: variant.price_kobo,
        compareAtKobo: variant.compare_at_kobo,
        saleEndsAt: variant.sale_ends_at,
        stock: variant.stock_qty,
      })),
    reviews: row.reviews
      .map((review) => ({
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.created_at,
      }))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
  };
}

export function useProductDetail(slug: string) {
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [status, setStatus] = useState<LoadStatus>("loading");

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const { data, error } = await supabase
          .from("products")
          .select(PRODUCT_SELECT)
          .eq("slug", slug)
          .eq("is_active", true)
          .maybeSingle();

        if (!active) return;
        if (error) {
          setStatus("error");
          return;
        }

        setProduct(data ? toDetail(data as unknown as ProductRow) : null);
        setStatus("ready");
      } catch {
        if (active) setStatus("error");
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [slug]);

  return { product, status };
}

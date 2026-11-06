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
  verified: boolean;
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
  /** Null for products Sumus sells itself. */
  sellerSlug: string | null;
  sellerName: string | null;
  /** The seller's average rating from approved reviews. Null if they have none yet. */
  sellerRating: { average: number; count: number } | null;
  warrantyPeriod: string | null;
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
  warranty_period: string | null;
  brands: { name: string } | null;
  categories: { id: string; name: string; slug: string } | null;
  sellers: { slug: string; display_name: string } | null;
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
  reviews: {
    id: string;
    rating: number;
    comment: string | null;
    created_at: string;
    status: string;
    verified_purchase: boolean;
  }[];
};

// One request loads the product with its brand, category, seller, photos, variants and reviews.
// Signed-in customers can also read their own waiting review, so only approved ones are kept below.
const PRODUCT_SELECT =
  "id, name, slug, description, specifications, warranty_period, brands(name), categories(id, name, slug), sellers(slug, display_name), product_images(image_url, variant_id, position), product_variants(id, storage, colour, price_kobo, compare_at_kobo, sale_ends_at, stock_qty, is_active), reviews(id, rating, comment, created_at, status, verified_purchase)";

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
    sellerSlug: row.sellers?.slug ?? null,
    sellerName: row.sellers?.display_name ?? null,
    sellerRating: null,
    warrantyPeriod: row.warranty_period,
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
      .filter((review) => review.status === "approved")
      .map((review) => ({
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.created_at,
        verified: review.verified_purchase === true,
      }))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
  };
}

/**
 * The database doesn't keep the order of saved details, so they are listed here in the order
 * the admin set the category's fields. Any other details follow after.
 */
function orderSpecs(
  specs: Record<string, unknown>,
  fields: { label: string }[]
): Record<string, unknown> {
  const ordered: Record<string, unknown> = {};
  for (const field of fields) {
    if (Object.prototype.hasOwnProperty.call(specs, field.label)) ordered[field.label] = specs[field.label];
  }
  for (const [key, value] of Object.entries(specs)) {
    if (!Object.prototype.hasOwnProperty.call(ordered, key)) ordered[key] = value;
  }
  return ordered;
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

        const detail = data ? toDetail(data as unknown as ProductRow) : null;

        // A failed field lookup only means the details stay in their saved order.
        if (detail && detail.categoryId && Object.keys(detail.specifications).length > 0) {
          const { data: fieldRows } = await supabase
            .from("category_fields")
            .select("label, sort_order")
            .eq("category_id", detail.categoryId)
            .order("sort_order", { ascending: true });
          if (!active) return;
          detail.specifications = orderSpecs(detail.specifications, (fieldRows ?? []) as { label: string }[]);
        }

        // A failed rating lookup only means no rating is shown.
        if (detail && detail.sellerSlug) {
          const { data: ratingRows } = await supabase.rpc("seller_rating", { p_slug: detail.sellerSlug });
          if (!active) return;
          const row = ((ratingRows ?? []) as { average: number | string | null; review_count: number }[])[0];
          if (row && row.review_count > 0 && row.average !== null) {
            detail.sellerRating = { average: Number(row.average), count: row.review_count };
          }
        }

        setProduct(detail);
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

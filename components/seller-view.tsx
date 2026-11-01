"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ProductCard } from "@/components/product-card";
import { buildCards, EMPTY_FILTERS, type CatalogueProduct } from "@/lib/catalogue";
import { supabase } from "@/lib/supabase";

type SellerInfo = {
  slug: string;
  display_name: string;
  kind: "business" | "individual";
  state: string;
  created_at: string;
};

type ProductRow = {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  brands: { name: string } | null;
  product_images: { image_url: string; position: number }[];
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
};

// The sellers!inner join keeps only products from approved sellers with this shop address.
const PRODUCT_SELECT =
  "id, name, slug, created_at, brands(name), product_images(image_url, position), product_variants(id, storage, colour, price_kobo, compare_at_kobo, sale_ends_at, stock_qty, is_active), sellers!inner(slug)";

function toCatalogue(row: ProductRow): CatalogueProduct {
  const firstImage = [...row.product_images].sort((a, b) => a.position - b.position)[0];
  return {
    productId: row.id,
    slug: row.slug,
    name: row.name,
    brand: row.brands?.name ?? null,
    categoryId: null,
    imageUrl: firstImage?.image_url ?? null,
    createdAt: row.created_at,
    variants: row.product_variants
      .filter((v) => v.is_active)
      .map((v) => ({
        variantId: v.id,
        storage: v.storage,
        colour: v.colour,
        label: [v.storage, v.colour].filter(Boolean).join(" · "),
        priceKobo: v.price_kobo,
        compareAtKobo: v.compare_at_kobo,
        stock: v.stock_qty,
        saleEndsAt: v.sale_ends_at,
      })),
  };
}

function joinedLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("en-NG", { month: "long", year: "numeric" });
}

export function SellerView({ slug }: { slug: string }) {
  const [seller, setSeller] = useState<SellerInfo | null>(null);
  const [products, setProducts] = useState<CatalogueProduct[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const [sellerResult, productResult] = await Promise.all([
          supabase
            .from("public_sellers")
            .select("slug, display_name, kind, state, created_at")
            .eq("slug", slug)
            .maybeSingle(),
          supabase
            .from("products")
            .select(PRODUCT_SELECT)
            .eq("is_active", true)
            .eq("sellers.slug", slug)
            .limit(200),
        ]);

        if (!active) return;
        if (sellerResult.error || productResult.error) {
          setStatus("error");
          return;
        }

        setSeller((sellerResult.data ?? null) as SellerInfo | null);
        setProducts(((productResult.data ?? []) as unknown as ProductRow[]).map(toCatalogue));
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

  const cards = useMemo(() => buildCards(products, EMPTY_FILTERS, "featured"), [products]);

  if (status === "loading") {
    return <p className="mx-auto max-w-6xl px-4 py-12 text-sm text-slate-600">Loading shop…</p>;
  }

  if (status === "error") {
    return (
      <p className="mx-auto max-w-6xl px-4 py-12 text-sm text-slate-600">
        This shop is unavailable right now. Please refresh the page shortly.
      </p>
    );
  }

  if (!seller) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-ink">Shop not found</h1>
        <p className="mt-2 text-sm text-slate-600">This seller may have been paused, or the link may be wrong.</p>
        <Link href="/sellers/" className="mt-6 inline-block font-semibold text-blue-700 hover:underline">
          Browse all sellers
        </Link>
      </section>
    );
  }

  return (
    <>
      <section className="bg-blue-700 text-white">
        <div className="mx-auto max-w-6xl px-4 py-10 md:py-14">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-100">
            {seller.kind === "business" ? "Registered business" : "Individual seller"}
          </p>
          <h1 className="mt-2 text-3xl font-bold md:text-4xl">{seller.display_name}</h1>
          <p className="mt-2 text-blue-50">
            {seller.state} · Member since {joinedLabel(seller.created_at)}
          </p>
          <span aria-hidden="true" className="mt-4 block h-1 w-16 rounded bg-gold" />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-xl font-bold text-ink md:text-2xl">Products from {seller.display_name}</h2>
          <p className="text-sm text-slate-600">
            {cards.length} {cards.length === 1 ? "product" : "products"}
          </p>
        </div>

        {cards.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <p className="font-semibold text-ink">No products listed right now.</p>
            <p className="mt-1 text-sm text-slate-600">Check back soon, or browse other sellers.</p>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
            {cards.map((card) => (
              <ProductCard key={card.variantId} product={card} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}

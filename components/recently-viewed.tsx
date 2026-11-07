"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ProductCard } from "@/components/product-card";
import type { ProductCardData } from "@/hooks/use-home-products";
import { useAuth } from "@/hooks/use-auth";
import { useCatalogue } from "@/hooks/use-catalogue";
import { buildCards, EMPTY_FILTERS } from "@/lib/catalogue";
import { supabase } from "@/lib/supabase";

const BUTTON =
  "rounded-full border border-blue-700 px-5 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-50 disabled:text-slate-400";

export function RecentlyViewed() {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id ?? null;
  const { products, status: catalogueStatus } = useCatalogue();

  const [ids, setIds] = useState<string[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [version, setVersion] = useState(0);

  // Loads the most recent product views, newest first.
  useEffect(() => {
    if (authLoading || !userId) return;
    let active = true;

    supabase
      .from("product_views")
      .select("product_id")
      .eq("user_id", userId)
      .order("viewed_at", { ascending: false })
      .limit(40)
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          setFailed(true);
          return;
        }
        setIds(((data ?? []) as { product_id: string }[]).map((row) => row.product_id));
      });

    return () => {
      active = false;
    };
  }, [authLoading, userId, version]);

  // Keeps the viewed order, and skips products that are no longer on sale.
  const cards = useMemo<ProductCardData[]>(() => {
    if (!ids) return [];
    const byId = new Map(
      buildCards(products, EMPTY_FILTERS, "featured").map((card) => [card.productId, card])
    );
    return ids
      .map((id) => byId.get(id))
      .filter((card): card is ProductCardData => card !== undefined);
  }, [ids, products]);

  async function clearHistory() {
    if (!userId) return;
    if (!window.confirm("Clear your recently viewed list?")) return;

    setBusy(true);
    setNotice(null);
    const { error } = await supabase.from("product_views").delete().eq("user_id", userId);
    setBusy(false);

    if (error) {
      setNotice("Your list couldn't be cleared. Try again.");
      return;
    }
    setVersion((current) => current + 1);
  }

  if (authLoading) {
    return <p className="text-sm text-slate-600">Loading your products…</p>;
  }

  if (failed || catalogueStatus === "error") {
    return (
      <p className="text-sm text-slate-600">
        Your recently viewed products are unavailable right now. Please refresh the page shortly.
      </p>
    );
  }

  if (ids === null || catalogueStatus === "loading") {
    return <p className="text-sm text-slate-600">Loading your products…</p>;
  }

  if (cards.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
        <p className="font-semibold text-ink">Nothing viewed yet.</p>
        <p className="mt-1 text-sm text-slate-600">
          Products you open while signed in appear here.
        </p>
        <Link href="/shop/" className="mt-4 inline-block font-semibold text-blue-700 hover:underline">
          Browse products
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600">
          {cards.length} {cards.length === 1 ? "product" : "products"}, newest first
        </p>
        <button type="button" onClick={clearHistory} disabled={busy} className={BUTTON}>
          {busy ? "Clearing…" : "Clear history"}
        </button>
      </div>

      {notice && <p className="mt-3 text-sm text-red-700">{notice}</p>}

      <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        {cards.map((card) => (
          <ProductCard key={card.productId} product={card} />
        ))}
      </div>
    </div>
  );
}

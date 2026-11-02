"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Notice } from "@/components/form-field";
import { SellerProductEditor } from "@/components/seller-product-editor";
import { useAuth } from "@/hooks/use-auth";
import { formatNaira } from "@/lib/format";
import { supabase } from "@/lib/supabase";

type MySeller = { id: string; display_name: string; status: string; kind: string };

type ProductRow = {
  id: string;
  name: string;
  is_active: boolean;
  seller_paused: boolean;
  moderation: "live" | "hidden";
  product_images: { image_url: string; position: number }[];
  product_variants: { price_kobo: number; stock_qty: number; is_active: boolean }[];
};

type Feedback = { tone: "error" | "info"; text: string } | null;

const CARD = "rounded-xl border border-slate-200 border-t-4 border-t-gold bg-white p-6";

function statusOf(row: ProductRow): { label: string; className: string } {
  if (row.moderation === "hidden") return { label: "Hidden by Sumus", className: "bg-red-50 text-red-700" };
  if (row.seller_paused) return { label: "Paused by you", className: "bg-amber-50 text-amber-800" };
  if (row.is_active) return { label: "Live", className: "bg-blue-50 text-blue-700" };
  return { label: "Not live yet", className: "bg-gold/20 text-ink" };
}

function priceRange(row: ProductRow): string {
  const prices = row.product_variants.filter((v) => v.is_active).map((v) => v.price_kobo);
  if (prices.length === 0) return "No price yet";
  const low = Math.min(...prices);
  const high = Math.max(...prices);
  return low === high ? formatNaira(low) : `${formatNaira(low)} to ${formatNaira(high)}`;
}

function stockOf(row: ProductRow): number {
  return row.product_variants.filter((v) => v.is_active).reduce((total, v) => total + v.stock_qty, 0);
}

export function SellerDashboard() {
  const { user, loading } = useAuth();
  const userId = user?.id ?? null;
  const [seller, setSeller] = useState<MySeller | null | undefined>(undefined);
  const [products, setProducts] = useState<ProductRow[] | null>(null);
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    supabase
      .from("sellers")
      .select("id, display_name, status, kind")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (active) setSeller((data ?? null) as MySeller | null);
      });
    return () => {
      active = false;
    };
  }, [userId]);

  useEffect(() => {
    if (!seller || seller.status !== "approved") return;
    let active = true;
    supabase
      .from("products")
      .select(
        "id, name, is_active, seller_paused, moderation, product_images(image_url, position), product_variants(price_kobo, stock_qty, is_active)"
      )
      .eq("seller_id", seller.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (active) setProducts((data ?? []) as unknown as ProductRow[]);
      });
    return () => {
      active = false;
    };
  }, [seller, reloadKey]);

  async function togglePause(row: ProductRow) {
    const pausing = !row.seller_paused;
    if (
      pausing &&
      !window.confirm(`Pause ${row.name}? It leaves the shop straight away, and Sumus is told.`)
    ) {
      return;
    }

    setBusyId(row.id);
    setFeedback(null);
    const { error } = await supabase.rpc("seller_set_pause", {
      p_product_id: row.id,
      p_paused: pausing,
    });
    setBusyId(null);

    if (error) {
      setFeedback({ tone: "error", text: error.message });
      return;
    }

    setFeedback({
      tone: "info",
      text: pausing
        ? `${row.name} is paused and hidden from the shop. Sumus has been told.`
        : `${row.name} is resumed. It goes live once every item in its checklist is complete.`,
    });
    setReloadKey((key) => key + 1);
  }

  if (loading) {
    return <p className="text-sm text-slate-600">Checking your account…</p>;
  }

  if (!userId) {
    return (
      <div className={CARD}>
        <h2 className="text-lg font-bold text-ink">Sign in to open your shop</h2>
        <Link
          href="/login/?next=/my-shop/"
          className="mt-4 inline-block rounded-full bg-blue-700 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-800"
        >
          Sign in
        </Link>
      </div>
    );
  }

  if (seller === undefined) {
    return <p className="text-sm text-slate-600">Loading your shop…</p>;
  }

  if (seller === null) {
    return (
      <div className={CARD}>
        <h2 className="text-lg font-bold text-ink">You don&apos;t have a seller account yet</h2>
        <p className="mt-2 text-sm text-slate-700">
          Apply first. Sumus reviews each application before you can list products.
        </p>
        <Link href="/sell/" className="mt-4 inline-block font-semibold text-blue-700 hover:underline">
          Apply to sell
        </Link>
      </div>
    );
  }

  if (seller.status !== "approved") {
    return (
      <div className={CARD}>
        <h2 className="text-lg font-bold text-ink">Your seller account isn&apos;t active yet</h2>
        <p className="mt-2 text-sm text-slate-700">
          {seller.status === "pending"
            ? "Your application is still being reviewed. We'll contact you on the phone number you gave us."
            : "Your seller account is paused. Contact Sumus for details."}
        </p>
      </div>
    );
  }

  const list = products ?? [];
  const liveCount = list.filter((p) => p.is_active).length;

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-blue-700 p-6 text-white">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-100">My shop</p>
        <p className="mt-1 text-xl font-bold">{seller.display_name}</p>
        <p className="mt-1 text-sm text-blue-50">
          {liveCount} live · {list.length} {list.length === 1 ? "product" : "products"}
        </p>
      </div>

      {editing ? (
        <SellerProductEditor
          sellerId={seller.id}
          productId={editing === "new" ? null : editing}
          onChanged={() => setReloadKey((key) => key + 1)}
          onClose={() => setEditing(null)}
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-ink">Your products</h2>
            <button
              type="button"
              onClick={() => setEditing("new")}
              className="rounded-full bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
            >
              Add a product
            </button>
          </div>

          {feedback && <Notice tone={feedback.tone}>{feedback.text}</Notice>}

          {products === null && <p className="text-sm text-slate-600">Loading your products…</p>}
          {products !== null && list.length === 0 && (
            <p className="text-sm text-slate-600">No products yet. Add your first one.</p>
          )}

          <ul className="space-y-3">
            {list.map((row) => {
              const status = statusOf(row);
              const photo = [...row.product_images].sort((a, b) => a.position - b.position)[0];
              const busy = busyId === row.id;

              return (
                <li
                  key={row.id}
                  className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 border-t-4 border-t-gold bg-white p-4"
                >
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-paper">
                    {photo ? (
                      <img src={photo.image_url} alt="" loading="lazy" className="h-full w-full object-contain p-1" />
                    ) : (
                      <span className="flex h-full items-center justify-center text-[10px] text-slate-400">
                        No photo
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-ink">{row.name}</p>
                    <p className="text-sm text-slate-600">
                      {priceRange(row)} · {stockOf(row)} in stock
                    </p>
                    {row.moderation === "hidden" && (
                      <p className="mt-1 text-xs text-red-700">Contact Sumus to restore this product.</p>
                    )}
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${status.className}`}>
                    {status.label}
                  </span>
                  <div className="flex gap-2">
                    {row.moderation !== "hidden" && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => togglePause(row)}
                        className="rounded-full border border-slate-400 px-4 py-2 text-sm font-semibold text-ink hover:border-slate-700 disabled:text-slate-400"
                      >
                        {busy ? "Saving…" : row.seller_paused ? "Resume" : "Pause"}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setEditing(row.id)}
                      className="rounded-full border border-blue-700 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
                    >
                      Edit
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
            Orders for your products will appear here once payouts are set up in a later step.
          </div>
        </>
      )}
    </div>
  );
}

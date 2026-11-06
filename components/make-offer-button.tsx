"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase";

type MakeOfferButtonProps = {
  productId: string;
  /** Null for products Sumus sells itself. Offers are only for seller products. */
  sellerSlug: string | null;
  /** The version the buyer has chosen on the product page. */
  variantId: string | null;
  disabled: boolean;
};

/** Shows "Make an offer" only when the seller has switched offers on for this product. */
export function MakeOfferButton({ productId, sellerSlug, variantId, disabled }: MakeOfferButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sellerSlug) {
      setEnabled(false);
      return;
    }

    let active = true;
    supabase
      .from("products")
      .select("accepts_offers")
      .eq("id", productId)
      .maybeSingle()
      .then(({ data, error: loadError }) => {
        if (!active) return;
        setEnabled(!loadError && (data as { accepts_offers: boolean } | null)?.accepts_offers === true);
      });

    return () => {
      active = false;
    };
  }, [productId, sellerSlug]);

  if (!enabled) return null;

  async function handleClick() {
    if (loading || busy) return;

    if (!user) {
      router.push(`/login/?next=${encodeURIComponent(pathname)}`);
      return;
    }

    setBusy(true);
    setError(null);
    const { data, error: startError } = await supabase.rpc("start_conversation", {
      p_product_id: productId,
    });
    setBusy(false);

    if (startError || typeof data !== "string") {
      setError(startError?.message ?? "The conversation could not be started.");
      return;
    }

    const offerPart = variantId ? `&offer=${encodeURIComponent(variantId)}` : "&offer=1";
    router.push(`/messages/?c=${data}${offerPart}`);
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={busy || disabled}
        className="w-full rounded-full border border-blue-700 px-6 py-3 font-semibold text-blue-700 hover:bg-blue-50 disabled:border-slate-300 disabled:text-slate-400"
      >
        {busy ? "Opening…" : "Make an offer"}
      </button>
      {error && (
        <p role="alert" className="mt-1 text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

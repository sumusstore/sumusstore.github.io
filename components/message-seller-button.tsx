"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase";

type MessageSellerButtonProps = {
  productId: string;
  /** False for products Sumus sells itself. Those keep the WhatsApp link for now. */
  soldBySeller: boolean;
  whatsappHref: string;
};

const BUTTON_CLASS =
  "shrink-0 rounded-full border border-slate-400 px-5 py-2 text-sm font-semibold text-ink hover:border-slate-700 disabled:opacity-60";

/** Opens a conversation with the seller of a product, or sends the person to log in first. */
export function MessageSellerButton({ productId, soldBySeller, whatsappHref }: MessageSellerButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!soldBySeller) {
    return (
      <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className={BUTTON_CLASS}>
        Message
      </a>
    );
  }

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

    router.push(`/messages/?c=${data}`);
  }

  return (
    <div className="shrink-0 text-right">
      <button type="button" onClick={handleClick} disabled={busy} className={BUTTON_CLASS}>
        {busy ? "Opening…" : "Message"}
      </button>
      {error && (
        <p role="alert" className="mt-1 max-w-48 text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

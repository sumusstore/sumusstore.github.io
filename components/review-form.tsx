"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Notice } from "@/components/form-field";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase";

type ReviewState = "loading" | "can_review" | "already" | "not_eligible" | "error";

const CARD = "rounded-xl border border-slate-200 border-t-4 border-t-gold bg-white p-5";

/** The review box on a product page. Only a customer who received the product can write a review. */
export function ReviewForm({ productId }: { productId: string }) {
  const { user, loading: authLoading } = useAuth();
  const pathname = usePathname();
  const userId = user?.id ?? null;

  const [state, setState] = useState<ReviewState>("loading");
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [thanks, setThanks] = useState(false);

  useEffect(() => {
    if (authLoading || !userId) return;

    let active = true;
    setState("loading");

    supabase.rpc("review_status", { p_product_id: productId }).then(({ data, error: rpcError }) => {
      if (!active) return;
      if (rpcError) {
        setState("error");
        return;
      }
      const value = String(data);
      setState(value === "can_review" || value === "already" ? value : "not_eligible");
    });

    return () => {
      active = false;
    };
  }, [authLoading, userId, productId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (rating < 1) {
      setError("Choose a rating from 1 to 5 stars.");
      return;
    }

    setBusy(true);
    const { error: rpcError } = await supabase.rpc("submit_review", {
      p_product_id: productId,
      p_rating: rating,
      p_comment: comment.trim() || null,
    });
    setBusy(false);

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    setThanks(true);
    setState("already");
    setRating(0);
    setComment("");
  }

  if (authLoading) return null;

  if (!userId) {
    return (
      <div className={CARD}>
        <h3 className="text-base font-bold text-ink">Write a review</h3>
        <p className="mt-2 text-sm text-slate-700">
          Customers who have received this product can review it.
        </p>
        <Link
          href={`/login/?next=${encodeURIComponent(pathname || "/")}`}
          className="mt-4 inline-block rounded-full bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
        >
          Log in to review
        </Link>
      </div>
    );
  }

  if (thanks) {
    return <Notice tone="info">Thanks. Your review shows once Sumus has checked it.</Notice>;
  }

  if (state === "loading") {
    return <p className="text-sm text-slate-600">Checking whether you can review this product…</p>;
  }

  if (state === "error") {
    return <p className="text-sm text-slate-600">Reviews can&apos;t be checked right now. Please try again shortly.</p>;
  }

  if (state === "already") {
    return <p className="text-sm text-slate-700">You&apos;ve already reviewed this product. Thank you.</p>;
  }

  if (state === "not_eligible") {
    return (
      <div className={CARD}>
        <h3 className="text-base font-bold text-ink">Write a review</h3>
        <p className="mt-2 text-sm text-slate-700">
          Reviews come from customers who have received this product. Orders placed while you were logged in to
          your account count.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={`${CARD} space-y-4`}>
      <h3 className="text-base font-bold text-ink">Write a review</h3>

      <div>
        <p className="text-sm font-semibold text-ink">Your rating</p>
        <div className="mt-2 flex gap-1" role="group" aria-label="Rating">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setRating(value)}
              aria-label={`${value} ${value === 1 ? "star" : "stars"}`}
              aria-pressed={rating === value}
              className={`text-3xl leading-none ${value <= rating ? "text-gold" : "text-slate-300"} hover:text-gold`}
            >
              ★
            </button>
          ))}
        </div>
      </div>

      <label className="block text-sm font-semibold text-ink">
        Your review (optional)
        <textarea
          rows={4}
          maxLength={1000}
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          placeholder="What was it like? How was the delivery?"
          className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal focus:border-blue-700 focus:outline-none"
        />
      </label>

      {error && <Notice tone="error">{error}</Notice>}

      <button
        type="submit"
        disabled={busy}
        className="rounded-full bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:bg-slate-300"
      >
        {busy ? "Sending…" : "Send review"}
      </button>
      <p className="text-xs text-slate-500">Your review shows on the product page once Sumus has checked it.</p>
    </form>
  );
}

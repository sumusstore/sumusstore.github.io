"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase";

type SaveSearchButtonProps = {
  label: string;
  query: string;
  categoryId: string | null;
  /** The search page address, so a guest can log in and come back to it. */
  returnTo: string;
};

const BUTTON =
  "rounded-full border border-blue-700 px-5 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-50 disabled:text-slate-400";

/** Saves the search the shopper is looking at, so it shows in their Saved feed. */
export function SaveSearchButton({ label, query, categoryId, returnTo }: SaveSearchButtonProps) {
  const router = useRouter();
  const { user, loading } = useAuth();
  const userId = user?.id ?? null;

  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (loading || busy) return;

    if (!userId) {
      router.push(`/login/?next=${encodeURIComponent(returnTo)}`);
      return;
    }

    setBusy(true);
    setError(null);

    const { error: insertError } = await supabase.from("saved_searches").insert({
      user_id: userId,
      label: label.slice(0, 120) || "My search",
      query,
      category_id: categoryId,
    });

    setBusy(false);

    if (insertError) {
      setError("That search couldn't be saved. Try again.");
      return;
    }
    setSaved(true);
  }

  if (saved) {
    return (
      <p className="text-sm text-slate-700">
        Saved. Your feed now checks this search.{" "}
        <Link href="/account/saved-feed/" className="font-semibold text-blue-700 hover:underline">
          View saved feed
        </Link>
      </p>
    );
  }

  return (
    <div>
      <button type="button" onClick={handleClick} disabled={busy || loading} className={BUTTON}>
        {busy ? "Saving…" : "Save this search"}
      </button>
      {error && (
        <p role="alert" className="mt-1 text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

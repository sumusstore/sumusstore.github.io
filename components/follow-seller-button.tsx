"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase";

type FollowSellerButtonProps = {
  sellerSlug: string;
};

const BUTTON_CLASS =
  "rounded-full px-5 py-2.5 text-sm font-semibold disabled:opacity-60";

/** Lets a signed-in customer follow a seller's shop. Guests are sent to log in first. */
export function FollowSellerButton({ sellerSlug }: FollowSellerButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const userId = user?.id ?? null;

  const [sellerId, setSellerId] = useState<string | null>(null);
  const [following, setFollowing] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Visitors can read sellers.id through the granted column privileges.
  useEffect(() => {
    let active = true;

    supabase
      .from("sellers")
      .select("id")
      .eq("slug", sellerSlug)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return;
        setSellerId((data as { id: string } | null)?.id ?? null);
      });

    return () => {
      active = false;
    };
  }, [sellerSlug]);

  // Checks whether the signed-in customer already follows this seller.
  useEffect(() => {
    if (loading) return;
    if (!userId || !sellerId) {
      setFollowing(false);
      setReady(true);
      return;
    }

    let active = true;

    supabase
      .from("seller_follows")
      .select("seller_id")
      .eq("user_id", userId)
      .eq("seller_id", sellerId)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return;
        setFollowing(data !== null);
        setReady(true);
      });

    return () => {
      active = false;
    };
  }, [loading, userId, sellerId]);

  async function handleClick() {
    if (loading || busy) return;

    if (!userId) {
      router.push(`/login/?next=${encodeURIComponent(pathname)}`);
      return;
    }
    if (!sellerId) return;

    setBusy(true);
    setError(null);

    const result = following
      ? await supabase
          .from("seller_follows")
          .delete()
          .eq("user_id", userId)
          .eq("seller_id", sellerId)
      : await supabase.from("seller_follows").insert({ user_id: userId, seller_id: sellerId });

    setBusy(false);

    if (result.error) {
      setError("We couldn't update this. Try again.");
      return;
    }
    setFollowing(!following);
  }

  if (!sellerId || !ready) return null;

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        aria-pressed={following}
        className={`${BUTTON_CLASS} ${
          following
            ? "border border-blue-700 bg-blue-50 text-blue-700 hover:bg-blue-100"
            : "bg-blue-700 text-white hover:bg-blue-800"
        }`}
      >
        {busy ? "Saving…" : following ? "Following" : "Follow seller"}
      </button>
      {error && (
        <p role="alert" className="mt-1 text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useWishlistStore, type WishlistItem } from "@/stores/wishlist-store";

type VariantRow = {
  id: string;
  storage: string | null;
  colour: string | null;
  price_kobo: number;
  products: {
    id: string;
    name: string;
    slug: string;
    product_images: { image_url: string; position: number }[];
  } | null;
};

function toWishlistItem(row: VariantRow): WishlistItem | null {
  const product = row.products;
  if (!product) return null;
  const first = [...product.product_images].sort((a, b) => a.position - b.position)[0];
  return {
    variantId: row.id,
    productId: product.id,
    slug: product.slug,
    name: product.name,
    variantLabel: [row.storage, row.colour].filter(Boolean).join(" · "),
    imageUrl: first?.image_url ?? null,
    priceKobo: row.price_kobo,
  };
}

async function saveToAccount(userId: string, variantIds: string[]) {
  if (variantIds.length === 0) return;
  await supabase.from("wishlist_items").upsert(
    variantIds.map((variantId) => ({ user_id: userId, variant_id: variantId })),
    { onConflict: "user_id,variant_id", ignoreDuplicates: true }
  );
}

async function removeFromAccount(userId: string, variantIds: string[]) {
  if (variantIds.length === 0) return;
  await supabase
    .from("wishlist_items")
    .delete()
    .eq("user_id", userId)
    .in("variant_id", variantIds);
}

/**
 * Keeps the wishlist in step with the account while someone is signed in.
 * Guests keep their wishlist on the device only. This component shows nothing.
 */
export function WishlistSync() {
  useEffect(() => {
    let signedInAs: string | null = null;

    // Combines the device wishlist with the account wishlist, so nothing saved is lost.
    async function mergeWithAccount(userId: string) {
      const { data: rows, error } = await supabase
        .from("wishlist_items")
        .select("variant_id")
        .eq("user_id", userId);
      if (error || signedInAs !== userId) return;

      const remoteIds = (rows ?? []).map((row) => row.variant_id as string);
      const remoteSet = new Set(remoteIds);
      const localItems = useWishlistStore.getState().items;
      const localSet = new Set(localItems.map((item) => item.variantId));

      // Save device items the account doesn't have yet.
      await saveToAccount(
        userId,
        localItems.filter((item) => !remoteSet.has(item.variantId)).map((item) => item.variantId)
      );

      // Bring in account items this device doesn't have yet.
      const missing = remoteIds.filter((id) => !localSet.has(id));
      if (missing.length === 0) return;

      const { data: variants } = await supabase
        .from("product_variants")
        .select("id, storage, colour, price_kobo, products(id, name, slug, product_images(image_url, position))")
        .in("id", missing);
      if (signedInAs !== userId) return;

      const incoming = ((variants ?? []) as unknown as VariantRow[])
        .map(toWishlistItem)
        .filter((item): item is WishlistItem => item !== null);

      useWishlistStore.setState((state) => ({
        items: [
          ...state.items,
          ...incoming.filter(
            (item) => !state.items.some((existing) => existing.variantId === item.variantId)
          ),
        ],
      }));
    }

    // Sends each change made while signed in to the account.
    const unsubscribe = useWishlistStore.subscribe((state, previous) => {
      if (!signedInAs) return;
      const userId = signedInAs;

      const added = state.items
        .filter((item) => !previous.items.some((p) => p.variantId === item.variantId))
        .map((item) => item.variantId);
      const removed = previous.items
        .filter((item) => !state.items.some((c) => c.variantId === item.variantId))
        .map((item) => item.variantId);

      void saveToAccount(userId, added);
      void removeFromAccount(userId, removed);
    });

    function handleSession(userId: string | null) {
      signedInAs = userId;
      if (userId) void mergeWithAccount(userId);
    }

    supabase.auth.getSession().then(({ data }) => handleSession(data.session?.user.id ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      handleSession(session?.user.id ?? null);
    });

    return () => {
      unsubscribe();
      listener.subscription.unsubscribe();
    };
  }, []);

  return null;
}

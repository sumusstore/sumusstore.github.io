"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type WishlistItem = {
  variantId: string;
  productId: string;
  slug: string;
  name: string;
  variantLabel: string;
  imageUrl: string | null;
  priceKobo: number;
};

type WishlistState = {
  items: WishlistItem[];
  toggleItem: (item: WishlistItem) => void;
  removeItem: (variantId: string) => void;
};

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set) => ({
      items: [],

      toggleItem: (item) =>
        set((state) => ({
          items: state.items.some((i) => i.variantId === item.variantId)
            ? state.items.filter((i) => i.variantId !== item.variantId)
            : [...state.items, item],
        })),

      removeItem: (variantId) =>
        set((state) => ({
          items: state.items.filter((i) => i.variantId !== variantId),
        })),
    }),
    {
      name: "store-wishlist-v1",
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// Use with useWishlistStore(selectIsWishlisted(variantId)) for a heart icon.
export const selectIsWishlisted = (variantId: string) => (state: WishlistState) =>
  state.items.some((i) => i.variantId === variantId);

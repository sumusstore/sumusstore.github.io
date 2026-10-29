"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

/** The most products that can be compared side by side. */
export const MAX_COMPARE = 4;

type CompareResult = "added" | "removed" | "full";

type CompareState = {
  productIds: string[];
  toggle: (productId: string) => CompareResult;
  remove: (productId: string) => void;
  clear: () => void;
};

export const useCompareStore = create<CompareState>()(
  persist(
    (set, get) => ({
      productIds: [],

      toggle: (productId) => {
        const current = get().productIds;
        if (current.includes(productId)) {
          set({ productIds: current.filter((id) => id !== productId) });
          return "removed";
        }
        if (current.length >= MAX_COMPARE) return "full";
        set({ productIds: [...current, productId] });
        return "added";
      },

      remove: (productId) =>
        set((state) => ({
          productIds: state.productIds.filter((id) => id !== productId),
        })),

      clear: () => set({ productIds: [] }),
    }),
    {
      name: "store-compare-v1",
      storage: createJSONStorage(() => localStorage),
    }
  )
);

export const selectIsCompared = (productId: string) => (state: CompareState) =>
  state.productIds.includes(productId);

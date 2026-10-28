"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type CartItem = {
  variantId: string;
  productId: string;
  slug: string;
  name: string;
  variantLabel: string; // e.g. "256GB · Black"
  imageUrl: string | null;
  unitPriceKobo: number;
  quantity: number;
  stock: number; // stock when last added; re-checked on the server at checkout
};

export type AddToCartInput = Omit<CartItem, "quantity"> & { quantity?: number };

type CartState = {
  items: CartItem[];
  addItem: (input: AddToCartInput) => void;
  setQuantity: (variantId: string, quantity: number) => void;
  removeItem: (variantId: string) => void;
  clearCart: () => void;
};

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],

      addItem: (input) =>
        set((state) => {
          if (input.stock <= 0) return {}; // sold out: do nothing

          const requested = Math.max(1, input.quantity ?? 1);
          const existing = state.items.find((i) => i.variantId === input.variantId);

          if (existing) {
            return {
              items: state.items.map((i) =>
                i.variantId === input.variantId
                  ? {
                      ...i,
                      stock: input.stock,
                      quantity: Math.min(i.quantity + requested, input.stock),
                    }
                  : i
              ),
            };
          }

          return {
            items: [...state.items, { ...input, quantity: Math.min(requested, input.stock) }],
          };
        }),

      setQuantity: (variantId, quantity) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.variantId === variantId
              ? { ...i, quantity: Math.min(Math.max(1, quantity), i.stock) }
              : i
          ),
        })),

      removeItem: (variantId) =>
        set((state) => ({
          items: state.items.filter((i) => i.variantId !== variantId),
        })),

      clearCart: () => set({ items: [] }),
    }),
    {
      name: "store-cart-v1",
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// Derived values. Use with useCartStore(selectCartCount).
export const selectCartCount = (state: CartState) =>
  state.items.reduce((total, i) => total + i.quantity, 0);

export const selectSubtotalKobo = (state: CartState) =>
  state.items.reduce((total, i) => total + i.unitPriceKobo * i.quantity, 0);

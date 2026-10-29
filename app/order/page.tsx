import type { Metadata } from "next";
import { Suspense } from "react";
import { OrderConfirmation } from "@/components/order-confirmation";

export const metadata: Metadata = {
  title: "Order received",
  robots: { index: false, follow: false },
};

export default function OrderPage() {
  return (
    <Suspense
      fallback={<p className="mx-auto max-w-6xl px-4 py-8 text-sm text-slate-600">Loading…</p>}
    >
      <OrderConfirmation />
    </Suspense>
  );
}

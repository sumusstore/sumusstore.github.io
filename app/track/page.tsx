import type { Metadata } from "next";
import { OrderTracking } from "@/components/order-tracking";

export const metadata: Metadata = {
  title: "Track an order",
  description: "Check the status of your Sumus order with your order number and email.",
};

export default function TrackPage() {
  return (
    <section className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-3xl font-bold text-slate-900">Track an order</h1>
      <p className="mt-2 text-sm text-slate-600">
        Enter the order number from your confirmation and the email you used at checkout.
      </p>
      <div className="mt-6">
        <OrderTracking />
      </div>
    </section>
  );
}

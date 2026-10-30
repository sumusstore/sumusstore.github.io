import type { Metadata } from "next";
import { OrderTracking } from "@/components/order-tracking";

export const metadata: Metadata = {
  title: "Track an order",
  description: "Check the status of your Sumus order with your order number and email.",
};

export default function TrackPage() {
  return (
    <>
      <section className="bg-blue-700 text-white">
        <div className="mx-auto max-w-2xl px-4 py-10 md:py-14">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-100">Order tracking</p>
          <h1 className="mt-2 text-3xl font-bold md:text-4xl">Track an order</h1>
          <p className="mt-2 text-blue-50">
            Enter the order number from your confirmation and the email you used at checkout.
          </p>
          <span aria-hidden="true" className="mt-4 block h-1 w-16 rounded bg-gold" />
        </div>
      </section>

      <section className="mx-auto max-w-2xl px-4 py-8">
        <OrderTracking />
      </section>
    </>
  );
}

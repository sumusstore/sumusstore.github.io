import type { Metadata } from "next";
import Link from "next/link";
import { OrdersList } from "@/components/orders-list";
import { RequireAuth } from "@/components/require-auth";

export const metadata: Metadata = {
  title: "Purchases",
  robots: { index: false, follow: false },
};

export default function OrdersPage() {
  return (
    <RequireAuth>
      <section className="mx-auto max-w-3xl px-4 py-8">
        <Link href="/account/" className="text-sm font-semibold text-blue-700 hover:underline">
          ← My Sumus
        </Link>
        <h1 className="mt-3 text-3xl font-bold text-ink md:text-4xl">Purchases</h1>
        <div className="mt-6">
          <OrdersList />
        </div>
      </section>
    </RequireAuth>
  );
}

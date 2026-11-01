import type { Metadata } from "next";
import { SellerDashboard } from "@/components/seller-dashboard";

export const metadata: Metadata = {
  title: "My shop",
  robots: { index: false, follow: false },
};

export default function MyShopPage() {
  return (
    <>
      <section className="bg-blue-700 text-white">
        <div className="mx-auto max-w-5xl px-4 py-10 md:py-14">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-100">Seller dashboard</p>
          <h1 className="mt-2 text-3xl font-bold md:text-4xl">My shop</h1>
          <p className="mt-2 max-w-2xl text-blue-50">
            Add your products, set prices and stock, and see what&apos;s live.
          </p>
          <span aria-hidden="true" className="mt-4 block h-1 w-16 rounded bg-gold" />
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-8">
        <SellerDashboard />
      </section>
    </>
  );
}

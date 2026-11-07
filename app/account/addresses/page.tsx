import type { Metadata } from "next";
import Link from "next/link";
import { AddressesPanel } from "@/components/addresses-panel";
import { RequireAuth } from "@/components/require-auth";

export const metadata: Metadata = {
  title: "Addresses",
  robots: { index: false, follow: false },
};

export default function AddressesPage() {
  return (
    <RequireAuth>
      <section className="mx-auto max-w-4xl px-4 py-8">
        <Link href="/account/" className="text-sm font-semibold text-blue-700 hover:underline">
          ← My Sumus
        </Link>
        <h1 className="mt-3 text-3xl font-bold text-ink md:text-4xl">Addresses</h1>
        <div className="mt-6">
          <AddressesPanel />
        </div>
      </section>
    </RequireAuth>
  );
}

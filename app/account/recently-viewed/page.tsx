import type { Metadata } from "next";
import Link from "next/link";
import { RecentlyViewed } from "@/components/recently-viewed";
import { RequireAuth } from "@/components/require-auth";

export const metadata: Metadata = {
  title: "Recently viewed",
  robots: { index: false, follow: false },
};

export default function RecentlyViewedPage() {
  return (
    <RequireAuth>
      <section className="mx-auto max-w-6xl px-4 py-8">
        <Link href="/account/" className="text-sm font-semibold text-blue-700 hover:underline">
          ← My Sumus
        </Link>
        <h1 className="mt-3 text-3xl font-bold text-ink md:text-4xl">Recently viewed</h1>
        <div className="mt-6">
          <RecentlyViewed />
        </div>
      </section>
    </RequireAuth>
  );
}

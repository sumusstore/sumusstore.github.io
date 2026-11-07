import type { Metadata } from "next";
import Link from "next/link";
import { RequireAuth } from "@/components/require-auth";
import { SavedFeed } from "@/components/saved-feed";

export const metadata: Metadata = {
  title: "Saved feed",
  robots: { index: false, follow: false },
};

export default function SavedFeedPage() {
  return (
    <RequireAuth>
      <section className="mx-auto max-w-6xl px-4 py-8">
        <Link href="/account/" className="text-sm font-semibold text-blue-700 hover:underline">
          ← My Sumus
        </Link>
        <h1 className="mt-3 text-3xl font-bold text-ink md:text-4xl">Saved feed</h1>
        <p className="mt-2 text-slate-600">Shop your searches, sellers and saved items.</p>
        <div className="mt-6">
          <SavedFeed />
        </div>
      </section>
    </RequireAuth>
  );
}

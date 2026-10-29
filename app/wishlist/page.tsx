import type { Metadata } from "next";
import { WishlistView } from "@/components/wishlist-view";

export const metadata: Metadata = {
  title: "Your wishlist",
  robots: { index: false, follow: false },
};

export default function WishlistPage() {
  return (
    <section className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-bold text-slate-900">Your wishlist</h1>
      <p className="mt-2 text-sm text-slate-600">
        Saved items stay on this device. Log in to keep them on your account too.
      </p>
      <div className="mt-6">
        <WishlistView />
      </div>
    </section>
  );
}

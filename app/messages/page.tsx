import type { Metadata } from "next";
import { Suspense } from "react";
import { MessagesView } from "@/components/messages-view";
import { RequireAuth } from "@/components/require-auth";

export const metadata: Metadata = {
  title: "Messages",
  robots: { index: false, follow: false },
};

export default function MessagesPage() {
  return (
    <RequireAuth>
      <Suspense
        fallback={<p className="mx-auto max-w-3xl px-4 py-12 text-sm text-slate-600">Loading messages…</p>}
      >
        <MessagesView />
      </Suspense>
    </RequireAuth>
  );
}

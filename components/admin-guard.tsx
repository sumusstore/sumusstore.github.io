"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAdmin } from "@/hooks/use-admin";

/** Shows the admin area only to admin accounts. Everyone else is sent to log in or told why they can't enter. */
export function AdminGuard({ children }: { children: ReactNode }) {
  const { status } = useAdmin();
  const router = useRouter();

  useEffect(() => {
    if (status === "signed-out") router.replace("/login/?next=/admin/");
  }, [status, router]);

  if (status === "loading" || status === "signed-out") {
    return <p className="mx-auto max-w-6xl px-4 py-12 text-sm text-slate-600">Checking access…</p>;
  }

  if (status === "not-admin") {
    return (
      <section className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Admins only</h1>
        <p className="mt-2 text-sm text-slate-600">
          This area is for store staff. If you should have access, ask the store owner.
        </p>
        <Link href="/account/" className="mt-6 inline-block font-semibold text-blue-700 hover:underline">
          Go to my account
        </Link>
      </section>
    );
  }

  return <>{children}</>;
}

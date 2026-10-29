"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";

/** Shows its children only to signed-in customers. Everyone else goes to the login page. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.replace(`/login/?next=${encodeURIComponent(pathname)}`);
    }
  }, [loading, user, pathname, router]);

  if (loading || !user) {
    return (
      <p className="mx-auto max-w-6xl px-4 py-12 text-sm text-slate-600">Loading your account…</p>
    );
  }

  return <>{children}</>;
}

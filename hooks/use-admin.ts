"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase";

export type AdminStatus = "loading" | "signed-out" | "not-admin" | "admin";

/** Checks the signed-in customer's role. The database enforces the same rule on every admin action. */
export function useAdmin() {
  const { user, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setIsAdmin(false);
      return;
    }

    let active = true;
    supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (active) setIsAdmin(!error && data?.role === "admin");
      });

    return () => {
      active = false;
    };
  }, [loading, user]);

  let status: AdminStatus;
  if (loading || (user && isAdmin === null)) status = "loading";
  else if (!user) status = "signed-out";
  else status = isAdmin ? "admin" : "not-admin";

  return { status, user };
}

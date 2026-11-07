"use client";

import { useAuth } from "@/hooks/use-auth";
import { AccountAddresses } from "@/components/account-addresses";

/** Passes the signed-in user's id to the saved addresses list. */
export function AddressesPanel() {
  const { user, loading } = useAuth();

  if (loading || !user) {
    return <p className="text-sm text-slate-600">Loading your addresses…</p>;
  }

  return <AccountAddresses userId={user.id} />;
}

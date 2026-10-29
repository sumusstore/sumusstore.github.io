import type { Metadata } from "next";
import { AccountView } from "@/components/account-view";
import { RequireAuth } from "@/components/require-auth";

export const metadata: Metadata = {
  title: "My account",
  robots: { index: false, follow: false },
};

export default function AccountPage() {
  return (
    <RequireAuth>
      <AccountView />
    </RequireAuth>
  );
}

import type { Metadata } from "next";
import { AdminGuard } from "@/components/admin-guard";
import { AdminView } from "@/components/admin-view";

export const metadata: Metadata = {
  title: "Store admin",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return (
    <AdminGuard>
      <AdminView />
    </AdminGuard>
  );
}

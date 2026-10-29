import type { Metadata } from "next";
import { PolicyPage } from "@/components/policy-page";
import { POLICIES } from "@/lib/policy-content";

export const metadata: Metadata = {
  title: POLICIES.warranty.title,
};

export default function WarrantyPage() {
  return <PolicyPage doc={POLICIES.warranty} />;
}

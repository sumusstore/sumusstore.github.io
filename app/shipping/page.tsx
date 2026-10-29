import type { Metadata } from "next";
import { PolicyPage } from "@/components/policy-page";
import { POLICIES } from "@/lib/policy-content";

export const metadata: Metadata = {
  title: POLICIES.shipping.title,
};

export default function ShippingPage() {
  return <PolicyPage doc={POLICIES.shipping} />;
}

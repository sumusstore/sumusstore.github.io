import type { Metadata } from "next";
import { PolicyPage } from "@/components/policy-page";
import { POLICIES } from "@/lib/policy-content";

export const metadata: Metadata = {
  title: POLICIES.returns.title,
};

export default function ReturnsPage() {
  return <PolicyPage doc={POLICIES.returns} />;
}

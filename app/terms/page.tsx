import type { Metadata } from "next";
import { PolicyPage } from "@/components/policy-page";
import { POLICIES } from "@/lib/policy-content";

export const metadata: Metadata = {
  title: POLICIES.terms.title,
};

export default function TermsPage() {
  return <PolicyPage doc={POLICIES.terms} />;
}

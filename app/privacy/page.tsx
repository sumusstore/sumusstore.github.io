import type { Metadata } from "next";
import { PolicyPage } from "@/components/policy-page";
import { POLICIES } from "@/lib/policy-content";

export const metadata: Metadata = {
  title: POLICIES.privacy.title,
};

export default function PrivacyPage() {
  return <PolicyPage doc={POLICIES.privacy} />;
}

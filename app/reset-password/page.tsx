import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/auth-forms";

export const metadata: Metadata = {
  title: "Set a new password",
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
  return (
    <section className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-3xl font-bold text-slate-900">Set a new password</h1>
      <div className="mt-6">
        <ResetPasswordForm />
      </div>
    </section>
  );
}

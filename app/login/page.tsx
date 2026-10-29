import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth-forms";

export const metadata: Metadata = {
  title: "Log in",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <section className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-3xl font-bold text-slate-900">Log in</h1>
      <div className="mt-6">
        <Suspense fallback={<p className="text-sm text-slate-600">Loading…</p>}>
          <LoginForm />
        </Suspense>
      </div>
    </section>
  );
}

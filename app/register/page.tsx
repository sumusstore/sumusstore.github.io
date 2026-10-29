import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth-forms";

export const metadata: Metadata = {
  title: "Create an account",
  robots: { index: false, follow: false },
};

export default function RegisterPage() {
  return (
    <section className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-3xl font-bold text-slate-900">Create an account</h1>
      <div className="mt-6">
        <RegisterForm />
      </div>
    </section>
  );
}

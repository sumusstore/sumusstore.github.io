"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Field, Notice } from "@/components/form-field";
import { safeNextPath } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase";

const BUTTON_CLASS =
  "w-full rounded-full bg-blue-700 px-6 py-3 font-semibold text-white hover:bg-blue-800 disabled:bg-slate-300";

/** The white card that holds each auth form. */
function AuthCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 border-t-4 border-t-gold bg-white p-6 shadow-sm">
      {children}
    </div>
  );
}

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNextPath(params.get("next"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (signInError) {
      setBusy(false);
      setError(
        signInError.message.toLowerCase().includes("not confirmed")
          ? "Please confirm your email first. Check your inbox for the link."
          : "That email and password don't match. Try again, or reset your password."
      );
      return;
    }
    router.replace(next);
  }

  return (
    <AuthCard>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field
          id="login-email"
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <Field
          id="login-password"
          label="Password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        {error && <Notice tone="error">{error}</Notice>}
        <button type="submit" disabled={busy} className={BUTTON_CLASS}>
          {busy ? "Logging in…" : "Log in"}
        </button>
        <div className="flex flex-wrap justify-between gap-2 text-sm">
          <Link href="/forgot-password/" className="font-semibold text-blue-700 hover:underline">
            Forgot password?
          </Link>
          <Link href="/register/" className="font-semibold text-blue-700 hover:underline">
            Create an account
          </Link>
        </div>
      </form>
    </AuthCard>
  );
}

export function RegisterForm() {
  const router = useRouter();
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  function update(key: "fullName" | "email" | "phone" | "password", value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (form.phone.replace(/\D/g, "").length < 10) {
      setError("Enter a valid phone number.");
      return;
    }
    if (form.password.length < 8) {
      setError("Use at least 8 characters for your password.");
      return;
    }

    setBusy(true);
    const email = form.email.trim().toLowerCase();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password: form.password,
      options: {
        data: { full_name: form.fullName.trim(), phone: form.phone.trim() },
        emailRedirectTo: `${window.location.origin}/account/`,
      },
    });
    setBusy(false);

    if (signUpError) {
      setError(
        signUpError.message.toLowerCase().includes("already")
          ? "An account with this email already exists. Log in instead."
          : "We couldn't create your account. Check your details and try again."
      );
      return;
    }

    // With email confirmation off, the customer is signed in straight away.
    if (data.session) {
      router.replace("/account/");
      return;
    }
    setSentTo(email);
  }

  if (sentTo) {
    return (
      <AuthCard>
        <div className="space-y-4">
          <Notice tone="info">
            We've sent a confirmation link to <strong>{sentTo}</strong>. Open it on this phone to
            activate your account.
          </Notice>
          <p className="text-sm text-slate-600">
            Didn't get it? Check your spam folder. Already registered?{" "}
            <Link href="/login/" className="font-semibold text-blue-700 hover:underline">
              Log in
            </Link>
            .
          </p>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field
          id="reg-name"
          label="Full name"
          autoComplete="name"
          required
          value={form.fullName}
          onChange={(event) => update("fullName", event.target.value)}
        />
        <Field
          id="reg-email"
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={form.email}
          onChange={(event) => update("email", event.target.value)}
        />
        <Field
          id="reg-phone"
          label="Phone number"
          type="tel"
          autoComplete="tel"
          required
          value={form.phone}
          onChange={(event) => update("phone", event.target.value)}
        />
        <Field
          id="reg-password"
          label="Password (at least 8 characters)"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={form.password}
          onChange={(event) => update("password", event.target.value)}
        />
        {error && <Notice tone="error">{error}</Notice>}
        <button type="submit" disabled={busy} className={BUTTON_CLASS}>
          {busy ? "Creating account…" : "Create account"}
        </button>
        <p className="text-sm text-slate-600">
          Already have an account?{" "}
          <Link href="/login/" className="font-semibold text-blue-700 hover:underline">
            Log in
          </Link>
        </p>
      </form>
    </AuthCard>
  );
}

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo: `${window.location.origin}/reset-password/` }
    );
    setBusy(false);

    if (resetError) {
      setError("We couldn't send the reset link. Try again shortly.");
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <AuthCard>
        <Notice tone="info">
          If an account exists for that email, a reset link is on its way. Check your spam folder too.
        </Notice>
      </AuthCard>
    );
  }

  return (
    <AuthCard>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field
          id="forgot-email"
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        {error && <Notice tone="error">{error}</Notice>}
        <button type="submit" disabled={busy} className={BUTTON_CLASS}>
          {busy ? "Sending…" : "Send reset link"}
        </button>
        <p className="text-sm text-slate-600">
          <Link href="/login/" className="font-semibold text-blue-700 hover:underline">
            Back to log in
          </Link>
        </p>
      </form>
    </AuthCard>
  );
}

export function ResetPasswordForm() {
  const router = useRouter();
  const [status, setStatus] = useState<"checking" | "ready" | "expired">("checking");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let active = true;

    // The reset link signs the customer in briefly. If nothing arrives, the link has expired or was used.
    const timer = window.setTimeout(() => {
      if (active) setStatus((current) => (current === "checking" ? "expired" : current));
    }, 6000);

    supabase.auth.getSession().then(({ data }) => {
      if (active && data.session) setStatus("ready");
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        setStatus("ready");
      }
    });

    return () => {
      active = false;
      window.clearTimeout(timer);
      listener.subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }

    setBusy(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setBusy(false);

    if (updateError) {
      setError("We couldn't save your new password. Request a new reset link and try again.");
      return;
    }
    setDone(true);
    window.setTimeout(() => router.replace("/account/"), 1500);
  }

  if (done) {
    return (
      <AuthCard>
        <Notice tone="info">Your password is updated. Taking you to your account…</Notice>
      </AuthCard>
    );
  }

  if (status === "checking") {
    return <p className="text-sm text-slate-600">Checking your link…</p>;
  }

  if (status === "expired") {
    return (
      <AuthCard>
        <div className="space-y-4">
          <Notice tone="error">This reset link has expired or was already used.</Notice>
          <Link href="/forgot-password/" className="font-semibold text-blue-700 hover:underline">
            Request a new link
          </Link>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field
          id="new-password"
          label="New password (at least 8 characters)"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        {error && <Notice tone="error">{error}</Notice>}

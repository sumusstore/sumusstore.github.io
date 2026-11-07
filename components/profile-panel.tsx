"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Field } from "@/components/form-field";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase";

const BUTTON_CLASS =
  "rounded-full bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:bg-slate-300";

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 border-t-4 border-t-gold bg-white p-5">
      {children}
    </div>
  );
}

export function ProfilePanel() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const userId = user?.id ?? null;
  const email = user?.email ?? "";

  const [loaded, setLoaded] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordNotice, setPasswordNotice] = useState<string | null>(null);

  useEffect(() => {
    if (loading || !userId) return;
    let active = true;

    supabase
      .from("profiles")
      .select("full_name, phone")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return;
        setFullName(data?.full_name ?? "");
        setPhone(data?.phone ?? "");
        setLoaded(true);
      });

    return () => {
      active = false;
    };
  }, [loading, userId]);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!userId) return;
    setSaveNotice(null);

    if (phone.replace(/\D/g, "").length < 10) {
      setSaveNotice("Enter a valid phone number.");
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName.trim(), phone: phone.trim() })
      .eq("id", userId);
    setSaving(false);
    setSaveNotice(error ? "We couldn't save your details. Try again." : "Your details are saved.");
  }

  async function handlePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordNotice(null);

    if (newPassword.length < 8) {
      setPasswordNotice("Use at least 8 characters.");
      return;
    }

    setPasswordBusy(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPasswordBusy(false);

    if (error) {
      setPasswordNotice("We couldn't change your password. Try again.");
      return;
    }
    setNewPassword("");
    setPasswordNotice("Your password is changed.");
  }

  async function handleLogOut() {
    await supabase.auth.signOut();
    router.replace("/");
  }

  if (loading || !userId || !loaded) {
    return <p className="text-sm text-slate-600">Loading your details…</p>;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <form onSubmit={handleSave} className="space-y-4">
          <h2 className="text-base font-bold text-ink">Your details</h2>
          <Field id="profile-email" label="Email" value={email} disabled readOnly />
          <Field
            id="profile-name"
            label="Full name"
            autoComplete="name"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
          />
          <Field
            id="profile-phone"
            label="Phone number"
            type="tel"
            autoComplete="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
          />
          {saveNotice && <p className="text-sm text-slate-700">{saveNotice}</p>}
          <button type="submit" disabled={saving} className={BUTTON_CLASS}>
            {saving ? "Saving…" : "Save details"}
          </button>
        </form>
      </Card>

      <div className="space-y-6">
        <Card>
          <form onSubmit={handlePassword} className="space-y-4">
            <h2 className="text-base font-bold text-ink">Change password</h2>
            <Field
              id="profile-password"
              label="New password (at least 8 characters)"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />
            {passwordNotice && <p className="text-sm text-slate-700">{passwordNotice}</p>}
            <button type="submit" disabled={passwordBusy} className={BUTTON_CLASS}>
              {passwordBusy ? "Saving…" : "Change password"}
            </button>
          </form>
        </Card>

        <Card>
          <p className="text-sm text-slate-600">Finished for now?</p>
          <button
            type="button"
            onClick={handleLogOut}
            className="mt-3 rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-ink hover:border-red-600 hover:text-red-600"
          >
            Log out
          </button>
        </Card>
      </div>
    </div>
  );
}

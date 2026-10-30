"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { AccountAddresses } from "@/components/account-addresses";
import { Field } from "@/components/form-field";
import { WishlistView } from "@/components/wishlist-view";
import { useAuth } from "@/hooks/use-auth";
import { formatNaira } from "@/lib/format";
import { statusInfo } from "@/lib/order-status";
import { supabase } from "@/lib/supabase";

type Tab = "orders" | "addresses" | "wishlist" | "profile";

const TABS: { value: Tab; label: string }[] = [
  { value: "orders", label: "Orders" },
  { value: "addresses", label: "Addresses" },
  { value: "wishlist", label: "Wishlist" },
  { value: "profile", label: "Profile" },
];

const BUTTON_CLASS =
  "rounded-full bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:bg-slate-300";

/** A white card with a gold top edge, used for each block on the account page. */
function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 border-t-4 border-t-gold bg-white p-5">
      {children}
    </div>
  );
}

type OrderRow = {
  id: string;
  order_number: string;
  status: string;
  total_kobo: number;
  created_at: string;
  order_items: { product_name: string; variant_label: string | null; quantity: number }[];
};

function OrdersTab({ userId }: { userId: string }) {
  const [orders, setOrders] = useState<OrderRow[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      const { data, error } = await supabase
        .from("orders")
        .select(
          "id, order_number, status, total_kobo, created_at, order_items(product_name, variant_label, quantity)"
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (!active) return;
      if (error) {
        setFailed(true);
        return;
      }
      setOrders((data ?? []) as OrderRow[]);
    }

    load();
    return () => {
      active = false;
    };
  }, [userId]);

  if (failed) {
    return (
      <p className="text-sm text-slate-600">
        Your orders are unavailable right now. Please refresh the page shortly.
      </p>
    );
  }

  if (!orders) {
    return <p className="text-sm text-slate-600">Loading your orders…</p>;
  }

  if (orders.length === 0) {
    return (
      <Card>
        <p className="font-semibold text-ink">No orders yet</p>
        <p className="mt-1 text-sm text-slate-600">Orders you place while signed in appear here.</p>
        <Link href="/shop/" className="mt-4 inline-block font-semibold text-blue-700 hover:underline">
          Start shopping
        </Link>
      </Card>
    );
  }

  return (
    <ul className="space-y-4">
      {orders.map((order) => {
        const info = statusInfo(order.status);
        return (
          <li key={order.id}>
            <Card>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-mono text-sm font-semibold text-ink">{order.order_number}</p>
                  <p className="text-xs text-slate-500">
                    {new Date(order.created_at).toLocaleDateString("en-NG", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                  {info.label}
                </span>
              </div>

              <ul className="mt-3 space-y-1 text-sm text-slate-700">
                {order.order_items.map((line, index) => (
                  <li key={index}>
                    {line.quantity} × {line.product_name}
                    {line.variant_label ? ` (${line.variant_label})` : ""}
                  </li>
                ))}
              </ul>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                <p className="text-sm text-slate-600">{info.detail}</p>
                <p className="font-bold text-ink">{formatNaira(order.total_kobo)}</p>
              </div>
            </Card>
          </li>
        );
      })}
    </ul>
  );
}

function ProfileTab({ userId, email }: { userId: string; email: string }) {
  const router = useRouter();
  const [loaded, setLoaded] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordNotice, setPasswordNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("id", userId)
        .maybeSingle();
      if (!active) return;
      setFullName(data?.full_name ?? "");
      setPhone(data?.phone ?? "");
      setLoaded(true);
    }

    load();
    return () => {
      active = false;
    };
  }, [userId]);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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

  if (!loaded) {
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

export function AccountView() {
  const { user, loading } = useAuth();
  const [tab, setTab] = useState<Tab>("orders");

  if (loading || !user) {
    return (
      <p className="mx-auto max-w-4xl px-4 py-12 text-sm text-slate-600">Loading your account…</p>
    );
  }

  return (
    <section className="mx-auto max-w-5xl px-4 py-6">
      <div className="rounded-xl bg-blue-700 p-6 text-white">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-100">My account</p>
        <p className="mt-1 text-xl font-bold">{user.email}</p>
      </div>

      <div role="tablist" className="mt-6 flex gap-6 overflow-x-auto border-b border-slate-200">
        {TABS.map((item) => (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={tab === item.value}
            onClick={() => setTab(item.value)}
            className={`-mb-px whitespace-nowrap border-b-4 pb-3 text-sm font-semibold ${
              tab === item.value
                ? "border-gold text-ink"
                : "border-transparent text-slate-600 hover:text-ink"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "orders" && <OrdersTab userId={user.id} />}
        {tab === "addresses" && <AccountAddresses userId={user.id} />}
        {tab === "wishlist" && <WishlistView />}
        {tab === "profile" && <ProfileTab userId={user.id} email={user.email ?? ""} />}
      </div>
    </section>
  );
}

"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Field, Notice } from "@/components/form-field";
import { supabase } from "@/lib/supabase";

type SavedAddress = {
  id: string;
  label: string | null;
  full_name: string;
  phone: string;
  state: string;
  area: string | null;
  street: string;
  is_default: boolean;
};

const EMPTY_FORM = { label: "", fullName: "", phone: "", state: "", area: "", street: "" };

const BUTTON_CLASS =
  "rounded-full bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:bg-slate-300";

export function AccountAddresses({ userId }: { userId: string }) {
  const [addresses, setAddresses] = useState<SavedAddress[] | null>(null);
  const [version, setVersion] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      const { data, error: loadError } = await supabase
        .from("addresses")
        .select("id, label, full_name, phone, state, area, street, is_default")
        .eq("user_id", userId)
        .order("is_default", { ascending: false });
      if (!active) return;
      setAddresses(loadError ? [] : ((data ?? []) as SavedAddress[]));
    }

    load();
    return () => {
      active = false;
    };
  }, [userId, version]);

  function refresh() {
    setVersion((current) => current + 1);
  }

  function update(key: keyof typeof EMPTY_FORM, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (form.phone.replace(/\D/g, "").length < 10) {
      setError("Enter a valid phone number.");
      return;
    }

    setBusy(true);
    const { error: insertError } = await supabase.from("addresses").insert({
      user_id: userId,
      label: form.label.trim() || null,
      full_name: form.fullName.trim(),
      phone: form.phone.trim(),
      state: form.state.trim(),
      area: form.area.trim() || null,
      street: form.street.trim(),
      // The first address saved becomes the default.
      is_default: (addresses ?? []).length === 0,
    });
    setBusy(false);

    if (insertError) {
      setError("We couldn't save that address. Check the details and try again.");
      return;
    }
    setForm(EMPTY_FORM);
    setShowForm(false);
    refresh();
  }

  async function makeDefault(id: string) {
    setBusy(true);
    await supabase.from("addresses").update({ is_default: false }).eq("user_id", userId);
    await supabase.from("addresses").update({ is_default: true }).eq("id", id);
    setBusy(false);
    refresh();
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this address?")) return;
    setBusy(true);
    await supabase.from("addresses").delete().eq("id", id);
    setBusy(false);
    refresh();
  }

  if (addresses === null) {
    return <p className="text-sm text-slate-600">Loading your addresses…</p>;
  }

  return (
    <div className="space-y-6">
      {addresses.length === 0 && !showForm && (
        <p className="text-sm text-slate-600">No saved addresses yet.</p>
      )}

      <ul className="grid gap-4 md:grid-cols-2">
        {addresses.map((address) => (
          <li
            key={address.id}
            className="rounded-xl border border-slate-200 border-t-4 border-t-gold bg-white p-5"
          >
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold text-ink">{address.label ?? "Address"}</p>
              {address.is_default && (
                <span className="rounded-full bg-gold/20 px-2 py-0.5 text-xs font-semibold text-ink">
                  Default
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-slate-700">
              {address.full_name} · {address.phone}
            </p>
            <p className="text-sm text-slate-700">
              {[address.street, address.area, address.state].filter(Boolean).join(", ")}
            </p>
            <div className="mt-3 flex flex-wrap gap-4 text-sm font-semibold">
              {!address.is_default && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => makeDefault(address.id)}
                  className="text-blue-700 hover:underline disabled:text-slate-400"
                >
                  Make default
                </button>
              )}
              <button
                type="button"
                disabled={busy}
                onClick={() => remove(address.id)}
                className="text-red-600 hover:underline disabled:text-slate-400"
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>

      {showForm ? (
        <form
          onSubmit={handleSave}
          className="max-w-md space-y-4 rounded-xl border border-slate-200 border-t-4 border-t-gold bg-white p-5"
        >
          <h2 className="font-bold text-ink">New address</h2>
          <Field
            id="addr-label"
            label="Label"
            optional
            placeholder="Home, Office"
            value={form.label}
            onChange={(event) => update("label", event.target.value)}
          />
          <Field
            id="addr-name"
            label="Full name"
            autoComplete="name"
            required
            value={form.fullName}
            onChange={(event) => update("fullName", event.target.value)}
          />
          <Field
            id="addr-phone"
            label="Phone number"
            type="tel"
            autoComplete="tel"
            required
            value={form.phone}
            onChange={(event) => update("phone", event.target.value)}
          />
          <Field
            id="addr-state"
            label="State"
            autoComplete="address-level1"
            required
            value={form.state}
            onChange={(event) => update("state", event.target.value)}
          />
          <Field
            id="addr-area"
            label="Area or town"
            optional
            autoComplete="address-level2"
            value={form.area}
            onChange={(event) => update("area", event.target.value)}
          />
          <Field
            id="addr-street"
            label="Street address"
            autoComplete="street-address"
            required
            value={form.street}
            onChange={(event) => update("street", event.target.value)}
          />
          {error && <Notice tone="error">{error}</Notice>}
          <div className="flex gap-3">
            <button type="submit" disabled={busy} className={BUTTON_CLASS}>
              {busy ? "Saving…" : "Save address"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setError(null);
              }}
              className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-ink"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="rounded-full border border-blue-700 px-5 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-50"
        >
          Add an address
        </button>
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent, type InputHTMLAttributes } from "react";
import {
  useCheckoutOptions,
  type DeliveryZone,
} from "@/hooks/use-checkout-options";
import { useHydrated } from "@/hooks/use-hydrated";
import { formatNaira } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import { selectSubtotalKobo, useCartStore } from "@/stores/cart-store";

type FormState = {
  fullName: string;
  email: string;
  phone: string;
  state: string;
  area: string;
  street: string;
  zoneId: string;
  storeId: string;
  agreed: boolean;
};

const INITIAL_FORM: FormState = {
  fullName: "",
  email: "",
  phone: "",
  state: "",
  area: "",
  street: "",
  zoneId: "",
  storeId: "",
  agreed: false,
};

function timeline(zone: DeliveryZone): string {
  if (zone.minDays === 0 && zone.maxDays <= 1) return "Same day or next working day";
  return `${zone.minDays} to ${zone.maxDays} working days`;
}

/** Reads the message the function sends back, so the customer sees what to fix. */
async function readError(error: unknown): Promise<string> {
  const response = (error as { context?: Response }).context;
  if (response && typeof response.json === "function") {
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) return body.error;
    } catch {
      // Not a JSON reply. Use the general message below.
    }
  }
  return "We couldn't place your order. Please check your details and try again.";
}

function Field({
  id,
  label,
  ...props
}: { id: string; label: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-800">
        {label}
      </label>
      <input
        id={id}
        {...props}
        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-600 focus:outline-none"
      />
    </div>
  );
}

export function CheckoutView() {
  const router = useRouter();
  const hydrated = useHydrated();
  const items = useCartStore((state) => state.items);
  const subtotalKobo = useCartStore(selectSubtotalKobo);
  const { zones, stores, status } = useCheckoutOptions();

  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  const zone = zones.find((option) => option.id === form.zoneId) ?? null;
  const isPickup = zone?.name === "Store Pickup";
  const deliveryFeeKobo = zone && !isPickup ? zone.feeKobo : 0;
  const totalKobo = subtotalKobo + deliveryFeeKobo;

  if (!hydrated || status === "loading") {
    return <p className="mx-auto max-w-6xl px-4 py-12 text-sm text-slate-600">Loading checkout…</p>;
  }

  if (items.length === 0) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Your cart is empty</h1>
        <p className="mt-2 text-sm text-slate-600">Add something to your cart before checking out.</p>
        <Link href="/shop/" className="mt-6 inline-block font-semibold text-blue-700 hover:underline">
          Browse all products
        </Link>
      </section>
    );
  }

  if (status === "error") {
    return (
      <p className="mx-auto max-w-6xl px-4 py-12 text-sm text-slate-600">
        Checkout options are unavailable right now. Please refresh the page shortly.
      </p>
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!zone) {
      setError("Choose a delivery option.");
      return;
    }
    if (isPickup && !form.storeId) {
      setError("Choose a store for pickup.");
      return;
    }

    setSubmitting(true);
    const { data, error: invokeError } = await supabase.functions.invoke("create-order", {
      body: {
        customer: { fullName: form.fullName, email: form.email, phone: form.phone },
        delivery: {
          zoneName: zone.name,
          storeId: isPickup ? form.storeId : null,
          address: isPickup
            ? null
            : { state: form.state, area: form.area, street: form.street },
        },
        paymentMethod: "bank_transfer",
        items: items.map((item) => ({ variantId: item.variantId, quantity: item.quantity })),
      },
    });
    setSubmitting(false);

    if (invokeError) {
      setError(await readError(invokeError));
      return;
    }

    const result = data as { orderNumber?: string; totalKobo?: number } | null;
    if (!result?.orderNumber) {
      setError("We couldn't place your order. Please try again.");
      return;
    }

    // The cart is cleared on the confirmation page, so this page doesn't flash "empty".
    router.push(
      `/order/?ref=${encodeURIComponent(result.orderNumber)}&amount=${result.totalKobo ?? 0}`
    );
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-3xl font-bold text-slate-900">Checkout</h1>
      <p className="mt-1 text-sm text-slate-600">Order as a guest. No account needed.</p>

      <form onSubmit={handleSubmit} className="mt-6 lg:grid lg:grid-cols-3 lg:gap-8">
        <div className="space-y-8 lg:col-span-2">
          <fieldset className="space-y-4">
            <legend className="text-lg font-semibold text-slate-900">1. Your details</legend>
            <Field
              id="full-name"
              label="Full name"
              autoComplete="name"
              required
              value={form.fullName}
              onChange={(event) => update("fullName", event.target.value)}
            />
            <Field
              id="email"
              label="Email"
              type="email"
              autoComplete="email"
              required
              value={form.email}
              onChange={(event) => update("email", event.target.value)}
            />
            <Field
              id="phone"
              label="Phone number"
              type="tel"
              autoComplete="tel"
              required
              value={form.phone}
              onChange={(event) => update("phone", event.target.value)}
            />
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="text-lg font-semibold text-slate-900">2. Delivery</legend>
            {zones.map((option) => {
              const selected = form.zoneId === option.id;
              return (
                <label
                  key={option.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 ${
                    selected ? "border-blue-700 bg-blue-50" : "border-slate-200 hover:border-slate-400"
                  }`}
                >
                  <input
                    type="radio"
                    name="delivery"
                    value={option.id}
                    checked={selected}
                    required
                    onChange={() => update("zoneId", option.id)}
                    className="mt-1 accent-blue-700"
                  />
                  <span className="flex-1">
                    <span className="block font-semibold text-slate-900">{option.name}</span>
                    <span className="block text-sm text-slate-600">{timeline(option)}</span>
                  </span>
                  <span className="text-sm font-semibold text-slate-900">
                    {option.feeKobo === 0 ? "Free" : formatNaira(option.feeKobo)}
                  </span>
                </label>
              );
            })}

            {zone && !isPickup && (
              <div className="grid gap-4 pt-2 sm:grid-cols-2">
                <Field
                  id="state"
                  label="State"
                  autoComplete="address-level1"
                  required
                  value={form.state}
                  onChange={(event) => update("state", event.target.value)}
                />
                <Field
                  id="area"
                  label="Area or town"
                  autoComplete="address-level2"
                  value={form.area}
                  onChange={(event) => update("area", event.target.value)}
                />
                <div className="sm:col-span-2">
                  <Field
                    id="street"
                    label="Street address"
                    autoComplete="street-address"
                    required
                    value={form.street}
                    onChange={(event) => update("street", event.target.value)}
                  />
                </div>
              </div>
            )}

            {isPickup && (
              <div className="space-y-3 pt-2">
                <p className="text-sm font-semibold text-slate-900">Choose a store</p>
                {stores.map((store) => {
                  const selected = form.storeId === store.id;
                  return (
                    <label
                      key={store.id}
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 ${
                        selected ? "border-blue-700 bg-blue-50" : "border-slate-200 hover:border-slate-400"
                      }`}
                    >
                      <input
                        type="radio"
                        name="store"
                        value={store.id}
                        checked={selected}
                        required
                        onChange={() => update("storeId", store.id)}
                        className="mt-1 accent-blue-700"
                      />
                      <span className="flex-1">
                        <span className="block font-semibold text-slate-900">{store.name}</span>
                        <span className="block text-sm text-slate-600">
                          {store.address}, {store.state}
                        </span>
                        {store.openingHours && (
                          <span className="block text-sm text-slate-500">{store.openingHours}</span>
                        )}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="text-lg font-semibold text-slate-900">3. Payment</legend>
            <div className="flex items-start gap-3 rounded-xl border border-blue-700 bg-blue-50 p-4">
              <input type="radio" name="payment" checked readOnly className="mt-1 accent-blue-700" />
              <div>
                <p className="font-semibold text-slate-900">Bank transfer</p>
                <p className="text-sm text-slate-600">
                  Your bank details appear after you place the order. We confirm your order once the
                  transfer arrives.
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-500">Card and USSD payments will be added here soon.</p>
          </fieldset>

          <label className="flex items-start gap-3 text-sm text-slate-700">
            <input
              type="checkbox"
              required
              checked={form.agreed}
              onChange={(event) => update("agreed", event.target.checked)}
              className="mt-1 accent-blue-700"
            />
            <span>
              I agree to the{" "}
              <Link href="/terms/" className="font-medium text-blue-700 hover:underline">
                terms and conditions
              </Link>{" "}
              and the{" "}
              <Link href="/returns/" className="font-medium text-blue-700 hover:underline">
                returns policy
              </Link>
              .
            </span>
          </label>

          {error && (
            <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-blue-700 px-6 py-3 font-semibold text-white hover:bg-blue-800 disabled:bg-slate-300 lg:w-auto"
          >
            {submitting ? "Placing order…" : "Place order"}
          </button>
        </div>

        <aside className="mt-8 h-fit rounded-xl border border-slate-200 p-5 lg:mt-0">
          <h2 className="font-semibold text-slate-900">Order summary</h2>

          <ul className="mt-4 divide-y divide-slate-200 text-sm">
            {items.map((item) => (
              <li key={item.variantId} className="flex justify-between gap-3 py-2">
                <span className="text-slate-700">
                  {item.name}
                  {item.variantLabel ? ` (${item.variantLabel})` : ""} × {item.quantity}
                </span>
                <span className="shrink-0 font-medium">
                  {formatNaira(item.unitPriceKobo * item.quantity)}
                </span>
              </li>
            ))}
          </ul>

          <dl className="mt-4 space-y-2 border-t border-slate-200 pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-600">Subtotal</dt>
              <dd>{formatNaira(subtotalKobo)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-600">Delivery</dt>
              <dd>
                {zone
                  ? deliveryFeeKobo === 0
                    ? "Free"
                    : formatNaira(deliveryFeeKobo)
                  : "Choose an option"}
              </dd>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold">
              <dt>Total</dt>
              <dd>{formatNaira(totalKobo)}</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-slate-500">
            The server checks prices and stock again when you place the order.
          </p>
        </aside>
      </form>
    </section>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent, type InputHTMLAttributes } from "react";
import { useCheckoutOptions, type DeliveryZone } from "@/hooks/use-checkout-options";
import { useHydrated } from "@/hooks/use-hydrated";
import { formatNaira } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import { selectSubtotalKobo, useCartStore } from "@/stores/cart-store";

type PaymentMethod = "paystack" | "bank_transfer";

type FormState = {
  fullName: string;
  email: string;
  phone: string;
  state: string;
  area: string;
  street: string;
  zoneId: string;
  storeId: string;
  paymentMethod: PaymentMethod;
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
  paymentMethod: "paystack",
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
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
      </label>
      <input
        id={id}
        {...props}
        className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-blue-700 focus:outline-none"
      />
    </div>
  );
}

/** A card for one step of checkout. */
function Step({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-xl border border-slate-200 bg-white p-5">
      <legend className="flex items-center gap-3 px-1 text-base font-bold text-ink">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gold text-sm text-ink">
          {number}
        </span>
        {title}
      </legend>
      <div className="mt-3 space-y-4">{children}</div>
    </fieldset>
  );
}

function ChoiceCard({
  name,
  value,
  checked,
  onChange,
  title,
  detail,
  right,
  required,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  title: string;
  detail?: string;
  right?: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 ${
        checked ? "border-blue-700 bg-blue-50 ring-1 ring-blue-700" : "border-slate-200 hover:border-slate-400"
      }`}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        required={required}
        onChange={onChange}
        className="mt-1 accent-blue-700"
      />
      <span className="flex-1">
        <span className="block font-semibold text-ink">{title}</span>
        {detail && <span className="block text-sm text-slate-600">{detail}</span>}
      </span>
      {right && <span className="text-sm font-bold text-ink">{right}</span>}
    </label>
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
        <h1 className="text-2xl font-bold text-ink">Your cart is empty</h1>
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
          address: isPickup ? null : { state: form.state, area: form.area, street: form.street },
        },
        paymentMethod: form.paymentMethod,
        items: items.map((item) => ({ variantId: item.variantId, quantity: item.quantity })),
      },
    });

    if (invokeError) {
      setSubmitting(false);
      setError(await readError(invokeError));
      return;
    }

    const result = data as {
      orderNumber?: string;
      totalKobo?: number;
      authorizationUrl?: string;
    } | null;

    if (!result?.orderNumber) {
      setSubmitting(false);
      setError("We couldn't place your order. Please try again.");
      return;
    }

    if (form.paymentMethod === "paystack") {
      if (!result.authorizationUrl) {
        setSubmitting(false);
        setError("We couldn't start your card payment. Please try again.");
        return;
      }
      // Send the customer to Paystack's secure page. Paystack brings them back to our confirmation page.
      window.location.assign(result.authorizationUrl);
      return;
    }

    router.push(
      `/order/?ref=${encodeURIComponent(result.orderNumber)}&amount=${result.totalKobo ?? 0}`
    );
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="text-2xl font-bold text-ink md:text-3xl">Checkout</h1>
      <p className="mt-1 text-sm text-slate-600">Order as a guest, or log in to keep your order history.</p>

      <form onSubmit={handleSubmit} className="mt-6 lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-8">
        <div className="space-y-5">
          <Step number={1} title="Your details">
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
          </Step>

          <Step number={2} title="Delivery">
            <div className="space-y-3">
              {zones.map((option) => (
                <ChoiceCard
                  key={option.id}
                  name="delivery"
                  value={option.id}
                  checked={form.zoneId === option.id}
                  required
                  onChange={() => update("zoneId", option.id)}
                  title={option.name}
                  detail={timeline(option)}
                  right={option.feeKobo === 0 ? "Free" : formatNaira(option.feeKobo)}
                />
              ))}
            </div>

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
                <p className="text-sm font-semibold text-ink">Choose a store</p>
                {stores.map((store) => (
                  <ChoiceCard
                    key={store.id}
                    name="store"
                    value={store.id}
                    checked={form.storeId === store.id}
                    required
                    onChange={() => update("storeId", store.id)}
                    title={store.name}
                    detail={[store.address, store.state, store.openingHours].filter(Boolean).join(" · ")}
                  />
                ))}
              </div>
            )}
          </Step>

          <Step number={3} title="Payment">
            <div className="space-y-3">
              <ChoiceCard
                name="payment"
                value="paystack"
                checked={form.paymentMethod === "paystack"}
                onChange={() => update("paymentMethod", "paystack")}
                title="Card, bank or USSD"
                detail="Pay securely on Paystack. You'll be taken to their page and brought back here."
              />
              <ChoiceCard
                name="payment"
                value="bank_transfer"
                checked={form.paymentMethod === "bank_transfer"}
                onChange={() => update("paymentMethod", "bank_transfer")}
                title="Bank transfer"
                detail="Pay into our account and send proof on WhatsApp. We confirm once it arrives."
              />
            </div>
          </Step>

          <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
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
        </div>

        <aside className="mt-6 rounded-xl border border-slate-200 bg-white p-5 lg:sticky lg:top-40 lg:mt-0">
          <h2 className="text-base font-bold text-ink">Order summary</h2>

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
            <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold text-ink">
              <dt>Total</dt>
              <dd>{formatNaira(totalKobo)}</dd>
            </div>
          </dl>

          <button
            type="submit"
            disabled={submitting}
            className="mt-5 w-full rounded-full bg-blue-700 px-6 py-3 font-semibold text-white hover:bg-blue-800 disabled:bg-slate-300"
          >
            {submitting
              ? "Please wait…"
              : form.paymentMethod === "paystack"
                ? "Continue to payment"
                : "Place order"}
          </button>

          <p className="mt-3 text-xs text-slate-500">
            The server checks prices and stock again when you place the order.
          </p>
        </aside>
      </form>
    </section>
  );
}

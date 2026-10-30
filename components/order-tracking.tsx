"use client";

import { useState, type FormEvent } from "react";
import { Field, Notice } from "@/components/form-field";
import { formatNaira } from "@/lib/format";
import { statusInfo } from "@/lib/order-status";
import { SITE } from "@/lib/site-config";
import { supabase } from "@/lib/supabase";

type TrackedItem = {
  productName: string;
  variantLabel: string | null;
  quantity: number;
  unitPriceKobo: number;
};

type TrackedOrder = {
  orderNumber: string;
  status: string;
  paymentMethod: string;
  createdAt: string;
  subtotalKobo: number;
  deliveryFeeKobo: number;
  totalKobo: number;
  deliveryZone: string | null;
  state: string | null;
  items: TrackedItem[];
};

const PAYMENT_LABELS: Record<string, string> = {
  paystack: "Card, bank or USSD",
  bank_transfer: "Bank transfer",
};

const BUTTON_CLASS =
  "w-full rounded-full bg-blue-700 px-6 py-3 font-semibold text-white hover:bg-blue-800 disabled:bg-slate-300 sm:w-auto";

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
  return "We couldn't look up your order. Please try again.";
}

function whatsappLink(message: string): string {
  const base = SITE.whatsappUrl.split("?")[0];
  return `${base}?text=${encodeURIComponent(message)}`;
}

export function OrderTracking() {
  const [orderNumber, setOrderNumber] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<TrackedOrder | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setOrder(null);

    const { data, error: invokeError } = await supabase.functions.invoke("track-order", {
      body: { orderNumber: orderNumber.trim(), email: email.trim().toLowerCase() },
    });
    setBusy(false);

    if (invokeError) {
      setError(await readError(invokeError));
      return;
    }
    setOrder((data ?? null) as TrackedOrder | null);
  }

  const info = order ? statusInfo(order.status) : null;

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-xl border border-slate-200 border-t-4 border-t-gold bg-white p-6"
      >
        <Field
          id="track-number"
          label="Order number"
          placeholder="SS-XXXXXXXX-XXXX"
          autoCapitalize="characters"
          required
          value={orderNumber}
          onChange={(event) => setOrderNumber(event.target.value)}
        />
        <Field
          id="track-email"
          label="Email used at checkout"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        {error && <Notice tone="error">{error}</Notice>}
        <button type="submit" disabled={busy} className={BUTTON_CLASS}>
          {busy ? "Checking…" : "Track order"}
        </button>
      </form>

      {order && info && (
        <div className="rounded-xl border border-slate-200 border-t-4 border-t-gold bg-white p-6">
          <p className="font-mono text-sm font-semibold text-ink">{order.orderNumber}</p>
          <p className="text-xs text-slate-500">
            Placed{" "}
            {new Date(order.createdAt).toLocaleDateString("en-NG", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>

          <div className="mt-4 rounded-lg bg-blue-50 p-4">
            <p className="font-bold text-blue-700">{info.label}</p>
            <p className="mt-1 text-sm text-slate-700">{info.detail}</p>
          </div>

          <ul className="mt-4 divide-y divide-slate-200 text-sm">
            {order.items.map((line, index) => (
              <li key={index} className="flex justify-between gap-3 py-2">
                <span className="text-slate-700">
                  {line.quantity} × {line.productName}
                  {line.variantLabel ? ` (${line.variantLabel})` : ""}
                </span>
                <span className="shrink-0 font-medium text-ink">
                  {formatNaira(line.unitPriceKobo * line.quantity)}
                </span>
              </li>
            ))}
          </ul>

          <dl className="mt-4 space-y-2 border-t border-slate-200 pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-600">Subtotal</dt>
              <dd className="text-ink">{formatNaira(order.subtotalKobo)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-600">Delivery</dt>
              <dd className="text-ink">
                {order.deliveryFeeKobo === 0 ? "Free" : formatNaira(order.deliveryFeeKobo)}
              </dd>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-2 font-bold text-ink">
              <dt>Total</dt>
              <dd>{formatNaira(order.totalKobo)}</dd>
            </div>
          </dl>

          <p className="mt-4 text-sm text-slate-600">
            Payment: {PAYMENT_LABELS[order.paymentMethod] ?? order.paymentMethod}.
            {order.deliveryZone && (
              <>
                {" "}
                Delivery: {order.deliveryZone}
                {order.state ? `, ${order.state}` : ""}.
              </>
            )}
          </p>

          {order.status === "awaiting_transfer" && (
            <a
              href={whatsappLink(
                `Hello, I have paid for order ${order.orderNumber}. Here is my proof of payment.`
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 block rounded-full bg-green-600 px-6 py-3 text-center font-semibold text-white hover:bg-green-700"
            >
              Send proof on WhatsApp
            </a>
          )}
        </div>
      )}

      <p className="text-sm text-slate-600">
        Can&apos;t find your order?{" "}
        <a
          href={whatsappLink("Hello, I can't find my order. Can you help?")}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-blue-700 hover:underline"
        >
          Message us on WhatsApp
        </a>
        .
      </p>
    </div>
  );
          }

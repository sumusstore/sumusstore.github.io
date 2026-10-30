"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { BANK_DETAILS } from "@/lib/bank-details";
import { formatNaira } from "@/lib/format";
import { SITE } from "@/lib/site-config";
import { supabase } from "@/lib/supabase";
import { useCartStore } from "@/stores/cart-store";

type CardStatus = "checking" | "paid" | "pending" | "failed" | "review" | "error";

const MAX_CHECKS = 6;
const CHECK_DELAY_MS = 4000;

const CARD_MESSAGES: Record<CardStatus, { heading: string; body: string }> = {
  checking: {
    heading: "Confirming your payment…",
    body: "This usually takes a few seconds. Keep this page open.",
  },
  paid: {
    heading: "Payment received. Thank you.",
    body: "We're preparing your order. We'll contact you on the phone number you gave us.",
  },
  pending: {
    heading: "Payment not confirmed yet",
    body: "If you have paid, give it a few minutes and check again. If you didn't finish paying, your cart is still saved.",
  },
  failed: {
    heading: "Payment didn't go through",
    body: "Your cart is still saved, so you can try again from checkout.",
  },
  review: {
    heading: "We're checking your payment",
    body: "The amount didn't match this order, so our team will confirm it with you on WhatsApp.",
  },
  error: {
    heading: "We couldn't confirm your payment right now",
    body: "Check again in a few minutes. Keep your order number in case you need to contact us.",
  },
};

function whatsappLink(message: string): string {
  const base = SITE.whatsappUrl.split("?")[0];
  return `${base}?text=${encodeURIComponent(message)}`;
}

/** A white card with a gold top edge, used for the main blocks on this page. */
function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 border-t-4 border-t-gold bg-white p-6">
      {children}
    </div>
  );
}

export function OrderConfirmation() {
  const params = useSearchParams();
  const ref = params.get("ref");
  const method = params.get("method");
  const amountKobo = Number(params.get("amount") ?? 0);
  const clearCart = useCartStore((state) => state.clearCart);
  const [cardStatus, setCardStatus] = useState<CardStatus>("checking");

  const isCard = method === "paystack";

  useEffect(() => {
    if (!ref) return;

    // Bank transfer orders are complete once placed, so the cart can be cleared now.
    if (!isCard) {
      clearCart();
      return;
    }

    let active = true;
    let timer: number | undefined;

    async function check(attempt: number) {
      const { data, error } = await supabase.functions.invoke("verify-payment", {
        body: { reference: ref },
      });
      if (!active) return;

      if (error) {
        setCardStatus("error");
        return;
      }

      const status = (data as { status?: string } | null)?.status;
      if (status === "paid") {
        clearCart();
        setCardStatus("paid");
        return;
      }
      if (status === "failed") {
        setCardStatus("failed");
        return;
      }
      if (status === "review") {
        setCardStatus("review");
        return;
      }

      // Paystack can take a few seconds to report. Check again before giving up.
      if (attempt < MAX_CHECKS) {
        timer = window.setTimeout(() => check(attempt + 1), CHECK_DELAY_MS);
      } else {
        setCardStatus("pending");
      }
    }

    check(1);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [ref, isCard, clearCart]);

  if (!ref) {
    return (
      <section className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-ink">No order found</h1>
        <p className="mt-2 text-sm text-slate-600">
          If you just placed an order, check your order number or contact us.
        </p>
        <Link
          href="/shop/"
          className="mt-6 inline-block rounded-full bg-blue-700 px-6 py-3 font-semibold text-white hover:bg-blue-800"
        >
          Continue shopping
        </Link>
      </section>
    );
  }

  if (isCard) {
    const message = CARD_MESSAGES[cardStatus];
    const showHelp = cardStatus === "pending" || cardStatus === "error" || cardStatus === "review";

    return (
      <section className="mx-auto max-w-2xl px-4 py-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Order {ref}</p>
        <h1 className="mt-2 text-2xl font-bold text-ink md:text-3xl">{message.heading}</h1>
        <span aria-hidden="true" className="mt-3 block h-1 w-12 rounded bg-gold" />
        <p className="mt-4 text-slate-600">{message.body}</p>

        <div className="mt-6">
          <Panel>
            {cardStatus === "paid" && amountKobo > 0 && (
              <p className="text-sm text-slate-600">
                Amount paid: <span className="font-bold text-ink">{formatNaira(amountKobo)}</span>
              </p>
            )}

            {showHelp && (
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-ink hover:border-blue-700 hover:text-blue-700"
                >
                  Check again
                </button>
                <a
                  href={whatsappLink(`Hello, I need help with order ${ref}.`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-700"
                >
                  Chat with us on WhatsApp
                </a>
              </div>
            )}

            {!showHelp && cardStatus !== "paid" && (
              <p className="text-sm text-slate-500">Please keep this page open while we confirm.</p>
            )}

            {cardStatus === "paid" && (
              <p className="text-sm text-slate-600">
                Your cart has been cleared. Keep your order number for your records.
              </p>
            )}
          </Panel>
        </div>

        <div className="mt-6 flex flex-wrap gap-6 text-sm font-semibold">
          {cardStatus === "failed" && (
            <Link href="/checkout/" className="text-blue-700 hover:underline">
              Back to checkout
            </Link>
          )}
          <Link href="/shop/" className="text-blue-700 hover:underline">
            Continue shopping
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-2xl px-4 py-8">
      <p className="text-xs font-semibold uppercase tracking-wide text-green-700">Order received</p>
      <h1 className="mt-2 text-2xl font-bold text-ink md:text-3xl">Thank you. Your order is in.</h1>
      <span aria-hidden="true" className="mt-3 block h-1 w-12 rounded bg-gold" />
      <p className="mt-4 text-slate-600">
        Order number <span className="font-mono font-semibold text-ink">{ref}</span>
      </p>

      <div className="mt-6">
        <Panel>
          <h2 className="text-base font-bold text-ink">Pay by bank transfer</h2>

          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <dt className="text-slate-500">Amount</dt>
            <dd className="font-bold text-ink">
              {amountKobo > 0 ? formatNaira(amountKobo) : "See your order total"}
            </dd>
            <dt className="text-slate-500">Bank</dt>
            <dd className="text-ink">{BANK_DETAILS.bankName}</dd>
            <dt className="text-slate-500">Account name</dt>
            <dd className="text-ink">{BANK_DETAILS.accountName}</dd>
            <dt className="text-slate-500">Account number</dt>
            <dd className="font-mono text-ink">{BANK_DETAILS.accountNumber}</dd>
            <dt className="text-slate-500">Reference</dt>
            <dd className="font-mono text-ink">{ref}</dd>
          </dl>

          <ol className="mt-5 list-decimal space-y-2 pl-5 text-sm text-slate-700">
            <li>Transfer the exact amount above.</li>
            <li>Use your order number as the transfer reference.</li>
            <li>Send your proof of payment on WhatsApp.</li>
          </ol>

          <a
            href={whatsappLink(`Hello, I have paid for order ${ref}. Here is my proof of payment.`)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 block rounded-full bg-green-600 px-6 py-3 text-center font-semibold text-white hover:bg-green-700"
          >
            Send proof on WhatsApp
          </a>
        </Panel>
      </div>

      <p className="mt-6 text-sm text-slate-600">
        We confirm your order once the transfer arrives. Keep your order number for your records.
      </p>
      <Link href="/shop/" className="mt-6 inline-block font-semibold text-blue-700 hover:underline">
        Continue shopping
      </Link>
    </section>
  );
}

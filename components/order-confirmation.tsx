"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { BANK_DETAILS } from "@/lib/bank-details";
import { formatNaira } from "@/lib/format";
import { SITE } from "@/lib/site-config";
import { useCartStore } from "@/stores/cart-store";

export function OrderConfirmation() {
  const params = useSearchParams();
  const ref = params.get("ref");
  const amountKobo = Number(params.get("amount") ?? 0);
  const clearCart = useCartStore((state) => state.clearCart);

  // The order is placed, so the cart can be emptied.
  useEffect(() => {
    if (ref) clearCart();
  }, [ref, clearCart]);

  if (!ref) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-slate-900">No order found</h1>
        <p className="mt-2 text-sm text-slate-600">
          If you just placed an order, check your order number or contact us.
        </p>
        <Link href="/shop/" className="mt-6 inline-block font-semibold text-blue-700 hover:underline">
          Continue shopping
        </Link>
      </section>
    );
  }

  const whatsappBase = SITE.whatsappUrl.split("?")[0];
  const proofLink = `${whatsappBase}?text=${encodeURIComponent(
    `Hello, I have paid for order ${ref}. Here is my proof of payment.`
  )}`;

  return (
    <section className="mx-auto max-w-2xl px-4 py-10">
      <p className="text-sm font-semibold uppercase tracking-wide text-green-700">Order received</p>
      <h1 className="mt-2 text-3xl font-bold text-slate-900">Thank you. Your order is in.</h1>
      <p className="mt-2 text-slate-600">
        Order number <span className="font-mono font-semibold text-slate-900">{ref}</span>
      </p>

      <div className="mt-8 rounded-xl border border-slate-200 p-5">
        <h2 className="font-semibold text-slate-900">Pay by bank transfer</h2>

        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <dt className="text-slate-500">Amount</dt>
          <dd className="font-bold text-slate-900">
            {amountKobo > 0 ? formatNaira(amountKobo) : "See your order total"}
          </dd>
          <dt className="text-slate-500">Bank</dt>
          <dd>{BANK_DETAILS.bankName}</dd>
          <dt className="text-slate-500">Account name</dt>
          <dd>{BANK_DETAILS.accountName}</dd>
          <dt className="text-slate-500">Account number</dt>
          <dd className="font-mono">{BANK_DETAILS.accountNumber}</dd>
          <dt className="text-slate-500">Reference</dt>
          <dd className="font-mono">{ref}</dd>
        </dl>

        <ol className="mt-5 list-decimal space-y-2 pl-5 text-sm text-slate-700">
          <li>Transfer the exact amount above.</li>
          <li>Use your order number as the transfer reference.</li>
          <li>Send your proof of payment on WhatsApp.</li>
        </ol>

        <a
          href={proofLink}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 block rounded-lg bg-green-600 px-6 py-3 text-center font-semibold text-white hover:bg-green-700"
        >
          Send proof on WhatsApp
        </a>
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

// app/help/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { SITE } from "@/lib/site-config";
import { POLICY_NUMBERS, SUPPORT_HOURS } from "@/lib/store-policies";

export const metadata: Metadata = {
  title: "Help and contact",
  description:
    "Get help with orders, delivery, returns, warranty and payments. Call, WhatsApp or email Sumus.",
};

type HelpTopic = { title: string; text: string; href: string; cta: string };

const TOPICS: HelpTopic[] = [
  {
    title: "Track an order",
    text: "See where your order is using your order number and the email you checked out with.",
    href: "/track/",
    cta: "Track my order",
  },
  {
    title: "Delivery and pickup",
    text: `Lagos in ${POLICY_NUMBERS.lagosDays} working days. Other states in ${POLICY_NUMBERS.outsideLagosDays} working days. Store pickup is free.`,
    href: "/shipping/",
    cta: "Delivery details",
  },
  {
    title: "Returns and refunds",
    text: `Report a faulty or wrong item within ${POLICY_NUMBERS.returnWindowDays} days of delivery.`,
    href: "/returns/",
    cta: "Returns policy",
  },
  {
    title: "Warranty",
    text: "Find out what your manufacturer warranty covers and how to make a claim.",
    href: "/warranty/",
    cta: "Warranty details",
  },
  {
    title: "Frequently asked questions",
    text: "Quick answers on payment, delivery fees, pickup, cancellations and bulk orders.",
    href: "/faq/",
    cta: "Read the FAQ",
  },
  {
    title: "Bulk and business orders",
    text: "Buying for an office, school, estate or event? Tell us what you need and how many.",
    href: "/bulk/",
    cta: "Make a bulk enquiry",
  },
];

const CARD = "rounded-xl border border-slate-200 border-t-4 border-t-gold bg-white p-5";

export default function HelpPage() {
  return (
    <>
      <section className="bg-blue-700 text-white">
        <div className="mx-auto max-w-6xl px-4 py-10 md:py-14">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-100">Help and contact</p>
          <h1 className="mt-2 text-3xl font-bold md:text-4xl">How can we help?</h1>
          <p className="mt-2 max-w-2xl text-blue-50">
            Find answers below, or reach a real person on the phone, on WhatsApp or by email. Our team
            is available {SUPPORT_HOURS}.
          </p>
          <span aria-hidden="true" className="mt-4 block h-1 w-16 rounded bg-gold" />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10">
        <h2 className="text-xl font-bold text-ink md:text-2xl">Talk to us now</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <a href={SITE.phoneLink} className={`${CARD} block hover:border-blue-700`}>
            <p className="font-bold text-ink">Call</p>
            <p className="mt-1 text-sm text-slate-600">{SITE.phoneDisplay}</p>
            <p className="mt-3 text-sm font-semibold text-blue-700">Call the store</p>
          </a>
          <a
            href={SITE.whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`${CARD} block hover:border-blue-700`}
          >
            <p className="font-bold text-ink">WhatsApp</p>
            <p className="mt-1 text-sm text-slate-600">Send us a message, photo or proof of payment.</p>
            <p className="mt-3 text-sm font-semibold text-blue-700">Chat on WhatsApp</p>
          </a>
          <a href={`mailto:${SITE.email}`} className={`${CARD} block hover:border-blue-700`}>
            <p className="font-bold text-ink">Email</p>
            <p className="mt-1 break-all text-sm text-slate-600">{SITE.email}</p>
            <p className="mt-3 text-sm font-semibold text-blue-700">Send an email</p>
          </a>
        </div>

        <div className="mt-6 rounded-xl bg-paper p-5 text-sm text-slate-700">
          Prefer a form?{" "}
          <Link href="/contact/" className="font-semibold text-blue-700 hover:underline">
            Send us a message
          </Link>{" "}
          and we&apos;ll reply on the phone number or email you give us.
        </div>

        <h2 className="mt-12 text-xl font-bold text-ink md:text-2xl">Browse help topics</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TOPICS.map((topic) => (
            <Link
              key={topic.href}
              href={topic.href}
              className={`${CARD} group flex flex-col hover:border-blue-700`}
            >
              <p className="font-bold text-ink group-hover:text-blue-700">{topic.title}</p>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">{topic.text}</p>
              <p className="mt-4 text-sm font-semibold text-blue-700">{topic.cta} →</p>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}

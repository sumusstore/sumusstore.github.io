import type { Metadata } from "next";
import Link from "next/link";
import { FAQ_ITEMS } from "@/lib/faq";

export const metadata: Metadata = {
  title: "Frequently asked questions",
  description: "Answers to common questions about delivery, payment, pickup, tracking, returns and warranty.",
};

export default function FaqPage() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-8">
      <div className="rounded-xl bg-blue-700 p-6 text-white md:p-8">
        <h1 className="text-2xl font-bold md:text-3xl">Frequently asked questions</h1>
        <p className="mt-2 text-blue-50">
          Can&apos;t find your answer?{" "}
          <Link
            href="/contact/"
            className="font-semibold text-white underline decoration-gold decoration-2 underline-offset-4"
          >
            Contact us
          </Link>
          .
        </p>
      </div>

      <div className="mt-6 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
        {FAQ_ITEMS.map((item) => (
          <details key={item.question} className="group p-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-ink [&::-webkit-details-marker]:hidden">
              {item.question}
              <span
                aria-hidden="true"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gold/20 text-lg leading-none text-ink transition-transform group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <p className="mt-3 leading-relaxed text-slate-700">{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

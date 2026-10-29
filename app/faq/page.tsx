import type { Metadata } from "next";
import Link from "next/link";
import { FAQ_ITEMS } from "@/lib/faq";

export const metadata: Metadata = {
  title: "Frequently asked questions",
  description: "Answers to common questions about delivery, payment, pickup, tracking, returns and warranty.",
};

export default function FaqPage() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-bold text-slate-900">Frequently asked questions</h1>
      <p className="mt-2 text-slate-600">
        Can&apos;t find your answer?{" "}
        <Link href="/contact/" className="font-medium text-blue-700 hover:underline">
          Contact us
        </Link>
        .
      </p>

      <div className="mt-8 divide-y divide-slate-200 rounded-xl border border-slate-200">
        {FAQ_ITEMS.map((item) => (
          <details key={item.question} className="group p-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-slate-900 [&::-webkit-details-marker]:hidden">
              {item.question}
              <span
                aria-hidden="true"
                className="text-xl leading-none text-slate-500 transition-transform group-open:rotate-45"
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

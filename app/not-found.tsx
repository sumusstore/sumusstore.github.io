import Link from "next/link";
import { SITE } from "@/lib/site-config";

export default function NotFound() {
  return (
    <section className="mx-auto max-w-2xl px-4 py-16 text-center">
      <div className="rounded-xl border border-slate-200 border-t-4 border-t-gold bg-white p-8 md:p-12">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Error 404</p>
        <h1 className="mt-2 text-3xl font-bold text-ink md:text-4xl">We can&apos;t find that page</h1>
        <span aria-hidden="true" className="mx-auto mt-4 block h-1 w-16 rounded bg-gold" />
        <p className="mx-auto mt-4 max-w-md text-slate-600">
          The page may have moved, or the link may be wrong. Try searching for what you need, or
          browse our range.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/"
            className="rounded-full bg-blue-700 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-800"
          >
            Back to home
          </Link>
          <Link
            href="/shop/"
            className="rounded-full border border-blue-700 px-6 py-3 text-sm font-semibold text-blue-700 hover:bg-blue-50"
          >
            Browse all products
          </Link>
        </div>

        <p className="mt-8 text-sm text-slate-500">
          Still stuck?{" "}
          <a href={`mailto:${SITE.email}`} className="font-semibold text-blue-700 hover:underline">
            Email us
          </a>{" "}
          or{" "}
          <a href={SITE.phoneLink} className="font-semibold text-blue-700 hover:underline">
            call {SITE.phoneDisplay}
          </a>
          .
        </p>
      </div>
    </section>
  );
}

import type { PolicyDocument } from "@/lib/policy-content";
import { POLICY_LAST_UPDATED } from "@/lib/store-policies";

/** Shows a policy document. Used by the shipping, returns, warranty, privacy and terms pages. */
export function PolicyPage({ doc }: { doc: PolicyDocument }) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-8">
      <div className="rounded-xl border border-slate-200 border-t-4 border-t-gold bg-white p-6 md:p-8">
        <h1 className="text-2xl font-bold text-ink md:text-3xl">{doc.title}</h1>
        <p className="mt-2 text-sm text-slate-500">Last updated {POLICY_LAST_UPDATED}</p>
        <p className="mt-4 text-slate-700">{doc.intro}</p>
      </div>

      <div className="mt-6 space-y-6">
        {doc.sections.map((section) => (
          <section key={section.heading} className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-ink">{section.heading}</h2>

            {section.paragraphs.map((paragraph, index) => (
              <p key={index} className="mt-3 leading-relaxed text-slate-700">
                {paragraph}
              </p>
            ))}

            {section.items && (
              <ul className="mt-3 list-disc space-y-1.5 pl-5 leading-relaxed text-slate-700 marker:text-gold">
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </article>
  );
}

import type { PolicyDocument } from "@/lib/policy-content";
import { POLICY_LAST_UPDATED } from "@/lib/store-policies";

/** Shows a policy document. Used by the shipping, returns, warranty, privacy and terms pages. */
export function PolicyPage({ doc }: { doc: PolicyDocument }) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-bold text-slate-900">{doc.title}</h1>
      <p className="mt-2 text-sm text-slate-500">Last updated {POLICY_LAST_UPDATED}</p>
      <p className="mt-4 text-slate-700">{doc.intro}</p>

      <div className="mt-8 space-y-8">
        {doc.sections.map((section) => (
          <section key={section.heading}>
            <h2 className="text-lg font-semibold text-slate-900">{section.heading}</h2>

            {section.paragraphs.map((paragraph, index) => (
              <p key={index} className="mt-2 leading-relaxed text-slate-700">
                {paragraph}
              </p>
            ))}

            {section.items && (
              <ul className="mt-2 list-disc space-y-1 pl-5 leading-relaxed text-slate-700">
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

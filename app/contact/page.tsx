import type { Metadata } from "next";
import { EnquiryForm } from "@/components/enquiry-form";
import { SITE } from "@/lib/site-config";
import { SUPPORT_HOURS } from "@/lib/store-policies";

export const metadata: Metadata = {
  title: "Contact us",
  description: "Call, WhatsApp or email Sumus, or send us a message about a product, order or delivery.",
};

function ContactCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 border-t-4 border-t-gold bg-white p-5">
      <h2 className="text-xs font-bold uppercase tracking-wide text-slate-500">{title}</h2>
      <div className="mt-2 text-slate-800">{children}</div>
    </div>
  );
}

export default function ContactPage() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-8">
      <div className="rounded-xl bg-blue-700 p-6 text-white md:p-8">
        <h1 className="text-2xl font-bold md:text-3xl">Contact us</h1>
        <p className="mt-2 max-w-2xl text-blue-50">
          Questions about a product, an order or a delivery? Reach us any of these ways, or send a
          message below.
        </p>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <ContactCard title="Call">
            <a href={SITE.phoneLink} className="text-lg font-semibold text-blue-700 hover:underline">
              {SITE.phoneDisplay}
            </a>
          </ContactCard>
          <ContactCard title="WhatsApp">
            <a
              href={SITE.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-lg font-semibold text-blue-700 hover:underline"
            >
              Chat with us on WhatsApp
            </a>
          </ContactCard>
          <ContactCard title="Email">
            <a
              href={`mailto:${SITE.email}`}
              className="text-lg font-semibold text-blue-700 hover:underline"
            >
              {SITE.email}
            </a>
          </ContactCard>
          <ContactCard title="Office">
            <p>{SITE.address}</p>
          </ContactCard>
          <ContactCard title="Support hours">
            <p>{SUPPORT_HOURS}</p>
          </ContactCard>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-bold text-ink">Send us a message</h2>
          <div className="relative mt-4">
            <EnquiryForm kind="contact" />
          </div>
        </div>
      </div>
    </section>
  );
}

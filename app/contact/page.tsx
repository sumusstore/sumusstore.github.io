import type { Metadata } from "next";
import { EnquiryForm } from "@/components/enquiry-form";
import { SITE } from "@/lib/site-config";
import { SUPPORT_HOURS } from "@/lib/store-policies";

export const metadata: Metadata = {
  title: "Contact us",
  description: "Call, WhatsApp or email Sumus, or send us a message about a product, order or delivery.",
};

function ContactItem({
  title,
  value,
  href,
  external,
}: {
  title: string;
  value: string;
  href: string;
  external?: boolean;
}) {
  return (
    <div>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h2>
      <a
        href={href}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
        className="mt-1 block text-lg font-medium text-blue-700 hover:underline"
      >
        {value}
      </a>
    </div>
  );
}

export default function ContactPage() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-bold text-slate-900">Contact us</h1>
      <p className="mt-2 max-w-2xl text-slate-600">
        Questions about a product, an order or a delivery? Reach us any of these ways, or send a message
        below.
      </p>

      <div className="mt-10 grid gap-10 md:grid-cols-2">
        <div className="space-y-6">
          <ContactItem title="Call" value={SITE.phoneDisplay} href={SITE.phoneLink} />
          <ContactItem
            title="WhatsApp"
            value="Chat with us on WhatsApp"
            href={SITE.whatsappUrl}
            external
          />
          <ContactItem title="Email" value={SITE.email} href={`mailto:${SITE.email}`} />

          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Office</h2>
            <p className="mt-1 text-slate-700">{SITE.address}</p>
          </div>

          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Support hours
            </h2>
            <p className="mt-1 text-slate-700">{SUPPORT_HOURS}</p>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-slate-900">Send us a message</h2>
          <div className="relative mt-4">
            <EnquiryForm kind="contact" />
          </div>
        </div>
      </div>
    </section>
  );
}

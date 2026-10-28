import Link from "next/link";
import { SITE } from "@/lib/site-config";

type FooterLink = { label: string; href: string };

const shopLinks: FooterLink[] = [
  { label: "Phones", href: "/category/phones/" },
  { label: "TVs and Audio", href: "/category/tv-audio/" },
  { label: "Home Appliances", href: "/category/home-appliances/" },
  { label: "Power and Solar", href: "/category/power-solar/" },
  { label: "Smart Home", href: "/category/smart-home/" },
  { label: "Accessories", href: "/category/accessories/" },
];

const helpLinks: FooterLink[] = [
  { label: "FAQ", href: "/faq/" },
  { label: "Track an order", href: "/track/" },
  { label: "Shipping and delivery", href: "/shipping/" },
  { label: "Returns and refunds", href: "/returns/" },
  { label: "Warranty", href: "/warranty/" },
];

const companyLinks: FooterLink[] = [
  { label: "About us", href: "/about/" },
  { label: "Store locator", href: "/stores/" },
  { label: "Bulk sales", href: "/bulk/" },
  { label: "Contact us", href: "/contact/" },
  { label: "Privacy policy", href: "/privacy/" },
  { label: "Terms and conditions", href: "/terms/" },
];

// Labels only. Adjust to match the payment options enabled in your Paystack account.
const paymentMethods = ["Paystack", "Visa", "Mastercard", "Bank transfer", "USSD"];

type FooterColumnProps = {
  title: string;
  links: FooterLink[];
};

function FooterColumn({ title, links }: FooterColumnProps) {
  return (
    <div>
      <h2 className="font-semibold text-slate-900">{title}</h2>
      <ul className="mt-4 space-y-2.5">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="hover:text-blue-700">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50 text-sm text-slate-700">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <FooterColumn title="Shop" links={shopLinks} />
        <FooterColumn title="Help" links={helpLinks} />
        <FooterColumn title="Company" links={companyLinks} />

        <div>
          <h2 className="font-semibold text-slate-900">Contact</h2>
          <ul className="mt-4 space-y-2.5">
            <li>
              <a href={SITE.phoneLink} className="hover:text-blue-700">
                {SITE.phoneDisplay}
              </a>
            </li>
            <li>
              <a
                href={SITE.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-blue-700"
              >
                Chat on WhatsApp
              </a>
            </li>
            <li>
              <a href={`mailto:${SITE.email}`} className="hover:text-blue-700">
                {SITE.email}
              </a>
            </li>
            <li className="leading-relaxed">{SITE.address}</li>
          </ul>

          <h3 className="mt-8 font-semibold text-slate-900">Follow us</h3>
          <ul className="mt-3 flex flex-wrap gap-2">
            {SITE.socials.map((social) => (
              <li key={social.label}>
                <a
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${SITE.name} on ${social.label}`}
                  className="inline-block rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium hover:border-blue-600 hover:text-blue-700"
                >
                  {social.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-slate-200">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 md:flex-row md:items-center md:justify-between">
          <ul className="flex flex-wrap gap-2" aria-label="Accepted payment methods">
            {paymentMethods.map((method) => (
              <li
                key={method}
                className="rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700"
              >
                {method}
              </li>
            ))}
          </ul>
          <p className="text-xs text-slate-500">
            © {new Date().getFullYear()} {SITE.name}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

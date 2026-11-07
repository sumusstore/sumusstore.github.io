// components/site-footer.tsx
import Link from "next/link";
import { SITE } from "@/lib/site-config";

type FooterLink = { label: string; href: string };

const mainLinks: FooterLink[] = [
  { label: "Shop all products", href: "/shop/" },
  { label: "Sellers", href: "/sellers/" },
  { label: "Track an order", href: "/track/" },
  { label: "Store locator", href: "/stores/" },
  { label: "Bulk sales", href: "/bulk/" },
  { label: "Sell on Sumus", href: "/sell/" },
  { label: "FAQ", href: "/faq/" },
  { label: "Contact us", href: "/contact/" },
];

const legalLinks: FooterLink[] = [
  { label: "About us", href: "/about/" },
  { label: "Shipping and delivery", href: "/shipping/" },
  { label: "Returns and refunds", href: "/returns/" },
  { label: "Warranty", href: "/warranty/" },
  { label: "Privacy policy", href: "/privacy/" },
  { label: "Terms and conditions", href: "/terms/" },
];

export function SiteFooter() {
  return (
    <footer className="mt-10 bg-[#121a22] text-white">
      <div className="mx-auto max-w-6xl px-5 pb-10 pt-12 md:pt-16">
        <nav aria-label="Footer">
          <ul className="grid gap-x-10 md:grid-cols-2 lg:grid-cols-3">
            {mainLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="block py-3.5 text-lg font-medium text-white transition-colors hover:text-blue-300 md:text-base"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mt-8 border-t border-white/20" />

        <div className="mt-10 text-center">
          <p className="text-sm">
            <a href={SITE.phoneLink} className="font-semibold text-white hover:text-blue-300">
              {SITE.phoneDisplay}
            </a>
            <span className="mx-2 text-slate-500" aria-hidden="true">
              ·
            </span>
            <a
              href={`mailto:${SITE.email}`}
              className="font-semibold text-white hover:text-blue-300"
            >
              {SITE.email}
            </a>
          </p>

          <nav aria-label="Legal and information" className="mt-6">
            <p className="text-sm leading-7 text-blue-300">
              {legalLinks.map((link, index) => (
                <span key={link.href}>
                  <Link href={link.href} className="underline underline-offset-4 hover:text-white">
                    {link.label}
                  </Link>
                  {index < legalLinks.length - 1 && ", "}
                </span>
              ))}
            </p>
          </nav>

          <p className="mt-8 text-sm text-slate-400">
            © {new Date().getFullYear()} {SITE.name}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

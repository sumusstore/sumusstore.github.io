// components/site-footer.tsx
import Link from "next/link";
import { SITE } from "@/lib/site-config";

type FooterLink = { label: string; href: string };

// Main list: the same stacked, large-type rhythm as the screenshot.
const mainLinks: FooterLink[] = [
  { label: "Home", href: "/" },
  { label: "My Sumus", href: "/account/" },
  { label: "Sell on Sumus", href: "/sell/" },
  { label: "Help & Contact", href: "/contact/" },
  { label: "Track an order", href: "/track/" },
  { label: "Find a store", href: "/stores/" },
];

// Legal and information row, centred under the divider.
const legalLinks: FooterLink[] = [
  { label: "Shipping & delivery", href: "/shipping/" },
  { label: "Returns & refunds", href: "/returns/" },
  { label: "Warranty", href: "/warranty/" },
  { label: "Sitemap", href: "/sitemap/" },
  { label: "Privacy", href: "/privacy/" },
  { label: "Terms & conditions", href: "/terms/" },
  { label: "About us", href: "/about/" },
  { label: "Bulk sales", href: "/bulk/" },
];

export function SiteFooter() {
  return (
    <footer className="mt-10 bg-[#121a22] text-white">
      <div className="mx-auto max-w-6xl px-5 pb-10 pt-12 md:pt-16">
        <nav aria-label="Footer">
          <ul className="max-w-md">
            {mainLinks.map((link) => (
              <li key={link.label}>
                <Link
                  href={link.href}
                  className="block py-3.5 text-lg font-medium text-white transition-colors hover:text-blue-300"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mt-8 border-t border-white/25" />

        <nav aria-label="Legal and information" className="mx-auto mt-10 max-w-3xl text-center">
          <p className="text-sm leading-8 text-blue-300">
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

        <p className="mt-8 text-center text-sm text-slate-400">
          © {new Date().getFullYear()} {SITE.name}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

import type { Metadata } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { WishlistSync } from "@/components/wishlist-sync";

export const metadata: Metadata = {
  title: {
    default: "Sumus | Electrical Building Materials, Electronics and Home Appliances in Nigeria",
    template: "%s | Sumus",
  },
  description:
    "Genuine Building Materials, electronics, home appliances, and solar products in Nigeria, with delivery to Lagos and beyond.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-NG">
      <body className="min-h-screen bg-white text-slate-900 antialiased">
        <WishlistSync />
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";
import { CompareBar } from "@/components/compare-bar";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { WishlistSync } from "@/components/wishlist-sync";

export const metadata: Metadata = {
  title: {
    default: "Sumus | Phones, Electronics and Home Appliances in Nigeria",
    template: "%s | Sumus",
  },
  description:
    "Genuine phones, electronics, home appliances, and solar products in Nigeria, with delivery to Lagos and beyond.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-NG">
      <body className="min-h-screen bg-paper text-ink antialiased">
        <WishlistSync />
        <SiteHeader />
        {children}
        <SiteFooter />
        <CompareBar />
      </body>
    </html>
  );
}

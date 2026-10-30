import type { Metadata } from "next";
import "./globals.css";
import { CompareBar } from "@/components/compare-bar";
import { MobileTabBar } from "@/components/mobile-tab-bar";
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
      {/* On phones the body has room at the bottom for the tab bar. */}
      <body className="min-h-screen bg-paper pb-16 text-ink antialiased md:pb-0">
        <WishlistSync />
        <SiteHeader />
        {children}
        <SiteFooter />
        <CompareBar />
        <MobileTabBar />
      </body>
    </html>
  );
}

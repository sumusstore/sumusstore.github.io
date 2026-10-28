import type { Metadata } from "next";
import { CatalogueView } from "@/components/catalogue-view";

export const metadata: Metadata = {
  title: "Shop all products",
};

export default function ShopPage() {
  return (
    <CatalogueView
      title="All products"
      subtitle="Phones, electronics, home appliances, power and solar, and smart home."
    />
  );
}

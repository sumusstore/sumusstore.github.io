import type { Metadata } from "next";
import { ProductDetailView } from "@/components/product-detail-view";
import { supabase } from "@/lib/supabase";

type BuildSnapshot = {
  name: string;
  description: string | null;
  brands: { name: string } | null;
  product_images: { image_url: string; position: number }[];
  product_variants: { price_kobo: number; stock_qty: number; is_active: boolean }[];
};

// Builds one page per active product when the site is built.
// Run the workflow again after you add a product.
export async function generateStaticParams() {
  const { data, error } = await supabase.from("products").select("slug").eq("is_active", true);
  if (error) {
    throw new Error(`Could not load products for the build: ${error.message}`);
  }
  return (data ?? []).map((row) => ({ slug: row.slug }));
}

/** Reads the details used for the page title and search engine data. */
async function loadSnapshot(slug: string): Promise<BuildSnapshot | null> {
  const { data } = await supabase
    .from("products")
    .select(
      "name, description, brands(name), product_images(image_url, position), product_variants(price_kobo, stock_qty, is_active)"
    )
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  return (data as unknown as BuildSnapshot | null) ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const snapshot = await loadSnapshot(slug);
  if (!snapshot) return { title: "Product not found" };

  return {
    title: snapshot.name,
    description:
      snapshot.description?.slice(0, 155) ??
      `Buy ${snapshot.name} in Nigeria, with delivery nationwide.`,
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const snapshot = await loadSnapshot(slug);

  const variants = (snapshot?.product_variants ?? []).filter((v) => v.is_active);
  const images = [...(snapshot?.product_images ?? [])].sort((a, b) => a.position - b.position);

  // Structured data that tells search engines the product name, price and availability.
  const jsonLd = snapshot
    ? {
        "@context": "https://schema.org",
        "@type": "Product",
        name: snapshot.name,
        description: snapshot.description ?? undefined,
        image: images[0]?.image_url,
        brand: snapshot.brands ? { "@type": "Brand", name: snapshot.brands.name } : undefined,
        offers:
          variants.length > 0
            ? {
                "@type": "Offer",
                priceCurrency: "NGN",
                price: (Math.min(...variants.map((v) => v.price_kobo)) / 100).toFixed(2),
                availability: variants.some((v) => v.stock_qty > 0)
                  ? "https://schema.org/InStock"
                  : "https://schema.org/OutOfStock",
              }
            : undefined,
      }
    : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
          }}
        />
      )}
      <ProductDetailView slug={slug} />
    </>
  );
}

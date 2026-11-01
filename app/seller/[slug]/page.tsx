import type { Metadata } from "next";
import { SellerView } from "@/components/seller-view";
import { supabase } from "@/lib/supabase";

// Builds one page per approved seller when the site is built.
// The rebuild queue adds a build when a seller is approved, renamed or suspended.
export async function generateStaticParams() {
  const { data, error } = await supabase.from("public_sellers").select("slug");
  if (error) {
    throw new Error(`Could not load sellers for the build: ${error.message}`);
  }
  return (data ?? []).map((row) => ({ slug: row.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const { data } = await supabase
    .from("public_sellers")
    .select("display_name")
    .eq("slug", slug)
    .maybeSingle();
  if (!data) return { title: "Shop not found" };
  return {
    title: data.display_name,
    description: `Shop ${data.display_name} on Sumus, with genuine products and nationwide delivery.`,
  };
}

export default async function SellerPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <SellerView slug={slug} />;
}

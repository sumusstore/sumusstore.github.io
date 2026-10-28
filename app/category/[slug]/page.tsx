import { CategoryView } from "@/components/category-view";
import { supabase } from "@/lib/supabase";

// Builds one page per category when the site is built.
// Run the workflow again after you add a category.
export async function generateStaticParams() {
  const { data, error } = await supabase.from("categories").select("slug");
  if (error) {
    throw new Error(`Could not load categories for the build: ${error.message}`);
  }
  return (data ?? []).map((row) => ({ slug: row.slug }));
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <CategoryView slug={slug} />;
}

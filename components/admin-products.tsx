"use client";

import { useEffect, useState, type FormEvent } from "react";
import { AdminProductEditor } from "@/components/admin-product-editor";
import { Notice } from "@/components/form-field";
import { slugify, type Brand, type Category } from "@/lib/admin-utils";
import { formatNaira } from "@/lib/format";
import { supabase } from "@/lib/supabase";

type ListRow = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  brands: { name: string } | null;
  product_images: { image_url: string; position: number }[];
  product_variants: { price_kobo: number; stock_qty: number; is_active: boolean }[];
};

type Message = { tone: "error" | "info"; text: string } | null;

const INPUT =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-600 focus:outline-none";
const BUTTON =
  "rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:bg-slate-300";
const GHOST =
  "rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-800 hover:border-slate-500";

/** Summarises a product's active variants for the list, such as "From ₦125,000 · 12 in stock". */
function summary(row: ListRow): string {
  const active = row.product_variants.filter((variant) => variant.is_active);
  if (active.length === 0) return "No active variants yet";
  const cheapest = Math.min(...active.map((variant) => variant.price_kobo));
  const stock = active.reduce((total, variant) => total + variant.stock_qty, 0);
  return `From ${formatNaira(cheapest)} · ${stock} in stock`;
}

export function AdminProducts() {
  const [rows, setRows] = useState<ListRow[] | null>(null);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [version, setVersion] = useState(0);
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<Message>(null);

  useEffect(() => {
    let active = true;

    Promise.all([
      supabase
        .from("products")
        .select(
          "id, name, slug, is_active, brands(name), product_images(image_url, position), product_variants(price_kobo, stock_qty, is_active)"
        )
        .order("name"),
      supabase.from("brands").select("id, name, slug").order("name"),
      supabase.from("categories").select("id, name, slug, parent_id, sort_order").order("sort_order"),
    ]).then(([productResult, brandResult, categoryResult]) => {
      if (!active) return;

      if (productResult.error) {
        setMessage({ tone: "error", text: "Products couldn't load. Refresh the page to try again." });
        setRows([]);
      } else {
        setRows((productResult.data ?? []) as unknown as ListRow[]);
      }
      setBrands((brandResult.data ?? []) as Brand[]);
      setCategories((categoryResult.data ?? []) as Category[]);
    });

    return () => {
      active = false;
    };
  }, [version]);

  function reload() {
    setVersion((current) => current + 1);
  }

  async function toggleActive(row: ListRow) {
    const { error } = await supabase
      .from("products")
      .update({ is_active: !row.is_active })
      .eq("id", row.id);

    if (error) {
      setMessage({ tone: "error", text: "Couldn't change this product's visibility." });
      return;
    }
    reload();
  }

  async function createProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newName.trim();
    const slug = slugify(name);
    if (!name || !slug) {
      setMessage({ tone: "error", text: "Enter a product name." });
      return;
    }

    setCreating(true);
    const { data, error } = await supabase
      .from("products")
      .insert({ name, slug, is_active: false })
      .select("id")
      .single();
    setCreating(false);

    if (error) {
      setMessage({
        tone: "error",
        text:
          error.code === "23505"
            ? "A product with this web address already exists. Use a different name."
            : "The product couldn't be created.",
      });
      return;
    }

    setNewName("");
    setMessage({
      tone: "info",
      text: `${name} is created and hidden from the shop. Add a variant with a price, then switch the product on.`,
    });
    setOpenId(data.id);
    reload();
  }

  const query = search.trim().toLowerCase();
  const visible = (rows ?? []).filter(
    (row) =>
      !query ||
      row.name.toLowerCase().includes(query) ||
      (row.brands?.name ?? "").toLowerCase().includes(query)
  );

  return (
    <div className="space-y-6">
      <form
        onSubmit={createProduct}
        className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-end"
      >
        <div className="flex-1">
          <label htmlFor="new-product" className="block text-sm font-medium text-slate-800">
            New product name
          </label>
          <input
            id="new-product"
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            placeholder="e.g. Tecno Pova 6"
            className={`mt-1 ${INPUT}`}
          />
        </div>
        <button type="submit" disabled={creating} className={BUTTON}>
          {creating ? "Creating…" : "Create product"}
        </button>
      </form>

      <input
        type="search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search products or brands"
        aria-label="Search products"
        className={INPUT}
      />

      {message && <Notice tone={message.tone}>{message.text}</Notice>}
      {rows === null && <p className="text-sm text-slate-600">Loading products…</p>}

      <ul className="space-y-3">
        {visible.map((row) => {
          const photo = [...row.product_images].sort((a, b) => a.position - b.position)[0];
          const open = openId === row.id;

          return (
            <li key={row.id} className="rounded-xl border border-slate-200 p-4">
              <div className="flex gap-4">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                  {photo ? (
                    <img src={photo.image_url} alt="" loading="lazy" className="h-full w-full object-contain p-1" />
                  ) : (
                    <span className="flex h-full items-center justify-center text-[10px] text-slate-400">
                      No photo
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900">{row.name}</p>
                  <p className="text-xs text-slate-500">
                    {row.brands?.name ?? "No brand"} · {summary(row)}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => toggleActive(row)}
                      className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                        row.is_active
                          ? "bg-green-100 text-green-800 hover:bg-green-200"
                          : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                      }`}
                    >
                      {row.is_active ? "Visible in shop" : "Hidden"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setOpenId(open ? null : row.id)}
                      aria-expanded={open}
                      className={GHOST}
                    >
                      {open ? "Close" : "Edit"}
                    </button>
                  </div>
                </div>
              </div>

              {open && (
                <div className="mt-5 border-t border-slate-100 pt-5">
                  <AdminProductEditor
                    productId={row.id}
                    brands={brands}
                    categories={categories}
                    onChanged={reload}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

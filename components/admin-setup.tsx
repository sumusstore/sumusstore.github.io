"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Notice } from "@/components/form-field";
import { slugify, type Brand, type Category } from "@/lib/admin-utils";
import { supabase } from "@/lib/supabase";

type Message = { tone: "error" | "info"; text: string } | null;

const INPUT =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-600 focus:outline-none";
const BUTTON =
  "rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:bg-slate-300";

export function AdminSetup() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [version, setVersion] = useState(0);
  const [message, setMessage] = useState<Message>(null);
  const [brandName, setBrandName] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [parentId, setParentId] = useState("");
  const [sortOrder, setSortOrder] = useState("0");

  useEffect(() => {
    let active = true;

    Promise.all([
      supabase.from("brands").select("id, name, slug").order("name"),
      supabase.from("categories").select("id, name, slug, parent_id, sort_order").order("sort_order"),
    ]).then(([brandResult, categoryResult]) => {
      if (!active) return;
      setBrands((brandResult.data ?? []) as Brand[]);
      setCategories((categoryResult.data ?? []) as Category[]);
    });

    return () => {
      active = false;
    };
  }, [version]);

  async function addBrand(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = brandName.trim();
    const slug = slugify(name);
    if (!name || !slug) {
      setMessage({ tone: "error", text: "Enter a brand name." });
      return;
    }

    const { error } = await supabase.from("brands").insert({ name, slug });
    if (error) {
      setMessage({
        tone: "error",
        text: error.code === "23505" ? `${name} is already in the list.` : "The brand couldn't be added.",
      });
      return;
    }

    setBrandName("");
    setMessage({ tone: "info", text: `${name} added. You can now choose it for products.` });
    setVersion((current) => current + 1);
  }

  async function addCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = categoryName.trim();
    const slug = slugify(name);
    const order = Number(sortOrder);
    if (!name || !slug) {
      setMessage({ tone: "error", text: "Enter a category name." });
      return;
    }
    if (!Number.isInteger(order)) {
      setMessage({ tone: "error", text: "Sort order must be a whole number." });
      return;
    }

    const { error } = await supabase.from("categories").insert({
      name,
      slug,
      parent_id: parentId || null,
      sort_order: order,
    });
    if (error) {
      setMessage({
        tone: "error",
        text:
          error.code === "23505"
            ? "A category with this name already exists."
            : "The category couldn't be added.",
      });
      return;
    }

    setCategoryName("");
    setParentId("");
    setSortOrder("0");
    setMessage({
      tone: "info",
      text: `${name} added. Its shop page appears after the site is rebuilt.`,
    });
    setVersion((current) => current + 1);
  }

  const nameOf = (id: string | null) => categories.find((category) => category.id === id)?.name;

  return (
    <div className="space-y-10">
      {message && <Notice tone={message.tone}>{message.text}</Notice>}

      <div className="grid gap-10 md:grid-cols-2">
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">Brands</h2>
          <form onSubmit={addBrand} className="flex gap-2">
            <input
              value={brandName}
              onChange={(event) => setBrandName(event.target.value)}
              placeholder="e.g. Hisense"
              aria-label="Brand name"
              className={`flex-1 ${INPUT}`}
            />
            <button type="submit" className={BUTTON}>
              Add brand
            </button>
          </form>
          <ul className="flex flex-wrap gap-2">
            {brands.map((brand) => (
              <li key={brand.id} className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-800">
                {brand.name}
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">Categories</h2>
          <form onSubmit={addCategory} className="space-y-3">
            <input
              value={categoryName}
              onChange={(event) => setCategoryName(event.target.value)}
              placeholder="e.g. Kitchen Appliances"
              aria-label="Category name"
              className={INPUT}
            />
            <select
              value={parentId}
              onChange={(event) => setParentId(event.target.value)}
              aria-label="Parent category"
              className={INPUT}
            >
              <option value="">Top level (main category)</option>
              {categories
                .filter((category) => category.parent_id === null)
                .map((category) => (
                  <option key={category.id} value={category.id}>
                    Under {category.name}
                  </option>
                ))}
            </select>
            <input
              inputMode="numeric"
              value={sortOrder}
              onChange={(event) => setSortOrder(event.target.value)}
              aria-label="Sort order"
              placeholder="Sort order (lower numbers show first)"
              className={INPUT}
            />
            <button type="submit" className={BUTTON}>
              Add category
            </button>
          </form>

          <ul className="space-y-2">
            {categories.map((category) => (
              <li
                key={category.id}
                className="flex flex-wrap justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                <span className="text-slate-900">
                  {category.parent_id ? `${nameOf(category.parent_id)} › ${category.name}` : category.name}
                </span>
                <span className="text-slate-500">/category/{category.slug}/</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

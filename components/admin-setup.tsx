"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Notice } from "@/components/form-field";
import { slugify, type Brand, type Category } from "@/lib/admin-utils";
import { supabase } from "@/lib/supabase";

type Message = { tone: "error" | "info"; text: string } | null;

type EditState = {
  id: string;
  name: string;
  slug: string;
  originalSlug: string;
  parentId: string;
  sortOrder: string;
};

const INPUT =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-700 focus:outline-none";
const BUTTON =
  "rounded-full bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:bg-slate-300";
const GHOST =
  "rounded-full border border-blue-700 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 disabled:border-slate-300 disabled:text-slate-400";
const DANGER =
  "rounded-full border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:text-slate-400";

/** The category plus every category beneath it, so a parent can't be moved under its own child. */
function branchIds(id: string, all: Category[]): Set<string> {
  const found = new Set<string>([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const item of all) {
      if (item.parent_id && found.has(item.parent_id) && !found.has(item.id)) {
        found.add(item.id);
        grew = true;
      }
    }
  }
  return found;
}

/** Shows a category with its parent, such as "Phones › Smartphones". */
function pathOf(category: Category, all: Category[]): string {
  const parent = all.find((item) => item.id === category.parent_id);
  return parent ? `${parent.name} › ${category.name}` : category.name;
}

/** Counts the rows that point at an item, so a delete can be blocked while it's still in use. */
async function countRows(table: string, column: string, id: string): Promise<number> {
  const { count } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq(column, id);
  return count ?? 0;
}

function plural(count: number, one: string, many: string): string {
  return count === 1 ? one : many;
}

export function AdminSetup() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [version, setVersion] = useState(0);
  const [message, setMessage] = useState<Message>(null);
  const [busy, setBusy] = useState(false);

  const [brandName, setBrandName] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [newParentId, setNewParentId] = useState("");
  const [newSortOrder, setNewSortOrder] = useState("0");
  const [editing, setEditing] = useState<EditState | null>(null);

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

  function reload() {
    setVersion((current) => current + 1);
  }

  function patchEditing(patch: Partial<EditState>) {
    setEditing((current) => (current ? { ...current, ...patch } : current));
  }

  // Brands

  async function addBrand(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = brandName.trim();
    const slug = slugify(name);
    if (!name || !slug) {
      setMessage({ tone: "error", text: "Enter a brand name." });
      return;
    }

    setBusy(true);
    const { error } = await supabase.from("brands").insert({ name, slug });
    setBusy(false);

    if (error) {
      setMessage({
        tone: "error",
        text: error.code === "23505" ? `${name} is already in the list.` : "The brand couldn't be added.",
      });
      return;
    }

    setBrandName("");
    setMessage({ tone: "info", text: `${name} added. You can now choose it for products.` });
    reload();
  }

  async function deleteBrand(brand: Brand) {
    setMessage(null);
    setBusy(true);
    const used = await countRows("products", "brand_id", brand.id);
    setBusy(false);

    if (used > 0) {
      setMessage({
        tone: "error",
        text: `${brand.name} is used by ${used} ${plural(used, "product", "products")}. Move ${plural(
          used,
          "it",
          "them"
        )} to another brand in the Products tab, then delete ${brand.name}.`,
      });
      return;
    }

    if (!window.confirm(`Delete the brand ${brand.name}? This can't be undone.`)) return;

    setBusy(true);
    const { error } = await supabase.from("brands").delete().eq("id", brand.id);
    setBusy(false);

    if (error) {
      setMessage({ tone: "error", text: `${brand.name} couldn't be deleted. ${error.message}` });
      return;
    }

    setMessage({ tone: "info", text: `${brand.name} is deleted.` });
    reload();
  }

  // Categories

  async function addCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = categoryName.trim();
    const slug = slugify(name);
    const order = Number(newSortOrder);
    if (!name || !slug) {
      setMessage({ tone: "error", text: "Enter a category name." });
      return;
    }
    if (!Number.isInteger(order)) {
      setMessage({ tone: "error", text: "Sort order must be a whole number." });
      return;
    }

    setBusy(true);
    const { error } = await supabase.from("categories").insert({
      name,
      slug,
      parent_id: newParentId || null,
      sort_order: order,
    });
    setBusy(false);

    if (error) {
      setMessage({
        tone: "error",
        text:
          error.code === "23505"
            ? "A category with this name or web address already exists."
            : "The category couldn't be added.",
      });
      return;
    }

    setCategoryName("");
    setNewParentId("");
    setNewSortOrder("0");
    setMessage({ tone: "info", text: `${name} added. Its shop page appears after the next rebuild.` });
    reload();
  }

  function startEdit(category: Category) {
    setMessage(null);
    setEditing({
      id: category.id,
      name: category.name,
      slug: category.slug,
      originalSlug: category.slug,
      parentId: category.parent_id ?? "",
      sortOrder: String(category.sort_order),
    });
  }

  async function saveEdit() {
    if (!editing) return;

    const name = editing.name.trim();
    const slug = slugify(editing.slug.trim() || name);
    const order = Number(editing.sortOrder);

    if (!name || !slug) {
      setMessage({ tone: "error", text: "Enter a category name." });
      return;
    }
    if (!Number.isInteger(order)) {
      setMessage({ tone: "error", text: "Sort order must be a whole number." });
      return;
    }
    if (
      slug !== editing.originalSlug &&
      !window.confirm("Changing the web address breaks any links that already point to this category. Continue?")
    ) {
      return;
    }

    setBusy(true);
    const { error } = await supabase
      .from("categories")
      .update({ name, slug, parent_id: editing.parentId || null, sort_order: order })
      .eq("id", editing.id);
    setBusy(false);

    if (error) {
      setMessage({
        tone: "error",
        text:
          error.code === "23505"
            ? "Another category already uses that name or web address."
            : "The category couldn't be saved.",
      });
      return;
    }

    setEditing(null);
    setMessage({ tone: "info", text: `${name} is saved. Its page updates after the next rebuild.` });
    reload();
  }

  async function deleteCategory(category: Category) {
    setMessage(null);
    setBusy(true);
    const [products, children] = await Promise.all([
      countRows("products", "category_id", category.id),
      countRows("categories", "parent_id", category.id),
    ]);
    setBusy(false);

    if (children > 0) {
      setMessage({
        tone: "error",
        text: `${category.name} has ${children} ${plural(children, "subcategory", "subcategories")}. Delete or move ${plural(
          children,
          "it",
          "them"
        )} first.`,
      });
      return;
    }

    if (products > 0) {
      setMessage({
        tone: "error",
        text: `${category.name} is used by ${products} ${plural(products, "product", "products")}. Move ${plural(
          products,
          "it",
          "them"
        )} to another category in the Products tab first.`,
      });
      return;
    }

    if (!window.confirm(`Delete the category ${category.name}?`)) return;

    setBusy(true);
    const { error } = await supabase.from("categories").delete().eq("id", category.id);
    setBusy(false);

    if (error) {
      setMessage({ tone: "error", text: `${category.name} couldn't be deleted. ${error.message}` });
      return;
    }

    setMessage({
      tone: "info",
      text: `${category.name} is deleted. Its old shop page is removed at the next rebuild.`,
    });
    reload();
  }

  // Parent choices for the edit form: top-level categories, excluding the one being edited and its branch.
  const editBranch = editing ? branchIds(editing.id, categories) : new Set<string>();
  const parentChoices = categories.filter((item) => item.parent_id === null && !editBranch.has(item.id));

  return (
    <div className="space-y-10">
      {message && <Notice tone={message.tone}>{message.text}</Notice>}

      <section className="space-y-4 rounded-xl border border-slate-200 border-t-4 border-t-gold bg-white p-5">
        <h2 className="text-lg font-bold text-ink">Brands</h2>

        <form onSubmit={addBrand} className="flex flex-col gap-2 sm:flex-row">
          <input
            value={brandName}
            onChange={(event) => setBrandName(event.target.value)}
            placeholder="e.g. Hisense"
            aria-label="Brand name"
            className={`flex-1 ${INPUT}`}
          />
          <button type="submit" disabled={busy} className={BUTTON}>
            Add brand
          </button>
        </form>

        {brands.length === 0 ? (
          <p className="text-sm text-slate-600">No brands yet.</p>
        ) : (
          <ul className="divide-y divide-slate-200">
            {brands.map((brand) => (
              <li key={brand.id} className="flex items-center justify-between gap-3 py-3">
                <span className="font-medium text-ink">{brand.name}</span>
                <button type="button" disabled={busy} onClick={() => deleteBrand(brand)} className={DANGER}>
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}

        <p className="text-xs text-slate-500">
          A brand used by products can&apos;t be deleted until those products use another brand. Sellers can
          add brands too, so check for duplicates before deleting.
        </p>
      </section>

      <section className="space-y-4 rounded-xl border border-slate-200 border-t-4 border-t-gold bg-white p-5">
        <h2 className="text-lg font-bold text-ink">Categories</h2>

        <form onSubmit={addCategory} className="grid gap-3 md:grid-cols-2">
          <input
            value={categoryName}
            onChange={(event) => setCategoryName(event.target.value)}
            placeholder="e.g. Kitchen Appliances"
            aria-label="Category name"
            className={INPUT}
          />
          <select
            value={newParentId}
            onChange={(event) => setNewParentId(event.target.value)}
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
            value={newSortOrder}
            onChange={(event) => setNewSortOrder(event.target.value)}
            aria-label="Sort order"
            placeholder="Sort order (lower numbers show first)"
            className={INPUT}
          />
          <button type="submit" disabled={busy} className={BUTTON}>
            Add category
          </button>
        </form>

        <ul className="divide-y divide-slate-200">
          {categories.map((category) =>
            editing && editing.id === category.id ? (
              <li key={category.id} className="py-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="block text-xs font-medium text-ink">
                    Name
                    <input
                      className={INPUT}
                      value={editing.name}
                      onChange={(event) => patchEditing({ name: event.target.value })}
                    />
                  </label>
                  <label className="block text-xs font-medium text-ink">
                    Web address
                    <input
                      className={INPUT}
                      value={editing.slug}
                      onChange={(event) => patchEditing({ slug: event.target.value })}
                    />
                  </label>
                  <label className="block text-xs font-medium text-ink">
                    Under
                    <select
                      className={INPUT}
                      value={editing.parentId}
                      onChange={(event) => patchEditing({ parentId: event.target.value })}
                    >
                      <option value="">Top level (main category)</option>
                      {parentChoices.map((choice) => (
                        <option key={choice.id} value={choice.id}>
                          {choice.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-xs font-medium text-ink">
                    Sort order
                    <input
                      inputMode="numeric"
                      className={INPUT}
                      value={editing.sortOrder}
                      onChange={(event) => patchEditing({ sortOrder: event.target.value })}
                    />
                  </label>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Changing the web address breaks links that already point to this category.
                </p>
                <div className="mt-3 flex gap-2">
                  <button type="button" onClick={saveEdit} disabled={busy} className={BUTTON}>
                    Save changes
                  </button>
                  <button type="button" onClick={() => setEditing(null)} className={GHOST}>
                    Cancel
                  </button>
                </div>
              </li>
            ) : (
              <li key={category.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="font-medium text-ink">{pathOf(category, categories)}</p>
                  <p className="text-xs text-slate-500">
                    /category/{category.slug}/ · sort {category.sort_order}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button type="button" disabled={busy} onClick={() => startEdit(category)} className={GHOST}>
                    Edit
                  </button>
                  <button type="button" disabled={busy} onClick={() => deleteCategory(category)} className={DANGER}>
                    Delete
                  </button>
                </div>
              </li>
            )
          )}
        </ul>
      </section>
    </div>
  );
}

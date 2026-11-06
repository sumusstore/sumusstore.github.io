"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Notice } from "@/components/form-field";
import {
  koboToNairaText,
  nairaToKobo,
  parseSpecs,
  shrinkImage,
  slugify,
  specsToText,
  storagePathFromUrl,
  type Brand,
  type Category,
} from "@/lib/admin-utils";
import { supabase } from "@/lib/supabase";

type Photo = { id: string; image_url: string; position: number };

type Variant = {
  id: string | null;
  storage: string;
  colour: string;
  price: string;
  compare: string;
  stock: string;
  active: boolean;
};

type Moderation = "live" | "hidden";

type FieldType = "text" | "number" | "choice";

type CategoryField = {
  id: string;
  label: string;
  field_type: FieldType;
  unit: string | null;
  options: string[];
  is_required: boolean;
  sort_order: number;
};

type Snapshot = {
  name: string;
  brandId: string;
  categoryOk: boolean;
  description: string;
  warranty: string;
  acceptsOffers: boolean;
  photoCount: number;
  variants: Variant[];
  moderation: Moderation;
  paused: boolean;
  fieldsReady: boolean;
  fieldChecks: { label: string; ok: boolean }[];
};

type Feedback = { tone: "error" | "info"; text: string; details?: string[] } | null;

type LoadedProduct = {
  id: string;
  name: string;
  brand_id: string | null;
  category_id: string | null;
  description: string | null;
  specifications: Record<string, unknown> | null;
  warranty_period: string | null;
  accepts_offers: boolean;
  is_active: boolean;
  seller_paused: boolean;
  moderation: Moderation;
  product_images: Photo[];
  product_variants: {
    id: string;
    storage: string | null;
    colour: string | null;
    price_kobo: number;
    compare_at_kobo: number | null;
    stock_qty: number;
    is_active: boolean;
  }[];
};

const INPUT =
  "mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-700 focus:outline-none";
const BUTTON =
  "rounded-full bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:bg-slate-300";
const GHOST =
  "rounded-full border border-blue-700 px-5 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-50 disabled:border-slate-300 disabled:text-slate-400";

function Mini({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-xs font-medium text-ink">
      {label}
      {children}
    </label>
  );
}

/** Turns a storage or database error into readable text, so the real cause shows on screen. */
function describeError(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null) {
    const e = err as { message?: unknown; statusCode?: unknown; code?: unknown };
    const parts: string[] = [];
    if (typeof e.message === "string") parts.push(e.message);
    if (e.statusCode !== undefined) parts.push(`status ${String(e.statusCode)}`);
    if (typeof e.code === "string") parts.push(`code ${e.code}`);
    if (parts.length > 0) parts.join(" · ");
  }
  return String(err);
}

function checklist(s: Snapshot): { label: string; ok: boolean }[] {
  const priced = s.variants.some((v) => v.active && (nairaToKobo(v.price) ?? 0) > 0);
  return [
    { label: "Product name (at least 3 characters)", ok: s.name.trim().length >= 3 },
    { label: "Brand", ok: s.brandId !== "" },
    { label: "Category (choose a subcategory)", ok: s.categoryOk },
    { label: "Description (at least 20 characters)", ok: s.description.trim().length >= 20 },
    { label: "Warranty period, such as 12 months", ok: s.warranty.trim().length > 0 },
    { label: "At least one photo", ok: s.photoCount > 0 },
    { label: "A shown version with a price", ok: priced },
    ...s.fieldChecks,
  ];
}

/** A paused product stays hidden, and so does one whose category details haven't loaded or are incomplete. */
function isReady(s: Snapshot): boolean {
  return !s.paused && s.fieldsReady && s.moderation === "live" && checklist(s).every((item) => item.ok);
}

function randomCode(length: number): string {
  return Math.random().toString(36).slice(2, 2 + length).toUpperCase();
}

/** Takes the unit off a saved value, so "8 GB" shows as 8 beside the unit. */
function stripUnit(saved: string, field: CategoryField): string {
  const unit = field.unit?.trim();
  if (field.field_type === "number" && unit && saved.toLowerCase().endsWith(unit.toLowerCase())) {
    return saved.slice(0, saved.length - unit.length).trim();
  }
  return saved;
}

/** The product's specifications: the category's fields in the admin's order, then any other details. */
function buildSpecs(
  fields: CategoryField[],
  values: Record<string, string>,
  extra: string
): Record<string, string> {
  const specs: Record<string, string> = {};

  for (const field of fields) {
    const raw = (values[field.label] ?? "").trim();
    if (!raw) continue;
    specs[field.label] = field.field_type === "number" && field.unit ? `${raw} ${field.unit}` : raw;
  }

  const taken = new Set(fields.map((field) => field.label.toLowerCase()));
  for (const [key, value] of Object.entries(parseSpecs(extra))) {
    if (!taken.has(key.toLowerCase())) specs[key] = value;
  }
  return specs;
}

/** Saves a seller's product. It goes live by itself once every item is complete, unless Sumus has hidden it or the seller has paused it. */
export function SellerProductEditor({
  sellerId,
  productId,
  onChanged,
  onClose,
}: {
  sellerId: string;
  productId: string | null;
  onChanged: () => void;
  onClose: () => void;
}) {
  const [id, setId] = useState<string | null>(productId);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(productId !== null);
  const [name, setName] = useState("");
  const [brandId, setBrandId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [rawSpecs, setRawSpecs] = useState<Record<string, string>>({});
  const [fields, setFields] = useState<CategoryField[]>([]);
  const [fieldsFor, setFieldsFor] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [extra, setExtra] = useState("");
  const [warranty, setWarranty] = useState("");
  const [acceptsOffers, setAcceptsOffers] = useState(false);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [moderation, setModeration] = useState<Moderation>("live");
  const [paused, setPaused] = useState(false);
  const [live, setLive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [version, setVersion] = useState(0);

  const [addingBrand, setAddingBrand] = useState(false);
  const [newBrandName, setNewBrandName] = useState("");
  const [brandSaving, setBrandSaving] = useState(false);

  const extraSeeded = useRef(false);

  // Only subcategories can hold products, so main categories that have subcategories aren't offered.
  const leafCategories = useMemo(() => {
    const parents = new Set(categories.map((item) => item.parent_id).filter((value): value is string => value !== null));
    const byId = new Map(categories.map((item) => [item.id, item]));
    return categories
      .filter((item) => !parents.has(item.id))
      .map((item) => {
        const parent = item.parent_id ? byId.get(item.parent_id) : undefined;
        return { id: item.id, label: parent ? `${parent.name} › ${item.name}` : item.name };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [categories]);

  const categoryOk = leafCategories.some((item) => item.id === categoryId);
  const fieldsReady = fieldsFor === categoryId;

  const fieldChecks = fieldsReady
    ? fields
        .filter((field) => field.is_required)
        .map((field) => ({
          label: `${field.label} (required detail)`,
          ok: (values[field.label] ?? "").trim() !== "",
        }))
    : [];

  const snapshot: Snapshot = {
    name,
    brandId,
    categoryOk,
    description,
    warranty,
    acceptsOffers,
    photoCount: photos.length,
    variants,
    moderation,
    paused,
    fieldsReady,
    fieldChecks,
  };
  const checks = checklist(snapshot);

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
  }, []);

  // Loads the detail fields the admin set for the chosen subcategory.
  useEffect(() => {
    if (!categoryId) {
      setFields([]);
      setFieldsFor("");
      return;
    }

    let active = true;
    supabase
      .from("category_fields")
      .select("id, label, field_type, unit, options, is_required, sort_order")
      .eq("category_id", categoryId)
      .order("sort_order", { ascending: true })
      .then(({ data, error }) => {
        if (!active) return;
        setFields(error ? [] : ((data ?? []) as CategoryField[]));
        setFieldsFor(categoryId);
      });

    return () => {
      active = false;
    };
  }, [categoryId]);

  // Fills each field from the product's saved details the first time it is shown.
  useEffect(() => {
    if (loading || fieldsFor !== categoryId) return;

    setValues((current) => {
      const next = { ...current };
      for (const field of fields) {
        if (next[field.label] === undefined) {
          const saved = rawSpecs[field.label];
          next[field.label] = saved === undefined ? "" : stripUnit(saved, field);
        }
      }
      return next;
    });

    // Details that don't belong to a field go in the "Other details" box, once.
    if (!extraSeeded.current) {
      extraSeeded.current = true;
      const labels = new Set(fields.map((field) => field.label));
      const rest: Record<string, string> = {};
      for (const [key, value] of Object.entries(rawSpecs)) {
        if (!labels.has(key)) rest[key] = value;
      }
      setExtra(specsToText(rest));
    }
  }, [loading, fieldsFor, categoryId, fields, rawSpecs]);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    let active = true;
    supabase
      .from("products")
      .select(
        "id, name, brand_id, category_id, description, specifications, warranty_period, accepts_offers, is_active, seller_paused, moderation, product_images(id, image_url, position), product_variants(id, storage, colour, price_kobo, compare_at_kobo, stock_qty, is_active)"
      )
      .eq("id", id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        if (error || !data) {
          setFeedback({ tone: "error", text: "This product couldn't load. Close it and try again." });
          setLoading(false);
          return;
        }
        const row = data as unknown as LoadedProduct;
        setName(row.name);
        setBrandId(row.brand_id ?? "");
        setCategoryId(row.category_id ?? "");
        setDescription(row.description ?? "");
        setRawSpecs(
          Object.fromEntries(Object.entries(row.specifications ?? {}).map(([key, value]) => [key, String(value)]))
        );
        setWarranty(row.warranty_period ?? "");
        setAcceptsOffers(row.accepts_offers ?? false);
        setModeration(row.moderation);
        setPaused(row.seller_paused);
        setLive(row.is_active);
        setPhotos([...row.product_images].sort((a, b) => a.position - b.position));
        setVariants(
          row.product_variants.map((v) => ({
            id: v.id,
            storage: v.storage ?? "",
            colour: v.colour ?? "",
            price: koboToNairaText(v.price_kobo),
            compare: koboToNairaText(v.compare_at_kobo),
            stock: String(v.stock_qty),
            active: v.is_active,
          }))
        );
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [version]);

  function refreshAll() {
    setVersion((current) => current + 1);
    onChanged();
  }

  /** Shows the product if it's complete, not paused and not hidden by Sumus. Otherwise it stays hidden. */
  async function setVisibility(productRef: string, s: Snapshot): Promise<boolean> {
    const next = isReady(s);
    const { error } = await supabase.from("products").update({ is_active: next }).eq("id", productRef);
    if (error) throw new Error(error.message);
    setLive(next);
    return next;
  }

  /** Adds a brand a seller can't find. If the name already exists in any case, that brand is selected instead. */
  async function saveNewBrand() {
    const cleaned = newBrandName.trim().replace(/\s+/g, " ");
    if (cleaned.length < 2) {
      setFeedback({ tone: "error", text: "Enter the brand name, at least 2 letters." });
      return;
    }

    const existing = brands.find((brand) => brand.name.toLowerCase() === cleaned.toLowerCase());
    if (existing) {
      setBrandId(existing.id);
      setAddingBrand(false);
      setNewBrandName("");
      setFeedback({ tone: "info", text: `${existing.name} is already listed, so it's selected for this product.` });
      return;
    }

    setBrandSaving(true);
    setFeedback(null);
    const base = slugify(cleaned) || "brand";

    let result = await supabase
      .from("brands")
      .insert({ name: cleaned, slug: base })
      .select("id, name, slug")
      .single();

    if (result.error?.code === "23505") {
      result = await supabase
        .from("brands")
        .insert({ name: cleaned, slug: `${base}-${randomCode(4).toLowerCase()}` })
        .select("id, name, slug")
        .single();
    }

    setBrandSaving(false);

    if (result.error || !result.data) {
      setFeedback({
        tone: "error",
        text: result.error?.message
          ? `The brand couldn't be added. ${result.error.message}`
          : "The brand couldn't be added. Try a different name.",
      });
      return;
    }

    const created = result.data as Brand;
    setBrands((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name)));
    setBrandId(created.id);
    setAddingBrand(false);
    setNewBrandName("");
    setFeedback({ tone: "info", text: `${created.name} is added as a brand and selected for this product.` });
  }

  function addVariant() {
    setVariants((current) => [
      ...current,
      { id: null, storage: "", colour: "", price: "", compare: "", stock: "0", active: true },
    ]);
  }

  function updateVariant(index: number, patch: Partial<Variant>) {
    setVariants((current) => current.map((v, i) => (i === index ? { ...v, ...patch } : v)));
  }

  async function removeVariant(index: number) {
    const target = variants[index];

    if (!target.id) {
      setVariants((current) => current.filter((_, i) => i !== index));
      return;
    }

    if (!window.confirm("Remove this version? Past orders keep their details.")) return;
    setBusy(true);
    setFeedback(null);
    try {
      const { error } = await supabase.from("product_variants").delete().eq("id", target.id);
      if (error) throw new Error("This version couldn't be removed.");
      const remaining = variants.filter((_, i) => i !== index);
      setVariants(remaining);
      if (id) {
        const nowLive = await setVisibility(id, { ...snapshot, variants: remaining });
        setFeedback({
          tone: "info",
          text: nowLive
            ? "Version removed. This product is still live."
            : "Version removed. This product isn't live until it has a version with a price.",
        });
      }
      onChanged();
    } catch (err) {
      setFeedback({ tone: "error", text: describeError(err) });
    } finally {
      setBusy(false);
    }
  }

  async function saveAll() {
    setFeedback(null);

    if (name.trim().length < 3) {
      setFeedback({ tone: "error", text: "Enter a product name, at least 3 characters." });
      return;
    }

    setBusy(true);
    try {
      for (const field of fields) {
        const raw = (values[field.label] ?? "").trim();
        if (raw && field.field_type === "number" && !/^\d+(\.\d+)?$/.test(raw)) {
          throw new Error(`${field.label} must be a number, such as 8.`);
        }
      }

      const details = {
        name: name.trim(),
        brand_id: brandId || null,
        category_id: categoryId || null,
        description: description.trim() || null,
        specifications: buildSpecs(fieldsReady ? fields : [], values, extra),
        warranty_period: warranty.trim() || null,
        accepts_offers: acceptsOffers,
      };

      let productRef = id;
      if (!productRef) {
        const { data, error } = await supabase
          .from("products")
          .insert({
            ...details,
            slug: `${slugify(name)}-${randomCode(4).toLowerCase()}`,
            seller_id: sellerId,
            is_active: false,
          })
          .select("id")
          .single();
        if (error || !data) {
          throw new Error(
            error?.message ? `This product couldn't be created. ${error.message}` : "This product couldn't be created. Try a different name."
          );
        }
        productRef = data.id as string;
        setId(productRef);
      } else {
        const { error: hideError } = await supabase
          .from("products")
          .update({ is_active: false })
          .eq("id", productRef);
        if (hideError) throw new Error("The product couldn't be updated. Try again.");
        const { error } = await supabase.from("products").update(details).eq("id", productRef);
        if (error) throw new Error(`The details couldn't be saved. ${error.message}`);
      }

      for (const v of variants) {
        const priceKobo = nairaToKobo(v.price);
        const compareKobo = v.compare.trim() === "" ? null : nairaToKobo(v.compare);
        const compareInvalid = v.compare.trim() !== "" && compareKobo === null;
        const stockQty = Number(v.stock);
        if (priceKobo === null || compareInvalid || !Number.isInteger(stockQty) || stockQty < 0) {
          throw new Error(
            "Each version needs a price in naira, a stock figure of 0 or more, and a valid was-price if you add one."
          );
        }

        const row = {
          storage: v.storage.trim() || null,
          colour: v.colour.trim() || null,
          price_kobo: priceKobo,
          compare_at_kobo: compareKobo,
          stock_qty: stockQty,
          is_active: v.active,
        };

        if (v.id) {
          const { error } = await supabase.from("product_variants").update(row).eq("id", v.id);
          if (error) throw new Error("A version couldn't be saved.");
        } else {
          const { error } = await supabase.from("product_variants").insert({
            ...row,
            product_id: productRef,
            sku: `S${productRef.slice(0, 6).toUpperCase()}-${randomCode(5)}`,
          });
          if (error) throw new Error("A new version couldn't be added.");
        }
      }

      const nowLive = await setVisibility(productRef, snapshot);
      setFeedback({
        tone: "info",
        text:
          moderation === "hidden"
            ? "Saved. Sumus has hidden this product, so it can't be shown until Sumus restores it."
            : paused
              ? "Saved. This product stays hidden while it's paused. Resume it on My shop when you're ready."
              : nowLive
                ? "Saved. This product is live on Sumus."
                : "Saved. It goes live once every item in the checklist is complete.",
      });
      refreshAll();
    } catch (err) {
      setFeedback({ tone: "error", text: describeError(err) });
    } finally {
      setBusy(false);
    }
  }

  async function addPhotos(files: File[]) {
    if (!id || files.length === 0) return;
    setBusy(true);
    setFeedback(null);

    let position = photos.length > 0 ? Math.max(...photos.map((p) => p.position)) + 1 : 0;
    const problems: string[] = [];

    for (const file of files) {
      const fileInfo = `"${file.name}" (${file.type || "unknown type"}, ${Math.round(file.size / 1024)} KB)`;
      try {
        const blob = await shrinkImage(file);
        const path = `${id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;

        const { error: uploadError } = await supabase.storage
          .from("product-images")
          .upload(path, blob, { contentType: "image/jpeg" });
        if (uploadError) {
          problems.push(`${fileInfo}: storage refused the upload. ${describeError(uploadError)}`);
          continue;
        }

        const { data } = supabase.storage.from("product-images").getPublicUrl(path);
        const { error: rowError } = await supabase.from("product_images").insert({
          product_id: id,
          variant_id: null,
          image_url: data.publicUrl,
          position,
        });
        if (rowError) {
          problems.push(`${fileInfo}: the photo was uploaded but not saved. ${describeError(rowError)}`);
          await supabase.storage.from("product-images").remove([path]);
          continue;
        }

        position += 1;
      } catch (err) {
        problems.push(`${fileInfo}: ${describeError(err)}`);
      }
    }

    try {
      const { data: fresh } = await supabase
        .from("product_images")
        .select("id, image_url, position")
        .eq("product_id", id)
        .order("position");
      const next = (fresh ?? []) as Photo[];
      setPhotos(next);
      const nowLive = await setVisibility(id, { ...snapshot, photoCount: next.length });

      if (problems.length > 0) {
        setFeedback({
          tone: "error",
          text: `${problems.length} of ${files.length} photos couldn't be uploaded.`,
          details: problems,
        });
      } else {
        setFeedback({
          tone: "info",
          text: nowLive ? "Photos added. This product is live on Sumus." : "Photos added.",
        });
      }
      onChanged();
    } catch (err) {
      setFeedback({
        tone: "error",
        text: "The photos couldn't be checked against the product.",
        details: [describeError(err)],
      });
    } finally {
      setBusy(false);
    }
  }

  async function removePhoto(photo: Photo) {
    if (!id || !window.confirm("Remove this photo?")) return;
    setBusy(true);
    setFeedback(null);
    try {
      const { error } = await supabase.from("product_images").delete().eq("id", photo.id);
      if (error) throw new Error("The photo couldn't be removed.");
      const path = storagePathFromUrl(photo.image_url);
      if (path) await supabase.storage.from("product-images").remove([path]);
      const remaining = photos.filter((p) => p.id !== photo.id);
      setPhotos(remaining);
      const nowLive = await setVisibility(id, { ...snapshot, photoCount: remaining.length });
      setFeedback({
        tone: "info",
        text: nowLive
          ? "Photo removed. This product is still live."
          : "Photo removed. This product isn't live until it has a photo.",
      });
      onChanged();
    } catch (err) {
      setFeedback({ tone: "error", text: describeError(err) });
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-600">Loading product…</p>;
  }

  const statusTone: "error" | "info" = moderation === "hidden" ? "error" : "info";
  const statusText =
    moderation === "hidden"
      ? "Hidden by Sumus. It can't be shown until Sumus restores it."
      : paused
        ? "Paused by you. It stays hidden until you resume it on My shop."
        : live
          ? "Live on Sumus."
          : "Not live yet. It goes live once the checklist is complete.";

  const inMainCategory = categoryId !== "" && categories.length > 0 && !categoryOk;

  return (
    <div className="space-y-6 rounded-xl border border-slate-200 border-t-4 border-t-gold bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-ink">{id ? "Edit product" : "New product"}</h2>
        <button type="button" onClick={onClose} className={GHOST}>
          Close
        </button>
      </div>

      <Notice tone={statusTone}>{statusText}</Notice>

      <section className="rounded-lg bg-paper p-4">
        <p className="text-sm font-bold text-ink">Before it goes live</p>
        <ul className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
          {checks.map((item) => (
            <li key={item.label} className={item.ok ? "text-green-700" : "text-slate-600"}>
              {item.ok ? "✓" : "○"} {item.label}
            </li>
          ))}
        </ul>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <Mini label="Product name">
            <input className={INPUT} value={name} onChange={(event) => setName(event.target.value)} />
          </Mini>
        </div>

        <Mini label="Brand">
          <select className={INPUT} value={brandId} onChange={(event) => setBrandId(event.target.value)}>
            <option value="">Choose a brand</option>
            {brands.map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.name}
              </option>
            ))}
          </select>
        </Mini>

        <Mini label="Category (subcategory)">
          <select
            className={INPUT}
            value={categoryOk ? categoryId : ""}
            onChange={(event) => setCategoryId(event.target.value)}
          >
            <option value="">Choose a subcategory</option>
            {leafCategories.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </Mini>

        {inMainCategory && (
          <div className="md:col-span-2">
            <Notice tone="error">
              This product is in a main category. Choose one of its subcategories, then save.
            </Notice>
          </div>
        )}

        <div className="md:col-span-2">
          {!addingBrand ? (
            <button
              type="button"
              onClick={() => setAddingBrand(true)}
              className="text-xs font-semibold text-blue-700 hover:underline"
            >
              Your brand isn&apos;t in the list? Add a new brand
            </button>
          ) : (
            <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-paper p-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <Mini label="New brand name">
                  <input
                    className={INPUT}
                    placeholder="e.g. Hisense"
                    value={newBrandName}
                    onChange={(event) => setNewBrandName(event.target.value)}
                  />
                </Mini>
              </div>
              <button type="button" onClick={saveNewBrand} disabled={brandSaving} className={BUTTON}>
                {brandSaving ? "Adding…" : "Use this brand"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setAddingBrand(false);
                  setNewBrandName("");
                }}
                className={GHOST}
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        <div className="md:col-span-2">
          <Mini label="Description (at least 20 characters)">
            <textarea
              rows={4}
              className={INPUT}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </Mini>
        </div>

        <div className="space-y-4 md:col-span-2">
          <p className="text-sm font-bold text-ink">Product details</p>

          {!categoryOk && (
            <p className="text-sm text-slate-600">
              Choose a subcategory to see the details buyers expect for it.
            </p>
          )}

          {categoryOk && fieldsReady && fields.length === 0 && (
            <p className="text-sm text-slate-600">
              This subcategory has no required details. Use the box below for anything else buyers should know.
            </p>
          )}

          {categoryOk && !fieldsReady && <p className="text-sm text-slate-600">Loading the details for this subcategory…</p>}

          {categoryOk && fieldsReady && fields.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2">
              {fields.map((field) => {
                const value = values[field.label] ?? "";
                const label = `${field.label}${field.is_required ? " *" : ""}`;

                if (field.field_type === "choice") {
                  const choices = value && !field.options.includes(value) ? [value, ...field.options] : field.options;
                  return (
                    <Mini key={field.id} label={label}>
                      <select
                        className={INPUT}
                        value={value}
                        onChange={(event) => setValues((current) => ({ ...current, [field.label]: event.target.value }))}
                      >
                        <option value="">Choose</option>
                        {choices.map((choice) => (
                          <option key={choice} value={choice}>
                            {choice}
                          </option>
                        ))}
                      </select>
                    </Mini>
                  );
                }

                return (
                  <Mini key={field.id} label={label}>
                    <div className="flex items-center gap-2">
                      <input
                        className={INPUT}
                        inputMode={field.field_type === "number" ? "decimal" : undefined}
                        value={value}
                        onChange={(event) => setValues((current) => ({ ...current, [field.label]: event.target.value }))}
                      />
                      {field.field_type === "number" && field.unit && (
                        <span className="mt-1 shrink-0 text-sm text-slate-600">{field.unit}</span>
                      )}
                    </div>
                  </Mini>
                );
              })}
            </div>
          )}

          <Mini label="Other details, one per line as Name: Value (optional)">
            <textarea
              rows={3}
              className={INPUT}
              placeholder={"Water resistance: IP68"}
              value={extra}
              onChange={(event) => setExtra(event.target.value)}
            />
          </Mini>
        </div>

        <div className="md:col-span-2">
          <Mini label="Warranty period">
            <input
              className={INPUT}
              placeholder="e.g. 12 months manufacturer warranty"
              value={warranty}
              onChange={(event) => setWarranty(event.target.value)}
            />
          </Mini>
        </div>

        <div className="md:col-span-2 flex items-center gap-2 pt-2">
          <input
            type="checkbox"
            id="accepts-offers-seller"
            checked={acceptsOffers}
            onChange={(e) => setAcceptsOffers(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-700"
          />
          <label htmlFor="accepts-offers-seller" className="text-sm font-medium text-ink">
            Accept offers on this product (buyers can negotiate lower prices)
          </label>
        </div>
      </section>

      <section className="space-y-3">
        <p className="text-sm font-bold text-ink">Versions you sell</p>
        <p className="text-xs text-slate-500">
          A version is one choice buyers can pick, such as 128GB Black. A shown version needs a price.
        </p>
        {variants.map((v, index) => (
          <div
            key={v.id ?? `new-${index}`}
            className="grid grid-cols-2 gap-3 rounded-lg border border-slate-200 p-3 md:grid-cols-6"
          >
            <Mini label="Storage">
              <input
                className={INPUT}
                placeholder="128GB"
                value={v.storage}
                onChange={(event) => updateVariant(index, { storage: event.target.value })}
              />
            </Mini>
            <Mini label="Colour">
              <input
                className={INPUT}
                placeholder="Black"
                value={v.colour}
                onChange={(event) => updateVariant(index, { colour: event.target.value })}
              />
            </Mini>
            <Mini label="Price (₦)">
              <input
                className={INPUT}
                inputMode="decimal"
                placeholder="125000"
                value={v.price}
                onChange={(event) => updateVariant(index, { price: event.target.value })}
              />
            </Mini>
            <Mini label="Was (₦, optional)">
              <input
                className={INPUT}
                inputMode="decimal"
                value={v.compare}
                onChange={(event) => updateVariant(index, { compare: event.target.value })}
              />
            </Mini>
            <Mini label="Stock">
              <input
                className={INPUT}
                inputMode="numeric"
                value={v.stock}
                onChange={(event) => updateVariant(index, { stock: event.target.value })}
              />
            </Mini>
            <div className="flex flex-col justify-end gap-2">
              <label className="flex items-center gap-2 text-xs text-ink">
                <input
                  type="checkbox"
                  checked={v.active}
                  onChange={(event) => updateVariant(index, { active: event.target.checked })}
                  className="accent-blue-700"
                />
                Shown
              </label>
              <button
                type="button"
                disabled={busy}
                onClick={() => removeVariant(index)}
                className="text-left text-xs font-semibold text-red-600 hover:underline disabled:text-slate-400"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
        <button type="button" onClick={addVariant} disabled={busy} className={GHOST}>
          Add a version
        </button>
      </section>

      <section className="space-y-3">
        <p className="text-sm font-bold text-ink">Photos</p>
        <p className="text-xs text-slate-500">The first photo is the main one. Photos are resized before upload.</p>
        {!id ? (
          <p className="text-sm text-slate-600">Save the details first, then you can add photos.</p>
        ) : (
          <>
            <ul className="grid grid-cols-3 gap-3 md:grid-cols-5">
              {photos.map((photo, index) => (
                <li key={photo.id}>
                  <div className="relative aspect-square overflow-hidden rounded-lg border border-slate-200 bg-white">
                    <img
                      src={photo.image_url}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-contain p-1"
                    />
                    {index === 0 && (
                      <span className="absolute left-1 top-1 rounded bg-gold px-1.5 py-0.5 text-[10px] font-bold text-ink">
                        Main
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => removePhoto(photo)}
                    className="mt-1 text-xs font-semibold text-red-600 hover:underline disabled:text-slate-400"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
            <label className="block text-sm font-semibold text-ink">
              Add photos
              <input
                type="file"
                accept="image/*"
                multiple
                disabled={busy}
                onChange={(event) => {
                  const files = Array.from(event.target.files ?? []);
                  event.target.value = "";
                  void addPhotos(files);
                }}
                className="mt-2 block w-full text-sm"
              />
            </label>
          </>
        )}
      </section>

      {feedback && <Notice tone={feedback.tone}>{feedback.text}</Notice>}
      {feedback?.details && feedback.details.length > 0 && (
        <ul className="space-y-2 rounded-lg border border-red-200 bg-white p-3 text-xs text-red-700">
          {feedback.details.map((detail) => (
            <li key={detail}>{detail}</li>
          ))}
        </ul>
      )}

      <div>
        <button type="button" onClick={saveAll} disabled={busy} className={BUTTON}>
          {busy ? "Saving…" : "Save product"}
        </button>
      </div>
    </div>
  );
}

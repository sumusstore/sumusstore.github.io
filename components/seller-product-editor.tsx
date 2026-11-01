"use client";

import { useEffect, useState, type ReactNode } from "react";
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

type Snapshot = {
  name: string;
  brandId: string;
  categoryId: string;
  description: string;
  warranty: string;
  photoCount: number;
  variants: Variant[];
  moderation: Moderation;
};

type Feedback = { tone: "error" | "info"; text: string } | null;

type LoadedProduct = {
  id: string;
  name: string;
  brand_id: string | null;
  category_id: string | null;
  description: string | null;
  specifications: Record<string, unknown> | null;
  warranty_period: string | null;
  is_active: boolean;
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

function checklist(s: Snapshot): { label: string; ok: boolean }[] {
  const priced = s.variants.some((v) => v.active && (nairaToKobo(v.price) ?? 0) > 0);
  return [
    { label: "Product name (at least 3 characters)", ok: s.name.trim().length >= 3 },
    { label: "Brand", ok: s.brandId !== "" },
    { label: "Category", ok: s.categoryId !== "" },
    { label: "Description (at least 20 characters)", ok: s.description.trim().length >= 20 },
    { label: "Warranty period, such as 12 months", ok: s.warranty.trim().length > 0 },
    { label: "At least one photo", ok: s.photoCount > 0 },
    { label: "A shown version with a price", ok: priced },
  ];
}

function isReady(s: Snapshot): boolean {
  return s.moderation === "live" && checklist(s).every((item) => item.ok);
}

function randomCode(length: number): string {
  return Math.random().toString(36).slice(2, 2 + length).toUpperCase();
}

/** Saves a seller's product. It goes live by itself once every item is complete, unless Sumus has hidden it. */
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
  const [specs, setSpecs] = useState("");
  const [warranty, setWarranty] = useState("");
  const [variants, setVariants] = useState<Variant[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [moderation, setModeration] = useState<Moderation>("live");
  const [live, setLive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [version, setVersion] = useState(0);

  const snapshot: Snapshot = {
    name,
    brandId,
    categoryId,
    description,
    warranty,
    photoCount: photos.length,
    variants,
    moderation,
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

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    let active = true;
    supabase
      .from("products")
      .select(
        "id, name, brand_id, category_id, description, specifications, warranty_period, is_active, moderation, product_images(id, image_url, position), product_variants(id, storage, colour, price_kobo, compare_at_kobo, stock_qty, is_active)"
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
        setSpecs(specsToText(row.specifications ?? {}));
        setWarranty(row.warranty_period ?? "");
        setModeration(row.moderation);
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

  /** Shows the product if it's complete and Sumus hasn't hidden it, and hides it otherwise. */
  async function setVisibility(productRef: string, s: Snapshot): Promise<boolean> {
    const next = isReady(s);
    const { error } = await supabase.from("products").update({ is_active: next }).eq("id", productRef);
    if (error) throw new Error(error.message);
    setLive(next);
    return next;
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
          text: nowLive ? "Version removed. This product is still live." : "Version removed. This product isn't live until it has a version with a price.",
        });
      }
      onChanged();
    } catch (err) {
      setFeedback({ tone: "error", text: err instanceof Error ? err.message : "Something went wrong. Try again." });
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
      const details = {
        name: name.trim(),
        brand_id: brandId || null,
        category_id: categoryId || null,
        description: description.trim() || null,
        specifications: parseSpecs(specs),
        warranty_period: warranty.trim() || null,
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
        if (error || !data) throw new Error("This product couldn't be created. Try a different name.");
        productRef = data.id as string;
        setId(productRef);
      } else {
        // Hide while editing, then decide again at the end, so an unfinished edit never stays live.
        const { error: hideError } = await supabase
          .from("products")
          .update({ is_active: false })
          .eq("id", productRef);
        if (hideError) throw new Error("The product couldn't be updated. Try again.");
        const { error } = await supabase.from("products").update(details).eq("id", productRef);
        if (error) throw new Error("The details couldn't be saved. Check the name and try again.");
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
            : nowLive
              ? "Saved. This product is live on Sumus."
              : "Saved. It goes live once every item in the checklist is complete.",
      });
      refreshAll();
    } catch (err) {
      setFeedback({ tone: "error", text: err instanceof Error ? err.message : "Something went wrong. Try again." });
    } finally {
      setBusy(false);
    }
  }

  async function addPhotos(files: File[]) {
    if (!id || files.length === 0) return;
    setBusy(true);
    setFeedback(null);

    let position = photos.length > 0 ? Math.max(...photos.map((p) => p.position)) + 1 : 0;
    let failed = 0;

    for (const file of files) {
      try {
        const blob = await shrinkImage(file);
        const path = `${id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from("product-images")
          .upload(path, blob, { contentType: "image/jpeg" });
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from("product-images").getPublicUrl(path);
        const { error: rowError } = await supabase
          .from("product_images")
          .insert({ product_id: id, variant_id: null, image_url: data.publicUrl, position });
        if (rowError) throw rowError;
        position += 1;
      } catch {
        failed += 1;
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
      setFeedback({
        tone: failed > 0 ? "error" : "info",
        text:
          failed > 0
            ? `${failed} of ${files.length} photos couldn't be uploaded. Try again with fewer at a time.`
            : nowLive
              ? "Photos added. This product is live on Sumus."
              : "Photos added.",
      });
      onChanged();
    } catch (err) {
      setFeedback({ tone: "error", text: err instanceof Error ? err.message : "Photos couldn't be updated." });
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
      setFeedback({ tone: "error", text: err instanceof Error ? err.message : "The photo couldn't be removed." });
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
      : live
        ? "Live on Sumus."
        : "Not live yet. It goes live once the checklist is complete.";

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
        <Mini label="Category">
          <select className={INPUT} value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
            <option value="">Choose a category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </Mini>
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
        <div className="md:col-span-2">
          <Mini label="Specifications, one per line as Name: Value">
            <textarea
              rows={4}
              className={INPUT}
              placeholder={"Battery: 5000mAh\nDisplay: 6.6 inch"}
              value={specs}
              onChange={(event) => setSpecs(event.target.value)}
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

      <div>
        <button type="button" onClick={saveAll} disabled={busy} className={BUTTON}>
          {busy ? "Saving…" : "Save product"}
        </button>
      </div>
    </div>
  );
}

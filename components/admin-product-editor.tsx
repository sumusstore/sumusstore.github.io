"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Notice } from "@/components/form-field";
import {
  isoToLocalInput,
  koboToNairaText,
  localInputToIso,
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

type Message = { tone: "error" | "info"; text: string } | null;

type ImageRow = { id: string; image_url: string; variant_id: string | null; position: number };

type VariantRow = {
  id: string;
  storage: string | null;
  colour: string | null;
  sku: string;
  price_kobo: number;
  compare_at_kobo: number | null;
  stock_qty: number;
  sale_ends_at: string | null;
  is_active: boolean;
};

type ProductRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  specifications: Record<string, unknown> | null;
  is_active: boolean;
  brand_id: string | null;
  category_id: string | null;
  product_images: ImageRow[];
  product_variants: VariantRow[];
};

type SectionProps = {
  product: ProductRow;
  onChanged: () => void;
  onNotice: (message: Message) => void;
};

const DETAIL_SELECT =
  "id, name, slug, description, specifications, is_active, brand_id, category_id, product_images(id, image_url, variant_id, position), product_variants(id, storage, colour, sku, price_kobo, compare_at_kobo, stock_qty, sale_ends_at, is_active)";

const INPUT =
  "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-600 focus:outline-none";
const BUTTON =
  "rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:bg-slate-300";
const GHOST =
  "rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 hover:border-slate-500 disabled:text-slate-400";

/** A small labelled input. The label wraps the field, so no ids are needed. */
function Mini({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-xs font-medium text-slate-700">
      {label}
      {children}
    </label>
  );
}

export function AdminProductEditor({
  productId,
  brands,
  categories,
  onChanged,
}: {
  productId: string;
  brands: Brand[];
  categories: Category[];
  onChanged: () => void;
}) {
  const [product, setProduct] = useState<ProductRow | null>(null);
  const [version, setVersion] = useState(0);
  const [message, setMessage] = useState<Message>(null);

  useEffect(() => {
    let active = true;

    supabase
      .from("products")
      .select(DETAIL_SELECT)
      .eq("id", productId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        if (error || !data) {
          setMessage({ tone: "error", text: "This product couldn't load. Close it and try again." });
          return;
        }
        setProduct(data as unknown as ProductRow);
      });

    return () => {
      active = false;
    };
  }, [productId, version]);

  function refresh() {
    setVersion((current) => current + 1);
    onChanged();
  }

  if (!product) {
    return message ? (
      <Notice tone={message.tone}>{message.text}</Notice>
    ) : (
      <p className="text-sm text-slate-600">Loading product…</p>
    );
  }

  return (
    <div className="space-y-10">
      {message && <Notice tone={message.tone}>{message.text}</Notice>}
      <DetailsForm
        product={product}
        brands={brands}
        categories={categories}
        onChanged={refresh}
        onNotice={setMessage}
      />
      <VariantsSection product={product} onChanged={refresh} onNotice={setMessage} />
      <PhotosSection product={product} onChanged={refresh} onNotice={setMessage} />
    </div>
  );
}

function DetailsForm({
  product,
  brands,
  categories,
  onChanged,
  onNotice,
}: SectionProps & { brands: Brand[]; categories: Category[] }) {
  const [name, setName] = useState(product.name);
  const [slug, setSlug] = useState(product.slug);
  const [brandId, setBrandId] = useState(product.brand_id ?? "");
  const [categoryId, setCategoryId] = useState(product.category_id ?? "");
  const [description, setDescription] = useState(product.description ?? "");
  const [specs, setSpecs] = useState(specsToText(product.specifications ?? {}));
  const [busy, setBusy] = useState(false);

  function categoryLabel(category: Category): string {
    const parent = categories.find((item) => item.id === category.parent_id);
    return parent ? `${parent.name} › ${category.name}` : category.name;
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanName = name.trim();
    const cleanSlug = slugify(slug.trim() || cleanName);
    if (!cleanName || !cleanSlug) {
      onNotice({ tone: "error", text: "Enter a name and a web address." });
      return;
    }

    setBusy(true);
    const { error } = await supabase
      .from("products")
      .update({
        name: cleanName,
        slug: cleanSlug,
        brand_id: brandId || null,
        category_id: categoryId || null,
        description: description.trim() || null,
        specifications: parseSpecs(specs),
      })
      .eq("id", product.id);
    setBusy(false);

    if (error) {
      onNotice({
        tone: "error",
        text:
          error.code === "23505"
            ? "Another product already uses that web address. Change it and try again."
            : "The details couldn't be saved.",
      });
      return;
    }
    onNotice({ tone: "info", text: "Product details saved." });
    onChanged();
  }

  return (
    <form onSubmit={save} className="grid gap-4 md:grid-cols-2">
      <h2 className="text-lg font-semibold text-slate-900 md:col-span-2">Details</h2>

      <Mini label="Name">
        <input required value={name} onChange={(e) => setName(e.target.value)} className={INPUT} />
      </Mini>

      <div>
        <Mini label="Web address">
          <input value={slug} onChange={(e) => setSlug(e.target.value)} className={INPUT} />
        </Mini>
        <p className="mt-1 text-xs text-slate-500">
          Changing this breaks links that already point to the product.
        </p>
      </div>

      <Mini label="Brand">
        <select value={brandId} onChange={(e) => setBrandId(e.target.value)} className={INPUT}>
          <option value="">No brand</option>
          {brands.map((brand) => (
            <option key={brand.id} value={brand.id}>
              {brand.name}
            </option>
          ))}
        </select>
      </Mini>

      <Mini label="Category">
        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={INPUT}>
          <option value="">No category</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {categoryLabel(category)}
            </option>
          ))}
        </select>
      </Mini>

      <div className="md:col-span-2">
        <Mini label="Description">
          <textarea
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={INPUT}
          />
        </Mini>
      </div>

      <div className="md:col-span-2">
        <Mini label="Specifications">
          <textarea
            rows={5}
            value={specs}
            onChange={(e) => setSpecs(e.target.value)}
            placeholder={"Battery: 5000mAh\nDisplay: 6.6 inch"}
            className={INPUT}
          />
        </Mini>
        <p className="mt-1 text-xs text-slate-500">One per line, written as Name: Value.</p>
      </div>

      <div className="md:col-span-2">
        <button type="submit" disabled={busy} className={BUTTON}>
          {busy ? "Saving…" : "Save details"}
        </button>
      </div>
    </form>
  );
}

function VariantsSection({ product, onChanged, onNotice }: SectionProps) {
  const [adding, setAdding] = useState(false);

  async function addVariant() {
    setAdding(true);
    const sku = `${product.slug.toUpperCase().slice(0, 14)}-${Date.now().toString(36).toUpperCase()}`;
    // New variants start hidden with no price, so nothing goes on sale by accident.
    const { error } = await supabase.from("product_variants").insert({
      product_id: product.id,
      sku,
      price_kobo: 0,
      stock_qty: 0,
      is_active: false,
    });
    setAdding(false);

    if (error) {
      onNotice({ tone: "error", text: "A new variant couldn't be added. Try again." });
      return;
    }
    onChanged();
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Variants</h2>
        <p className="mt-1 text-sm text-slate-600">
          Each variant is one version customers can buy, such as 128GB Black. Set its price and stock,
          then switch it on.
        </p>
      </div>

      {product.product_variants.length === 0 && (
        <p className="text-sm text-slate-600">No variants yet.</p>
      )}

      {product.product_variants.map((variant) => (
        <VariantCard key={variant.id} variant={variant} onChanged={onChanged} onNotice={onNotice} />
      ))}

      <button type="button" onClick={addVariant} disabled={adding} className={GHOST}>
        {adding ? "Adding…" : "Add a variant"}
      </button>
    </section>
  );
}

function VariantCard({
  variant,
  onChanged,
  onNotice,
}: {
  variant: VariantRow;
  onChanged: () => void;
  onNotice: (message: Message) => void;
}) {
  const [storage, setStorage] = useState(variant.storage ?? "");
  const [colour, setColour] = useState(variant.colour ?? "");
  const [price, setPrice] = useState(koboToNairaText(variant.price_kobo));
  const [compare, setCompare] = useState(koboToNairaText(variant.compare_at_kobo));
  const [stock, setStock] = useState(String(variant.stock_qty));
  const [saleEnds, setSaleEnds] = useState(isoToLocalInput(variant.sale_ends_at));
  const [active, setActive] = useState(variant.is_active);
  const [busy, setBusy] = useState(false);

  async function save() {
    const priceKobo = nairaToKobo(price);
    const compareKobo = compare.trim() === "" ? null : nairaToKobo(compare);
    const stockQty = Number(stock);

    if (priceKobo === null) {
      onNotice({ tone: "error", text: "Enter a price in naira." });
      return;
    }
    if (compare.trim() !== "" && compareKobo === null) {
      onNotice({ tone: "error", text: "The crossed-out price isn't a valid amount." });
      return;
    }
    if (!Number.isInteger(stockQty) || stockQty < 0) {
      onNotice({ tone: "error", text: "Stock must be a whole number, 0 or more." });
      return;
    }
    if (active && priceKobo <= 0) {
      onNotice({ tone: "error", text: "Set a price above zero before switching this variant on." });
      return;
    }

    setBusy(true);
    const { error } = await supabase
      .from("product_variants")
      .update({
        storage: storage.trim() || null,
        colour: colour.trim() || null,
        price_kobo: priceKobo,
        compare_at_kobo: compareKobo,
        stock_qty: stockQty,
        sale_ends_at: localInputToIso(saleEnds),
        is_active: active,
      })
      .eq("id", variant.id);
    setBusy(false);

    if (error) {
      onNotice({ tone: "error", text: "This variant couldn't be saved." });
      return;
    }
    onNotice({ tone: "info", text: "Variant saved." });
    onChanged();
  }

  return (
    <div
      className={`rounded-xl border p-4 ${
        active ? "border-slate-200" : "border-dashed border-slate-300 bg-slate-50"
      }`}
    >
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Mini label="Storage">
          <input value={storage} onChange={(e) => setStorage(e.target.value)} placeholder="128GB" className={INPUT} />
        </Mini>
        <Mini label="Colour">
          <input value={colour} onChange={(e) => setColour(e.target.value)} placeholder="Black" className={INPUT} />
        </Mini>
        <Mini label="Price (₦)">
          <input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="125000" className={INPUT} />
        </Mini>
        <Mini label="Was (₦, optional)">
          <input inputMode="decimal" value={compare} onChange={(e) => setCompare(e.target.value)} placeholder="135000" className={INPUT} />
        </Mini>
        <Mini label="Stock">
          <input inputMode="numeric" value={stock} onChange={(e) => setStock(e.target.value)} className={INPUT} />
        </Mini>
        <div className="col-span-2">
          <Mini label="Sale ends (optional)">
            <input type="datetime-local" value={saleEnds} onChange={(e) => setSaleEnds(e.target.value)} className={INPUT} />
          </Mini>
        </div>
        <label className="col-span-2 flex items-center gap-2 self-end text-sm font-medium text-slate-800 md:col-span-2">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="h-4 w-4 accent-blue-700"
          />
          Show this version in the shop
        </label>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-500">SKU {variant.sku}</p>
        <button type="button" onClick={save} disabled={busy} className={BUTTON}>
          {busy ? "Saving…" : "Save variant"}
        </button>
      </div>
    </div>
  );
}

function PhotosSection({ product, onChanged, onNotice }: SectionProps) {
  const [uploading, setUploading] = useState(false);
  const images = [...product.product_images].sort((a, b) => a.position - b.position);

  async function upload(files: File[]) {
    if (files.length === 0) return;

    setUploading(true);
    let position = images.length > 0 ? Math.max(...images.map((image) => image.position)) + 1 : 0;
    let failed = 0;

    for (const file of files) {
      try {
        const blob = await shrinkImage(file);
        const path = `${product.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;

        const { error: uploadError } = await supabase.storage
          .from("product-images")
          .upload(path, blob, { contentType: "image/jpeg" });
        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from("product-images").getPublicUrl(path);
        const { error: rowError } = await supabase.from("product_images").insert({
          product_id: product.id,
          variant_id: null,
          image_url: data.publicUrl,
          position,
        });
        if (rowError) throw rowError;

        position += 1;
      } catch {
        failed += 1;
      }
    }

    setUploading(false);
    onNotice(
      failed === 0
        ? { tone: "info", text: files.length === 1 ? "Photo uploaded." : "Photos uploaded." }
        : {
            tone: "error",
            text: `${failed} of ${files.length} photos couldn't be uploaded. Try again with fewer photos at a time.`,
          }
    );
    onChanged();
  }

  async function removeImage(image: ImageRow) {
    if (!window.confirm("Remove this photo?")) return;

    const { error } = await supabase.from("product_images").delete().eq("id", image.id);
    if (error) {
      onNotice({ tone: "error", text: "The photo couldn't be removed." });
      return;
    }

    const path = storagePathFromUrl(image.image_url);
    if (path) await supabase.storage.from("product-images").remove([path]);
    onChanged();
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Photos</h2>
        <p className="mt-1 text-sm text-slate-600">
          The first photo is the main one on shop pages. Photos are resized automatically before upload.
        </p>
      </div>

      {images.length === 0 && <p className="text-sm text-slate-600">No photos yet.</p>}

      <ul className="grid grid-cols-3 gap-3 md:grid-cols-5">
        {images.map((image, index) => (
          <li key={image.id}>
            <div className="relative aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
              <img src={image.image_url} alt="" loading="lazy" className="h-full w-full object-contain p-1" />
              {index === 0 && (
                <span className="absolute left-1 top-1 rounded bg-blue-700 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  Main
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => removeImage(image)}
              className="mt-1 text-xs font-medium text-red-600 hover:underline"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>

      <label className="block text-sm font-medium text-slate-800">
        Add photos
        <input
          type="file"
          accept="image/*"
          multiple
          disabled={uploading}
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            event.target.value = "";
            void upload(files);
          }}
          className="mt-2 block w-full text-sm"
        />
      </label>
      {uploading && <p className="text-sm text-slate-600">Uploading photos…</p>}
    </section>
  );
}

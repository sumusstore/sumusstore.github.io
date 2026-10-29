"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { LoadStatus } from "@/hooks/use-home-products";
import { useHydrated } from "@/hooks/use-hydrated";
import { formatNaira } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import { MAX_COMPARE, useCompareStore } from "@/stores/compare-store";

type CompareRow = {
  id: string;
  name: string;
  slug: string;
  specifications: Record<string, unknown> | null;
  brands: { name: string } | null;
  product_images: { image_url: string; position: number }[];
  product_variants: {
    storage: string | null;
    colour: string | null;
    price_kobo: number;
    stock_qty: number;
    is_active: boolean;
  }[];
};

type Compared = {
  id: string;
  name: string;
  slug: string;
  brand: string | null;
  imageUrl: string | null;
  fromKobo: number | null;
  inStock: boolean;
  storages: string[];
  colours: string[];
  specs: Record<string, string>;
};

function unique(values: (string | null)[]): string[] {
  return [...new Set(values.filter((value): value is string => value !== null))];
}

function toCompared(row: CompareRow): Compared {
  const active = row.product_variants.filter((variant) => variant.is_active);
  const firstImage = [...row.product_images].sort((a, b) => a.position - b.position)[0];
  const prices = active.map((variant) => variant.price_kobo);

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    brand: row.brands?.name ?? null,
    imageUrl: firstImage?.image_url ?? null,
    fromKobo: prices.length > 0 ? Math.min(...prices) : null,
    inStock: active.some((variant) => variant.stock_qty > 0),
    storages: unique(active.map((variant) => variant.storage)).sort(
      (a, b) => (parseInt(a, 10) || 0) - (parseInt(b, 10) || 0)
    ),
    colours: unique(active.map((variant) => variant.colour)),
    specs: Object.fromEntries(
      Object.entries(row.specifications ?? {}).map(([key, value]) => [key, String(value)])
    ),
  };
}

function Row({ label, cells }: { label: string; cells: string[] }) {
  return (
    <tr className="border-t border-slate-200">
      <th scope="row" className="sticky left-0 bg-white p-3 text-left font-medium text-slate-700">
        {label}
      </th>
      {cells.map((cell, index) => (
        <td key={index} className="p-3 align-top text-slate-800">
          {cell}
        </td>
      ))}
    </tr>
  );
}

export function CompareView() {
  const hydrated = useHydrated();
  const ids = useCompareStore((state) => state.productIds);
  const remove = useCompareStore((state) => state.remove);
  const clear = useCompareStore((state) => state.clear);
  const idKey = ids.join(",");

  const [items, setItems] = useState<Compared[]>([]);
  const [status, setStatus] = useState<LoadStatus>("loading");

  useEffect(() => {
    if (!hydrated) return;
    if (!idKey) {
      setItems([]);
      setStatus("ready");
      return;
    }

    let active = true;
    setStatus("loading");

    supabase
      .from("products")
      .select(
        "id, name, slug, specifications, brands(name), product_images(image_url, position), product_variants(storage, colour, price_kobo, stock_qty, is_active)"
      )
      .in("id", idKey.split(","))
      .eq("is_active", true)
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          setStatus("error");
          return;
        }

        const byId = new Map(
          ((data ?? []) as unknown as CompareRow[]).map((row) => [row.id, toCompared(row)])
        );
        // Keep products in the order the shopper added them.
        const ordered = idKey
          .split(",")
          .map((id) => byId.get(id))
          .filter((item): item is Compared => Boolean(item));

        setItems(ordered);
        setStatus("ready");
      });

    return () => {
      active = false;
    };
  }, [hydrated, idKey]);

  if (!hydrated || status === "loading") {
    return <p className="text-sm text-slate-600">Loading comparison…</p>;
  }

  if (status === "error") {
    return (
      <p className="text-sm text-slate-600">
        Products couldn&apos;t load. Please refresh the page shortly.
      </p>
    );
  }

  if (ids.length === 0 || items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center">
        <p className="font-semibold text-slate-900">Nothing to compare yet</p>
        <p className="mt-1 text-sm text-slate-600">
          Tap Compare on up to {MAX_COMPARE} products in the shop.
        </p>
        <Link href="/shop/" className="mt-4 inline-block font-semibold text-blue-700 hover:underline">
          Browse products
        </Link>
      </div>
    );
  }

  const specKeys = Array.from(new Set(items.flatMap((item) => Object.keys(item.specs))));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600">
          Comparing {items.length} of up to {MAX_COMPARE} products.
        </p>
        <button
          type="button"
          onClick={clear}
          className="text-sm font-semibold text-blue-700 hover:underline"
        >
          Clear all
        </button>
      </div>

      {items.length < 2 && (
        <p className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
          Add at least one more product to see a comparison. Use Compare on any product card.
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50">
              <th scope="col" className="sticky left-0 w-40 bg-slate-50 p-3 text-left font-semibold text-slate-700">
                Feature
              </th>
              {items.map((item) => (
                <th key={item.id} scope="col" className="min-w-52 p-3 text-left align-top">
                  <div className="relative h-28 w-28 overflow-hidden rounded-lg bg-slate-100">
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt=""
                        fill
                        sizes="112px"
                        className="object-contain p-2"
                      />
                    ) : (
                      <span className="flex h-full items-center justify-center text-xs text-slate-400">
                        No photo
                      </span>
                    )}
                  </div>
                  <Link
                    href={`/product/${item.slug}/`}
                    className="mt-2 block font-semibold text-slate-900 hover:text-blue-700"
                  >
                    {item.name}
                  </Link>
                  <button
                    type="button"
                    onClick={() => remove(item.id)}
                    className="mt-1 text-xs font-medium text-red-600 hover:underline"
                  >
                    Remove
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <Row label="Brand" cells={items.map((item) => item.brand ?? "—")} />
            <Row
              label="From"
              cells={items.map((item) => (item.fromKobo === null ? "—" : formatNaira(item.fromKobo)))}
            />
            <Row label="Availability" cells={items.map((item) => (item.inStock ? "In stock" : "Sold out"))} />
            <Row label="Storage" cells={items.map((item) => item.storages.join(", ") || "—")} />
            <Row label="Colours" cells={items.map((item) => item.colours.join(", ") || "—")} />
            {specKeys.map((key) => (
              <Row key={key} label={key} cells={items.map((item) => item.specs[key] ?? "—")} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

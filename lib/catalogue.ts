import type { ProductCardData } from "@/hooks/use-home-products";

/** One purchasable version of a product, such as "256GB · Blue". */
export type VariantOption = {
  variantId: string;
  storage: string | null;
  colour: string | null;
  label: string;
  priceKobo: number;
  compareAtKobo: number | null;
  stock: number;
  saleEndsAt: string | null;
};

/** A product with all of its variants. Filters work on these, and cards are built from them. */
export type CatalogueProduct = {
  productId: string;
  slug: string;
  name: string;
  brand: string | null;
  categoryId: string | null;
  imageUrl: string | null;
  createdAt: string;
  /** Null for products Sumus sells itself. */
  sellerSlug: string | null;
  sellerName: string | null;
  /** Category names and the values filled in for the product, so shoppers can search by them. */
  searchText?: string;
  /** The detail values filled in for the product, by field name, such as RAM: "8 GB". */
  specs?: Record<string, string>;
  variants: VariantOption[];
};

/** A detail field the admin switched on as a filter for a subcategory. */
export type FilterField = {
  label: string;
  fieldType: "text" | "number" | "choice";
  unit: string | null;
  options: string[];
};

/** A detail filter ready to show: the field and the values that products in view actually have. */
export type SpecFacet = {
  field: FilterField;
  options: string[];
};

export type PriceBand = "any" | "under-50k" | "50k-150k" | "150k-500k" | "over-500k";

export const PRICE_BANDS: { value: PriceBand; label: string }[] = [
  { value: "any", label: "Any price" },
  { value: "under-50k", label: "Under ₦50,000" },
  { value: "50k-150k", label: "₦50,000 to ₦150,000" },
  { value: "150k-500k", label: "₦150,000 to ₦500,000" },
  { value: "over-500k", label: "Over ₦500,000" },
];

// Prices are stored in kobo, so ₦50,000 is 5,000,000. Each band includes its lower limit only.
const BAND_RANGES: Record<Exclude<PriceBand, "any">, { min: number; max: number }> = {
  "under-50k": { min: 0, max: 5_000_000 },
  "50k-150k": { min: 5_000_000, max: 15_000_000 },
  "150k-500k": { min: 15_000_000, max: 50_000_000 },
  "over-500k": { min: 50_000_000, max: Infinity },
};

export type CatalogueFilters = {
  brands: string[];
  storages: string[];
  colours: string[];
  /** Chosen values for each detail filter, by field name. */
  specs: Record<string, string[]>;
  priceBand: PriceBand;
  inStockOnly: boolean;
};

export const EMPTY_FILTERS: CatalogueFilters = {
  brands: [],
  storages: [],
  colours: [],
  specs: {},
  priceBand: "any",
  inStockOnly: false,
};

export type SortOption = "featured" | "price-asc" | "price-desc" | "newest" | "discount";

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "featured", label: "Recommended" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "newest", label: "Newest" },
  { value: "discount", label: "Biggest discount" },
];

export type Facets = {
  brands: string[];
  storages: string[];
  colours: string[];
};

export function countActiveFilters(filters: CatalogueFilters): number {
  const specCount = Object.values(filters.specs).reduce((total, list) => total + list.length, 0);
  return (
    filters.brands.length +
    filters.storages.length +
    filters.colours.length +
    specCount +
    (filters.priceBand !== "any" ? 1 : 0) +
    (filters.inStockOnly ? 1 : 0)
  );
}

function inBand(priceKobo: number, band: PriceBand): boolean {
  if (band === "any") return true;
  const { min, max } = BAND_RANGES[band];
  return priceKobo >= min && priceKobo < max;
}

function discountPercent(priceKobo: number, compareAtKobo: number | null): number {
  if (compareAtKobo === null || compareAtKobo <= priceKobo) return 0;
  return Math.round(((compareAtKobo - priceKobo) / compareAtKobo) * 100);
}

function matchesQuery(product: CatalogueProduct, query: string): boolean {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;

  const haystack = [
    product.name,
    product.brand ?? "",
    product.searchText ?? "",
    ...product.variants.map((v) => v.label),
  ]
    .join(" ")
    .toLowerCase();

  // Every word typed must appear somewhere in the product's name, brand, category, details or variants.
  // A plural also matches its singular, so "smartphones" finds "Smartphone".
  return tokens.every(
    (token) =>
      haystack.includes(token) ||
      (token.length > 3 && token.endsWith("s") && haystack.includes(token.slice(0, -1)))
  );
}

/** Applies the page scope (a category, or a search) before the sidebar filters. */
export function scopeProducts(
  products: CatalogueProduct[],
  categoryIds: string[] | null,
  query: string
): CatalogueProduct[] {
  const allowed = categoryIds ? new Set(categoryIds) : null;

  return products.filter(
    (product) =>
      (allowed === null || (product.categoryId !== null && allowed.has(product.categoryId))) &&
      matchesQuery(product, query)
  );
}

/** The brand, storage and colour choices shown in the sidebar. */
export function buildFacets(products: CatalogueProduct[]): Facets {
  const brands = new Set<string>();
  const storages = new Set<string>();
  const colours = new Set<string>();

  for (const product of products) {
    if (product.brand) brands.add(product.brand);
    for (const variant of product.variants) {
      if (variant.storage) storages.add(variant.storage);
      if (variant.colour) colours.add(variant.colour);
    }
  }

  return {
    brands: [...brands].sort(),
    // Sort storage by size, so 64GB comes before 128GB.
    storages: [...storages].sort((a, b) => (parseInt(a, 10) || 0) - (parseInt(b, 10) || 0)),
    colours: [...colours].sort(),
  };
}

/** The detail filters to show: only values that products in view have, in a sensible order. */
export function buildSpecFacets(products: CatalogueProduct[], fields: FilterField[]): SpecFacet[] {
  const facets: SpecFacet[] = [];

  for (const field of fields) {
    const found = new Set<string>();
    for (const product of products) {
      const value = product.specs?.[field.label];
      if (value) found.add(value);
    }

    const options = [...found];
    if (field.fieldType === "number") {
      options.sort((a, b) => (parseFloat(a) || 0) - (parseFloat(b) || 0));
    } else if (field.fieldType === "choice") {
      // Keep the order the admin listed the options in. Anything unlisted goes last.
      const rank = (value: string) => {
        const index = field.options.indexOf(value);
        return index === -1 ? field.options.length : index;
      };
      options.sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
    } else {
      options.sort();
    }

    if (options.length > 0) facets.push({ field, options });
  }

  return facets;
}

function sortCards(cards: ProductCardData[], sort: SortOption): ProductCardData[] {
  const newestFirst = (a: ProductCardData, b: ProductCardData) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();

  switch (sort) {
    case "price-asc":
      return cards.sort((a, b) => a.priceKobo - b.priceKobo);
    case "price-desc":
      return cards.sort((a, b) => b.priceKobo - a.priceKobo);
    case "newest":
      return cards.sort(newestFirst);
    case "discount":
      return cards.sort(
        (a, b) =>
          discountPercent(b.priceKobo, b.compareAtKobo) -
          discountPercent(a.priceKobo, a.compareAtKobo)
      );
    default:
      // Recommended: in-stock products first, then newest.
      return cards.sort(
        (a, b) => Number(b.stock > 0) - Number(a.stock > 0) || newestFirst(a, b)
      );
  }
}

/**
 * Builds one card per product. The card shows the variant that matches the filters,
 * preferring in-stock items and the lowest price.
 */
export function buildCards(
  products: CatalogueProduct[],
  filters: CatalogueFilters,
  sort: SortOption
): ProductCardData[] {
  const cards: ProductCardData[] = [];
  const specChoices = Object.entries(filters.specs).filter(([, chosen]) => chosen.length > 0);

  for (const product of products) {
    if (filters.brands.length > 0 && (!product.brand || !filters.brands.includes(product.brand))) {
      continue;
    }

    // A product must match every detail filter that has a value chosen.
    const failsDetail = specChoices.some(([label, chosen]) => {
      const value = product.specs?.[label];
      return !value || !chosen.includes(value);
    });
    if (failsDetail) continue;

    const matching = product.variants.filter(
      (variant) =>
        (filters.storages.length === 0 ||
          (variant.storage !== null && filters.storages.includes(variant.storage))) &&
        (filters.colours.length === 0 ||
          (variant.colour !== null && filters.colours.includes(variant.colour))) &&
        (!filters.inStockOnly || variant.stock > 0) &&
        inBand(variant.priceKobo, filters.priceBand)
    );
    if (matching.length === 0) continue;

    const best = [...matching].sort(
      (a, b) => Number(b.stock > 0) - Number(a.stock > 0) || a.priceKobo - b.priceKobo
    )[0];

    cards.push({
      productId: product.productId,
      variantId: best.variantId,
      slug: product.slug,
      name: product.name,
      brand: product.brand,
      variantLabel: best.label,
      imageUrl: product.imageUrl,
      priceKobo: best.priceKobo,
      compareAtKobo: best.compareAtKobo,
      stock: best.stock,
      saleEndsAt: best.saleEndsAt,
      createdAt: product.createdAt,
      sellerSlug: product.sellerSlug,
      sellerName: product.sellerName,
    });
  }

  return sortCards(cards, sort);
}

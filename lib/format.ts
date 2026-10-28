const naira = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** Prices are stored in kobo (₦1 = 100 kobo). Convert them before display. */
export function formatNaira(kobo: number): string {
  return naira.format(kobo / 100);
}

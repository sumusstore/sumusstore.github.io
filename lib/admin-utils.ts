export type Brand = { id: string; name: string; slug: string };

export type Category = {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  sort_order: number;
};

/** Makes a web address from a name, such as "Galaxy A35" becomes "galaxy-a35". */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Converts a naira amount typed by the admin, such as "1,250,000", into kobo. */
export function nairaToKobo(input: string): number | null {
  const cleaned = input.replace(/[,\s₦]/g, "");
  if (cleaned === "") return null;
  const amount = Number(cleaned);
  if (!Number.isFinite(amount) || amount < 0) return null;
  return Math.round(amount * 100);
}

export function koboToNairaText(kobo: number | null): string {
  return kobo === null ? "" : String(kobo / 100);
}

/** Turns a stored timestamp into the value a date-and-time input expects. */
export function isoToLocalInput(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

export function localInputToIso(value: string): string | null {
  return value ? new Date(value).toISOString() : null;
}

/** Reads "Name: Value" lines into the specifications shown on the product page. */
export function parseSpecs(text: string): Record<string, string> {
  const specs: Record<string, string> = {};
  for (const line of text.split("\n")) {
    const index = line.indexOf(":");
    if (index === -1) continue;
    const key = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim();
    if (key && value) specs[key] = value;
  }
  return specs;
}

export function specsToText(specs: Record<string, unknown>): string {
  return Object.entries(specs)
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join("\n");
}

/** Shrinks a phone photo before upload, so product pages stay quick on mobile data. */
export async function shrinkImage(file: File, maxSide = 1200): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not prepare the photo.");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.85)
  );
  if (!blob) throw new Error("Could not prepare the photo.");
  return blob;
}

/** Finds the storage path inside a product photo's web address, so the file can be deleted. */
export function storagePathFromUrl(url: string): string | null {
  const marker = "/product-images/";
  const index = url.indexOf(marker);
  return index === -1 ? null : url.slice(index + marker.length);
}

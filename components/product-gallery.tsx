"use client";

import Image from "next/image";
import { useState } from "react";

type ProductGalleryProps = {
  urls: string[];
  alt: string;
};

export function ProductGallery({ urls, alt }: ProductGalleryProps) {
  const [index, setIndex] = useState(0);

  if (urls.length === 0) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-xl bg-slate-50 text-sm text-slate-400">
        Photos coming soon
      </div>
    );
  }

  // If the list gets shorter, such as after changing colour, show the first photo.
  const safeIndex = index < urls.length ? index : 0;

  return (
    <div className="md:flex md:gap-4">
      {urls.length > 1 && (
        // Thumbnails sit in a row under the photo on phones, and in a column beside it on desktop.
        <ul className="order-2 mt-3 flex gap-2 overflow-x-auto md:order-1 md:mt-0 md:w-16 md:flex-col md:overflow-visible">
          {urls.map((url, i) => (
            <li key={`${url}-${i}`} className="shrink-0">
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Show photo ${i + 1}`}
                aria-pressed={i === safeIndex}
                className={`relative block h-16 w-16 overflow-hidden rounded-lg border-2 bg-white ${
                  i === safeIndex ? "border-blue-700" : "border-slate-200 hover:border-slate-400"
                }`}
              >
                <Image src={url} alt="" fill sizes="64px" className="object-contain p-1" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="relative order-1 aspect-square min-w-0 flex-1 overflow-hidden rounded-xl bg-slate-50 md:order-2">
        <Image
          src={urls[safeIndex]}
          alt={alt}
          fill
          priority
          sizes="(min-width: 1024px) 40vw, 100vw"
          className="object-contain p-6"
        />
      </div>
    </div>
  );
}

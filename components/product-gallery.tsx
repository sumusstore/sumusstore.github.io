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
      <div className="flex aspect-square items-center justify-center rounded-xl bg-slate-100 text-sm text-slate-400">
        Photos coming soon
      </div>
    );
  }

  // If the list gets shorter, such as after changing colour, show the first photo.
  const safeIndex = index < urls.length ? index : 0;

  return (
    <div>
      <div className="relative aspect-square overflow-hidden rounded-xl bg-slate-100">
        <Image
          src={urls[safeIndex]}
          alt={alt}
          fill
          priority
          sizes="(min-width: 768px) 50vw, 100vw"
          className="object-contain p-6"
        />
      </div>

      {urls.length > 1 && (
        <ul className="mt-3 flex gap-2 overflow-x-auto">
          {urls.map((url, i) => (
            <li key={`${url}-${i}`}>
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Show photo ${i + 1}`}
                aria-pressed={i === safeIndex}
                className={`relative block h-16 w-16 overflow-hidden rounded-lg border-2 bg-slate-100 ${
                  i === safeIndex ? "border-blue-700" : "border-transparent"
                }`}
              >
                <Image src={url} alt="" fill sizes="64px" className="object-contain p-1" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

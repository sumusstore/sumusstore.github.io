"use client";

import Image from "next/image";
import { useState, type ReactNode } from "react";

type ProductGalleryProps = {
  urls: string[];
  alt: string;
  /** A button shown on the bottom-right corner of the main photo, such as the save heart. */
  action?: ReactNode;
};

export function ProductGallery({ urls, alt, action }: ProductGalleryProps) {
  const [index, setIndex] = useState(0);

  if (urls.length === 0) {
    return (
      <div className="relative flex aspect-square items-center justify-center rounded-xl bg-white text-sm text-slate-400">
        Photos coming soon
        {action && <div className="absolute bottom-3 right-3">{action}</div>}
      </div>
    );
  }

  // If the list gets shorter, such as after changing colour, show the first photo.
  const safeIndex = index < urls.length ? index : 0;

  return (
    <div className="md:flex md:gap-4">
      {/* Thumbnails run down the side on computers only */}
      {urls.length > 1 && (
        <ul className="hidden md:flex md:w-16 md:flex-col md:gap-2">
          {urls.map((url, i) => (
            <li key={`${url}-${i}`}>
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

      <div className="min-w-0 flex-1">
        <div className="relative aspect-square overflow-hidden rounded-xl bg-white">
          <Image
            src={urls[safeIndex]}
            alt={alt}
            fill
            priority
            sizes="(min-width: 1024px) 40vw, 100vw"
            className="object-contain p-6"
          />
          {action && <div className="absolute bottom-3 right-3 z-10">{action}</div>}
        </div>

        {/* Dots under the photo on phones */}
        {urls.length > 1 && (
          <ul className="mt-3 flex justify-center gap-2 md:hidden">
            {urls.map((url, i) => (
              <li key={`dot-${url}-${i}`}>
                <button
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={`Show photo ${i + 1}`}
                  className={`block rounded-full ${
                    i === safeIndex ? "h-2.5 w-2.5 bg-ink" : "h-2 w-2 bg-slate-300"
                  }`}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

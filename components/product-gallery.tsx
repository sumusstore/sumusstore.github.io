"use client";

import Image from "next/image";
import { useState, type ReactNode } from "react";
import { ChevronDownIcon } from "@/components/icons";
import { Modal } from "@/components/modal";

type ProductGalleryProps = {
  urls: string[];
  alt: string;
  /** A button shown in the top-right corner, beside the enlarge button, such as the save heart. */
  action?: ReactNode;
};

function ExpandIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M15 3h6v6" />
      <path d="M9 21H3v-6" />
      <path d="m21 3-7 7" />
      <path d="m3 21 7-7" />
    </svg>
  );
}

const CORNER_BUTTON =
  "flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-md ring-1 ring-slate-200 hover:scale-105";

const ARROW_BUTTON =
  "absolute top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-md ring-1 ring-slate-200 hover:scale-105";

export function ProductGallery({ urls, alt, action }: ProductGalleryProps) {
  const [index, setIndex] = useState(0);
  const [enlarged, setEnlarged] = useState(false);

  if (urls.length === 0) {
    return (
      <div className="relative flex aspect-square items-center justify-center rounded-xl bg-white text-sm text-slate-400">
        Photos coming soon
        {action && <div className="absolute right-3 top-3">{action}</div>}
      </div>
    );
  }

  // If the list gets shorter, such as after changing colour, show the first photo.
  const safeIndex = index < urls.length ? index : 0;
  const current = urls[safeIndex];
  const hasMany = urls.length > 1;

  function step(delta: number) {
    setIndex((safeIndex + delta + urls.length) % urls.length);
  }

  return (
    <div>
      <div className="relative aspect-square overflow-hidden rounded-xl bg-white">
        <Image
          src={current}
          alt={alt}
          fill
          priority
          sizes="(min-width: 1024px) 55vw, 100vw"
          className="object-contain p-6"
        />

        <div className="absolute right-3 top-3 z-10 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setEnlarged(true)}
            aria-label="Enlarge photo"
            className={CORNER_BUTTON}
          >
            <ExpandIcon className="h-5 w-5 text-ink" />
          </button>
          {action}
        </div>

        {hasMany && (
          <>
            <button
              type="button"
              onClick={() => step(-1)}
              aria-label="Previous photo"
              className={`${ARROW_BUTTON} left-3`}
            >
              <ChevronDownIcon className="h-5 w-5 rotate-90 text-ink" />
            </button>
            <button
              type="button"
              onClick={() => step(1)}
              aria-label="Next photo"
              className={`${ARROW_BUTTON} right-3`}
            >
              <ChevronDownIcon className="h-5 w-5 -rotate-90 text-ink" />
            </button>
          </>
        )}
      </div>

      {hasMany && (
        <ul className="mt-3 flex gap-2 overflow-x-auto pb-1">
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

      <Modal title={alt} open={enlarged} onClose={() => setEnlarged(false)}>
        <div className="relative aspect-square overflow-hidden rounded-lg bg-white">
          <Image src={current} alt={alt} fill sizes="90vw" className="object-contain" />
        </div>
      </Modal>
    </div>
  );
}

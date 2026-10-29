"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useHydrated } from "@/hooks/use-hydrated";
import { MAX_COMPARE, useCompareStore } from "@/stores/compare-store";

/** A small floating bar that appears once a shopper has picked products to compare. */
export function CompareBar() {
  const hydrated = useHydrated();
  const pathname = usePathname();
  const count = useCompareStore((state) => state.productIds.length);
  const clear = useCompareStore((state) => state.clear);

  // Stay out of the way on the compare page itself and while nothing is selected.
  if (!hydrated || count === 0 || pathname?.startsWith("/compare")) return null;

  return (
    <div
      role="region"
      aria-label="Compare products"
      className="fixed bottom-20 right-4 z-40 flex items-center gap-3 rounded-full bg-slate-900 py-2 pl-4 pr-2 text-sm text-white shadow-lg md:bottom-4"
    >
      <span>
        Compare {count} of {MAX_COMPARE}
      </span>
      <Link href="/compare/" className="rounded-full bg-white px-3 py-1.5 font-semibold text-slate-900">
        Compare
      </Link>
      <button
        type="button"
        onClick={clear}
        aria-label="Clear comparison"
        className="px-2 text-slate-300 hover:text-white"
      >
        Clear
      </button>
    </div>
  );
}

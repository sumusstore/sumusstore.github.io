// components/mobile-menu.tsx
"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  popularCategories,
  type CategoryNode,
  type CategoryStatus,
} from "@/hooks/use-category-tree";
import { ChevronDownIcon, CloseIcon } from "@/components/icons";
import { supabase } from "@/lib/supabase";

type MobileMenuProps = {
  open: boolean;
  onClose: () => void;
  tree: CategoryNode[];
  status: CategoryStatus;
};

/** One screen of the drawer. The stack of these is the drawer's history. */
type View =
  | { kind: "root" }
  | { kind: "categories" }
  | { kind: "category"; id: string };

const ROOT: View = { kind: "root" };

function findNode(nodes: CategoryNode[], id: string): CategoryNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    const found = findNode(node.children, id);
    if (found) return found;
  }
  return null;
}

/** A row's text, with an optional arrow on the right. */
function RowContent({ label, arrow }: { label: string; arrow: boolean }) {
  return (
    <span className="flex w-full items-center justify-between gap-4">
      <span className="min-w-0">{label}</span>
      {arrow && <ChevronDownIcon className="h-5 w-5 shrink-0 -rotate-90 text-slate-500" />}
    </span>
  );
}

const ROW_CLASS = "block w-full px-4 py-3.5 text-left text-base text-slate-800 hover:bg-slate-50";

export function MobileMenu({ open, onClose, tree, status }: MobileMenuProps) {
  const [stack, setStack] = useState<View[]>([ROOT]);
  const { user } = useAuth();
  const popular = popularCategories(tree);

  const current = stack[stack.length - 1];
  const canGoBack = stack.length > 1;

  // Each time the drawer opens, it starts at the root menu.
  useEffect(() => {
    if (!open) setStack([ROOT]);
  }, [open]);

  // Escape closes the whole drawer.
  useEffect(() => {
    if (!open) return;
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  function push(view: View) {
    setStack((current) => [...current, view]);
  }

  function back() {
    setStack((current) => (current.length > 1 ? current.slice(0, -1) : current));
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    onClose();
  }

  // A category with children opens its own view. A category without children opens its page.
  function categoryRow(node: CategoryNode): ReactNode {
    if (node.children.length > 0) {
      return (
        <li key={node.id}>
          <button type="button" onClick={() => push({ kind: "category", id: node.id })} className={ROW_CLASS}>
            <RowContent label={node.name} arrow />
          </button>
        </li>
      );
    }
    return (
      <li key={node.id}>
        <Link href={`/category/${node.slug}/`} onClick={onClose} className={ROW_CLASS}>
          <RowContent label={node.name} arrow={false} />
        </Link>
      </li>
    );
  }

  const topBar = (
    <div className="flex items-center justify-between px-4 py-3">
      {canGoBack ? (
        <button
          type="button"
          onClick={back}
          aria-label="Go back"
          className="-ml-2 flex h-11 w-11 items-center justify-center"
        >
          <ChevronDownIcon className="h-6 w-6 rotate-90 text-ink" />
        </button>
      ) : (
        <span className="h-11 w-11" aria-hidden="true" />
      )}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close menu"
        className="-mr-2 flex h-11 w-11 items-center justify-center"
      >
        <CloseIcon className="h-6 w-6 text-ink" />
      </button>
    </div>
  );

  let body: ReactNode;

  if (current.kind === "root") {
    body = (
      <ul className="px-4 pt-2 text-xl font-bold text-ink">
        <li>
          <button type="button" onClick={() => push({ kind: "categories" })} className="block w-full py-4 text-left">
            Categories
          </button>
        </li>
        <li>
          <Link href="/sell/" onClick={onClose} className="block py-4">
            Sell
          </Link>
        </li>
        <li>
          <Link href="/faq/" onClick={onClose} className="block py-4">
            Help
          </Link>
        </li>
        <li className="mt-4 border-t border-slate-200 pt-4">
          {user ? (
            <button type="button" onClick={handleSignOut} className="block py-3 text-base font-semibold text-blue-700">
              Sign Out
            </button>
          ) : (
            <Link href="/login/" onClick={onClose} className="block py-3 text-base font-semibold text-blue-700">
              Sign In
            </Link>
          )}
        </li>
      </ul>
    );
  } else if (current.kind === "categories") {
    body = (
      <div className="pb-6">
        {status === "loading" && <p className="px-4 py-3 text-sm text-slate-500">Loading categories…</p>}
        {status === "error" && (
          <p className="px-4 py-3 text-sm text-slate-500">
            Categories are unavailable right now. Please try again shortly.
          </p>
        )}

        {status === "ready" && (
          <>
            {popular.length > 0 && (
              <section>
                <h2 className="px-4 pb-1 pt-2 text-xl font-bold text-ink">Popular Categories</h2>
                <ul>{popular.map(categoryRow)}</ul>
              </section>
            )}

            <section className="mt-4">
              <h2 className="px-4 pb-1 pt-2 text-xl font-bold text-ink">All Categories</h2>
              <ul>{tree.map(categoryRow)}</ul>
            </section>
          </>
        )}
      </div>
    );
  } else {
    const node = findNode(tree, current.id);

    body = node ? (
      <div className="pb-6">
        <h2 className="px-4 pb-2 pt-2 text-xl font-bold text-ink">{node.name}</h2>
        <ul>
          <li>
            <Link href={`/category/${node.slug}/`} onClick={onClose} className={`${ROW_CLASS} font-semibold`}>
              <RowContent label={`All in ${node.name}`} arrow={false} />
            </Link>
          </li>
          {node.children.map(categoryRow)}
        </ul>
      </div>
    ) : (
      <p className="px-4 py-3 text-sm text-slate-500">This category isn&apos;t available right now.</p>
    );
  }

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <button
        type="button"
        aria-label="Close menu"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Site menu"
        className="absolute inset-y-0 left-0 flex w-[85%] max-w-sm flex-col overflow-y-auto bg-white shadow-xl"
      >
        {topBar}
        {body}
      </aside>
    </div>
  );
}

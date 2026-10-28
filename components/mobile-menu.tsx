"use client";

import Link from "next/link";
import { useState } from "react";
import type { CategoryNode, CategoryStatus } from "@/hooks/use-category-tree";
import { SITE } from "@/lib/site-config";
import { ChevronDownIcon, CloseIcon } from "@/components/icons";

type MobileMenuProps = {
  open: boolean;
  onClose: () => void;
  tree: CategoryNode[];
  status: CategoryStatus;
};

const helpLinks = [
  { label: "Shop all products", href: "/shop/" },
  { label: "Store locator", href: "/stores/" },
  { label: "Track an order", href: "/track/" },
  { label: "My account", href: "/account/" },
  { label: "FAQ", href: "/faq/" },
  { label: "Contact us", href: "/contact/" },
];

export function MobileMenu({ open, onClose, tree, status }: MobileMenuProps) {
  if (!open) return null;

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
        className="absolute inset-y-0 left-0 flex w-[85%] max-w-sm flex-col bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <span className="text-lg font-bold text-blue-700">{SITE.name}</span>
          <button type="button" onClick={onClose} aria-label="Close menu" className="p-2">
            <CloseIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <p className="px-4 pt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Categories
          </p>

          {status === "loading" && (
            <p className="px-4 py-3 text-sm text-slate-500">Loading categories…</p>
          )}
          {status === "error" && (
            <p className="px-4 py-3 text-sm text-slate-500">
              Categories are unavailable right now. Please try again shortly.
            </p>
          )}
          {status === "ready" && (
            <ul className="mt-2 border-b border-slate-200 pb-2">
              {tree.map((node) => (
                <MobileCategory key={node.id} node={node} depth={0} onNavigate={onClose} />
              ))}
            </ul>
          )}

          <p className="px-4 pt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Help and account
          </p>
          <ul className="mt-2 pb-4">
            {helpLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={onClose}
                  className="block px-4 py-3 text-slate-800 hover:bg-slate-50"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-2 border-t border-slate-200 p-4">
          <a
            href={SITE.phoneLink}
            className="block rounded-lg bg-blue-700 px-4 py-3 text-center font-semibold text-white"
          >
            Call {SITE.phoneDisplay}
          </a>
          <a
            href={SITE.whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-lg border border-slate-300 px-4 py-3 text-center font-semibold text-slate-800"
          >
            Chat on WhatsApp
          </a>
        </div>
      </aside>
    </div>
  );
}

type MobileCategoryProps = {
  node: CategoryNode;
  depth: number;
  onNavigate: () => void;
};

function MobileCategory({ node, depth, onNavigate }: MobileCategoryProps) {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = node.children.length > 0;

  return (
    <li>
      <div className="flex items-center">
        <Link
          href={`/category/${node.slug}/`}
          onClick={onNavigate}
          style={{ paddingLeft: `${16 + depth * 16}px` }}
          className="flex-1 py-3 pr-2 text-slate-800 hover:text-blue-700"
        >
          {node.name}
        </Link>
        {hasChildren && (
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={expanded}
            aria-label={`${expanded ? "Collapse" : "Expand"} ${node.name}`}
            className="p-3"
          >
            <ChevronDownIcon
              className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
            />
          </button>
        )}
      </div>

      {hasChildren && expanded && (
        <ul>
          {node.children.map((child) => (
            <MobileCategory
              key={child.id}
              node={child}
              depth={depth + 1}
              onNavigate={onNavigate}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

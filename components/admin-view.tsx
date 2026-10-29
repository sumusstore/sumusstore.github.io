"use client";

import { useState } from "react";
import { AdminOrders } from "@/components/admin-orders";
import { AdminProducts } from "@/components/admin-products";
import { AdminSetup } from "@/components/admin-setup";
import { Notice } from "@/components/form-field";

// Opens the workflow page where the site is rebuilt. Check the repository name if the link doesn't open.
const REBUILD_URL = "https://github.com/sumusstore/sumusstore.github.io/actions";

type Tab = "orders" | "products" | "setup";

const TABS: { value: Tab; label: string }[] = [
  { value: "orders", label: "Orders" },
  { value: "products", label: "Products" },
  { value: "setup", label: "Brands and categories" },
];

export function AdminView() {
  const [tab, setTab] = useState<Tab>("orders");

  return (
    <section className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-3xl font-bold text-slate-900">Store admin</h1>

      <div role="tablist" className="mt-6 flex gap-6 overflow-x-auto border-b border-slate-200">
        {TABS.map((item) => (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={tab === item.value}
            onClick={() => setTab(item.value)}
            className={`-mb-px whitespace-nowrap border-b-2 pb-3 text-sm font-semibold ${
              tab === item.value
                ? "border-blue-700 text-blue-700"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "orders" && <AdminOrders />}
        {tab === "products" && <AdminProducts />}
        {tab === "setup" && <AdminSetup />}
      </div>

      <div className="mt-10">
        <Notice tone="info">
          Products, brands and categories show in the shop straight away. Their own product and category pages
          appear after the site is rebuilt, so until then tapping them shows a 404.{" "}
          <a href={REBUILD_URL} target="_blank" rel="noopener noreferrer" className="font-semibold underline">
            Open the rebuild page
          </a>{" "}
          and tap Run workflow.
        </Notice>
      </div>
    </section>
  );
}

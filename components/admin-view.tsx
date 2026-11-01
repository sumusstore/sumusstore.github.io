"use client";

import { useEffect, useState } from "react";
import { AdminEnquiries } from "@/components/admin-enquiries";
import { AdminOrders } from "@/components/admin-orders";
import { AdminProducts } from "@/components/admin-products";
import { AdminSetup } from "@/components/admin-setup";
import { markOrdersSeen, useAdminAlerts } from "@/hooks/use-admin-alerts";

type Tab = "orders" | "enquiries" | "products" | "setup";

const TABS: { value: Tab; label: string }[] = [
  { value: "orders", label: "Orders" },
  { value: "enquiries", label: "Enquiries" },
  { value: "products", label: "Products" },
  { value: "setup", label: "Brands and categories" },
];

/** A small gold count shown beside a tab name. Hidden when the count is zero. */
function CountBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1.5 text-xs font-bold text-ink">
      {count}
    </span>
  );
}

export function AdminView() {
  const [tab, setTab] = useState<Tab>("orders");
  const { counts, version, refresh, alerts, requestAlerts } = useAdminAlerts();
  const total = counts.orders + counts.enquiries;

  useEffect(() => {
    document.title = total > 0 ? `(${total}) Store admin` : "Store admin";
  }, [total]);

  async function handleGotIt() {
    await markOrdersSeen();
    refresh();
  }

  const alertParts: string[] = [];
  if (counts.orders > 0) {
    alertParts.push(`${counts.orders} new ${counts.orders === 1 ? "order" : "orders"}`);
  }
  if (counts.enquiries > 0) {
    alertParts.push(
      `${counts.enquiries} ${counts.enquiries === 1 ? "enquiry" : "enquiries"} to reply to`
    );
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-3xl font-bold text-ink">Store admin</h1>

      {total > 0 && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 border-t-4 border-t-gold bg-white p-4">
          <p className="font-semibold text-ink">{alertParts.join(" and ")}.</p>
          <div className="flex flex-wrap gap-2">
            {counts.orders > 0 && (
              <>
                <button
                  type="button"
                  onClick={() => setTab("orders")}
                  className="rounded-full bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
                >
                  Open orders
                </button>
                <button
                  type="button"
                  onClick={handleGotIt}
                  className="rounded-full border border-blue-700 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
                >
                  Mark orders as seen
                </button>
              </>
            )}
            {counts.enquiries > 0 && (
              <button
                type="button"
                onClick={() => setTab("enquiries")}
                className="rounded-full bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
              >
                Open enquiries
              </button>
            )}
          </div>
        </div>
      )}

      {alerts === "default" && (
        <button
          type="button"
          onClick={requestAlerts}
          className="mt-4 rounded-full border border-blue-700 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
        >
          Turn on phone alerts
        </button>
      )}
      {alerts === "granted" && (
        <p className="mt-4 text-xs text-slate-500">Pop-up alerts are on while this page is open.</p>
      )}
      {alerts === "denied" && (
        <p className="mt-4 text-xs text-slate-500">
          Pop-up alerts are blocked in this browser. The banner above still shows new work.
        </p>
      )}

      <div role="tablist" className="mt-6 flex gap-6 overflow-x-auto border-b border-slate-200">
        {TABS.map((item) => (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={tab === item.value}
            onClick={() => setTab(item.value)}
            className={`-mb-px flex items-center whitespace-nowrap border-b-4 pb-3 text-sm font-semibold ${
              tab === item.value
                ? "border-gold text-ink"
                : "border-transparent text-slate-600 hover:text-ink"
            }`}
          >
            {item.label}
            {item.value === "orders" && <CountBadge count={counts.orders} />}
            {item.value === "enquiries" && <CountBadge count={counts.enquiries} />}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {/* Remounts the orders list when new orders arrive, so they appear without a reload. */}
        {tab === "orders" && <AdminOrders key={version} />}
        {tab === "enquiries" && <AdminEnquiries onChanged={refresh} />}
        {tab === "products" && <AdminProducts />}
        {tab === "setup" && <AdminSetup />}
      </div>

      <div className="mt-10 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
        Products, brands and categories show in the shop straight away. A new product&apos;s own page
        goes live a few minutes after you switch it on, because the site rebuilds automatically.
      </div>
    </section>
  );
}

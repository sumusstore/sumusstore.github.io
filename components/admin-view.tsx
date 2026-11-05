"use client";

import { useEffect, useState } from "react";
import { AdminConversations } from "@/components/admin-conversations";
import { AdminEnquiries } from "@/components/admin-enquiries";
import { AdminFields } from "@/components/admin-fields";
import { AdminOrders } from "@/components/admin-orders";
import { AdminProducts } from "@/components/admin-products";
import { AdminSellers } from "@/components/admin-sellers";
import { AdminSetup } from "@/components/admin-setup";
import { markOrdersSeen, useAdminAlerts } from "@/hooks/use-admin-alerts";
import { supabase } from "@/lib/supabase";

type Tab = "orders" | "enquiries" | "messages" | "sellers" | "products" | "fields" | "setup";

const TABS: { value: Tab; label: string }[] = [
  { value: "orders", label: "Orders" },
  { value: "enquiries", label: "Enquiries" },
  { value: "messages", label: "Messages" },
  { value: "sellers", label: "Sellers" },
  { value: "products", label: "Products" },
  { value: "fields", label: "Product fields" },
  { value: "setup", label: "Brands and categories" },
];

type PausedRow = {
  id: string;
  name: string;
  seller_paused_at: string | null;
  sellers: { display_name: string } | null;
};

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
  const [pendingSellers, setPendingSellers] = useState(0);
  const [sellerTick, setSellerTick] = useState(0);
  const [paused, setPaused] = useState<PausedRow[]>([]);
  const [pauseTick, setPauseTick] = useState(0);
  const { counts, version, refresh, alerts, requestAlerts } = useAdminAlerts();
  const newWork = counts.orders + counts.enquiries;
  const titleCount = newWork + paused.length;

  useEffect(() => {
    document.title = titleCount > 0 ? `(${titleCount}) Store admin` : "Store admin";
  }, [titleCount]);

  // Counts applications waiting for a decision. Refreshes when the tab changes or a decision is saved.
  useEffect(() => {
    let active = true;
    supabase
      .from("sellers")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")
      .then(({ count }) => {
        if (active) setPendingSellers(count ?? 0);
      });
    return () => {
      active = false;
    };
  }, [tab, sellerTick]);

  // Products that sellers have paused and Sumus hasn't acknowledged. Checked every minute.
  useEffect(() => {
    let active = true;

    async function loadPaused() {
      const { data } = await supabase
        .from("products")
        .select("id, name, seller_paused_at, sellers(display_name)")
        .eq("seller_paused", true)
        .eq("pause_seen_by_admin", false)
        .order("seller_paused_at", { ascending: false });
      if (active) setPaused((data ?? []) as unknown as PausedRow[]);
    }

    loadPaused();
    const timer = window.setInterval(loadPaused, 60000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [tab, pauseTick]);

  async function handleGotIt() {
    await markOrdersSeen();
    refresh();
  }

  async function markPausesSeen() {
    await supabase
      .from("products")
      .update({ pause_seen_by_admin: true })
      .eq("seller_paused", true)
      .eq("pause_seen_by_admin", false);
    setPauseTick((count) => count + 1);
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

      {paused.length > 0 && (
        <div className="mt-6 rounded-xl border border-red-200 border-t-4 border-t-red-600 bg-white p-4">
          <p className="font-semibold text-ink">
            {paused.length === 1 ? "A seller has paused a product" : `${paused.length} sellers have paused products`}
          </p>
          <ul className="mt-2 space-y-1 text-sm text-slate-700">
            {paused.map((row) => (
              <li key={row.id}>
                {row.name} · {row.sellers?.display_name ?? "Seller"}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-slate-500">
            Paused products stay hidden until the seller resumes them, or you restore them from the Products tab.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setTab("products")}
              className="rounded-full bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
            >
              Open products
            </button>
            <button
              type="button"
              onClick={markPausesSeen}
              className="rounded-full border border-blue-700 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
            >
              Mark as seen
            </button>
          </div>
        </div>
      )}

      {newWork > 0 && (
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
            {item.value === "sellers" && <CountBadge count={pendingSellers} />}
            {item.value === "products" && <CountBadge count={paused.length} />}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {/* Remounts the orders list when new orders arrive, so they appear without a reload. */}
        {tab === "orders" && <AdminOrders key={version} />}
        {tab === "enquiries" && <AdminEnquiries onChanged={refresh} />}
        {tab === "messages" && <AdminConversations />}
        {tab === "sellers" && <AdminSellers onChanged={() => setSellerTick((count) => count + 1)} />}
        {tab === "products" && <AdminProducts />}
        {tab === "fields" && <AdminFields />}
        {tab === "setup" && <AdminSetup />}
      </div>

      <div className="mt-10 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
        Products, brands and categories show in the shop straight away. A new product&apos;s own page
        goes live a few minutes after you switch it on, because the site rebuilds automatically.
      </div>
    </section>
  );
}

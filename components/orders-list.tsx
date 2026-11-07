"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { formatNaira } from "@/lib/format";
import { statusInfo } from "@/lib/order-status";
import { supabase } from "@/lib/supabase";

type OrderRow = {
  id: string;
  order_number: string;
  status: string;
  total_kobo: number;
  created_at: string;
  order_items: { product_name: string; variant_label: string | null; quantity: number }[];
};

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 border-t-4 border-t-gold bg-white p-5">
      {children}
    </div>
  );
}

export function OrdersList() {
  const { user, loading } = useAuth();
  const userId = user?.id ?? null;
  const [orders, setOrders] = useState<OrderRow[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (loading || !userId) return;
    let active = true;

    supabase
      .from("orders")
      .select(
        "id, order_number, status, total_kobo, created_at, order_items(product_name, variant_label, quantity)"
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          setFailed(true);
          return;
        }
        setOrders((data ?? []) as OrderRow[]);
      });

    return () => {
      active = false;
    };
  }, [loading, userId]);

  if (failed) {
    return (
      <p className="text-sm text-slate-600">
        Your purchases are unavailable right now. Please refresh the page shortly.
      </p>
    );
  }

  if (!orders) {
    return <p className="text-sm text-slate-600">Loading your purchases…</p>;
  }

  if (orders.length === 0) {
    return (
      <Card>
        <p className="font-semibold text-ink">No purchases yet</p>
        <p className="mt-1 text-sm text-slate-600">Orders you place while signed in appear here.</p>
        <Link href="/shop/" className="mt-4 inline-block font-semibold text-blue-700 hover:underline">
          Start shopping
        </Link>
      </Card>
    );
  }

  return (
    <ul className="space-y-4">
      {orders.map((order) => {
        const info = statusInfo(order.status);
        return (
          <li key={order.id}>
            <Card>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-mono text-sm font-semibold text-ink">{order.order_number}</p>
                  <p className="text-xs text-slate-500">
                    {new Date(order.created_at).toLocaleDateString("en-NG", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                  {info.label}
                </span>
              </div>

              <ul className="mt-3 space-y-1 text-sm text-slate-700">
                {order.order_items.map((line, index) => (
                  <li key={index}>
                    {line.quantity} × {line.product_name}
                    {line.variant_label ? ` (${line.variant_label})` : ""}
                  </li>
                ))}
              </ul>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                <p className="text-sm text-slate-600">{info.detail}</p>
                <p className="font-bold text-ink">{formatNaira(order.total_kobo)}</p>
              </div>
            </Card>
          </li>
        );
      })}
    </ul>
  );
}

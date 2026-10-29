"use client";

import { useEffect, useState } from "react";
import { Notice } from "@/components/form-field";
import { formatNaira } from "@/lib/format";
import { statusInfo } from "@/lib/order-status";
import { supabase } from "@/lib/supabase";

type AdminOrder = {
  id: string;
  order_number: string;
  status: string;
  payment_method: string;
  email: string;
  phone: string;
  subtotal_kobo: number;
  delivery_fee_kobo: number;
  total_kobo: number;
  shipping_address: { fullName?: string; state?: string; area?: string; street?: string } | null;
  admin_note: string | null;
  created_at: string;
  delivery_zones: { name: string } | null;
  stores: { name: string } | null;
  order_items: {
    product_name: string;
    variant_label: string | null;
    quantity: number;
    unit_price_kobo: number;
  }[];
};

type Message = { tone: "error" | "info"; text: string } | null;

type ActionTone = "primary" | "neutral" | "danger";

const ORDER_SELECT =
  "id, order_number, status, payment_method, email, phone, subtotal_kobo, delivery_fee_kobo, total_kobo, shipping_address, admin_note, created_at, delivery_zones(name), stores(name), order_items(product_name, variant_label, quantity, unit_price_kobo)";

const FILTERS = [
  { value: "open", label: "Needs action" },
  { value: "all", label: "All orders" },
  { value: "awaiting_transfer", label: "Awaiting transfer" },
  { value: "pending_payment", label: "Card payment pending" },
  { value: "paid", label: "Paid" },
  { value: "processing", label: "Processing" },
  { value: "shipped", label: "Shipped or ready" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
  { value: "refunded", label: "Refunded" },
];

const OPEN_STATUSES = ["awaiting_transfer", "paid", "processing", "shipped"];

const CONFIRM_TEXT: Record<string, string> = {
  cancelled:
    "Cancel this order? If stock was already taken for it, the stock goes back on the shelf.",
  refunded:
    "Mark this order as refunded? Send the refund in Paystack or by bank first. If stock was taken for it, the stock goes back on the shelf.",
};

const TONE_CLASS: Record<ActionTone, string> = {
  primary: "bg-blue-700 text-white hover:bg-blue-800",
  neutral: "border border-slate-300 text-slate-800 hover:border-slate-500",
  danger: "border border-red-300 text-red-700 hover:bg-red-50",
};

/** Converts a Nigerian number such as 0806 504 7590 into the format WhatsApp links need. */
function whatsappNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("0") ? `234${digits.slice(1)}` : digits;
}

function paymentLabel(method: string): string {
  return method === "paystack" ? "Card, bank or USSD" : "Bank transfer";
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-NG", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AdminOrders() {
  const [orders, setOrders] = useState<AdminOrder[] | null>(null);
  const [version, setVersion] = useState(0);
  const [filter, setFilter] = useState("open");
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<Message>(null);

  useEffect(() => {
    let active = true;

    supabase
      .from("orders")
      .select(ORDER_SELECT)
      .order("created_at", { ascending: false })
      .limit(300)
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          setMessage({ tone: "error", text: "Orders couldn't load. Refresh the page to try again." });
          setOrders([]);
          return;
        }
        setOrders((data ?? []) as unknown as AdminOrder[]);
      });

    return () => {
      active = false;
    };
  }, [version]);

  function reload() {
    setVersion((current) => current + 1);
  }

  async function confirmTransfer(order: AdminOrder) {
    const question = `Confirm that ${formatNaira(order.total_kobo)} has arrived in your account for ${order.order_number}?`;
    if (!window.confirm(question)) return;

    setBusyId(order.id);
    setMessage(null);
    const { data, error } = await supabase.rpc("admin_confirm_bank_transfer", {
      p_order_id: order.id,
    });
    setBusyId(null);

    if (error) {
      setMessage({ tone: "error", text: error.message });
      return;
    }

    const result = String(data);
    if (result === "already_processed") {
      setMessage({ tone: "info", text: `${order.order_number} was already marked as paid.` });
    } else if (result === "paid_short_stock") {
      setMessage({
        tone: "error",
        text: `${order.order_number} is paid, but one item didn't have enough stock. Check the note on the order and refund if needed.`,
      });
    } else {
      setMessage({ tone: "info", text: `${order.order_number} is paid and its stock has been updated.` });
    }
    reload();
  }

  async function changeStatus(order: AdminOrder, next: string) {
    const question = CONFIRM_TEXT[next];
    if (question && !window.confirm(question)) return;

    setBusyId(order.id);
    setMessage(null);
    const { data, error } = await supabase.rpc("admin_set_order_status", {
      p_order_id: order.id,
      p_status: next,
    });
    setBusyId(null);

    if (error) {
      setMessage({ tone: "error", text: error.message });
      return;
    }

    setMessage({
      tone: "info",
      text: `${order.order_number} is now ${statusInfo(String(data)).label.toLowerCase()}.`,
    });
    reload();
  }

  function actionsFor(order: AdminOrder) {
    const isPickup = order.delivery_zones?.name === "Store Pickup";
    const actions: { label: string; tone: ActionTone; run: () => void }[] = [];

    if (order.status === "awaiting_transfer") {
      actions.push({ label: "Confirm transfer received", tone: "primary", run: () => confirmTransfer(order) });
    }
    if (order.status === "paid") {
      actions.push({ label: "Start processing", tone: "primary", run: () => changeStatus(order, "processing") });
    }
    if (order.status === "processing") {
      actions.push({
        label: isPickup ? "Ready for pickup" : "Mark as shipped",
        tone: "primary",
        run: () => changeStatus(order, "shipped"),
      });
    }
    if (order.status === "shipped") {
      actions.push({
        label: isPickup ? "Customer collected" : "Mark as delivered",
        tone: "primary",
        run: () => changeStatus(order, "delivered"),
      });
    }
    if (["paid", "processing", "shipped", "delivered"].includes(order.status)) {
      actions.push({ label: "Refund", tone: "neutral", run: () => changeStatus(order, "refunded") });
    }
    if (["pending_payment", "awaiting_transfer", "paid", "processing"].includes(order.status)) {
      actions.push({ label: "Cancel order", tone: "danger", run: () => changeStatus(order, "cancelled") });
    }
    return actions;
  }

  const query = search.trim().toLowerCase();
  const visible = (orders ?? []).filter((order) => {
    if (filter === "open" && !OPEN_STATUSES.includes(order.status)) return false;
    if (filter !== "open" && filter !== "all" && order.status !== filter) return false;
    if (!query) return true;
    return [order.order_number, order.email, order.phone, order.shipping_address?.fullName ?? ""].some(
      (field) => field.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <select
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          aria-label="Filter orders"
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          {FILTERS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search order number, email, phone or name"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
        />
      </div>

      {message && <Notice tone={message.tone}>{message.text}</Notice>}
      {orders === null && <p className="text-sm text-slate-600">Loading orders…</p>}
      {orders !== null && visible.length === 0 && (
        <p className="text-sm text-slate-600">No orders match this view.</p>
      )}

      <ul className="space-y-3">
        {visible.map((order) => {
          const info = statusInfo(order.status);
          const open = openId === order.id;
          const busy = busyId === order.id;
          const actions = actionsFor(order);
          const name = order.shipping_address?.fullName || order.email;

          return (
            <li key={order.id} className="rounded-xl border border-slate-200 p-4">
              <button
                type="button"
                onClick={() => setOpenId(open ? null : order.id)}
                aria-expanded={open}
                className="flex w-full flex-wrap items-start justify-between gap-2 text-left"
              >
                <div>
                  <p className="font-mono text-sm font-semibold text-slate-900">{order.order_number}</p>
                  <p className="text-xs text-slate-500">
                    {formatDate(order.created_at)} · {paymentLabel(order.payment_method)}
                  </p>
                  <p className="mt-1 text-sm text-slate-700">{name}</p>
                </div>
                <div className="text-right">
                  <span className="inline-block rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-800">
                    {info.label}
                  </span>
                  <p className="mt-1 font-bold text-slate-900">{formatNaira(order.total_kobo)}</p>
                </div>
              </button>

              {order.admin_note && (
                <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{order.admin_note}</p>
              )}

              {open && (
                <div className="mt-4 space-y-4 border-t border-slate-100 pt-4 text-sm">
                  <ul className="space-y-1">
                    {order.order_items.map((line, index) => (
                      <li key={index} className="flex justify-between gap-3">
                        <span>
                          {line.quantity} × {line.product_name}
                          {line.variant_label ? ` (${line.variant_label})` : ""}
                        </span>
                        <span className="shrink-0">{formatNaira(line.unit_price_kobo * line.quantity)}</span>
                      </li>
                    ))}
                  </ul>

                  <dl className="space-y-1 text-slate-700">
                    <div className="flex justify-between">
                      <dt>Subtotal</dt>
                      <dd>{formatNaira(order.subtotal_kobo)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt>Delivery</dt>
                      <dd>{order.delivery_fee_kobo === 0 ? "Free" : formatNaira(order.delivery_fee_kobo)}</dd>
                    </div>
                  </dl>

                  <div className="rounded-lg bg-slate-50 p-3 text-slate-700">
                    {order.delivery_zones?.name === "Store Pickup" ? (
                      <p>Pickup at {order.stores?.name ?? "a store that isn't recorded"}</p>
                    ) : (
                      <p>
                        {[order.shipping_address?.street, order.shipping_address?.area, order.shipping_address?.state]
                          .filter(Boolean)
                          .join(", ")}{" "}
                        <span className="text-slate-500">({order.delivery_zones?.name})</span>
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-4">
                    <a href={`tel:${order.phone}`} className="font-semibold text-blue-700 hover:underline">
                      Call {order.phone}
                    </a>
                    <a
                      href={`https://wa.me/${whatsappNumber(order.phone)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-green-700 hover:underline"
                    >
                      WhatsApp
                    </a>
                    <a href={`mailto:${order.email}`} className="font-semibold text-blue-700 hover:underline">
                      Email
                    </a>
                  </div>
                </div>
              )}

              {actions.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {actions.map((action) => (
                    <button
                      key={action.label}
                      type="button"
                      disabled={busy}
                      onClick={action.run}
                      className={`rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-50 ${TONE_CLASS[action.tone]}`}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

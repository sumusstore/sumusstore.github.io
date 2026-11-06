"use client";

import { useEffect, useState } from "react";
import { Notice } from "@/components/form-field";
import { supabase } from "@/lib/supabase";

type ReviewRow = {
  id: string;
  product_id: string;
  product_name: string;
  seller_name: string | null;
  reviewer: string;
  rating: number;
  comment: string | null;
  status: string;
  verified_purchase: boolean;
  created_at: string;
};

type Filter = "pending" | "approved";

type Message = { tone: "error" | "info"; text: string } | null;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "pending", label: "Waiting for approval" },
  { value: "approved", label: "Approved" },
];

export function AdminReviews({ onChanged }: { onChanged: () => void }) {
  const [filter, setFilter] = useState<Filter>("pending");
  const [rows, setRows] = useState<ReviewRow[] | null>(null);
  const [version, setVersion] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<Message>(null);

  useEffect(() => {
    let active = true;
    setRows(null);

    supabase.rpc("admin_reviews", { p_status: filter }).then(({ data, error }) => {
      if (!active) return;
      if (error) {
        setMessage({ tone: "error", text: `Reviews couldn't load. ${error.message}` });
        setRows([]);
        return;
      }
      setRows((data ?? []) as ReviewRow[]);
    });

    return () => {
      active = false;
    };
  }, [filter, version]);

  async function moderate(row: ReviewRow, action: "approve" | "remove") {
    if (action === "remove" && !window.confirm(`Remove this review of ${row.product_name}? This can't be undone.`)) {
      return;
    }

    setBusyId(row.id);
    setMessage(null);
    const { error } = await supabase.rpc("admin_moderate_review", {
      p_review_id: row.id,
      p_action: action,
    });
    setBusyId(null);

    if (error) {
      setMessage({ tone: "error", text: error.message });
      return;
    }

    setMessage({
      tone: "info",
      text: action === "approve" ? "Review approved. It now shows on the product page." : "Review removed.",
    });
    setVersion((current) => current + 1);
    onChanged();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setFilter(item.value)}
            aria-pressed={filter === item.value}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              filter === item.value
                ? "bg-blue-700 text-white"
                : "border border-slate-300 text-ink hover:border-slate-500"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {message && <Notice tone={message.tone}>{message.text}</Notice>}
      {rows === null && <p className="text-sm text-slate-600">Loading reviews…</p>}
      {rows !== null && rows.length === 0 && (
        <p className="text-sm text-slate-600">
          {filter === "pending" ? "No reviews are waiting for approval." : "No approved reviews yet."}
        </p>
      )}

      <ul className="space-y-3">
        {(rows ?? []).map((row) => {
          const busy = busyId === row.id;

          return (
            <li key={row.id} className="rounded-xl border border-slate-200 border-t-4 border-t-gold bg-white p-4">
              <p className="font-semibold text-ink">{row.product_name}</p>
              <p className="text-xs text-slate-500">
                {row.seller_name ? `Sold by ${row.seller_name}` : "Sold by Sumus"}
              </p>

              <p className="mt-2 text-gold">
                {"★".repeat(row.rating)}
                <span className="text-slate-300">{"★".repeat(5 - row.rating)}</span>
              </p>
              {row.comment ? (
                <p className="mt-1 text-sm text-slate-700">{row.comment}</p>
              ) : (
                <p className="mt-1 text-sm text-slate-500">No comment.</p>
              )}

              <p className="mt-2 text-xs text-slate-500">
                {row.reviewer} ·{" "}
                {new Date(row.created_at).toLocaleDateString("en-NG", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
                {row.verified_purchase ? " · Verified purchase" : ""}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                {row.status === "pending" && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => moderate(row, "approve")}
                    className="rounded-full bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:bg-slate-300"
                  >
                    Approve
                  </button>
                )}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => moderate(row, "remove")}
                  className="rounded-full border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:text-slate-400"
                >
                  Remove
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

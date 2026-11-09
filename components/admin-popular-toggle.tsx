"use client";

import { useEffect, useState } from "react";
import { Notice } from "@/components/form-field";
import { supabase } from "@/lib/supabase";

type MainCategory = {
  id: string;
  name: string;
  slug: string;
  is_popular: boolean;
};

type Message = { tone: "error" | "info"; text: string } | null;

/** Lets the admin choose which main categories appear under "Popular Categories" in the mobile menu. */
export function AdminPopularToggle() {
  const [rows, setRows] = useState<MainCategory[] | null>(null);
  const [version, setVersion] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<Message>(null);

  useEffect(() => {
    let active = true;

    supabase
      .from("categories")
      .select("id, name, slug, is_popular")
      .is("parent_id", null)
      .order("sort_order", { ascending: true })
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          setMessage({ tone: "error", text: `Categories couldn't load. ${error.message}` });
          setRows([]);
          return;
        }
        setRows((data ?? []) as MainCategory[]);
      });

    return () => {
      active = false;
    };
  }, [version]);

  async function togglePopular(row: MainCategory) {
    setBusyId(row.id);
    setMessage(null);

    const { error } = await supabase
      .from("categories")
      .update({ is_popular: !row.is_popular })
      .eq("id", row.id);

    setBusyId(null);

    if (error) {
      setMessage({ tone: "error", text: `${row.name} couldn't be updated. ${error.message}` });
      return;
    }

    setMessage({
      tone: "info",
      text: row.is_popular
        ? `${row.name} is removed from Popular Categories.`
        : `${row.name} is now shown under Popular Categories.`,
    });
    setVersion((count) => count + 1);
  }

  const popularCount = (rows ?? []).filter((row) => row.is_popular).length;

  return (
    <section className="space-y-4 rounded-xl border border-slate-200 border-t-4 border-t-gold bg-white p-5">
      <div>
        <h2 className="text-lg font-bold text-ink">Popular Categories</h2>
        <p className="mt-1 text-sm text-slate-600">
          Switch on the main categories you want at the top of the mobile menu, under &quot;Popular
          Categories&quot;. Only main categories can be popular. Currently {popularCount} switched on.
        </p>
      </div>

      {message && <Notice tone={message.tone}>{message.text}</Notice>}
      {rows === null && <p className="text-sm text-slate-600">Loading categories…</p>}
      {rows !== null && rows.length === 0 && (
        <p className="text-sm text-slate-600">No main categories yet.</p>
      )}

      {rows !== null && rows.length > 0 && (
        <ul className="divide-y divide-slate-200">
          {rows.map((row) => {
            const busy = busyId === row.id;
            return (
              <li key={row.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="font-medium text-ink">{row.name}</p>
                  <p className="text-xs text-slate-500">/category/{row.slug}/</p>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => togglePopular(row)}
                  aria-pressed={row.is_popular}
                  className={`rounded-full px-4 py-2 text-sm font-semibold disabled:text-slate-400 ${
                    row.is_popular
                      ? "bg-blue-700 text-white hover:bg-blue-800"
                      : "border border-blue-700 text-blue-700 hover:bg-blue-50"
                  }`}
                >
                  {busy ? "Saving…" : row.is_popular ? "Popular: On" : "Popular: Off"}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

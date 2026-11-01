"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Row = {
  slug: string;
  display_name: string;
  kind: "business" | "individual";
  state: string;
  created_at: string;
};

export function SellersIndex() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;

    supabase
      .from("public_sellers")
      .select("slug, display_name, kind, state, created_at")
      .order("display_name", { ascending: true })
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          setFailed(true);
          setRows([]);
          return;
        }
        setRows((data ?? []) as Row[]);
      });

    return () => {
      active = false;
    };
  }, []);

  if (rows === null) {
    return <p className="text-sm text-slate-600">Loading sellers…</p>;
  }

  if (failed) {
    return <p className="text-sm text-slate-600">Sellers are unavailable right now. Please refresh the page shortly.</p>;
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
        <p className="font-semibold text-ink">No sellers yet.</p>
        <p className="mt-1 text-sm text-slate-600">Approved sellers appear here.</p>
      </div>
    );
  }

  return (
    <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {rows.map((row) => (
        <li key={row.slug}>
          <Link
            href={`/seller/${row.slug}/`}
            className="block rounded-xl border border-slate-200 border-t-4 border-t-gold bg-white p-5 hover:border-blue-700"
          >
            <p className="text-lg font-bold text-ink">{row.display_name}</p>
            <p className="mt-1 text-sm text-slate-600">
              {row.kind === "business" ? "Registered business" : "Individual seller"} · {row.state}
            </p>
            <p className="mt-4 text-sm font-semibold text-blue-700">Visit shop →</p>
          </Link>
        </li>
      ))}
    </ul>
  );
}

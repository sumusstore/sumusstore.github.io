"use client";

import { useEffect, useState } from "react";
import { Notice } from "@/components/form-field";
import { supabase } from "@/lib/supabase";

type Enquiry = {
  id: string;
  kind: "contact" | "bulk";
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  message: string;
  handled: boolean;
  created_at: string;
};

type Filter = "open" | "all";

/** Converts a Nigerian number such as 0806 504 7590 into the format WhatsApp links need. */
function whatsappNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("0") ? `234${digits.slice(1)}` : digits;
}

export function AdminEnquiries({ onChanged }: { onChanged: () => void }) {
  const [rows, setRows] = useState<Enquiry[] | null>(null);
  const [filter, setFilter] = useState<Filter>("open");
  const [reload, setReload] = useState(0);
  const [notice, setNotice] = useState<{ tone: "error" | "info"; text: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    supabase
      .from("enquiries")
      .select("id, kind, name, email, phone, company, message, handled, created_at")
      .order("created_at", { ascending: false })
      .limit(200)
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          setNotice({ tone: "error", text: "Enquiries couldn't load. Refresh the page to try again." });
          setRows([]);
          return;
        }
        setRows((data ?? []) as Enquiry[]);
      });

    return () => {
      active = false;
    };
  }, [reload]);

  async function setHandled(row: Enquiry, handled: boolean) {
    setBusyId(row.id);
    setNotice(null);
    const { error } = await supabase.from("enquiries").update({ handled }).eq("id", row.id);
    setBusyId(null);

    if (error) {
      setNotice({ tone: "error", text: "That couldn't be saved. Try again." });
      return;
    }
    setReload((current) => current + 1);
    onChanged();
  }

  const visible = (rows ?? []).filter((row) => filter === "all" || !row.handled);
  const openCount = (rows ?? []).filter((row) => !row.handled).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {(["open", "all"] as Filter[]).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            aria-pressed={filter === value}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              filter === value
                ? "bg-blue-700 text-white"
                : "border border-slate-300 text-ink hover:border-slate-500"
            }`}
          >
            {value === "open" ? `Needs a reply (${openCount})` : "All enquiries"}
          </button>
        ))}
      </div>

      {notice && <Notice tone={notice.tone}>{notice.text}</Notice>}
      {rows === null && <p className="text-sm text-slate-600">Loading enquiries…</p>}
      {rows !== null && visible.length === 0 && (
        <p className="text-sm text-slate-600">
          {filter === "open" ? "No enquiries waiting for a reply." : "No enquiries yet."}
        </p>
      )}

      <ul className="space-y-3">
        {visible.map((row) => {
          const busy = busyId === row.id;
          return (
            <li
              key={row.id}
              className="rounded-xl border border-slate-200 border-t-4 border-t-gold bg-white p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {row.kind === "bulk" ? "Bulk enquiry" : "Contact message"}
                  </p>
                  <p className="font-bold text-ink">
                    {row.name}
                    {row.company ? ` · ${row.company}` : ""}
                  </p>
                  <p className="text-xs text-slate-500">
                    {new Date(row.created_at).toLocaleString("en-NG", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    row.handled ? "bg-slate-100 text-slate-600" : "bg-gold/20 text-ink"
                  }`}
                >
                  {row.handled ? "Replied" : "Waiting"}
                </span>
              </div>

              <p className="mt-3 whitespace-pre-line rounded-lg bg-paper p-3 text-sm text-ink">
                {row.message}
              </p>

              <div className="mt-3 flex flex-wrap gap-4 text-sm font-semibold">
                <a
                  href={`mailto:${row.email}?subject=${encodeURIComponent("Re: your enquiry to Sumus")}`}
                  className="text-blue-700 hover:underline"
                >
                  Email {row.email}
                </a>
                {row.phone && (
                  <>
                    <a
                      href={`https://wa.me/${whatsappNumber(row.phone)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-700 hover:underline"
                    >
                      WhatsApp
                    </a>
                    <a href={`tel:${row.phone}`} className="text-blue-700 hover:underline">
                      Call
                    </a>
                  </>
                )}
              </div>

              <div className="mt-4">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setHandled(row, !row.handled)}
                  className="rounded-full border border-blue-700 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 disabled:border-slate-300 disabled:text-slate-400"
                >
                  {busy ? "Saving…" : row.handled ? "Mark as waiting again" : "Mark as replied"}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

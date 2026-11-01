"use client";

import { useEffect, useState } from "react";
import { Notice } from "@/components/form-field";
import { supabase } from "@/lib/supabase";

type Status = "pending" | "approved" | "rejected" | "suspended";
type Filter = Status | "all";

type DocRow = { id: string; doc_type: string; file_path: string };

type SellerRow = {
  id: string;
  kind: "business" | "individual";
  display_name: string;
  slug: string;
  business_name: string | null;
  registration_number: string | null;
  tax_id: string | null;
  owner_full_name: string;
  owner_phone: string;
  state: string;
  address: string;
  bank_name: string;
  account_name: string;
  account_number: string;
  status: Status;
  admin_note: string | null;
  terms_version: string;
  terms_accepted_at: string;
  created_at: string;
  seller_documents: DocRow[];
};

const FILTERS: { value: Filter; label: string }[] = [
  { value: "pending", label: "Waiting" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "suspended", label: "Suspended" },
  { value: "all", label: "All" },
];

const DOC_LABELS: Record<string, string> = {
  registration: "Registration certificate",
  owner_id: "Owner's ID",
  genuine_proof: "Proof of genuine products",
};

const STATUS_STYLE: Record<Status, string> = {
  pending: "bg-gold/20 text-ink",
  approved: "bg-blue-50 text-blue-700",
  rejected: "bg-red-50 text-red-700",
  suspended: "bg-slate-200 text-ink",
};

function dateText(iso: string): string {
  return new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
}

export function AdminSellers({ onChanged }: { onChanged: () => void }) {
  const [rows, setRows] = useState<SellerRow[] | null>(null);
  const [filter, setFilter] = useState<Filter>("pending");
  const [reload, setReload] = useState(0);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "error" | "info"; text: string } | null>(null);

  useEffect(() => {
    let active = true;

    supabase
      .from("sellers")
      .select("*, seller_documents(id, doc_type, file_path)")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          setNotice({ tone: "error", text: "Sellers couldn't load. Refresh the page to try again." });
          setRows([]);
          return;
        }
        setRows((data ?? []) as unknown as SellerRow[]);
      });

    return () => {
      active = false;
    };
  }, [reload]);

  async function openDocument(path: string) {
    // Open the tab first, so phone browsers don't block it while the link is prepared.
    const tab = window.open("", "_blank");
    const { data, error } = await supabase.storage.from("seller-documents").createSignedUrl(path, 300);
    if (error || !data) {
      tab?.close();
      setNotice({ tone: "error", text: "That document couldn't be opened. Try again." });
      return;
    }
    if (tab) {
      tab.location.href = data.signedUrl;
    } else {
      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    }
  }

  async function changeStatus(row: SellerRow, next: Status) {
    const note = (notes[row.id] ?? "").trim();

    if ((next === "rejected" || next === "suspended") && note.length < 5) {
      setNotice({ tone: "error", text: "Write a short reason first. The seller will see it." });
      return;
    }

    const questions: Record<Status, string> = {
      approved: `Approve ${row.display_name}? They can then sign in to the seller area. Sales need the payout account, which is set up in a later step.`,
      rejected: `Reject ${row.display_name}'s application? They will see your reason.`,
      suspended: `Suspend ${row.display_name}? They won't be able to sell until you reactivate them.`,
      pending: `Move ${row.display_name} back to waiting?`,
    };
    if (!window.confirm(questions[next])) return;

    setBusyId(row.id);
    setNotice(null);
    const { error } = await supabase
      .from("sellers")
      .update({
        status: next,
        admin_note: note || row.admin_note,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", row.id);
    setBusyId(null);

    if (error) {
      setNotice({ tone: "error", text: "That couldn't be saved. Try again." });
      return;
    }
    setNotice({ tone: "info", text: `${row.display_name} is now ${next}.` });
    setReload((count) => count + 1);
    onChanged();
  }

  const visible = (rows ?? []).filter((row) => filter === "all" || row.status === filter);
  const counts = (rows ?? []).reduce<Record<string, number>>((tally, row) => {
    tally[row.status] = (tally[row.status] ?? 0) + 1;
    return tally;
  }, {});

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
            {item.value !== "all" && counts[item.value] ? ` (${counts[item.value]})` : ""}
          </button>
        ))}
      </div>

      {notice && <Notice tone={notice.tone}>{notice.text}</Notice>}
      {rows === null && <p className="text-sm text-slate-600">Loading sellers…</p>}
      {rows !== null && visible.length === 0 && (
        <p className="text-sm text-slate-600">No applications in this view.</p>
      )}

      <ul className="space-y-4">
        {visible.map((row) => {
          const busy = busyId === row.id;

          return (
            <li key={row.id} className="rounded-xl border border-slate-200 border-t-4 border-t-gold bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-bold text-ink">{row.display_name}</p>
                  <p className="text-xs text-slate-500">
                    {row.kind === "business" ? "Registered business" : "Individual"} · applied{" "}
                    {dateText(row.created_at)} · link /seller/{row.slug}/
                  </p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLE[row.status]}`}>
                  {row.status}
                </span>
              </div>

              <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-slate-500">Owner</dt>
                  <dd className="font-medium text-ink">{row.owner_full_name}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Phone</dt>
                  <dd className="font-medium text-ink">
                    <a href={`tel:${row.owner_phone}`} className="hover:underline">
                      {row.owner_phone}
                    </a>
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Address</dt>
                  <dd className="font-medium text-ink">
                    {row.address}, {row.state}
                  </dd>
                </div>
                {row.kind === "business" && (
                  <div>
                    <dt className="text-slate-500">Business</dt>
                    <dd className="font-medium text-ink">
                      {row.business_name} · reg. {row.registration_number}
                      {row.tax_id ? ` · tax ${row.tax_id}` : ""}
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="text-slate-500">Bank</dt>
                  <dd className="font-medium text-ink">
                    {row.bank_name} · {row.account_name} · {row.account_number}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Terms</dt>
                  <dd className="font-medium text-ink">
                    {row.terms_version}, agreed {dateText(row.terms_accepted_at)}
                  </dd>
                </div>
              </dl>

              <div className="mt-4">
                <p className="text-sm font-semibold text-ink">Documents</p>
                {row.seller_documents.length === 0 ? (
                  <p className="mt-1 text-sm text-red-600">No documents on file. Ask the seller to re-upload.</p>
                ) : (
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {row.seller_documents.map((doc) => (
                      <li key={doc.id}>
                        <button
                          type="button"
                          onClick={() => openDocument(doc.file_path)}
                          className="rounded-full border border-blue-700 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
                        >
                          {DOC_LABELS[doc.doc_type] ?? doc.doc_type}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="mt-4">
                <label htmlFor={`note-${row.id}`} className="block text-sm font-medium text-ink">
                  Note for the seller (required to reject or suspend)
                </label>
                <textarea
                  id={`note-${row.id}`}
                  rows={2}
                  value={notes[row.id] ?? ""}
                  onChange={(event) => setNotes((current) => ({ ...current, [row.id]: event.target.value }))}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-700 focus:outline-none"
                />
                {row.admin_note && (
                  <p className="mt-1 text-xs text-slate-500">Last note: {row.admin_note}</p>
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {row.status !== "approved" && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => changeStatus(row, "approved")}
                    className="rounded-full bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:bg-slate-300"
                  >
                    {row.status === "suspended" ? "Reactivate" : "Approve"}
                  </button>
                )}
                {(row.status === "pending" || row.status === "approved") && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => changeStatus(row, "rejected")}
                    className="rounded-full border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:text-slate-400"
                  >
                    Reject
                  </button>
                )}
                {row.status === "approved" && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => changeStatus(row, "suspended")}
                    className="rounded-full border border-slate-400 px-4 py-2 text-sm font-semibold text-ink hover:border-slate-700 disabled:text-slate-400"
                  >
                    Suspend
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

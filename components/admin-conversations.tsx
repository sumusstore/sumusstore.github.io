"use client";

import { useCallback, useEffect, useState } from "react";
import { Notice } from "@/components/form-field";
import { supabase } from "@/lib/supabase";

type ConversationRow = {
  id: string;
  buyer_id: string;
  product_name: string;
  buyer_name: string;
  last_message_at: string;
  hidden_by_admin: boolean;
  sellers: { display_name: string } | null;
};

type MessageRow = {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

type Filter = "all" | "hidden";

const SELECT = "id, buyer_id, product_name, buyer_name, last_message_at, hidden_by_admin, sellers(display_name)";

function when(iso: string): string {
  return new Date(iso).toLocaleString("en-NG", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Lets Sumus read any buyer and seller conversation, and hide or restore it. */
export function AdminConversations() {
  const [rows, setRows] = useState<ConversationRow[] | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageRow[] | null>(null);
  const [notice, setNotice] = useState<{ tone: "error" | "info"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const loadList = useCallback(async () => {
    const { data, error } = await supabase
      .from("conversations")
      .select(SELECT)
      .not("last_sender_id", "is", null)
      .order("last_message_at", { ascending: false })
      .limit(200);

    if (error) {
      setNotice({ tone: "error", text: `Conversations couldn't load: ${error.message}` });
      setRows([]);
      return;
    }
    setRows((data ?? []) as unknown as ConversationRow[]);
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    if (!openId) {
      setMessages(null);
      return;
    }

    let active = true;
    supabase
      .from("messages")
      .select("id, sender_id, body, created_at")
      .eq("conversation_id", openId)
      .order("created_at", { ascending: true })
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          setNotice({ tone: "error", text: `Messages couldn't load: ${error.message}` });
          setMessages([]);
          return;
        }
        setMessages((data ?? []) as MessageRow[]);
      });

    return () => {
      active = false;
    };
  }, [openId]);

  async function setHidden(row: ConversationRow, hidden: boolean) {
    setBusy(true);
    setNotice(null);
    const { error } = await supabase.rpc("admin_set_conversation_hidden", {
      p_conversation_id: row.id,
      p_hidden: hidden,
    });
    setBusy(false);

    if (error) {
      setNotice({ tone: "error", text: `That couldn't be saved: ${error.message}` });
      return;
    }

    setNotice({
      tone: "info",
      text: hidden ? "Conversation hidden from the buyer and seller." : "Conversation restored.",
    });
    await loadList();
  }

  const current = openId ? (rows ?? []).find((row) => row.id === openId) : undefined;

  if (openId && current) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => {
            setOpenId(null);
            setNotice(null);
          }}
          className="text-sm font-semibold text-blue-700 hover:underline"
        >
          ← All conversations
        </button>

        {notice && <Notice tone={notice.tone}>{notice.text}</Notice>}

        <div className="rounded-xl border border-slate-200 border-t-4 border-t-gold bg-white p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-bold text-ink">{current.product_name}</p>
              <p className="text-sm text-slate-600">
                Buyer: {current.buyer_name} · Seller: {current.sellers?.display_name ?? "Seller"}
              </p>
              {current.hidden_by_admin && (
                <span className="mt-2 inline-block rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700">
                  Hidden
                </span>
              )}
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() => setHidden(current, !current.hidden_by_admin)}
              className="rounded-full border border-blue-700 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-60"
            >
              {busy ? "Saving…" : current.hidden_by_admin ? "Restore conversation" : "Hide conversation"}
            </button>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            A hidden conversation disappears from the buyer&apos;s and seller&apos;s inboxes, and neither can send
            in it. You can still read it here.
          </p>
        </div>

        <div className="space-y-2 rounded-xl border border-slate-200 bg-paper p-4">
          {messages === null && <p className="text-sm text-slate-600">Loading messages…</p>}
          {messages !== null && messages.length === 0 && (
            <p className="text-sm text-slate-600">No messages in this conversation.</p>
          )}
          {(messages ?? []).map((message) => {
            const fromBuyer = message.sender_id === current.buyer_id;
            return (
              <div
                key={message.id}
                className={`max-w-[85%] rounded-2xl border px-3.5 py-2 text-sm ${
                  fromBuyer
                    ? "border-slate-200 bg-white text-ink"
                    : "ml-auto border-blue-200 bg-blue-50 text-ink"
                }`}
              >
                <p className="text-xs font-semibold text-slate-600">
                  {fromBuyer ? `Buyer (${current.buyer_name})` : `Seller (${current.sellers?.display_name ?? "Seller"})`}
                  {" · "}
                  {when(message.created_at)}
                </p>
                <p className="mt-1 whitespace-pre-wrap break-words">{message.body}</p>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const all = rows ?? [];
  const visible = filter === "hidden" ? all.filter((row) => row.hidden_by_admin) : all;
  const hiddenCount = all.filter((row) => row.hidden_by_admin).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setFilter("all")}
          aria-pressed={filter === "all"}
          className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
            filter === "all" ? "bg-blue-700 text-white" : "border border-slate-300 text-slate-700"
          }`}
        >
          All ({all.length})
        </button>
        <button
          type="button"
          onClick={() => setFilter("hidden")}
          aria-pressed={filter === "hidden"}
          className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
            filter === "hidden" ? "bg-blue-700 text-white" : "border border-slate-300 text-slate-700"
          }`}
        >
          Hidden ({hiddenCount})
        </button>
      </div>

      {notice && <Notice tone={notice.tone}>{notice.text}</Notice>}
      {rows === null && <p className="text-sm text-slate-600">Loading conversations…</p>}
      {rows !== null && visible.length === 0 && (
        <p className="text-sm text-slate-600">
          {filter === "hidden" ? "No hidden conversations." : "No conversations yet."}
        </p>
      )}

      <ul className="space-y-2">
        {visible.map((row) => (
          <li key={row.id}>
            <button
              type="button"
              onClick={() => {
                setOpenId(row.id);
                setNotice(null);
              }}
              className="w-full rounded-xl border border-slate-200 bg-white p-4 text-left hover:bg-paper"
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="truncate font-semibold text-ink">{row.product_name}</span>
                <span className="shrink-0 text-xs text-slate-500">{when(row.last_message_at)}</span>
              </div>
              <p className="mt-1 text-sm text-slate-600">
                {row.buyer_name} with {row.sellers?.display_name ?? "Seller"}
                {row.hidden_by_admin && (
                  <span className="ml-2 rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">
                    Hidden
                  </span>
                )}
              </p>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

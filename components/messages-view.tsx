"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Notice } from "@/components/form-field";
import { useAuth } from "@/hooks/use-auth";
import {
  CONVERSATION_SELECT,
  announceMessagesChanged,
  fetchMySellerId,
  toConversation,
  useConversations,
  type Conversation,
  type ConversationRow,
} from "@/hooks/use-conversations";
import { supabase } from "@/lib/supabase";

const MAX_LENGTH = 2000;
const REFRESH_MS = 20000;

type MessageRow = {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

function sameDay(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString();
}

function shortTime(iso: string): string {
  const date = new Date(iso);
  if (sameDay(date, new Date())) {
    return date.toLocaleTimeString("en-NG", { hour: "numeric", minute: "2-digit" });
  }
  return date.toLocaleDateString("en-NG", { day: "numeric", month: "short" });
}

function dayLabel(iso: string): string {
  const date = new Date(iso);
  if (sameDay(date, new Date())) return "Today";
  return date.toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
}

function PageBand({ title }: { title: string }) {
  return (
    <section className="bg-blue-700 text-white">
      <div className="mx-auto max-w-3xl px-4 py-8 md:py-10">
        <h1 className="text-3xl font-bold">{title}</h1>
        <span aria-hidden="true" className="mt-4 block h-1 w-16 rounded bg-gold" />
      </div>
    </section>
  );
}

function Avatar({ name }: { name: string }) {
  return (
    <span
      aria-hidden="true"
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-700 text-base font-bold text-white"
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

function InboxRow({ item }: { item: Conversation }) {
  return (
    <li>
      <Link
        href={`/messages/?c=${item.id}`}
        className="flex items-start gap-3 border-b border-slate-200 px-4 py-3 last:border-b-0 hover:bg-paper"
      >
        <Avatar name={item.otherName} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className={`truncate text-ink ${item.unread ? "font-bold" : "font-semibold"}`}>
              {item.otherName}
            </span>
            <span className="shrink-0 text-xs text-slate-500">{shortTime(item.lastMessageAt)}</span>
          </div>
          <p className="truncate text-sm text-slate-600">{item.productName}</p>
          <p className="mt-0.5 text-xs text-slate-500">
            {item.role === "buyer" ? "You are the buyer" : "You are the seller"}
          </p>
        </div>
        {item.unread && (
          <span
            role="img"
            aria-label="Unread"
            className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-blue-700"
          />
        )}
      </Link>
    </li>
  );
}

function InboxView() {
  const { conversations, status, unreadCount } = useConversations();
  const [tab, setTab] = useState<"all" | "unread">("all");

  const shown = tab === "unread" ? conversations.filter((item) => item.unread) : conversations;

  return (
    <>
      <PageBand title="Messages" />
      <section className="mx-auto max-w-3xl px-4 py-6">
        <div className="flex gap-6 border-b border-slate-200 text-sm">
          <button
            type="button"
            onClick={() => setTab("all")}
            aria-pressed={tab === "all"}
            className={`-mb-px border-b-4 py-2 font-semibold ${
              tab === "all" ? "border-gold text-ink" : "border-transparent text-slate-600"
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setTab("unread")}
            aria-pressed={tab === "unread"}
            className={`-mb-px border-b-4 py-2 font-semibold ${
              tab === "unread" ? "border-gold text-ink" : "border-transparent text-slate-600"
            }`}
          >
            Unread ({unreadCount})
          </button>
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 border-t-4 border-t-gold bg-white">
          {status === "loading" && <p className="p-5 text-sm text-slate-600">Loading your messages…</p>}
          {status === "error" && (
            <p className="p-5 text-sm text-slate-600">
              Your messages are unavailable right now. Please refresh the page shortly.
            </p>
          )}
          {status === "ready" && shown.length === 0 && (
            <div className="p-5 text-sm text-slate-600">
              <p>{tab === "unread" ? "No unread messages." : "No messages yet."}</p>
              {tab === "all" && (
                <p className="mt-2">
                  To ask a seller about an item, open the product and tap Message.{" "}
                  <Link href="/shop/" className="font-semibold text-blue-700 hover:underline">
                    Browse products
                  </Link>
                </p>
              )}
            </div>
          )}
          {status === "ready" && shown.length > 0 && (
            <ul>
              {shown.map((item) => (
                <InboxRow key={item.id} item={item} />
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}

type ThreadStatus = "loading" | "ready" | "missing" | "error";

function ThreadView({ id }: { id: string }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [status, setStatus] = useState<ThreadStatus>("loading");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    if (!userId) return;

    const mySellerId = await fetchMySellerId(userId);
    const conversationResult = await supabase
      .from("conversations")
      .select(CONVERSATION_SELECT)
      .eq("id", id)
      .maybeSingle();

    if (!mounted.current) return;

    if (conversationResult.error) {
      setStatus("error");
      return;
    }

    const mine = conversationResult.data
      ? toConversation(conversationResult.data as unknown as ConversationRow, userId, mySellerId)
      : null;

    if (!mine) {
      setStatus("missing");
      return;
    }

    const messageResult = await supabase
      .from("messages")
      .select("id, sender_id, body, created_at")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true });

    if (!mounted.current) return;

    if (messageResult.error) {
      setStatus("error");
      return;
    }

    setConversation(mine);
    setMessages((messageResult.data ?? []) as MessageRow[]);
    setStatus("ready");

    if (mine.unread) {
      const { error: readError } = await supabase.rpc("mark_conversation_read", {
        p_conversation_id: id,
      });
      if (!readError) announceMessagesChanged();
    }
  }, [id, userId]);

  useEffect(() => {
    void load();

    // Checks for new messages now and then while the page is open.
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, REFRESH_MS);

    return () => window.clearInterval(timer);
  }, [load]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  async function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = body.trim();

    if (!text) {
      setError("Write a message first.");
      return;
    }

    setSending(true);
    setError(null);
    const { error: sendError } = await supabase.rpc("send_message", {
      p_conversation_id: id,
      p_body: text,
    });
    setSending(false);

    if (sendError) {
      setError(sendError.message);
      return;
    }

    setBody("");
    await load();
    announceMessagesChanged();
  }

  if (status === "loading") {
    return <p className="mx-auto max-w-3xl px-4 py-12 text-sm text-slate-600">Loading this conversation…</p>;
  }

  if (status === "error") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-sm text-slate-600">
        <p>This conversation couldn&apos;t be loaded. Please refresh the page shortly.</p>
        <Link href="/messages/" className="mt-3 inline-block font-semibold text-blue-700 hover:underline">
          Back to messages
        </Link>
      </div>
    );
  }

  if (status === "missing" || !conversation) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-sm text-slate-600">
        <p>This conversation isn&apos;t available.</p>
        <Link href="/messages/" className="mt-3 inline-block font-semibold text-blue-700 hover:underline">
          Back to messages
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-4">
      <Link href="/messages/" className="text-sm font-semibold text-blue-700 hover:underline">
        ← Messages
      </Link>

      <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 border-t-4 border-t-gold bg-white">
        <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
          <Avatar name={conversation.otherName} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold text-ink">{conversation.otherName}</p>
            <p className="text-xs text-slate-500">
              {conversation.role === "buyer" ? "Seller on Sumus" : "Buyer"}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-paper px-4 py-2.5">
          <p className="min-w-0 truncate text-sm text-ink">{conversation.productName}</p>
          {conversation.productSlug && (
            <Link
              href={`/product/${conversation.productSlug}/`}
              className="shrink-0 text-sm font-semibold text-blue-700 hover:underline"
            >
              View item
            </Link>
          )}
        </div>

        <div className="min-h-[40vh] bg-paper px-4 py-4">
          {messages.length === 0 && (
            <p className="text-center text-sm text-slate-600">No messages yet. Say hello below.</p>
          )}
          {messages.map((message, index) => {
            const mine = message.sender_id === userId;
            const previous = messages[index - 1];
            const newDay = !previous || !sameDay(new Date(previous.created_at), new Date(message.created_at));

            return (
              <div key={message.id}>
                {newDay && (
                  <p className="my-3 text-center text-xs text-slate-500">{dayLabel(message.created_at)}</p>
                )}
                <div className={`mb-2 flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                      mine
                        ? "rounded-br-sm bg-blue-700 text-white"
                        : "rounded-bl-sm border border-slate-200 bg-white text-ink"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{message.body}</p>
                    <p className={`mt-1 text-right text-xs ${mine ? "text-blue-100" : "text-slate-500"}`}>
                      {new Date(message.created_at).toLocaleTimeString("en-NG", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>

        <form onSubmit={handleSend} className="space-y-2 border-t border-slate-200 p-3">
          {error && <Notice tone="error">{error}</Notice>}
          <label htmlFor="message-body" className="sr-only">
            Message
          </label>
          <div className="flex items-end gap-2">
            <textarea
              id="message-body"
              value={body}
              onChange={(event) => {
                setBody(event.target.value);
                if (error) setError(null);
              }}
              maxLength={MAX_LENGTH}
              rows={2}
              placeholder="Write a message"
              className="min-w-0 flex-1 resize-none rounded-2xl border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
            />
            <button
              type="submit"
              disabled={sending}
              className="shrink-0 rounded-full bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:bg-slate-300"
            >
              {sending ? "Sending…" : "Send"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function MessagesView() {
  const params = useSearchParams();
  const id = params.get("c");

  return id ? <ThreadView id={id} /> : <InboxView />;
}

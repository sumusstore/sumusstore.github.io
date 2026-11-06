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
import { formatNaira } from "@/lib/format";

const MAX_LENGTH = 2000;
const REFRESH_MS = 20000;

type MessageRow = {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

type OfferRow = {
  id: string;
  conversation_id: string;
  variant_id: string;
  buyer_id: string;
  seller_id: string;
  amount_kobo: number;
  listed_price_kobo: number;
  made_by: "buyer" | "seller";
  parent_offer_id: string | null;
  status: "pending" | "accepted" | "declined" | "countered" | "withdrawn" | "expired" | "used";
  expires_at: string;
  created_at: string;
};

type ProductVariantInfo = {
  id: string;
  storage: string | null;
  colour: string | null;
  price_kobo: number;
  stock_qty: number;
  is_active: boolean;
  product_id: string;
  product_name: string;
  accepts_offers: boolean;
  product_active: boolean;
  moderation: string;
  seller_paused: boolean | null;
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
  const [offers, setOffers] = useState<OfferRow[]>([]);
  const [variants, setVariants] = useState<ProductVariantInfo[]>([]);
  const [status, setStatus] = useState<ThreadStatus>("loading");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Offer modal / action states
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [offerAmountInput, setOfferAmountInput] = useState("");
  const [offerActionBusy, setOfferActionBusy] = useState(false);
  const [counterInputMap, setCounterInputMap] = useState<Record<string, string>>({});
  const [activeCounterOfferId, setActiveCounterOfferId] = useState<string | null>(null);

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

    const [messageResult, offerResult, variantResult] = await Promise.all([
      supabase
        .from("messages")
        .select("id, sender_id, body, created_at")
        .eq("conversation_id", id)
        .order("created_at", { ascending: true }),
      supabase
        .from("offers")
        .select("*")
        .eq("conversation_id", id)
        .order("created_at", { ascending: true }),
      supabase
        .from("product_variants")
        .select("id, storage, colour, price_kobo, stock_qty, is_active, products(id, name, accepts_offers, is_active, moderation, seller_paused)")
        .eq("product_id", mine.productId),
    ]);

    if (!mounted.current) return;

    if (messageResult.error || offerResult.error) {
      setStatus("error");
      return;
    }

    setConversation(mine);
    setMessages((messageResult.data ?? []) as MessageRow[]);
    setOffers((offerResult.data ?? []) as OfferRow[]);

    if (variantResult.data) {
      const formattedVariants: ProductVariantInfo[] = variantResult.data.map((v: any) => ({
        id: v.id,
        storage: v.storage,
        colour: v.colour,
        price_kobo: v.price_kobo,
        stock_qty: v.stock_qty,
        is_active: v.is_active,
        product_id: v.products.id,
        product_name: v.products.name,
        accepts_offers: v.products.accepts_offers,
        product_active: v.products.is_active,
        moderation: v.products.moderation,
        seller_paused: v.products.seller_paused,
      }));
      setVariants(formattedVariants);
      if (formattedVariants.length > 0 && !selectedVariantId) {
        setSelectedVariantId(formattedVariants[0].id);
      }
    }

    setStatus("ready");

    if (mine.unread) {
      const { error: readError } = await supabase.rpc("mark_conversation_read", {
        p_conversation_id: id,
      });
      if (!readError) announceMessagesChanged();
    }
  }, [id, userId, selectedVariantId]);

  useEffect(() => {
    void load();

    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, REFRESH_MS);

    return () => window.clearInterval(timer);
  }, [load]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, offers.length]);

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

  async function handleMakeOffer(e: FormEvent) {
    e.preventDefault();
    const amountNaira = parseFloat(offerAmountInput);
    if (isNaN(amountNaira) || amountNaira <= 0) {
      setError("Please enter a valid offer amount.");
      return;
    }
    const amountKobo = Math.round(amountNaira * 100);

    setOfferActionBusy(true);
    setError(null);
    const { error: rpcError } = await supabase.rpc("make_offer", {
      p_conversation_id: id,
      p_variant_id: selectedVariantId,
      p_amount_kobo: amountKobo,
    });
    setOfferActionBusy(false);

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    setShowOfferModal(false);
    setOfferAmountInput("");
    await load();
  }

  async function handleRespond(offerId: string, action: "accept" | "decline" | "counter", counterAmountNaira?: string) {
    let amountKobo = null;
    if (action === "counter") {
      const val = parseFloat(counterAmountNaira ?? "");
      if (isNaN(val) || val <= 0) {
        setError("Please enter a valid counter-offer amount.");
        return;
      }
      amountKobo = Math.round(val * 100);
    }

    setOfferActionBusy(true);
    setError(null);
    const { error: rpcError } = await supabase.rpc("respond_to_offer", {
      p_offer_id: offerId,
      p_action: action,
      p_amount_kobo: amountKobo,
    });
    setOfferActionBusy(false);

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    setActiveCounterOfferId(null);
    await load();
  }

  async function handleWithdraw(offerId: string) {
    setOfferActionBusy(true);
    setError(null);
    const { error: rpcError } = await supabase.rpc("withdraw_offer", {
      p_offer_id: offerId,
    });
    setOfferActionBusy(false);

    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    await load();
  }

  if (status === "loading") {
    return <p className="mx-auto max-w-3xl px-4 py-12 text-sm text-slate-600">Loading this conversation…</p>;
  }

  if (status === "error" || status === "missing" || !conversation) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-sm text-slate-600">
        <p>This conversation isn&apos;t available or couldn&apos;t be loaded.</p>
        <Link href="/messages/" className="mt-3 inline-block font-semibold text-blue-700 hover:underline">
          Back to messages
        </Link>
      </div>
    );
  }

  const isBuyer = conversation.role === "buyer";
  const canOffer = isBuyer && variants.some((v) => v.accepts_offers && v.product_active && v.is_active && v.moderation === "live" && !v.seller_paused && v.stock_qty > 0);

  return (
    <div className="mx-auto max-w-3xl px-4 py-4">
      <div className="flex items-center justify-between">
        <Link href="/messages/" className="text-sm font-semibold text-blue-700 hover:underline">
          ← Messages
        </Link>
        {canOffer && (
          <button
            type="button"
            onClick={() => setShowOfferModal(true)}
            className="rounded-full bg-gold px-4 py-1.5 text-xs font-bold text-ink hover:bg-amber-500"
          >
            Make an Offer
          </button>
        )}
      </div>

      <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 border-t-4 border-t-gold bg-white">
        <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
          <Avatar name={conversation.otherName} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold text-ink">{conversation.otherName}</p>
            <p className="text-xs text-slate-500">
              {isBuyer ? "Seller on Sumus" : "Buyer"}
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

        {/* Modal for making an offer */}
        {showOfferModal && (
          <div className="border-b border-amber-200 bg-amber-50 p-4">
            <h3 className="text-sm font-bold text-ink">Make an Offer</h3>
            <form onSubmit={handleMakeOffer} className="mt-3 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700">Choose version</label>
                <select
                  value={selectedVariantId}
                  onChange={(e) => setSelectedVariantId(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  {variants.map((v) => (
                    <option key={v.id} value={v.id}>
                      {[v.storage, v.colour].filter(Boolean.parse ? Boolean : Boolean).join(" - ")} ({formatNaira(v.price_kobo)})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">Your Offer Amount (₦)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="e.g. 95000"
                  value={offerAmountInput}
                  onChange={(e) => setOfferAmountInput(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={offerActionBusy}
                  className="rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800"
                >
                  {offerActionBusy ? "Submitting..." : "Submit Offer"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowOfferModal(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="min-h-[40vh] bg-paper px-4 py-4 space-y-4">
          {messages.length === 0 && offers.length === 0 && (
            <p className="text-center text-sm text-slate-600">No messages or offers yet. Say hello or make an offer below.</p>
          )}

          {/* Render offers inline */}
          {offers.map((offer) => {
            const vInfo = variants.find((v) => v.id === offer.variant_id);
            const isMineMade = offer.buyer_id === userId && offer.made_by === 'buyer' || (!isBuyer && offer.made_by === 'seller');
            const canRespond = offer.status === 'pending' && !isMineMade;

            return (
              <div key={offer.id} className="my-3 rounded-xl border border-amber-300 bg-amber-50 p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="rounded bg-gold px-2 py-0.5 text-[10px] font-bold uppercase text-ink">
                    Offer: {offer.status}
                  </span>
                  <span className="text-xs text-slate-500">{shortTime(offer.created_at)}</span>
                </div>
                <div className="mt-2 text-sm text-ink">
                  <p className="font-semibold">
                    {vInfo ? [vInfo.storage, vInfo.colour].filter(Boolean).join(" - ") : "Item Variant"}
                  </p>
                  <p className="mt-1">
                    Offered Amount: <span className="font-bold text-blue-700">{formatNaira(offer.amount_kobo)}</span>{" "}
                    <span className="text-xs text-slate-500">(Listed: {formatNaira(offer.listed_price_kobo)})</span>
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Proposed by {offer.made_by === 'buyer' ? 'Buyer' : 'Seller'} • Expires {new Date(offer.expires_at).toLocaleString("en-NG")}
                  </p>
                </div>

                {/* Offer Action Buttons */}
                {offer.status === 'pending' && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 pt-2 border-t border-amber-200">
                    {canRespond && (
                      <>
                        <button
                          type="button"
                          disabled={offerActionBusy}
                          onClick={() => handleRespond(offer.id, 'accept')}
                          className="rounded bg-green-700 px-3 py-1 text-xs font-bold text-white hover:bg-green-800"
                        >
                          Accept
                        </button>
                        <button
                          type="button"
                          disabled={offerActionBusy}
                          onClick={() => handleRespond(offer.id, 'decline')}
                          className="rounded bg-red-600 px-3 py-1 text-xs font-bold text-white hover:bg-red-700"
                        >
                          Decline
                        </button>
                        <button
                          type="button"
                          disabled={offerActionBusy}
                          onClick={() => setActiveCounterOfferId(activeCounterOfferId === offer.id ? null : offer.id)}
                          className="rounded border border-slate-400 bg-white px-3 py-1 text-xs font-semibold text-slate-800 hover:bg-slate-100"
                        >
                          Counter
                        </button>
                      </>
                    )}
                    {isMineMade && (
                      <button
                        type="button"
                        disabled={offerActionBusy}
                        onClick={() => handleWithdraw(offer.id)}
                        className="rounded border border-red-300 bg-white px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                      >
                        Withdraw Offer
                      </button>
                    )}
                  </div>
                )}

                {/* Counter Input Form */}
                {activeCounterOfferId === offer.id && (
                  <div className="mt-3 flex items-center gap-2 pt-2 border-t border-amber-200">
                    <input
                      type="number"
                      placeholder="Counter amount (₦)"
                      value={counterInputMap[offer.id] ?? ""}
                      onChange={(e) => setCounterInputMap({ ...counterInputMap, [offer.id]: e.target.value })}
                      className="rounded border border-slate-300 bg-white px-2 py-1 text-xs"
                    />
                    <button
                      type="button"
                      disabled={offerActionBusy}
                      onClick={() => handleRespond(offer.id, 'counter', counterInputMap[offer.id])}
                      className="rounded bg-blue-700 px-3 py-1 text-xs font-bold text-white hover:bg-blue-800"
                    >
                      Send Counter
                    </button>
                  </div>
                )}

                {offer.status === 'accepted' && (
                  <p className="mt-2 text-xs font-semibold text-green-700">
                    ✓ Offer Accepted! You can proceed to checkout at this negotiated price.
                  </p>
                )}
              </div>
            );
          })}

          {/* Regular Messages */}
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

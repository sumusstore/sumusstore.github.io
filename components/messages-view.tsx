"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
import { nairaToKobo } from "@/lib/admin-utils";
import { formatNaira } from "@/lib/format";
import { OFFER_RULES } from "@/lib/store-policies";
import { supabase } from "@/lib/supabase";
import { useCartStore } from "@/stores/cart-store";

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

type OfferStatus = "pending" | "accepted" | "declined" | "countered" | "withdrawn" | "expired" | "used";

type OfferRow = {
  id: string;
  variant_id: string;
  buyer_id: string;
  seller_id: string;
  amount_kobo: number;
  listed_price_kobo: number;
  made_by: "buyer" | "seller";
  parent_offer_id: string | null;
  status: OfferStatus;
  expires_at: string;
  created_at: string;
};

type VariantRow = {
  id: string;
  storage: string | null;
  colour: string | null;
  price_kobo: number;
  stock_qty: number;
  is_active: boolean;
};

type TimelineItem =
  | { kind: "message"; at: string; message: MessageRow }
  | { kind: "offer"; at: string; offer: OfferRow };

function variantLabel(variant: VariantRow | undefined): string {
  if (!variant) return "This item";
  return [variant.storage, variant.colour].filter(Boolean).join(" · ") || "Standard";
}

/** A pending or accepted offer past its time counts as expired, even before the database job marks it. */
function effectiveStatus(offer: OfferRow): OfferStatus {
  if ((offer.status === "pending" || offer.status === "accepted") && new Date(offer.expires_at).getTime() <= Date.now()) {
    return "expired";
  }
  return offer.status;
}

function timeLeft(iso: string): string | null {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return null;
  const minutes = Math.ceil(ms / 60000);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  const hours = Math.floor(minutes / 60);
  return `${hours} hour${hours === 1 ? "" : "s"}`;
}

function dateTimeLabel(iso: string): string {
  return new Date(iso).toLocaleString("en-NG", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

const STATUS_LABELS: Record<OfferStatus, string> = {
  pending: "Waiting for a reply",
  accepted: "Accepted",
  declined: "Declined",
  countered: "Countered",
  withdrawn: "Withdrawn",
  expired: "Expired",
  used: "Used for an order",
};

type ThreadStatus = "loading" | "ready" | "missing" | "error";

function ThreadView({ id, offerVariant }: { id: string; offerVariant: string | null }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [offers, setOffers] = useState<OfferRow[]>([]);
  const [variants, setVariants] = useState<VariantRow[]>([]);
  const [acceptsOffers, setAcceptsOffers] = useState(false);
  const [productImage, setProductImage] = useState<string | null>(null);
  const router = useRouter();
  const addOfferItem = useCartStore((state) => state.addOfferItem);
  const [status, setStatus] = useState<ThreadStatus>("loading");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [composerOpen, setComposerOpen] = useState(false);
  const [composerVariant, setComposerVariant] = useState("");
  const [composerAmount, setComposerAmount] = useState("");
  const [counterFor, setCounterFor] = useState<string | null>(null);
  const [counterAmount, setCounterAmount] = useState("");
  const [offerBusy, setOfferBusy] = useState<string | null>(null);
  const [offerError, setOfferError] = useState<string | null>(null);

  const endRef = useRef<HTMLDivElement | null>(null);
  const mounted = useRef(true);
  const seeded = useRef(false);

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

    const [messageResult, offerResult, productResult, variantResult] = await Promise.all([
      supabase
        .from("messages")
        .select("id, sender_id, body, created_at")
        .eq("conversation_id", id)
        .order("created_at", { ascending: true }),
      supabase
        .from("offers")
        .select(
          "id, variant_id, buyer_id, seller_id, amount_kobo, listed_price_kobo, made_by, parent_offer_id, status, expires_at, created_at"
        )
        .eq("conversation_id", id)
        .order("created_at", { ascending: true }),
      mine.productId
        ? supabase
            .from("products")
            .select("accepts_offers, product_images(image_url, position)")
            .eq("id", mine.productId)
            .maybeSingle()
        : Promise.resolve(null),
      mine.productId
        ? supabase
            .from("product_variants")
            .select("id, storage, colour, price_kobo, stock_qty, is_active")
            .eq("product_id", mine.productId)
        : Promise.resolve(null),
    ]);

    if (!mounted.current) return;

    if (messageResult.error) {
      setStatus("error");
      return;
    }

    setConversation(mine);
    setMessages((messageResult.data ?? []) as MessageRow[]);
    // Offers are optional: if they can't load, messaging still works.
    setOffers(offerResult.error ? [] : ((offerResult.data ?? []) as OfferRow[]));
    const productData =
      !productResult || productResult.error
        ? null
        : (productResult.data as {
            accepts_offers: boolean;
            product_images: { image_url: string; position: number }[];
          } | null);
    setAcceptsOffers(productData?.accepts_offers === true);
    setProductImage(
      [...(productData?.product_images ?? [])].sort((a, b) => a.position - b.position)[0]?.image_url ?? null
    );
    setVariants(
      variantResult && !variantResult.error ? ((variantResult.data ?? []) as VariantRow[]) : []
    );
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

    // Checks for new messages and offers now and then while the page is open.
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, REFRESH_MS);

    return () => window.clearInterval(timer);
  }, [load]);

  const timeline: TimelineItem[] = [
    ...messages.map((message): TimelineItem => ({ kind: "message", at: message.created_at, message })),
    ...offers.map((offer): TimelineItem => ({ kind: "offer", at: offer.created_at, offer })),
  ].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [timeline.length]);

  const isBuyer = conversation?.role === "buyer";
  const offerChoices = variants.filter((variant) => variant.is_active && variant.stock_qty > 0);
  const canOffer = isBuyer && acceptsOffers && offerChoices.length > 0;
  const chosenVariantId = offerChoices.some((variant) => variant.id === composerVariant)
    ? composerVariant
    : (offerChoices[0]?.id ?? "");

  // Opens the offer form once when the buyer arrives from "Make an offer" on the product page.
  useEffect(() => {
    if (seeded.current || status !== "ready" || !offerVariant) return;
    seeded.current = true;
    if (!canOffer) return;
    setComposerOpen(true);
    if (offerChoices.some((variant) => variant.id === offerVariant)) setComposerVariant(offerVariant);
  }, [status, offerVariant, canOffer, offerChoices]);

  const usedForChosen = offers.filter(
    (offer) => offer.variant_id === chosenVariantId && offer.made_by === "buyer"
  ).length;
  const openForChosen = offers.some(
    (offer) =>
      offer.variant_id === chosenVariantId &&
      (effectiveStatus(offer) === "pending" || effectiveStatus(offer) === "accepted")
  );

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

  async function callOffer(
    busyKey: string,
    run: () => PromiseLike<{ error: { message: string } | null }>
  ): Promise<boolean> {
    setOfferBusy(busyKey);
    setOfferError(null);
    const { error: offerCallError } = await run();
    setOfferBusy(null);

    if (offerCallError) {
      setOfferError(offerCallError.message);
      return false;
    }

    await load();
    announceMessagesChanged();
    return true;
  }

  async function handleMakeOffer() {
    const kobo = nairaToKobo(composerAmount);
    if (!kobo || kobo < 1) {
      setOfferError("Enter your offer in naira.");
      return;
    }
    if (!chosenVariantId) {
      setOfferError("Choose a version first.");
      return;
    }

    const done = await callOffer("new", () =>
      supabase.rpc("make_offer", {
        p_conversation_id: id,
        p_variant_id: chosenVariantId,
        p_amount_kobo: kobo,
      })
    );
    if (done) {
      setComposerOpen(false);
      setComposerAmount("");
    }
  }

  async function handleAnswer(offer: OfferRow, action: "accept" | "decline") {
    await callOffer(offer.id, () =>
      supabase.rpc("respond_to_offer", { p_offer_id: offer.id, p_action: action })
    );
  }

  async function handleCounter(offer: OfferRow) {
    const kobo = nairaToKobo(counterAmount);
    if (!kobo || kobo < 1) {
      setOfferError("Enter your counter offer in naira.");
      return;
    }

    const done = await callOffer(offer.id, () =>
      supabase.rpc("respond_to_offer", {
        p_offer_id: offer.id,
        p_action: "counter",
        p_amount_kobo: kobo,
      })
    );
    if (done) {
      setCounterFor(null);
      setCounterAmount("");
    }
  }

  async function handleWithdraw(offer: OfferRow) {
    await callOffer(offer.id, () => supabase.rpc("withdraw_offer", { p_offer_id: offer.id }));
  }

  function handlePay(offer: OfferRow) {
    const variant = variants.find((item) => item.id === offer.variant_id);

    if (!variant || variant.stock_qty < 1 || !conversation?.productId || !conversation.productSlug) {
      setOfferError("This item can't be added to your cart right now.");
      return;
    }

    addOfferItem({
      variantId: variant.id,
      productId: conversation.productId,
      slug: conversation.productSlug,
      name: conversation.productName,
      variantLabel: variantLabel(variant),
      imageUrl: productImage,
      unitPriceKobo: Math.min(offer.amount_kobo, variant.price_kobo),
      stock: variant.stock_qty,
      offerId: offer.id,
    });
    router.push("/cart/");
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

  const myRole = conversation.role;

  function renderOffer(offer: OfferRow) {
    const state = effectiveStatus(offer);
    const mineOffer = offer.made_by === myRole;
    const isCounter = offer.parent_offer_id !== null;
    const label = mineOffer
      ? isCounter
        ? "Your counter offer"
        : "Your offer"
      : isCounter
        ? `Counter offer from ${conversation?.otherName}`
        : `Offer from ${conversation?.otherName}`;
    const variant = variants.find((item) => item.id === offer.variant_id);
    const left = state === "pending" || state === "accepted" ? timeLeft(offer.expires_at) : null;
    const busy = offerBusy === offer.id;
    const canAnswer = state === "pending" && !mineOffer;
    const canWithdraw = state === "pending" && mineOffer;

    return (
      <div className="mb-3 rounded-xl border border-slate-200 border-t-4 border-t-gold bg-white p-3.5 text-sm">
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-xs text-slate-500">{variantLabel(variant)}</p>
        <p className="mt-1 text-xl font-bold text-ink">{formatNaira(offer.amount_kobo)}</p>
        <p className="text-xs text-slate-500">Listed at {formatNaira(offer.listed_price_kobo)}</p>

        <p className="mt-2">
          <span
            className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              state === "pending"
                ? "bg-gold text-ink"
                : state === "accepted"
                  ? "bg-green-100 text-green-800"
                  : "bg-slate-100 text-slate-700"
            }`}
          >
            {state === "pending" && mineOffer ? `Waiting for ${conversation?.otherName}` : STATUS_LABELS[state]}
          </span>
          {left && (
            <span className="ml-2 text-xs text-slate-600">
              {state === "accepted" ? `Pay within ${left}` : `Expires in ${left}`}
            </span>
          )}
        </p>

        {state === "accepted" && (
          <div className="mt-2 space-y-2">
            <p className="text-xs text-slate-600">
              {myRole === "buyer"
                ? `You have until ${dateTimeLabel(offer.expires_at)} to pay at this price.`
                : `The buyer has until ${dateTimeLabel(offer.expires_at)} to pay at this price.`}
            </p>
            {myRole === "buyer" && (
              <button
                type="button"
                onClick={() => handlePay(offer)}
                className="h-10 w-full rounded-full bg-blue-700 text-sm font-semibold text-white hover:bg-blue-800"
              >
                Pay at this price
              </button>
            )}
          </div>
        )}

        {canAnswer && counterFor !== offer.id && (
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => handleAnswer(offer, "accept")}
              disabled={busy}
              className="h-10 flex-1 rounded-full bg-blue-700 text-sm font-semibold text-white hover:bg-blue-800 disabled:bg-slate-300"
            >
              Accept
            </button>
            <button
              type="button"
              onClick={() => {
                setCounterFor(offer.id);
                setCounterAmount("");
                setOfferError(null);
              }}
              disabled={busy}
              className="h-10 flex-1 rounded-full border border-slate-400 text-sm font-semibold text-ink hover:border-slate-700 disabled:opacity-60"
            >
              Counter
            </button>
            <button
              type="button"
              onClick={() => handleAnswer(offer, "decline")}
              disabled={busy}
              className="h-10 flex-1 rounded-full border border-slate-400 text-sm font-semibold text-ink hover:border-slate-700 disabled:opacity-60"
            >
              Decline
            </button>
          </div>
        )}

        {canAnswer && counterFor === offer.id && (
          <div className="mt-3 space-y-2">
            <label className="block text-xs font-medium text-ink">
              Your counter offer in naira
              <input
                inputMode="decimal"
                value={counterAmount}
                onChange={(event) => setCounterAmount(event.target.value)}
                placeholder="e.g. 295000"
                className="mt-1 w-full rounded-full border border-slate-300 px-4 py-2 text-sm focus:border-blue-600 focus:outline-none"
              />
            </label>
            <p className="text-xs text-slate-500">
              {myRole === "seller"
                ? "It must be higher than their offer and no higher than the listed price."
                : "It must be lower than the seller's offer."}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleCounter(offer)}
                disabled={busy}
                className="h-10 flex-1 rounded-full bg-blue-700 text-sm font-semibold text-white hover:bg-blue-800 disabled:bg-slate-300"
              >
                {busy ? "Sending…" : "Send counter offer"}
              </button>
              <button
                type="button"
                onClick={() => setCounterFor(null)}
                className="h-10 flex-1 rounded-full border border-slate-400 text-sm font-semibold text-ink"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {canWithdraw && (
          <div className="mt-3">
            <button
              type="button"
              onClick={() => handleWithdraw(offer)}
              disabled={busy}
              className="h-10 rounded-full border border-slate-400 px-5 text-sm font-semibold text-ink hover:border-slate-700 disabled:opacity-60"
            >
              {busy ? "Working…" : "Withdraw offer"}
            </button>
          </div>
        )}
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
            <p className="text-xs text-slate-500">{myRole === "buyer" ? "Seller on Sumus" : "Buyer"}</p>
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
          {timeline.length === 0 && (
            <p className="text-center text-sm text-slate-600">No messages yet. Say hello below.</p>
          )}
          {timeline.map((item, index) => {
            const previous = timeline[index - 1];
            const newDay = !previous || !sameDay(new Date(previous.at), new Date(item.at));
            const separator = newDay ? (
              <p className="my-3 text-center text-xs text-slate-500">{dayLabel(item.at)}</p>
            ) : null;

            if (item.kind === "offer") {
              return (
                <div key={`offer-${item.offer.id}`}>
                  {separator}
                  {renderOffer(item.offer)}
                </div>
              );
            }

            const message = item.message;
            const mine = message.sender_id === userId;

            return (
              <div key={message.id}>
                {separator}
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

        <div className="space-y-2 border-t border-slate-200 p-3">
          {offerError && <Notice tone="error">{offerError}</Notice>}

          {canOffer && !composerOpen && (
            <button
              type="button"
              onClick={() => {
                setComposerOpen(true);
                setOfferError(null);
              }}
              className="rounded-full border border-slate-400 px-4 py-1.5 text-sm font-semibold text-ink hover:border-slate-700"
            >
              Make an offer
            </button>
          )}

          {canOffer && composerOpen && (
            <div className="space-y-2 rounded-xl border border-slate-200 bg-paper p-3">
              <p className="text-sm font-bold text-ink">Make an offer</p>
              <label className="block text-xs font-medium text-ink">
                Version
                <select
                  value={chosenVariantId}
                  onChange={(event) => setComposerVariant(event.target.value)}
                  className="mt-1 w-full rounded-full border border-slate-300 bg-white px-4 py-2 text-sm focus:border-blue-600 focus:outline-none"
                >
                  {offerChoices.map((variant) => (
                    <option key={variant.id} value={variant.id}>
                      {variantLabel(variant)} · {formatNaira(variant.price_kobo)}
                    </option>
                  ))}
                </select>
              </label>

              {openForChosen && (
                <p className="text-xs text-slate-600">You already have an open offer on this version.</p>
              )}
              {!openForChosen && usedForChosen >= OFFER_RULES.maxOffersPerBuyer && (
                <p className="text-xs text-slate-600">
                  You have used all {OFFER_RULES.maxOffersPerBuyer} offers for this version.
                </p>
              )}

              {!openForChosen && usedForChosen < OFFER_RULES.maxOffersPerBuyer && (
                <>
                  <label className="block text-xs font-medium text-ink">
                    Your offer in naira
                    <input
                      inputMode="decimal"
                      value={composerAmount}
                      onChange={(event) => setComposerAmount(event.target.value)}
                      placeholder="e.g. 285000"
                      className="mt-1 w-full rounded-full border border-slate-300 bg-white px-4 py-2 text-sm focus:border-blue-600 focus:outline-none"
                    />
                  </label>
                  <p className="text-xs text-slate-500">
                    Offers used for this version: {usedForChosen} of {OFFER_RULES.maxOffersPerBuyer}. Your offer
                    must be lower than the listed price, and it lasts {OFFER_RULES.offerHours} hours.
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleMakeOffer}
                      disabled={offerBusy === "new"}
                      className="h-10 flex-1 rounded-full bg-blue-700 text-sm font-semibold text-white hover:bg-blue-800 disabled:bg-slate-300"
                    >
                      {offerBusy === "new" ? "Sending…" : "Send offer"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setComposerOpen(false)}
                      className="h-10 flex-1 rounded-full border border-slate-400 text-sm font-semibold text-ink"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}
              {(openForChosen || usedForChosen >= OFFER_RULES.maxOffersPerBuyer) && (
                <button
                  type="button"
                  onClick={() => setComposerOpen(false)}
                  className="h-10 w-full rounded-full border border-slate-400 text-sm font-semibold text-ink"
                >
                  Close
                </button>
              )}
            </div>
          )}

          <form onSubmit={handleSend} className="space-y-2">
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
    </div>
  );
}

export function MessagesView() {
  const params = useSearchParams();
  const id = params.get("c");
  const offerVariant = params.get("offer");

  return id ? <ThreadView id={id} offerVariant={offerVariant} /> : <InboxView />;
}

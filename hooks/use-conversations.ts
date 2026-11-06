"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase";

/** Other parts of the site fire this after a message is sent or read, so counts refresh. */
export const MESSAGES_CHANGED = "sumus:messages-changed";

export function announceMessagesChanged() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(MESSAGES_CHANGED));
}

export type MessageStatus = "loading" | "ready" | "error";

export type ConversationRow = {
  id: string;
  buyer_id: string;
  seller_id: string;
  product_id: string | null;
  product_name: string;
  buyer_name: string;
  last_message_at: string;
  last_sender_id: string | null;
  buyer_last_read_at: string | null;
  seller_last_read_at: string | null;
  sellers: { display_name: string; slug: string } | null;
  products: { slug: string } | null;
};

export type Conversation = {
  id: string;
  /** Whether the signed-in person is the buyer or the seller in this conversation. */
  role: "buyer" | "seller";
  otherName: string;
  productId: string | null;
  productName: string;
  productSlug: string | null;
  lastMessageAt: string;
  unread: boolean;
};

export const CONVERSATION_SELECT =
  "id, buyer_id, seller_id, product_id, product_name, buyer_name, last_message_at, last_sender_id, buyer_last_read_at, seller_last_read_at, sellers(display_name, slug), products(slug)";

/** The signed-in person's own seller id, or null if they are not a seller. */
export async function fetchMySellerId(userId: string): Promise<string | null> {
  const { data } = await supabase.from("sellers").select("id").eq("user_id", userId).maybeSingle();
  return (data as { id: string } | null)?.id ?? null;
}

/** Turns a database row into what the pages show. Returns null if the row isn't theirs. */
export function toConversation(
  row: ConversationRow,
  userId: string,
  mySellerId: string | null
): Conversation | null {
  let role: "buyer" | "seller";
  if (row.buyer_id === userId) role = "buyer";
  else if (mySellerId !== null && row.seller_id === mySellerId) role = "seller";
  else return null;

  const readAt = role === "buyer" ? row.buyer_last_read_at : row.seller_last_read_at;
  const unread =
    row.last_sender_id !== null &&
    row.last_sender_id !== userId &&
    (readAt === null || new Date(row.last_message_at).getTime() > new Date(readAt).getTime());

  return {
    id: row.id,
    role,
    otherName: role === "buyer" ? (row.sellers?.display_name ?? "Seller") : row.buyer_name,
    productId: row.product_id,
    productName: row.product_name,
    productSlug: row.products?.slug ?? null,
    lastMessageAt: row.last_message_at,
    unread,
  };
}

/** Loads the signed-in person's conversations, newest first, and counts the unread ones. */
export function useConversations() {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id ?? null;
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [status, setStatus] = useState<MessageStatus>("loading");
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const reload = useCallback(async () => {
    if (!userId) {
      if (mounted.current) {
        setConversations([]);
        setStatus("ready");
      }
      return;
    }

    const mySellerId = await fetchMySellerId(userId);
    const { data, error } = await supabase
      .from("conversations")
      .select(CONVERSATION_SELECT)
      .order("last_message_at", { ascending: false });

    if (!mounted.current) return;

    if (error) {
      setStatus("error");
      return;
    }

    const list = ((data ?? []) as unknown as ConversationRow[])
      // A conversation only appears once someone has written in it.
      .filter((row) => row.last_sender_id !== null)
      .map((row) => toConversation(row, userId, mySellerId))
      .filter((item): item is Conversation => item !== null);

    setConversations(list);
    setStatus("ready");
  }, [userId]);

  useEffect(() => {
    if (authLoading) return;
    void reload();

    function handleRefresh() {
      void reload();
    }

    window.addEventListener(MESSAGES_CHANGED, handleRefresh);
    window.addEventListener("focus", handleRefresh);
    return () => {
      window.removeEventListener(MESSAGES_CHANGED, handleRefresh);
      window.removeEventListener("focus", handleRefresh);
    };
  }, [authLoading, reload]);

  const unreadCount = conversations.filter((item) => item.unread).length;

  return { conversations, status, unreadCount, reload };
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

export type AlertCounts = { orders: number; enquiries: number };
export type AlertsState = "unsupported" | "default" | "granted" | "denied";

const POLL_MS = 60_000;

function readAlertsState(): AlertsState {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

/** Shows a phone or desktop pop-up, if the browser allows it. The banner always works. */
function notify(counts: AlertCounts) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  const body = `${counts.orders} new order(s), ${counts.enquiries} enquiry(ies) to check`;
  try {
    new Notification("Sumus admin", { body });
  } catch {
    // Some phone browsers only show alerts through their own service. The banner still shows the count.
  }
}

/** Marks every waiting order as seen, which clears the orders alert. */
export async function markOrdersSeen(): Promise<void> {
  await supabase
    .from("orders")
    .update({ seen_by_admin: true })
    .eq("seen_by_admin", false)
    .in("status", ["awaiting_transfer", "paid"]);
}

/** Counts orders and enquiries that need the admin. Refreshes every minute and when the tab comes back into view. */
export function useAdminAlerts() {
  const [counts, setCounts] = useState<AlertCounts>({ orders: 0, enquiries: 0 });
  const [version, setVersion] = useState(0);
  const [alerts, setAlerts] = useState<AlertsState>("unsupported");
  const previousTotal = useRef<number | null>(null);

  const refresh = useCallback(async () => {
    const [orderResult, enquiryResult] = await Promise.all([
      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("seen_by_admin", false)
        .in("status", ["awaiting_transfer", "paid"]),
      supabase.from("enquiries").select("id", { count: "exact", head: true }).eq("handled", false),
    ]);

    const next = { orders: orderResult.count ?? 0, enquiries: enquiryResult.count ?? 0 };
    const total = next.orders + next.enquiries;

    // Only a rise counts as new work. The first reading when the page opens does not.
    if (previousTotal.current !== null && total > previousTotal.current) {
      setVersion((current) => current + 1);
      notify(next);
    }
    previousTotal.current = total;
    setCounts(next);
  }, []);

  useEffect(() => {
    setAlerts(readAlertsState());
    refresh();

    const timer = window.setInterval(refresh, POLL_MS);
    function handleVisible() {
      if (document.visibilityState === "visible") refresh();
    }
    document.addEventListener("visibilitychange", handleVisible);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", handleVisible);
    };
  }, [refresh]);

  async function requestAlerts() {
    if (!("Notification" in window)) return;
    const result = await Notification.requestPermission();
    setAlerts(result);
  }

  return { counts, version, refresh, alerts, requestAlerts };
}

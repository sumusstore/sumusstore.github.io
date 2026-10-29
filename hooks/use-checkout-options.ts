"use client";

import { useEffect, useState } from "react";
import type { LoadStatus } from "@/hooks/use-home-products";
import { supabase } from "@/lib/supabase";

export type DeliveryZone = {
  id: string;
  name: string;
  feeKobo: number;
  minDays: number;
  maxDays: number;
};

export type PickupStore = {
  id: string;
  name: string;
  address: string;
  state: string;
  openingHours: string | null;
};

type ZoneRow = { id: string; name: string; fee_kobo: number; min_days: number; max_days: number };
type StoreRow = { id: string; name: string; address: string; state: string; opening_hours: string | null };

/** Loads the delivery options and pickup stores shown at checkout. */
export function useCheckoutOptions() {
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [stores, setStores] = useState<PickupStore[]>([]);
  const [status, setStatus] = useState<LoadStatus>("loading");

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const [zoneResult, storeResult] = await Promise.all([
          supabase
            .from("delivery_zones")
            .select("id, name, fee_kobo, min_days, max_days")
            .eq("is_active", true)
            .order("name", { ascending: true }),
          supabase
            .from("stores")
            .select("id, name, address, state, opening_hours")
            .eq("is_active", true)
            .order("name", { ascending: true }),
        ]);

        if (!active) return;
        if (zoneResult.error || storeResult.error) {
          setStatus("error");
          return;
        }

        const zoneRows = (zoneResult.data ?? []) as ZoneRow[];
        const storeRows = (storeResult.data ?? []) as StoreRow[];

        setZones(
          zoneRows.map((z) => ({
            id: z.id,
            name: z.name,
            feeKobo: z.fee_kobo,
            minDays: z.min_days,
            maxDays: z.max_days,
          }))
        );
        setStores(
          storeRows.map((s) => ({
            id: s.id,
            name: s.name,
            address: s.address,
            state: s.state,
            openingHours: s.opening_hours,
          }))
        );
        setStatus("ready");
      } catch {
        if (active) setStatus("error");
      }
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  return { zones, stores, status };
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { Notice } from "@/components/form-field";
import { SITE } from "@/lib/site-config";
import { supabase } from "@/lib/supabase";

type Store = {
  id: string;
  name: string;
  address: string;
  state: string;
  phone: string | null;
  latitude: number | null;
  longitude: number | null;
  opening_hours: string | null;
};

const ALL_STATES = "All states";

// Google's free map embed. It needs no API key.
function mapUrl(lat: number, lng: number): string {
  return `https://maps.google.com/maps?q=${lat},${lng}&z=15&output=embed`;
}

function directionsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dsearch/?api=1&query=${lat},${lng}`;
}

export function StoreLocator() {
  const [stores, setStores] = useState<Store[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [stateFilter, setStateFilter] = useState(ALL_STATES);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    supabase
      .from("stores")
      .select("id, name, address, state, phone, latitude, longitude, opening_hours")
      .eq("is_active", true)
      .order("state", { ascending: true })
      .order("name", { ascending: true })
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          setLoadFailed(true);
          setStores([]);
          return;
        }
        setStores((data ?? []) as Store[]);
      });

    return () => {
      active = false;
    };
  }, []);

  const states = useMemo(() => {
    const names = new Set((stores ?? []).map((store) => store.state));
    return [ALL_STATES, ...[...names].sort()];
  }, [stores]);

  const visible = useMemo(
    () =>
      (stores ?? []).filter(
        (store) => stateFilter === ALL_STATES || store.state === stateFilter
      ),
    [stores, stateFilter]
  );

  const selected = visible.find((store) => store.id === selectedId) ?? visible[0] ?? null;

  if (loadFailed) {
    return (
      <Notice tone="error">Our store list couldn't load. Please refresh the page shortly.</Notice>
    );
  }

  if (stores === null) {
    return <p className="text-sm text-slate-600">Loading stores…</p>;
  }

  if (stores.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
        <p className="font-semibold text-ink">Our store list is being updated.</p>
        <p className="mt-1 text-sm text-slate-600">
          Message us on WhatsApp to ask about pickup options.
        </p>
        <a
          href={SITE.whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-block font-semibold text-blue-700 hover:underline"
        >
          Chat on WhatsApp
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="state-filter" className="text-sm font-semibold text-ink">
          Filter by state
        </label>
        <select
          id="state-filter"
          value={stateFilter}
          onChange={(event) => {
            setStateFilter(event.target.value);
            setSelectedId(null);
          }}
          className="rounded-full border-2 border-blue-700 bg-white px-4 py-2 text-sm font-medium text-ink focus:outline-none focus:ring-2 focus:ring-blue-200"
        >
          {states.map((state) => (
            <option key={state} value={state}>
              {state}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <ul className="space-y-3">
          {visible.map((store) => {
            const isSelected = selected?.id === store.id;
            return (
              <li key={store.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(store.id)}
                  aria-pressed={isSelected}
                  className={`w-full rounded-xl border border-t-4 bg-white p-4 text-left ${
                    isSelected
                      ? "border-blue-700 border-t-gold ring-1 ring-blue-700"
                      : "border-slate-200 border-t-gold/60 hover:border-slate-400"
                  }`}
                >
                  <span className="block font-semibold text-ink">{store.name}</span>
                  <span className="block text-sm text-slate-600">
                    {store.address}, {store.state}
                  </span>
                  {store.opening_hours && (
                    <span className="block text-sm text-slate-500">{store.opening_hours}</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        {selected && (
          <div className="space-y-4">
            {selected.latitude !== null && selected.longitude !== null ? (
              <div className="aspect-[4/3] overflow-hidden rounded-xl border border-slate-200 bg-white">
                <iframe
                  title={`Map showing ${selected.name}`}
                  src={mapUrl(selected.latitude, selected.longitude)}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="h-full w-full"
                />
              </div>
            ) : (
              <div className="flex aspect-[4/3] items-center justify-center rounded-xl bg-paper p-6 text-center text-sm text-slate-600">
                The map for this branch isn&apos;t available yet. Use the address or call the branch.
              </div>
            )}

            <div className="rounded-xl border border-slate-200 border-t-4 border-t-gold bg-white p-5">
              <p className="font-bold text-ink">{selected.name}</p>
              <p className="mt-1 text-sm text-slate-700">
                {selected.address}, {selected.state}
              </p>
              {selected.opening_hours && (
                <p className="mt-1 text-sm text-slate-600">{selected.opening_hours}</p>
              )}

              <div className="mt-4 flex flex-wrap gap-3">
                {selected.latitude !== null && selected.longitude !== null && (
                  <a
                    href={directionsUrl(selected.latitude, selected.longitude)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
                  >
                    Get directions
                  </a>
                )}
                {selected.phone && (
                  <a
                    href={`tel:${selected.phone.replace(/\s/g, "")}`}
                    className="rounded-full border border-blue-700 px-5 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-50"
                  >
                    Call this branch
                  </a>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

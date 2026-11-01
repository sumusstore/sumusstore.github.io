"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SellerApplicationForm } from "@/components/seller-application-form";
import { useAuth } from "@/hooks/use-auth";
import { SITE } from "@/lib/site-config";
import { supabase } from "@/lib/supabase";

type MySeller = {
  status: "pending" | "approved" | "rejected" | "suspended";
  display_name: string;
  kind: "business" | "individual";
  admin_note: string | null;
  created_at: string;
};

const CARD = "rounded-xl border border-slate-200 border-t-4 border-t-gold bg-white p-6";

function ApplicationStatus({ seller }: { seller: MySeller }) {
  if (seller.status === "pending") {
    return (
      <div className={CARD}>
        <h2 className="text-lg font-bold text-ink">Application received</h2>
        <p className="mt-2 text-sm text-slate-700">
          Thanks, {seller.display_name}. We're reviewing your documents and will reply on the phone
          number you gave us. Nothing is listed until we approve it.
        </p>
      </div>
    );
  }

  if (seller.status === "approved") {
    return (
      <div className={CARD}>
        <h2 className="text-lg font-bold text-ink">Approved. Welcome, {seller.display_name}.</h2>
        <p className="mt-2 text-sm text-slate-700">
          Your seller tools are coming in the next steps. There's nothing more you need to do for now.
        </p>
      </div>
    );
  }

  if (seller.status === "rejected") {
    return (
      <div className={CARD}>
        <h2 className="text-lg font-bold text-ink">We couldn't approve this application.</h2>
        {seller.admin_note && <p className="mt-2 text-sm text-slate-700">{seller.admin_note}</p>}
        <a
          href={SITE.whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-block font-semibold text-blue-700 hover:underline"
        >
          Talk to us on WhatsApp
        </a>
      </div>
    );
  }

  return (
    <div className={CARD}>
      <h2 className="text-lg font-bold text-ink">Your seller account is paused.</h2>
      {seller.admin_note && <p className="mt-2 text-sm text-slate-700">{seller.admin_note}</p>}
    </div>
  );
}

export function SellView() {
  const { user, loading } = useAuth();
  const userId = user?.id ?? null;
  const [seller, setSeller] = useState<MySeller | null | undefined>(undefined);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!userId) return;
    let active = true;

    supabase
      .from("sellers")
      .select("status, display_name, kind, admin_note, created_at")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (active) setSeller((data ?? null) as MySeller | null);
      });

    return () => {
      active = false;
    };
  }, [userId, reloadKey]);

  if (loading) {
    return <p className="text-sm text-slate-600">Checking your account…</p>;
  }

  if (!userId) {
    return (
      <div className={CARD}>
        <h2 className="text-lg font-bold text-ink">Sign in to apply</h2>
        <p className="mt-2 text-sm text-slate-700">
          You apply from your account. Sign in, or create one first.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/login/?next=/sell/"
            className="rounded-full bg-blue-700 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-800"
          >
            Sign in
          </Link>
          <Link
            href="/register/"
            className="rounded-full border border-blue-700 px-6 py-3 text-sm font-semibold text-blue-700 hover:bg-blue-50"
          >
            Create an account
          </Link>
        </div>
      </div>
    );
  }

  if (seller === undefined) {
    return <p className="text-sm text-slate-600">Loading your application…</p>;
  }

  if (seller === null) {
    return (
      <SellerApplicationForm userId={userId} onSubmitted={() => setReloadKey((key) => key + 1)} />
    );
  }

  return <ApplicationStatus seller={seller} />;
}

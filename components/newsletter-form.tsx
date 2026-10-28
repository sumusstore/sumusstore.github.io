"use client";

import { useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";

type FormStatus = "idle" | "saving" | "done" | "exists" | "error";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MESSAGES: Record<"done" | "exists" | "error", string> = {
  done: "Thanks. You're on the list.",
  exists: "That email is already subscribed.",
  error: "We couldn't save that. Check the address and try again.",
};

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<FormStatus>("idle");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleaned = email.trim().toLowerCase();

    if (!EMAIL_PATTERN.test(cleaned)) {
      setStatus("error");
      return;
    }

    setStatus("saving");
    const { error } = await supabase
      .from("newsletter_subscribers")
      .insert({ email: cleaned });

    if (!error) {
      setStatus("done");
    } else if (error.code === "23505") {
      // 23505 means the email is already in the table.
      setStatus("exists");
    } else {
      setStatus("error");
    }
  }

  const message = status === "idle" || status === "saving" ? null : MESSAGES[status];

  return (
    <div className="w-full max-w-md">
      <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="newsletter-email" className="sr-only">
          Email address
        </label>
        <input
          id="newsletter-email"
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Your email address"
          className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-blue-600 focus:outline-none"
        />
        <button
          type="submit"
          disabled={status === "saving"}
          className="rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
        >
          {status === "saving" ? "Saving…" : "Subscribe"}
        </button>
      </form>
      {message && (
        <p role="status" className="mt-2 text-sm text-slate-700">
          {message}
        </p>
      )}
    </div>
  );
}

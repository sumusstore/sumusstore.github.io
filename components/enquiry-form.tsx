"use client";

import { useState, type FormEvent } from "react";
import { Field, Notice } from "@/components/form-field";
import { supabase } from "@/lib/supabase";

type EnquiryKind = "contact" | "bulk";

type FormState = {
  name: string;
  email: string;
  phone: string;
  company: string;
  message: string;
  // Hidden from people. Bots that fill it in are quietly ignored.
  website: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const COPY: Record<EnquiryKind, { button: string; label: string; placeholder: string; thanks: string }> = {
  contact: {
    button: "Send message",
    label: "How can we help?",
    placeholder: "Tell us about the product, order or delivery.",
    thanks: "Thanks. Your message is with us. We'll reply on the email or phone number you gave.",
  },
  bulk: {
    button: "Send bulk enquiry",
    label: "What do you need, and how many?",
    placeholder: "e.g. 20 air conditioners for an office refit",
    thanks: "Thanks. Your bulk enquiry is in. We'll reply on the email or phone number you gave.",
  },
};

const EMPTY: FormState = { name: "", email: "", phone: "", company: "", message: "", website: "" };

export function EnquiryForm({ kind }: { kind: EnquiryKind }) {
  const copy = COPY[kind];
  const [form, setForm] = useState<FormState>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function problemWithForm(): string | null {
    if (!form.name.trim()) return "Please enter your name.";
    if (!EMAIL_PATTERN.test(form.email.trim())) return "Please enter a valid email address.";
    if (form.phone.trim() && form.phone.replace(/\D/g, "").length < 10) {
      return "Enter a valid phone number, or leave it empty.";
    }
    if (kind === "bulk" && !form.company.trim()) {
      return "Please enter your company or organisation name.";
    }
    if (form.message.trim().length < 5) return "Please tell us a little more about what you need.";
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const problem = problemWithForm();
    if (problem) {
      setError(problem);
      return;
    }

    if (form.website) {
      setSent(true);
      return;
    }

    setBusy(true);
    const { error: insertError } = await supabase.from("enquiries").insert({
      kind,
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      phone: form.phone.trim() || null,
      company: form.company.trim() || null,
      message: form.message.trim(),
    });
    setBusy(false);

    if (insertError) {
      setError("We couldn't send your message. Try again, or message us on WhatsApp.");
      return;
    }
    setSent(true);
  }

  if (sent) return <Notice tone="info">{copy.thanks}</Notice>;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div aria-hidden="true" className="absolute left-[-10000px] top-auto h-px w-px overflow-hidden">
        <label>
          Website
          <input
            tabIndex={-1}
            autoComplete="off"
            value={form.website}
            onChange={(event) => update("website", event.target.value)}
          />
        </label>
      </div>

      <Field
        id={`${kind}-name`}
        label="Your name"
        autoComplete="name"
        maxLength={120}
        required
        value={form.name}
        onChange={(event) => update("name", event.target.value)}
      />
      <Field
        id={`${kind}-email`}
        label="Email"
        type="email"
        autoComplete="email"
        maxLength={254}
        required
        value={form.email}
        onChange={(event) => update("email", event.target.value)}
      />
      <Field
        id={`${kind}-phone`}
        label="Phone number"
        type="tel"
        autoComplete="tel"
        maxLength={30}
        optional
        value={form.phone}
        onChange={(event) => update("phone", event.target.value)}
      />
      <Field
        id={`${kind}-company`}
        label="Company or organisation"
        maxLength={120}
        optional={kind === "contact"}
        required={kind === "bulk"}
        value={form.company}
        onChange={(event) => update("company", event.target.value)}
      />

      <div>
        <label htmlFor={`${kind}-message`} className="block text-sm font-medium text-slate-800">
          {copy.label}
        </label>
        <textarea
          id={`${kind}-message`}
          rows={5}
          maxLength={2000}
          required
          placeholder={copy.placeholder}
          value={form.message}
          onChange={(event) => update("message", event.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-600 focus:outline-none"
        />
      </div>

      {error && <Notice tone="error">{error}</Notice>}

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-lg bg-blue-700 px-6 py-3 font-semibold text-white hover:bg-blue-800 disabled:bg-slate-300 sm:w-auto"
      >
        {busy ? "Sending…" : copy.button}
      </button>
    </form>
  );
}

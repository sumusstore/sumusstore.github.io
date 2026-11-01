"use client";

import { useState, type FormEvent } from "react";
import { Field, Notice } from "@/components/form-field";
import { slugify } from "@/lib/admin-utils";
import { supabase } from "@/lib/supabase";

type Kind = "business" | "individual";
type DocType = "registration" | "owner_id" | "genuine_proof";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "application/pdf"];

const DOC_LABELS: Record<DocType, string> = {
  registration: "Business registration certificate",
  owner_id: "Owner's government-issued ID",
  genuine_proof: "Proof your products are genuine (invoice or distributor letter)",
};

const BUTTON_CLASS =
  "w-full rounded-full bg-blue-700 px-6 py-3 font-semibold text-white hover:bg-blue-800 disabled:bg-slate-300";

type FormState = {
  kind: Kind;
  displayName: string;
  businessName: string;
  registrationNumber: string;
  taxId: string;
  ownerName: string;
  ownerPhone: string;
  state: string;
  address: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  agreed: boolean;
};

const INITIAL: FormState = {
  kind: "individual",
  displayName: "",
  businessName: "",
  registrationNumber: "",
  taxId: "",
  ownerName: "",
  ownerPhone: "",
  state: "",
  address: "",
  bankName: "",
  accountName: "",
  accountNumber: "",
  agreed: false,
};

function requiredDocs(kind: Kind): DocType[] {
  return kind === "business"
    ? ["registration", "owner_id", "genuine_proof"]
    : ["owner_id", "genuine_proof"];
}

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 6);
}

function extensionOf(file: File): string {
  if (file.type === "application/pdf") return "pdf";
  if (file.type === "image/png") return "png";
  return "jpg";
}

function KindCard({
  title,
  detail,
  selected,
  onSelect,
}: {
  title: string;
  detail: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={`flex-1 rounded-lg border p-4 text-left ${
        selected ? "border-blue-700 bg-blue-50 ring-1 ring-blue-700" : "border-slate-200 bg-white hover:border-slate-400"
      }`}
    >
      <span className="block font-bold text-ink">{title}</span>
      <span className="mt-1 block text-sm text-slate-600">{detail}</span>
    </button>
  );
}

function DocInput({
  doc,
  file,
  onChoose,
}: {
  doc: DocType;
  file: File | undefined;
  onChoose: (file: File | undefined) => void;
}) {
  return (
    <label className="block rounded-lg border border-slate-200 bg-white p-4">
      <span className="block text-sm font-semibold text-ink">{DOC_LABELS[doc]}</span>
      <span className="mt-1 block text-xs text-slate-500">
        {file ? `Selected: ${file.name}` : "JPG, PNG or PDF, up to 5 MB"}
      </span>
      <input
        type="file"
        accept="image/jpeg,image/png,application/pdf"
        onChange={(event) => onChoose(event.target.files?.[0])}
        className="mt-3 block w-full text-sm"
      />
    </label>
  );
}

export function SellerApplicationForm({
  userId,
  onSubmitted,
}: {
  userId: string;
  onSubmitted: () => void;
}) {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [files, setFiles] = useState<Partial<Record<DocType, File>>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function chooseFile(doc: DocType, file: File | undefined) {
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Upload a JPG, PNG or PDF file.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError("Each file must be 5 MB or smaller.");
      return;
    }
    setError(null);
    setFiles((current) => ({ ...current, [doc]: file }));
  }

  function problem(): string | null {
    if (form.displayName.trim().length < 2) return "Enter the shop name buyers will see.";
    if (form.kind === "business" && !form.businessName.trim()) return "Enter your registered business name.";
    if (form.kind === "business" && !form.registrationNumber.trim()) return "Enter your business registration number.";
    if (form.ownerName.trim().length < 3) return "Enter the owner's full name.";
    if (form.ownerPhone.replace(/\D/g, "").length < 10) return "Enter a valid phone number.";
    if (!form.state.trim() || form.address.trim().length < 5) return "Enter your state and address.";
    if (form.bankName.trim().length < 2) return "Enter your bank name.";
    if (form.accountName.trim().length < 3) return "Enter the account name, as the bank shows it.";
    if (!/^\d{10}$/.test(form.accountNumber.trim())) return "Account numbers have 10 digits.";
    const missing = requiredDocs(form.kind).find((doc) => !files[doc]);
    if (missing) return `Upload: ${DOC_LABELS[missing].toLowerCase()}.`;
    if (!form.agreed) return "Tick the box to agree to the seller terms.";
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const issue = problem();
    if (issue) {
      setError(issue);
      return;
    }

    setBusy(true);
    try {
      // Files go in a folder named after the login, which the storage rules check.
      const uploaded: { doc: DocType; path: string }[] = [];
      for (const doc of requiredDocs(form.kind)) {
        const file = files[doc];
        if (!file) throw new Error(`Upload: ${DOC_LABELS[doc].toLowerCase()}.`);
        const path = `${userId}/${doc}-${Date.now()}-${randomSuffix()}.${extensionOf(file)}`;
        const { error: uploadError } = await supabase.storage
          .from("seller-documents")
          .upload(path, file, { contentType: file.type });
        if (uploadError) throw new Error(`${DOC_LABELS[doc]} couldn't be uploaded. Try again.`);
        uploaded.push({ doc, path });
      }

      const { data: seller, error: insertError } = await supabase
        .from("sellers")
        .insert({
          user_id: userId,
          kind: form.kind,
          display_name: form.displayName.trim(),
          slug: `${slugify(form.displayName)}-${randomSuffix()}`,
          business_name: form.kind === "business" ? form.businessName.trim() : null,
          registration_number: form.kind === "business" ? form.registrationNumber.trim() : null,
          tax_id: form.taxId.trim() || null,
          owner_full_name: form.ownerName.trim(),
          owner_phone: form.ownerPhone.trim(),
          state: form.state.trim(),
          address: form.address.trim(),
          bank_name: form.bankName.trim(),
          account_name: form.accountName.trim(),
          account_number: form.accountNumber.trim(),
          terms_accepted_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (insertError || !seller) throw new Error("Your application couldn't be saved. Try again.");

      const { error: docError } = await supabase.from("seller_documents").insert(
        uploaded.map((item) => ({ seller_id: seller.id, doc_type: item.doc, file_path: item.path }))
      );
      if (docError) {
        throw new Error("Your application was saved, but the documents weren't linked. Contact us on WhatsApp.");
      }

      onSubmitted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="rounded-xl border border-slate-200 border-t-4 border-t-gold bg-white p-6">
        <h2 className="text-base font-bold text-ink">1. What are you applying as?</h2>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <KindCard
            title="A registered business"
            detail="You have a business registration number and a CAC certificate."
            selected={form.kind === "business"}
            onSelect={() => update("kind", "business")}
          />
          <KindCard
            title="An individual"
            detail="You sell as yourself, with a valid government-issued ID."
            selected={form.kind === "individual"}
            onSelect={() => update("kind", "individual")}
          />
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-slate-200 border-t-4 border-t-gold bg-white p-6">
        <h2 className="text-base font-bold text-ink">2. Your shop</h2>
        <Field
          id="seller-display"
          label="Shop name (buyers see this)"
          required
          value={form.displayName}
          onChange={(event) => update("displayName", event.target.value)}
        />
        {form.kind === "business" && (
          <>
            <Field
              id="seller-business"
              label="Registered business name"
              required
              value={form.businessName}
              onChange={(event) => update("businessName", event.target.value)}
            />
            <Field
              id="seller-reg"
              label="Business registration number"
              required
              value={form.registrationNumber}
              onChange={(event) => update("registrationNumber", event.target.value)}
            />
          </>
        )}
        <Field
          id="seller-tax"
          label="Tax identification number"
          optional
          value={form.taxId}
          onChange={(event) => update("taxId", event.target.value)}
        />
      </section>

      <section className="space-y-4 rounded-xl border border-slate-200 border-t-4 border-t-gold bg-white p-6">
        <h2 className="text-base font-bold text-ink">3. Who we contact</h2>
        <Field
          id="seller-owner"
          label="Owner's full name"
          required
          value={form.ownerName}
          onChange={(event) => update("ownerName", event.target.value)}
        />
        <Field
          id="seller-phone"
          label="Phone number"
          type="tel"
          required
          value={form.ownerPhone}
          onChange={(event) => update("ownerPhone", event.target.value)}
        />
        <Field
          id="seller-state"
          label="State"
          required
          value={form.state}
          onChange={(event) => update("state", event.target.value)}
        />
        <Field
          id="seller-address"
          label="Address where you dispatch orders"
          required
          value={form.address}
          onChange={(event) => update("address", event.target.value)}
        />
      </section>

      <section className="space-y-4 rounded-xl border border-slate-200 border-t-4 border-t-gold bg-white p-6">
        <h2 className="text-base font-bold text-ink">4. Where you get paid</h2>
        <p className="text-sm text-slate-600">
          Use a bank account in the name you're applying under. Sales go to this account after each
          order.
        </p>
        <Field
          id="seller-bank"
          label="Bank name"
          required
          value={form.bankName}
          onChange={(event) => update("bankName", event.target.value)}
        />
        <Field
          id="seller-account-name"
          label="Account name"
          required
          value={form.accountName}
          onChange={(event) => update("accountName", event.target.value)}
        />
        <Field
          id="seller-account-number"
          label="Account number (10 digits)"
          inputMode="numeric"
          required
          value={form.accountNumber}
          onChange={(event) => update("accountNumber", event.target.value)}
        />
      </section>

      <section className="space-y-3 rounded-xl border border-slate-200 border-t-4 border-t-gold bg-white p-6">
        <h2 className="text-base font-bold text-ink">5. Documents</h2>
        <p className="text-sm text-slate-600">
          These are private. Only the Sumus team can open them, to check your application.
        </p>
        {requiredDocs(form.kind).map((doc) => (
          <DocInput key={doc} doc={doc} file={files[doc]} onChoose={(file) => chooseFile(doc, file)} />
        ))}
      </section>

      <section className="rounded-xl border border-slate-200 border-t-4 border-t-gold bg-white p-6">
        <label className="flex items-start gap-3 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={form.agreed}
            onChange={(event) => update("agreed", event.target.checked)}
            className="mt-1 accent-blue-700"
          />
          <span>
            I agree to Sumus's seller terms. I understand my application is reviewed before I can sell,
            that Sumus keeps 10% of each sale, and that I deliver my own orders.
          </span>
        </label>
      </section>

      {error && <Notice tone="error">{error}</Notice>}

      <button type="submit" disabled={busy} className={BUTTON_CLASS}>
        {busy ? "Sending your application…" : "Send application"}
      </button>
    </form>
  );
}

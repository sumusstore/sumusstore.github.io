"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Notice } from "@/components/form-field";
import type { Category } from "@/lib/admin-utils";
import { supabase } from "@/lib/supabase";

type FieldType = "text" | "number" | "choice";

type Field = {
  id: string;
  label: string;
  field_type: FieldType;
  unit: string | null;
  options: string[];
  is_required: boolean;
  sort_order: number;
};

type Missing = { product_id: string; product_name: string; missing: string };

type Message = { tone: "error" | "info"; text: string } | null;

type Draft = { label: string; type: FieldType; unit: string; options: string; required: boolean };

const EMPTY_DRAFT: Draft = { label: "", type: "text", unit: "", options: "", required: false };

const INPUT =
  "mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-700 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500";
const BUTTON =
  "rounded-full bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:bg-slate-300";
const GHOST =
  "rounded-full border border-blue-700 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 disabled:border-slate-300 disabled:text-slate-400";
const DANGER =
  "rounded-full border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:text-slate-400";

/** Shows a category with its parent, such as "Phones › Smartphones". */
function pathOf(category: Category, all: Category[]): string {
  const parent = all.find((item) => item.id === category.parent_id);
  return parent ? `${parent.name} › ${category.name}` : category.name;
}

/** One option per line or separated by commas. Repeats are dropped, whatever their capital letters. */
function parseOptions(text: string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const part of text.split(/[\n,]/)) {
    const value = part.trim();
    const key = value.toLowerCase();
    if (value && !seen.has(key)) {
      seen.add(key);
      result.push(value);
    }
  }
  return result;
}

function typeText(field: Field): string {
  if (field.field_type === "number") return field.unit ? `Number in ${field.unit}` : "Number";
  if (field.field_type === "choice") return `Choice: ${field.options.join(", ")}`;
  return "Text";
}

function checkDraft(draft: Draft): { row: Record<string, unknown> } | { error: string } {
  const label = draft.label.trim().replace(/\s+/g, " ");
  if (!label) return { error: "Enter a field name, such as Battery capacity." };
  if (label.length > 60) return { error: "The field name is too long. Use 60 characters or fewer." };
  if (label.includes(":")) return { error: "Leave the colon out of the field name." };

  const options = draft.type === "choice" ? parseOptions(draft.options) : [];
  if (draft.type === "choice" && options.length < 2) {
    return { error: "A choice field needs at least two options. Put each one on its own line." };
  }

  return {
    row: {
      label,
      field_type: draft.type,
      unit: draft.type === "number" ? draft.unit.trim() || null : null,
      options,
      is_required: draft.required,
    },
  };
}

function FieldForm({
  draft,
  onChange,
  lockCore,
  submitLabel,
  busy,
  onSubmit,
  onCancel,
}: {
  draft: Draft;
  onChange: (patch: Partial<Draft>) => void;
  lockCore: boolean;
  submitLabel: string;
  busy: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel?: () => void;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="block text-xs font-medium text-ink">
          Field name
          <input
            className={INPUT}
            placeholder="e.g. Battery capacity"
            value={draft.label}
            disabled={lockCore}
            onChange={(event) => onChange({ label: event.target.value })}
          />
        </label>

        <label className="block text-xs font-medium text-ink">
          Type
          <select
            className={INPUT}
            value={draft.type}
            disabled={lockCore}
            onChange={(event) => onChange({ type: event.target.value as FieldType })}
          >
            <option value="text">Text</option>
            <option value="number">Number with a unit</option>
            <option value="choice">Choose from a list</option>
          </select>
        </label>

        {draft.type === "number" && (
          <label className="block text-xs font-medium text-ink">
            Unit (optional)
            <input
              className={INPUT}
              placeholder="e.g. GB, mAh, inch"
              value={draft.unit}
              disabled={lockCore}
              onChange={(event) => onChange({ unit: event.target.value })}
            />
          </label>
        )}

        {draft.type === "choice" && (
          <label className="block text-xs font-medium text-ink md:col-span-2">
            Options, one per line
            <textarea
              rows={4}
              className={INPUT}
              placeholder={"AMOLED\nLCD\nOLED"}
              value={draft.options}
              onChange={(event) => onChange({ options: event.target.value })}
            />
          </label>
        )}
      </div>

      <label className="flex items-center gap-2 text-sm font-medium text-ink">
        <input
          type="checkbox"
          checked={draft.required}
          onChange={(event) => onChange({ required: event.target.checked })}
          className="h-4 w-4 accent-blue-700"
        />
        Required. A product can&apos;t go live without it.
      </label>

      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={busy} className={BUTTON}>
          {busy ? "Saving…" : submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className={GHOST}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

export function AdminFields() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [fields, setFields] = useState<Field[]>([]);
  const [usage, setUsage] = useState<Record<string, number>>({});
  const [missing, setMissing] = useState<Missing[]>([]);
  const [version, setVersion] = useState(0);
  const [message, setMessage] = useState<Message>(null);
  const [busy, setBusy] = useState(false);
  const [newDraft, setNewDraft] = useState<Draft>(EMPTY_DRAFT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Draft>(EMPTY_DRAFT);

  useEffect(() => {
    let active = true;
    supabase
      .from("categories")
      .select("id, name, slug, parent_id, sort_order")
      .order("sort_order")
      .then(({ data }) => {
        if (active) setCategories((data ?? []) as Category[]);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!categoryId) {
      setFields([]);
      setUsage({});
      return;
    }

    let active = true;
    Promise.all([
      supabase
        .from("category_fields")
        .select("id, label, field_type, unit, options, is_required, sort_order")
        .eq("category_id", categoryId)
        .order("sort_order", { ascending: true }),
      supabase.rpc("category_field_usage", { p_category_id: categoryId }),
    ]).then(([fieldResult, usageResult]) => {
      if (!active) return;
      setFields(fieldResult.error ? [] : ((fieldResult.data ?? []) as Field[]));

      const map: Record<string, number> = {};
      for (const row of (usageResult.data ?? []) as { field_id: string; products: number }[]) {
        map[row.field_id] = row.products;
      }
      setUsage(map);
    });

    return () => {
      active = false;
    };
  }, [categoryId, version]);

  useEffect(() => {
    let active = true;
    supabase.rpc("products_missing_required").then(({ data }) => {
      if (active) setMissing((data ?? []) as Missing[]);
    });
    return () => {
      active = false;
    };
  }, [version]);

  function reload() {
    setVersion((current) => current + 1);
  }

  // A main category has subcategories, so it can't hold fields. Only the others are listed.
  const parentIds = new Set(categories.map((item) => item.parent_id).filter((id): id is string => id !== null));
  const leaves = categories
    .filter((item) => !parentIds.has(item.id))
    .sort((a, b) => pathOf(a, categories).localeCompare(pathOf(b, categories)));

  async function addField(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const checked = checkDraft(newDraft);
    if ("error" in checked) {
      setMessage({ tone: "error", text: checked.error });
      return;
    }

    const nextOrder = fields.length > 0 ? Math.max(...fields.map((field) => field.sort_order)) + 1 : 0;

    setBusy(true);
    const { error } = await supabase
      .from("category_fields")
      .insert({ ...checked.row, category_id: categoryId, sort_order: nextOrder });
    setBusy(false);

    if (error) {
      setMessage({
        tone: "error",
        text:
          error.code === "23505"
            ? "This subcategory already has a field with that name."
            : `The field couldn't be added. ${error.message}`,
      });
      return;
    }

    setNewDraft(EMPTY_DRAFT);
    setMessage({ tone: "info", text: "Field added. Sellers see it when they pick this subcategory." });
    reload();
  }

  function startEdit(field: Field) {
    setMessage(null);
    setEditingId(field.id);
    setEditDraft({
      label: field.label,
      type: field.field_type,
      unit: field.unit ?? "",
      options: field.options.join("\n"),
      required: field.is_required,
    });
  }

  async function saveEdit() {
    if (!editingId) return;
    setMessage(null);

    const checked = checkDraft(editDraft);
    if ("error" in checked) {
      setMessage({ tone: "error", text: checked.error });
      return;
    }

    setBusy(true);
    const { error } = await supabase.from("category_fields").update(checked.row).eq("id", editingId);
    setBusy(false);

    if (error) {
      setMessage({
        tone: "error",
        text:
          error.code === "23505"
            ? "This subcategory already has a field with that name."
            : `The field couldn't be saved. ${error.message}`,
      });
      return;
    }

    setEditingId(null);
    setMessage({ tone: "info", text: "Field saved." });
    reload();
  }

  async function move(index: number, direction: -1 | 1) {
    const other = fields[index + direction];
    const current = fields[index];
    if (!other || !current) return;

    setBusy(true);
    setMessage(null);
    const first = await supabase.from("category_fields").update({ sort_order: other.sort_order }).eq("id", current.id);
    const second = await supabase.from("category_fields").update({ sort_order: current.sort_order }).eq("id", other.id);
    setBusy(false);

    if (first.error || second.error) {
      setMessage({ tone: "error", text: `The order couldn't be changed. ${(first.error ?? second.error)?.message ?? ""}` });
    }
    reload();
  }

  async function remove(field: Field) {
    const used = usage[field.id] ?? 0;
    const warning =
      used > 0
        ? `${used} ${used === 1 ? "product has" : "products have"} a value for ${field.label}. Those values stay on the products as plain details. Delete the field?`
        : `Delete the field ${field.label}?`;
    if (!window.confirm(warning)) return;

    setBusy(true);
    setMessage(null);
    const { error } = await supabase.from("category_fields").delete().eq("id", field.id);
    setBusy(false);

    if (error) {
      setMessage({ tone: "error", text: `${field.label} couldn't be deleted. ${error.message}` });
      return;
    }

    setMessage({ tone: "info", text: `${field.label} is deleted.` });
    reload();
  }

  const selected = categories.find((item) => item.id === categoryId) ?? null;

  return (
    <div className="space-y-8">
      {message && <Notice tone={message.tone}>{message.text}</Notice>}

      <section className="space-y-4 rounded-xl border border-slate-200 border-t-4 border-t-gold bg-white p-5">
        <div>
          <h2 className="text-lg font-bold text-ink">Product detail fields</h2>
          <p className="mt-1 text-sm text-slate-600">
            Pick a subcategory, then set the details sellers must fill in for products in it, such as RAM or
            screen type. The answers show in the Item description pop-up and can be searched by buyers.
          </p>
        </div>

        <label className="block text-xs font-medium text-ink">
          Subcategory
          <select className={INPUT} value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
            <option value="">Choose a subcategory</option>
            {leaves.map((item) => (
              <option key={item.id} value={item.id}>
                {pathOf(item, categories)}
              </option>
            ))}
          </select>
        </label>

        <p className="text-xs text-slate-500">
          Main categories that have subcategories, such as Phones, can&apos;t have fields. Add them to the
          subcategories instead, such as Smartphones.
        </p>
      </section>

      {selected && (
        <section className="space-y-5 rounded-xl border border-slate-200 border-t-4 border-t-gold bg-white p-5">
          <h2 className="text-lg font-bold text-ink">Fields for {pathOf(selected, categories)}</h2>

          {fields.length === 0 ? (
            <p className="text-sm text-slate-600">No fields yet. Add the first one below.</p>
          ) : (
            <ul className="divide-y divide-slate-200">
              {fields.map((field, index) => {
                const used = usage[field.id] ?? 0;
                const editing = editingId === field.id;

                return (
                  <li key={field.id} className="py-4">
                    {editing ? (
                      <div className="space-y-2">
                        {used > 0 && (
                          <p className="text-xs text-slate-500">
                            {used} {used === 1 ? "product uses" : "products use"} this field, so its name, type and
                            unit are locked. You can still change whether it&apos;s required, and its options.
                          </p>
                        )}
                        <FieldForm
                          draft={editDraft}
                          onChange={(patch) => setEditDraft((current) => ({ ...current, ...patch }))}
                          lockCore={used > 0}
                          submitLabel="Save changes"
                          busy={busy}
                          onSubmit={(event) => {
                            event.preventDefault();
                            void saveEdit();
                          }}
                          onCancel={() => setEditingId(null)}
                        />
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-ink">
                            {field.label}
                            {field.is_required && (
                              <span className="ml-2 rounded-full bg-gold/20 px-2 py-0.5 text-xs font-semibold text-ink">
                                Required
                              </span>
                            )}
                          </p>
                          <p className="text-sm text-slate-600">{typeText(field)}</p>
                          <p className="text-xs text-slate-500">
                            {used === 0 ? "Not used by any product yet" : `Used by ${used} ${used === 1 ? "product" : "products"}`}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={busy || index === 0}
                            onClick={() => move(index, -1)}
                            aria-label={`Move ${field.label} up`}
                            className={GHOST}
                          >
                            Up
                          </button>
                          <button
                            type="button"
                            disabled={busy || index === fields.length - 1}
                            onClick={() => move(index, 1)}
                            aria-label={`Move ${field.label} down`}
                            className={GHOST}
                          >
                            Down
                          </button>
                          <button type="button" disabled={busy} onClick={() => startEdit(field)} className={GHOST}>
                            Edit
                          </button>
                          <button type="button" disabled={busy} onClick={() => remove(field)} className={DANGER}>
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          <div className="rounded-lg bg-paper p-4">
            <p className="mb-3 text-sm font-bold text-ink">Add a field</p>
            <FieldForm
              draft={newDraft}
              onChange={(patch) => setNewDraft((current) => ({ ...current, ...patch }))}
              lockCore={false}
              submitLabel="Add field"
              busy={busy}
              onSubmit={addField}
            />
          </div>
        </section>
      )}

      <section className="space-y-3 rounded-xl border border-slate-200 border-t-4 border-t-gold bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-ink">Live products missing a required detail</h2>
          <button type="button" onClick={reload} className={GHOST}>
            Refresh
          </button>
        </div>
        <p className="text-sm text-slate-600">
          These stay live until their seller edits them. Making a field required doesn&apos;t hide them.
        </p>

        {missing.length === 0 ? (
          <p className="text-sm text-slate-600">None. Every live product has its required details.</p>
        ) : (
          <ul className="divide-y divide-slate-200">
            {missing.map((row) => (
              <li key={row.product_id} className="py-3 text-sm">
                <span className="font-semibold text-ink">{row.product_name}</span>
                <span className="text-slate-600"> · missing {row.missing}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

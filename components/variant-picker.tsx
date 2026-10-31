"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDownIcon } from "@/components/icons";

export type PickerOption = { value: string; label: string; disabled?: boolean };

type VariantPickerProps = {
  label: string;
  options: PickerOption[];
  value: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
};

/** A box that shows the current choice and opens a list of the other choices. */
export function VariantPicker({
  label,
  options,
  value,
  onChange,
  placeholder = "Select",
}: VariantPickerProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const current = options.find((option) => option.value === value);
  const empty = options.length === 0;

  useEffect(() => {
    if (!open) return;

    function handlePointer(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={empty}
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-3 rounded-md border border-slate-400 bg-white px-4 py-3 text-left text-sm hover:border-slate-700 disabled:border-slate-200 disabled:text-slate-400"
      >
        <span className="min-w-0 truncate text-slate-600">
          {label}: <span className="font-bold text-ink">{current?.label ?? placeholder}</span>
        </span>
        <ChevronDownIcon className={`h-5 w-5 shrink-0 text-ink transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-md border border-slate-300 bg-white py-1 shadow-lg"
        >
          {options.map((option) => {
            const selected = option.value === value;
            return (
              <li key={option.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  disabled={option.disabled}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm disabled:text-slate-400 ${
                    selected ? "bg-blue-50 font-bold text-blue-700" : "text-ink hover:bg-slate-50"
                  }`}
                >
                  <span>{option.label}</span>
                  {selected && <span aria-hidden="true">✓</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

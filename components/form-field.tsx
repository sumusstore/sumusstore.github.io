import type { InputHTMLAttributes, ReactNode } from "react";

export const INPUT_CLASS =
  "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-600 focus:outline-none";

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
  optional?: boolean;
};

/** A labelled text input. Used by every form on the account pages. */
export function Field({ id, label, optional, ...props }: FieldProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-800">
        {label}
        {optional && <span className="font-normal text-slate-500"> (optional)</span>}
      </label>
      <input id={id} className={INPUT_CLASS} {...props} />
    </div>
  );
}

/** A coloured message box. Errors are announced to screen readers. */
export function Notice({ tone, children }: { tone: "error" | "info"; children: ReactNode }) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-lg p-3 text-sm ${
        tone === "error" ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-800"
      }`}
    >
      {children}
    </p>
  );
}

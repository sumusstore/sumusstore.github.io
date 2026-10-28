"use client";

import { useEffect, useState } from "react";

function formatRemaining(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (value: number) => String(value).padStart(2, "0");

  const clock = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  return days > 0 ? `${days}d ${clock}` : clock;
}

/** Counts down to the end of a sale and shows "Sale ended" when time runs out. */
export function Countdown({ endsAt }: { endsAt: string }) {
  const end = new Date(endsAt).getTime();
  const [remaining, setRemaining] = useState(() => end - Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setRemaining(end - Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [end]);

  if (remaining <= 0) {
    return <span className="text-sm font-semibold text-slate-500">Sale ended</span>;
  }

  return (
    <span className="text-sm font-semibold text-red-600">
      Ends in <span className="font-mono">{formatRemaining(remaining)}</span>
    </span>
  );
}

"use client";

import { useTransition } from "react";
import { setLocale } from "@/lib/actions";

export default function LangSwitch({ current, label }: { current: "ja" | "en"; label: string }) {
  const [pending, start] = useTransition();
  return (
    <div className="lang" role="group" aria-label={label} data-pending={pending}>
      {(["ja", "en"] as const).map((l) => (
        <button
          key={l}
          type="button"
          aria-pressed={current === l}
          onClick={() => current !== l && start(() => setLocale(l))}
        >
          {l === "ja" ? "日本語" : "EN"}
        </button>
      ))}
    </div>
  );
}

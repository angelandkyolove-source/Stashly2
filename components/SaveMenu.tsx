"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { createCollectionAction, toggleSaveAction } from "@/lib/actions";
import type { Collection } from "@/lib/store";
import type { SaveLabels } from "@/lib/i18n";
import { MAX_COLLECTIONS } from "@/lib/constants";

const MAX = MAX_COLLECTIONS;

export default function SaveMenu({
  postId,
  collections,
  initial,
  labels,
  variant = "chip",
}: {
  postId: string;
  collections: Collection[];
  initial: string[];
  labels: SaveLabels;
  variant?: "chip" | "overlay";
}) {
  const router = useRouter();
  const [ids, setIds] = useState(initial);
  const [cols, setCols] = useState(collections);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [pending, start] = useTransition();
  const saved = ids.length > 0;

  useEffect(() => setCols(collections), [collections]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const flip = (id: string) => setIds((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  function toggle(id: string) {
    flip(id);
    start(async () => {
      if ((await toggleSaveAction(postId, id)) === null) flip(id);
    });
  }

  function create() {
    const n = name.trim();
    if (!n) return;
    start(async () => {
      const c = await createCollectionAction(n);
      if (!c) return;
      setName("");
      setCols((p) => [...p, c]);
      setIds((p) => [...p, c.id]);
      await toggleSaveAction(postId, c.id);
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        className={`save save-${variant}${saved ? " is-saved" : ""}`}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
          <path
            d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2z"
            fill={saved ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
        </svg>
        <span>{saved ? labels.savedState : labels.save}</span>
      </button>

      {open &&
        createPortal(
          <div className="modal-back" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
            <div className="modal" role="dialog" aria-modal="true" aria-label={labels.saveTo}>
              <h2>{labels.saveTo}</h2>
              <ul className="col-pick">
                {cols.map((c) => (
                  <li key={c.id}>
                    <button type="button" onClick={() => toggle(c.id)} aria-pressed={ids.includes(c.id)}>
                      <span>{c.name}</span>
                      <span className="check" aria-hidden="true">{ids.includes(c.id) ? "♥" : "♡"}</span>
                    </button>
                  </li>
                ))}
              </ul>
              {cols.length < MAX ? (
                <form
                  className="col-new"
                  onSubmit={(e) => {
                    e.preventDefault();
                    create();
                  }}
                >
                  <input
                    value={name}
                    maxLength={40}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={`+ ${labels.newCollection}`}
                    aria-label={labels.newCollection}
                  />
                  <button className="btn" disabled={pending || !name.trim()}>{labels.create}</button>
                </form>
              ) : (
                <p className="muted small">{labels.limit}</p>
              )}
              <button type="button" className="btn btn-primary modal-done" onClick={() => setOpen(false)}>
                {labels.done}
              </button>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

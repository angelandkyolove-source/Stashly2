"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createCollectionAction, deleteCollectionAction, renameCollectionAction } from "@/lib/actions";

type T = {
  rename: string; renameOk: string; cancel: string; del: string; delSure: string; delDo: string;
  newCollection: string; collectionPh: string; create: string; limit: string; count: string;
};

export function CollectionHeader({ id, name, canDelete, t }: { id: string; name: string; canDelete: boolean; t: T }) {
  const router = useRouter();
  const [mode, setMode] = useState<"view" | "edit" | "del">("view");
  const [value, setValue] = useState(name);
  const [pending, start] = useTransition();

  if (mode === "edit")
    return (
      <form
        className="col-head"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            if (await renameCollectionAction(id, value)) {
              setMode("view");
              router.refresh();
            }
          });
        }}
      >
        <input autoFocus value={value} maxLength={40} onChange={(e) => setValue(e.target.value)} aria-label={t.rename} />
        <button className="btn btn-primary" disabled={pending || !value.trim()}>{t.renameOk}</button>
        <button type="button" className="btn" onClick={() => { setValue(name); setMode("view"); }}>{t.cancel}</button>
      </form>
    );

  if (mode === "del")
    return (
      <div className="col-head">
        <span className="muted small">{t.delSure}</span>
        <button
          className="btn btn-danger"
          disabled={pending}
          onClick={() =>
            start(async () => {
              if (await deleteCollectionAction(id)) {
                router.push("/saved");
                router.refresh();
              }
            })
          }
        >
          {t.delDo}
        </button>
        <button className="btn" onClick={() => setMode("view")}>{t.cancel}</button>
      </div>
    );

  return (
    <div className="col-head">
      <h1>{name}</h1>
      <button className="link" onClick={() => { setValue(name); setMode("edit"); }}>{t.rename}</button>
      {canDelete && <button className="link" onClick={() => setMode("del")}>{t.del}</button>}
    </div>
  );
}

export function NewCollection({ count, max, t }: { count: number; max: number; t: T }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [pending, start] = useTransition();

  if (count >= max) return <span className="muted small">{t.limit}</span>;
  if (!open)
    return (
      <button className="chip-btn" onClick={() => setOpen(true)}>
        + {t.newCollection} <span className="muted">{t.count}</span>
      </button>
    );
  return (
    <form
      className="col-new inline"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const c = await createCollectionAction(name);
          if (c) {
            setName("");
            setOpen(false);
            router.push(`/saved?c=${c.id}`);
            router.refresh();
          }
        });
      }}
    >
      <input autoFocus value={name} maxLength={40} onChange={(e) => setName(e.target.value)} placeholder={t.collectionPh} aria-label={t.newCollection} />
      <button className="btn btn-primary" disabled={pending || !name.trim()}>{t.create}</button>
      <button type="button" className="btn" onClick={() => setOpen(false)}>{t.cancel}</button>
    </form>
  );
}

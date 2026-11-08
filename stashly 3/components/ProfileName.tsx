"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setNameAction } from "@/lib/actions";

type T = { rename: string; renameOk: string; cancel: string; displayName: string };

export default function ProfileName({ name, t }: { name: string; t: T }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const [pending, start] = useTransition();

  if (!editing)
    return (
      <div className="col-head">
        <h1>{name}</h1>
        <button className="link" onClick={() => { setValue(name); setEditing(true); }}>{t.rename}</button>
      </div>
    );
  return (
    <form
      className="col-head"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          if (await setNameAction(value)) {
            setEditing(false);
            router.refresh();
          }
        });
      }}
    >
      <input autoFocus value={value} maxLength={30} onChange={(e) => setValue(e.target.value)} aria-label={t.displayName} />
      <button className="btn btn-primary" disabled={pending || !value.trim()}>{t.renameOk}</button>
      <button type="button" className="btn" onClick={() => setEditing(false)}>{t.cancel}</button>
    </form>
  );
}

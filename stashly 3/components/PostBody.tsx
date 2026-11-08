"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deletePostAction, updatePostAction } from "@/lib/actions";

type T = {
  edit: string; save: string; cancel: string; del: string; delSure: string; delDo: string;
  text: string; textPh: string; tags: string; tagsPh: string;
};

export default function PostBody({
  postId, text, tags, isOwn, t,
}: { postId: string; text: string; tags: string[]; isOwn: boolean; t: T }) {
  const router = useRouter();
  const [mode, setMode] = useState<"view" | "edit" | "del">("view");
  const [draftText, setDraftText] = useState(text);
  const [draftTags, setDraftTags] = useState(tags.join(" "));
  const [pending, start] = useTransition();

  if (mode === "edit")
    return (
      <form
        className="post-edit"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            if (await updatePostAction(postId, draftText, draftTags)) {
              setMode("view");
              router.refresh();
            }
          });
        }}
      >
        <label htmlFor="pe-text">{t.text}</label>
        <textarea id="pe-text" autoFocus rows={4} maxLength={500} value={draftText} placeholder={t.textPh} onChange={(e) => setDraftText(e.target.value)} />
        <label htmlFor="pe-tags">{t.tags}</label>
        <input id="pe-tags" value={draftTags} placeholder={t.tagsPh} onChange={(e) => setDraftTags(e.target.value)} />
        <div className="c-actions">
          <button className="btn btn-primary" disabled={pending}>{t.save}</button>
          <button type="button" className="btn" onClick={() => setMode("view")}>{t.cancel}</button>
        </div>
      </form>
    );

  return (
    <>
      {text && <p className="detail-text">{text}</p>}
      {tags.length > 0 && (
        <div className="tags">
          {tags.map((tag) => (
            <Link key={tag} href={`/?q=${encodeURIComponent(tag)}`}>#{tag}</Link>
          ))}
        </div>
      )}
      {isOwn && (
        <div className="c-actions post-actions">
          {mode === "del" ? (
            <>
              <span className="muted small">{t.delSure}</span>
              <button
                className="btn btn-danger"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    if (await deletePostAction(postId)) {
                      router.push("/");
                      router.refresh();
                    }
                  })
                }
              >
                {t.delDo}
              </button>
              <button className="btn" onClick={() => setMode("view")}>{t.cancel}</button>
            </>
          ) : (
            <>
              <button className="link" onClick={() => { setDraftText(text); setDraftTags(tags.join(" ")); setMode("edit"); }}>{t.edit}</button>
              <button className="link" onClick={() => setMode("del")}>{t.del}</button>
            </>
          )}
        </div>
      )}
    </>
  );
}

"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPostAction } from "@/lib/actions";

type T = {
  image: string; chooseImage: string; text: string; textPh: string; tags: string; tagsPh: string;
  submit: string; posting: string; errNoImage: string; errTooBig: string; errGeneric: string;
};

const MAX_EDGE = 1600;

// 画像を縮小してアップロード容量を抑える（GIFはそのまま）
async function prepare(file: File): Promise<{ file: File; w: number; h: number }> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale);
  const h = Math.round(bmp.height * scale);
  if (file.type === "image/gif" || (scale === 1 && file.size < 3.5 * 1024 * 1024)) return { file, w, h };
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, w, h);
  const blob: Blob = await new Promise((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error("encode"))), "image/webp", 0.85),
  );
  return { file: new File([blob], "image.webp", { type: "image/webp" }), w, h };
}

export default function NewPostForm({ t }: { t: T }) {
  const router = useRouter();
  const [prepared, setPrepared] = useState<{ file: File; w: number; h: number } | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const [pending, start] = useTransition();
  const input = useRef<HTMLInputElement>(null);

  async function pick(f: File | undefined) {
    if (!f || !f.type.startsWith("image/")) return;
    setError(null);
    try {
      const p = await prepare(f);
      setPrepared(p);
      setPreview((old) => {
        if (old) URL.revokeObjectURL(old);
        return URL.createObjectURL(p.file);
      });
    } catch {
      setError(t.errGeneric);
    }
  }

  return (
    <form
      className="form"
      onSubmit={(e) => {
        e.preventDefault();
        if (!prepared) return setError(t.errNoImage);
        const fd = new FormData(e.currentTarget);
        fd.set("image", prepared.file);
        fd.set("w", String(prepared.w));
        fd.set("h", String(prepared.h));
        setError(null);
        start(async () => {
          const r = await createPostAction(fd);
          if (r.ok) {
            router.push("/");
            router.refresh();
          } else setError(r.error === "image" ? t.errNoImage : r.error === "big" ? t.errTooBig : t.errGeneric);
        });
      }}
    >
      <label className="label">{t.image}</label>
      <div
        className={`drop${drag ? " is-drag" : ""}${preview ? " has-img" : ""}`}
        onClick={() => input.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files[0]); }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && input.current?.click()}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" />
        ) : (
          <span>{t.chooseImage}</span>
        )}
        <input ref={input} type="file" accept="image/*" hidden onChange={(e) => pick(e.target.files?.[0])} />
      </div>

      <label className="label" htmlFor="text">{t.text}</label>
      <textarea id="text" name="text" rows={3} maxLength={500} placeholder={t.textPh} />

      <label className="label" htmlFor="tags">{t.tags}</label>
      <input id="tags" name="tags" placeholder={t.tagsPh} />

      {error && <p className="error" role="alert">{error}</p>}
      <button className="btn btn-primary btn-lg" disabled={pending}>
        {pending ? t.posting : t.submit}
      </button>
    </form>
  );
}

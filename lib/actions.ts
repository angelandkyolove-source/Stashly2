"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createPost, toggleSave, createCollection, renameCollection, deleteCollection, toggleFollow, setName, pidOf, updatePost, deletePost, type Collection } from "./store";
import { getT } from "./i18n";

export async function setLocale(locale: string) {
  (await cookies()).set("locale", locale === "ja" ? "ja" : "en", {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  revalidatePath("/", "layout");
}

async function who() {
  const uid = (await cookies()).get("uid")?.value;
  const { t } = await getT();
  return { uid, defaultName: t.defaultName };
}

export async function toggleSaveAction(postId: string, colId: string): Promise<boolean | null> {
  const { uid, defaultName } = await who();
  if (!uid) return null;
  const now = await toggleSave(uid, colId, postId, defaultName);
  revalidatePath("/saved");
  return now;
}

export async function createCollectionAction(name: string): Promise<Collection | null> {
  const { uid, defaultName } = await who();
  if (!uid) return null;
  const c = await createCollection(uid, name, defaultName);
  revalidatePath("/saved");
  return c;
}

export async function renameCollectionAction(id: string, name: string): Promise<boolean> {
  const { uid, defaultName } = await who();
  if (!uid) return false;
  const ok = await renameCollection(uid, id, name, defaultName);
  revalidatePath("/saved");
  return ok;
}

export async function deleteCollectionAction(id: string): Promise<boolean> {
  const { uid, defaultName } = await who();
  if (!uid) return false;
  const ok = await deleteCollection(uid, id, defaultName);
  revalidatePath("/saved");
  return ok;
}

export async function toggleFollowAction(pid: string): Promise<boolean | null> {
  const { uid } = await who();
  if (!uid) return null;
  const r = await toggleFollow(uid, pid);
  revalidatePath("/", "layout");
  return r;
}

export async function setNameAction(name: string): Promise<boolean> {
  const { uid } = await who();
  if (!uid) return false;
  const ok = await setName(uid, name);
  revalidatePath("/", "layout");
  return ok;
}

function parseTags(raw: string): string[] {
  return [
    ...new Set(
      raw
        .split(/[\s,、　]+/)
        .map((t) => t.replace(/^#/, "").trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 10),
    ),
  ];
}

export async function updatePostAction(id: string, text: string, tags: string): Promise<boolean> {
  const { uid } = await who();
  if (!uid) return false;
  const post = await updatePost(uid, id, { text: text.slice(0, 500), tags: parseTags(tags) });
  revalidatePath("/", "layout");
  return !!post;
}

export async function deletePostAction(id: string): Promise<boolean> {
  const { uid } = await who();
  if (!uid) return false;
  const ok = await deletePost(uid, id);
  revalidatePath("/", "layout");
  return ok;
}

export type PostResult = { ok: true; id: string } | { ok: false; error: "image" | "big" | "generic" };

const MAX_BYTES = 4 * 1024 * 1024;

export async function createPostAction(fd: FormData): Promise<PostResult> {
  try {
    const file = fd.get("image");
    if (!(file instanceof File) || file.size === 0 || !file.type.startsWith("image/")) return { ok: false, error: "image" };
    if (file.size > MAX_BYTES) return { ok: false, error: "big" };
    const text = String(fd.get("text") ?? "").slice(0, 500);
    const tags = parseTags(String(fd.get("tags") ?? ""));
    const w = Math.max(1, Math.min(10000, Number(fd.get("w")) || 1));
    const h = Math.max(1, Math.min(10000, Number(fd.get("h")) || 1));
    const uid = (await cookies()).get("uid")?.value;
    const post = await createPost({ text, tags, w, h, author: uid ? pidOf(uid) : undefined }, file);
    revalidatePath("/");
    return { ok: true, id: post.id };
  } catch (e) {
    console.error(e);
    return { ok: false, error: "generic" };
  }
}

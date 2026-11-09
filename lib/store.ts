import { promises as fs } from "fs";
import path from "path";
import { createHash } from "crypto";
import { MAX_COLLECTIONS } from "./constants";
import { Redis } from "@upstash/redis";
import { put, del } from "@vercel/blob";

export type Post = {
  id: string;
  text: string;
  tags: string[];
  image: string;
  w: number;
  h: number;
  createdAt: number;
  saves: number;
  author?: string; // 公開用の作者ID（pidOf(uid)）
  hidden?: boolean; // 通報が一定数に達して非表示になった投稿
};

const redisUrl = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
export const redis = redisUrl && redisToken ? new Redis({ url: redisUrl, token: redisToken }) : null;
const blobEnabled = !!process.env.BLOB_READ_WRITE_TOKEN;

export type Collection = { id: string; name: string };
export { MAX_COLLECTIONS };

export const isLocalMode = !redis || !blobEnabled;

/* ---------- ローカル(開発用)ストア ---------- */
export type Local = { posts: Post[]; saved: Record<string, string[] | Record<string, string[]>>; cols?: Record<string, Collection[]>;
  names?: Record<string, string>; following?: Record<string, string[]>;
  kv?: Record<string, { v: unknown; exp?: number }> };
const FILE = path.join(process.cwd(), ".data", "db.json");

export async function readLocal(): Promise<Local> {
  try {
    return JSON.parse(await fs.readFile(FILE, "utf8"));
  } catch {
    return { posts: [], saved: {} };
  }
}
export async function writeLocal(d: Local) {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(d));
}

/* ---------- 公開API ---------- */
const MAX_SCAN = 500;

export async function listPosts(): Promise<Post[]> {
  if (redis) {
    const ids = await redis.zrange<string[]>("posts", 0, MAX_SCAN - 1, { rev: true });
    if (!ids.length) return [];
    const rows = await redis.mget<(Post | null)[]>(...ids.map((i) => `post:${i}`));
    return rows.filter((r): r is Post => !!r && !r.hidden);
  }
  return (await readLocal()).posts.filter((p) => !p.hidden).sort((a, b) => b.createdAt - a.createdAt);
}

export async function getPost(id: string): Promise<Post | null> {
  if (redis) return (await redis.get<Post>(`post:${id}`)) ?? null;
  return (await readLocal()).posts.find((p) => p.id === id) ?? null;
}

export async function createPost(
  input: { text: string; tags: string[]; w: number; h: number; author?: string },
  file: File,
): Promise<Post> {
  const id = crypto.randomUUID().slice(0, 12);
  const ext = file.type === "image/png" ? "png" : file.type === "image/gif" ? "gif" : file.type === "image/webp" ? "webp" : "jpg";
  let image: string;
  if (blobEnabled) {
    const blob = await put(`posts/${id}.${ext}`, file, { access: "public", contentType: file.type });
    image = blob.url;
  } else {
    const dir = path.join(process.cwd(), "public", "uploads");
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, `${id}.${ext}`), Buffer.from(await file.arrayBuffer()));
    image = `/uploads/${id}.${ext}`;
  }
  const post: Post = { id, ...input, image, createdAt: Date.now(), saves: 0 };
  if (redis) {
    await redis.set(`post:${id}`, post);
    await redis.zadd("posts", { score: post.createdAt, member: id });
  } else {
    const d = await readLocal();
    d.posts.push(post);
    await writeLocal(d);
  }
  return post;
}

/** 自分の投稿のテキストとタグだけ更新できる（画像は変更不可） */
export async function updatePost(uid: string, id: string, input: { text: string; tags: string[] }): Promise<Post | null> {
  const post = await getPost(id);
  if (!post || !post.author || post.author !== pidOf(uid)) return null;
  const next: Post = { ...post, text: input.text, tags: input.tags };
  if (redis) await redis.set(`post:${id}`, next);
  else {
    const d = await readLocal();
    d.posts = d.posts.map((p) => (p.id === id ? next : p));
    await writeLocal(d);
  }
  return next;
}

/** 自分の投稿を、画像ごと削除する。他の人のコレクションに残る参照は、表示時に読み飛ばされる */
export async function deletePost(uid: string, id: string): Promise<boolean> {
  const post = await getPost(id);
  if (!post || !post.author || post.author !== pidOf(uid)) return false;
  if (redis) await Promise.all([redis.del(`post:${id}`), redis.zrem("posts", id)]);
  else {
    const d = await readLocal();
    d.posts = d.posts.filter((p) => p.id !== id);
    await writeLocal(d);
  }
  try {
    if (post.image.startsWith("/uploads/")) await fs.unlink(path.join(process.cwd(), "public", post.image));
    else if (blobEnabled) await del(post.image);
  } catch {
    /* 画像の削除に失敗しても投稿の削除は成立させる */
  }
  return true;
}

/* ---------- コレクション ---------- */
const skey = (uid: string, col: string) => (col === "default" ? `saved:${uid}` : `saved:${uid}:${col}`);
const cleanName = (n: string) => n.trim().slice(0, 40);

// ローカル用: 旧形式(配列)は "default" コレクションとして扱う
function localSets(d: Local, uid: string): Record<string, string[]> {
  const cur = d.saved[uid];
  const sets = Array.isArray(cur) ? { default: cur } : (cur ?? {});
  d.saved[uid] = sets;
  return sets;
}

async function saveCols(uid: string, cols: Collection[]) {
  if (redis) return void (await redis.set(`cols:${uid}`, cols));
  const d = await readLocal();
  (d.cols ??= {})[uid] = cols;
  await writeLocal(d);
}

export async function getCollections(uid: string, defaultName: string): Promise<Collection[]> {
  const cols = redis ? await redis.get<Collection[]>(`cols:${uid}`) : ((await readLocal()).cols?.[uid] ?? null);
  if (cols?.length) return cols;
  const init = [{ id: "default", name: defaultName }];
  await saveCols(uid, init);
  return init;
}

export async function createCollection(uid: string, name: string, defaultName: string): Promise<Collection | null> {
  const cols = await getCollections(uid, defaultName);
  const n = cleanName(name);
  if (!n || cols.length >= MAX_COLLECTIONS) return null;
  const col = { id: crypto.randomUUID().slice(0, 8), name: n };
  await saveCols(uid, [...cols, col]);
  return col;
}

export async function renameCollection(uid: string, id: string, name: string, defaultName: string): Promise<boolean> {
  const cols = await getCollections(uid, defaultName);
  const n = cleanName(name);
  if (!n || !cols.some((c) => c.id === id)) return false;
  await saveCols(uid, cols.map((c) => (c.id === id ? { ...c, name: n } : c)));
  return true;
}

export async function deleteCollection(uid: string, id: string, defaultName: string): Promise<boolean> {
  const cols = await getCollections(uid, defaultName);
  if (cols.length <= 1 || !cols.some((c) => c.id === id)) return false;
  for (const postId of await collectionIds(uid, id)) await toggleSave(uid, id, postId, defaultName);
  if (redis) await redis.del(skey(uid, id));
  else {
    const d = await readLocal();
    delete localSets(d, uid)[id];
    await writeLocal(d);
  }
  await saveCols(uid, cols.filter((c) => c.id !== id));
  return true;
}

/** コレクション内の投稿ID（新しい順） */
export async function collectionIds(uid: string, colId: string): Promise<string[]> {
  if (redis) return redis.zrange<string[]>(skey(uid, colId), 0, -1, { rev: true });
  return [...(localSets(await readLocal(), uid)[colId] ?? [])].reverse();
}

/** 投稿ID → 入っているコレクションID[] */
export async function getMembership(uid: string, cols: Collection[]): Promise<Record<string, string[]>> {
  const lists = await Promise.all(cols.map((c) => collectionIds(uid, c.id)));
  const out: Record<string, string[]> = {};
  cols.forEach((c, i) => lists[i].forEach((pid) => (out[pid] ??= []).push(c.id)));
  return out;
}

export async function toggleSave(uid: string, colId: string, postId: string, defaultName = ""): Promise<boolean | null> {
  if (!(await getCollections(uid, defaultName)).some((c) => c.id === colId)) return null;
  if (redis) {
    const key = skey(uid, colId);
    const had = (await redis.zscore(key, postId)) !== null;
    if (had) await redis.zrem(key, postId);
    else await redis.zadd(key, { score: Date.now(), member: postId });
    const post = await redis.get<Post>(`post:${postId}`);
    if (post) await redis.set(`post:${postId}`, { ...post, saves: Math.max(0, post.saves + (had ? -1 : 1)) });
    return !had;
  }
  const d = await readLocal();
  const list = (localSets(d, uid)[colId] ??= []);
  const i = list.indexOf(postId);
  const post = d.posts.find((p) => p.id === postId);
  if (i >= 0) list.splice(i, 1);
  else list.push(postId);
  if (post) post.saves = Math.max(0, post.saves + (i >= 0 ? -1 : 1));
  await writeLocal(d);
  return i < 0;
}

/* ---------- プロフィールとフォロー ---------- */
/** Cookieの非公開uidから作る公開用ID（逆算できない） */
export const pidOf = (uid: string) => createHash("sha256").update(uid).digest("hex").slice(0, 10);

/** 保存済みの表示名（未設定の人は含まれない） */
export async function getNames(pids: string[]): Promise<Record<string, string>> {
  const uniq = [...new Set(pids)];
  if (!uniq.length) return {};
  const out: Record<string, string> = {};
  if (redis) {
    const rows = await redis.mget<(string | null)[]>(...uniq.map((p) => `pname:${p}`));
    uniq.forEach((p, i) => rows[i] && (out[p] = rows[i]!));
  } else {
    const names = (await readLocal()).names ?? {};
    uniq.forEach((p) => names[p] && (out[p] = names[p]));
  }
  return out;
}

export async function setName(uid: string, name: string): Promise<boolean> {
  const n = name.trim().slice(0, 30);
  if (!n) return false;
  const pid = pidOf(uid);
  if (redis) await redis.set(`pname:${pid}`, n);
  else {
    const d = await readLocal();
    (d.names ??= {})[pid] = n;
    await writeLocal(d);
  }
  return true;
}

export async function getFollowing(uid: string): Promise<string[]> {
  if (redis) return redis.smembers(`following:${uid}`);
  return (await readLocal()).following?.[uid] ?? [];
}

export async function followerCount(pid: string): Promise<number> {
  if (redis) return redis.scard(`followers:${pid}`);
  return Object.values((await readLocal()).following ?? {}).filter((l) => l.includes(pid)).length;
}

/** フォローを切り替える。自分自身は null。戻り値は切替後の「フォロー中」状態 */
export async function toggleFollow(uid: string, pid: string): Promise<boolean | null> {
  if (!pid || pid === pidOf(uid)) return null;
  if (redis) {
    const had = (await redis.sismember(`following:${uid}`, pid)) === 1;
    if (had) await Promise.all([redis.srem(`following:${uid}`, pid), redis.srem(`followers:${pid}`, uid)]);
    else await Promise.all([redis.sadd(`following:${uid}`, pid), redis.sadd(`followers:${pid}`, uid)]);
    return !had;
  }
  const d = await readLocal();
  const list = ((d.following ??= {})[uid] ??= []);
  const i = list.indexOf(pid);
  if (i >= 0) list.splice(i, 1);
  else list.push(pid);
  await writeLocal(d);
  return i < 0;
}

/* ---------- 運営・アカウント用 ---------- */
/** 作者の全投稿（非表示を含む）。アカウント削除で使う */
export async function postsByAuthor(pid: string): Promise<Post[]> {
  if (redis) {
    const ids = await redis.zrange<string[]>("posts", 0, -1, { rev: true });
    if (!ids.length) return [];
    const rows = await redis.mget<(Post | null)[]>(...ids.map((i) => `post:${i}`));
    return rows.filter((r): r is Post => !!r && r.author === pid);
  }
  return (await readLocal()).posts.filter((p) => p.author === pid);
}

export async function patchPost(id: string, patch: Partial<Post>): Promise<void> {
  if (redis) {
    const post = await redis.get<Post>(`post:${id}`);
    if (post) await redis.set(`post:${id}`, { ...post, ...patch });
    return;
  }
  const d = await readLocal();
  d.posts = d.posts.map((p) => (p.id === id ? { ...p, ...patch } : p));
  await writeLocal(d);
}

/** この作者をフォローしている人のuid一覧 */
export async function followersOf(pid: string): Promise<string[]> {
  if (redis) return redis.smembers(`followers:${pid}`);
  return Object.entries((await readLocal()).following ?? {}).filter(([, l]) => l.includes(pid)).map(([u]) => u);
}

/** 利用者の保存・コレクション・フォロー・名前・投稿をすべて消す（アカウント削除用） */
export async function purgeUserData(uid: string): Promise<void> {
  const pid = pidOf(uid);
  for (const p of await postsByAuthor(pid)) await deletePost(uid, p.id);

  const cols = (redis ? await redis.get<Collection[]>(`cols:${uid}`) : (await readLocal()).cols?.[uid]) ?? [];
  for (const c of cols) {
    for (const postId of await collectionIds(uid, c.id)) await toggleSave(uid, c.id, postId);
    if (redis) await redis.del(skey(uid, c.id));
  }
  for (const f of await getFollowing(uid)) await toggleFollow(uid, f);
  for (const fu of await followersOf(pid)) await toggleFollow(fu, pid);

  if (redis) await redis.del(`cols:${uid}`, `pname:${pid}`, `following:${uid}`, `followers:${pid}`);
  else {
    const d = await readLocal();
    delete d.cols?.[uid];
    delete d.names?.[pid];
    delete d.saved[uid];
    delete d.following?.[uid];
    await writeLocal(d);
  }
}

export function matches(p: Post, q: string): boolean {
  const terms = q.toLowerCase().split(/[\s,、　#]+/).filter(Boolean);
  const hay = `${p.text} ${p.tags.join(" ")}`.toLowerCase();
  return terms.every((t) => hay.includes(t));
}

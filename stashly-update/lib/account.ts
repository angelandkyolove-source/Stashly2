import { createHash, randomBytes, randomUUID, scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { getFollowing, getPost, patchPost, pidOf, purgeUserData, readLocal, redis, toggleFollow, writeLocal } from "./store";

const scryptAsync = promisify(scrypt) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

/* ---------- 小さなキー値ストア（Redis / 開発時はファイル） ---------- */
const kv = {
  async get<T>(k: string): Promise<T | null> {
    if (redis) return (await redis.get<T>(k)) ?? null;
    const e = (await readLocal()).kv?.[k];
    if (!e || (e.exp && e.exp < Date.now())) return null;
    return e.v as T;
  },
  async set(k: string, v: unknown, ttlSec?: number) {
    if (redis) return void (ttlSec ? await redis.set(k, v, { ex: ttlSec }) : await redis.set(k, v));
    const d = await readLocal();
    (d.kv ??= {})[k] = { v, exp: ttlSec ? Date.now() + ttlSec * 1000 : undefined };
    await writeLocal(d);
  },
  async del(...ks: string[]) {
    if (!ks.length) return;
    if (redis) return void (await redis.del(...ks));
    const d = await readLocal();
    for (const k of ks) delete d.kv?.[k];
    await writeLocal(d);
  },
};

/* ---------- アカウント ---------- */
type User = { id: string; email: string; salt: string; hash: string; createdAt: number; termsAt: number };

const SESSION_TTL = 60 * 60 * 24 * 90; // 90日
const MAX_FAILS = 10; // 15分あたりのログイン失敗の上限
const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const normEmail = (e: string) => e.trim().toLowerCase();

async function hashPassword(password: string, saltHex = randomBytes(16).toString("hex")) {
  const key = await scryptAsync(password, Buffer.from(saltHex, "hex"), 64);
  return { salt: saltHex, hash: key.toString("hex") };
}

async function verifyPassword(user: User, password: string) {
  const { hash } = await hashPassword(password, user.salt);
  const a = Buffer.from(hash, "hex");
  const b = Buffer.from(user.hash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

async function startSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  await kv.set(`sess:${sha(token)}`, userId, SESSION_TTL);
  const list = (await kv.get<string[]>(`usess:${userId}`)) ?? [];
  await kv.set(`usess:${userId}`, [...list.slice(-19), sha(token)]);
  return token;
}

export type AuthResult =
  | { ok: true; token: string; uid: string }
  | { ok: false; error: "terms" | "email" | "password" | "exists" | "invalid" | "locked" };

export async function registerUser(email: string, password: string, acceptTerms: boolean): Promise<AuthResult> {
  if (!acceptTerms) return { ok: false, error: "terms" };
  const e = normEmail(email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) || e.length > 200) return { ok: false, error: "email" };
  if (password.length < 8 || password.length > 200) return { ok: false, error: "password" };
  if (await kv.get(`email:${e}`)) return { ok: false, error: "exists" };
  const id = randomUUID();
  const { salt, hash } = await hashPassword(password);
  const user: User = { id, email: e, salt, hash, createdAt: Date.now(), termsAt: Date.now() };
  await kv.set(`user:${id}`, user);
  await kv.set(`email:${e}`, id);
  return { ok: true, token: await startSession(id), uid: id };
}

export async function loginUser(email: string, password: string): Promise<AuthResult> {
  const e = normEmail(email);
  const failKey = `fail:${sha(e)}`;
  const fails = (await kv.get<number>(failKey)) ?? 0;
  if (fails >= MAX_FAILS) return { ok: false, error: "locked" };
  const id = await kv.get<string>(`email:${e}`);
  const user = id ? await kv.get<User>(`user:${id}`) : null;
  if (!user || !(await verifyPassword(user, password))) {
    await kv.set(failKey, fails + 1, 15 * 60);
    return { ok: false, error: "invalid" };
  }
  await kv.del(failKey);
  return { ok: true, token: await startSession(user.id), uid: user.id };
}

export async function userFromToken(token: string): Promise<{ uid: string; email: string } | null> {
  if (!token) return null;
  const id = await kv.get<string>(`sess:${sha(token)}`);
  const user = id ? await kv.get<User>(`user:${id}`) : null;
  return user ? { uid: user.id, email: user.email } : null;
}

export async function logoutToken(token: string): Promise<void> {
  await kv.del(`sess:${sha(token)}`);
}

/** パスワードを確認したうえで、アカウントと関連データをすべて消す */
export async function deleteAccount(uid: string, password: string): Promise<boolean> {
  const user = await kv.get<User>(`user:${uid}`);
  if (!user || !(await verifyPassword(user, password))) return false;
  await purgeUserData(uid);
  const sessions = (await kv.get<string[]>(`usess:${uid}`)) ?? [];
  await kv.del(
    ...sessions.map((h) => `sess:${h}`),
    `usess:${uid}`, `user:${uid}`, `email:${user.email}`, `blocks:${uid}`, `myreports:${uid}`,
  );
  return true;
}

/* ---------- 通報・ブロック ---------- */
const REPORT_HIDE_THRESHOLD = 3;
type ReportLog = { postId: string; by: string; reason: string; at: number };

/** 通報する。別々の利用者から3件集まった投稿は自動で非表示にする */
export async function reportPost(uid: string, postId: string, reason: string): Promise<{ ok: boolean; hidden: boolean }> {
  const post = await getPost(postId);
  const me = pidOf(uid);
  if (!post || post.author === me) return { ok: false, hidden: false };

  const mine = (await kv.get<string[]>(`myreports:${uid}`)) ?? [];
  if (mine.includes(postId)) return { ok: true, hidden: !!post.hidden };
  await kv.set(`myreports:${uid}`, [...mine, postId].slice(-500));

  const reporters = (await kv.get<string[]>(`reporters:${postId}`)) ?? [];
  const next = [...new Set([...reporters, me])];
  await kv.set(`reporters:${postId}`, next);

  const log = (await kv.get<ReportLog[]>("reportlog")) ?? [];
  await kv.set("reportlog", [...log, { postId, by: me, reason: reason.slice(0, 200), at: Date.now() }].slice(-1000));

  const hide = next.length >= REPORT_HIDE_THRESHOLD;
  if (hide && !post.hidden) await patchPost(postId, { hidden: true });
  return { ok: true, hidden: hide };
}

/** 自分が通報した投稿のID（自分のフィードから隠す） */
export async function myReportedIds(uid: string): Promise<string[]> {
  return (await kv.get<string[]>(`myreports:${uid}`)) ?? [];
}

export async function getBlocks(uid: string): Promise<string[]> {
  return (await kv.get<string[]>(`blocks:${uid}`)) ?? [];
}

/** ブロックの切替。ブロックしたらフォローも外す。自分自身は null */
export async function toggleBlock(uid: string, pid: string): Promise<boolean | null> {
  if (!pid || pid === pidOf(uid)) return null;
  const list = await getBlocks(uid);
  if (list.includes(pid)) {
    await kv.set(`blocks:${uid}`, list.filter((p) => p !== pid));
    return false;
  }
  await kv.set(`blocks:${uid}`, [...list, pid].slice(-500));
  if ((await getFollowing(uid)).includes(pid)) await toggleFollow(uid, pid);
  return true;
}

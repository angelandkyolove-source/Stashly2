import { dict } from "./i18n";
import { userFromToken, getBlocks, myReportedIds } from "./account";
import { getMembership, getNames, pidOf, getCollections, type Post } from "./store";

export const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
export const fail = (error: string, status = 400) => json({ error }, status);

export type Authed = { uid: string; pid: string; email: string; lang: "ja" | "en"; defaultName: string };

export const langOf = (req: Request): "ja" | "en" =>
  (req.headers.get("accept-language") ?? "").toLowerCase().startsWith("ja") ? "ja" : "en";

export const bearer = (req: Request) => (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");

/** Authorization: Bearer <token> からログイン中の利用者を取り出す。未ログインなら 401 の Response */
export async function authed(req: Request): Promise<Authed | Response> {
  const u = await userFromToken(bearer(req));
  if (!u) return fail("unauthorized", 401);
  const lang = langOf(req);
  return { uid: u.uid, pid: pidOf(u.uid), email: u.email, lang, defaultName: dict[lang].defaultName };
}

export async function body<T = Record<string, unknown>>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    return {} as T;
  }
}

export const guestName = (lang: "ja" | "en", pid: string) => `${dict[lang].guest}-${pid.slice(0, 4)}`;

export type PostDTO = {
  id: string; text: string; tags: string[]; image: string; w: number; h: number; createdAt: number; saves: number;
  author: { pid: string; name: string } | null; collections: string[]; mine: boolean;
};

/** 投稿を、アプリに返す形に整える（作者名と、自分が入れているコレクションを付ける） */
export async function toPostDTOs(a: Authed, posts: Post[]): Promise<PostDTO[]> {
  const names = await getNames(posts.map((p) => p.author).filter((x): x is string => !!x));
  const cols = await getCollections(a.uid, a.defaultName);
  const membership = await getMembership(a.uid, cols);
  return posts.map((p) => ({
    id: p.id, text: p.text, tags: p.tags, image: p.image, w: p.w, h: p.h, createdAt: p.createdAt, saves: p.saves,
    author: p.author ? { pid: p.author, name: names[p.author] ?? guestName(a.lang, p.author) } : null,
    collections: membership[p.id] ?? [],
    mine: !!p.author && p.author === a.pid,
  }));
}

/** ブロックした人・自分が通報した投稿を除く */
export async function visiblePosts(a: Authed, posts: Post[]): Promise<Post[]> {
  const [blocked, reported] = await Promise.all([getBlocks(a.uid), myReportedIds(a.uid)]);
  return posts.filter((p) => !(p.author && blocked.includes(p.author)) && !reported.includes(p.id));
}

export function parseTags(raw: string): string[] {
  return [
    ...new Set(
      raw.split(/[\s,、　]+/).map((t) => t.replace(/^#/, "").trim().toLowerCase()).filter(Boolean).slice(0, 10),
    ),
  ];
}

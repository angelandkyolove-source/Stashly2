import { authed, fail, json, parseTags, toPostDTOs, visiblePosts } from "@/lib/api";
import { createPost, getFollowing, listPosts, matches } from "@/lib/store";

export const dynamic = "force-dynamic";

const MAX_BYTES = 4 * 1024 * 1024;

/** フィード。q=検索語 / following=1 / author=<pid> / offset / limit */
export async function GET(req: Request) {
  const a = await authed(req);
  if (a instanceof Response) return a;
  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? "";
  const author = url.searchParams.get("author");
  const offset = Math.max(0, Number(url.searchParams.get("offset")) || 0);
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit")) || 30));

  let posts = await visiblePosts(a, await listPosts());
  if (url.searchParams.get("following") === "1") {
    const following = await getFollowing(a.uid);
    posts = posts.filter((p) => p.author && following.includes(p.author));
  }
  if (author) posts = posts.filter((p) => p.author === author);
  if (q.trim()) posts = posts.filter((p) => matches(p, q));

  const page = posts.slice(offset, offset + limit);
  return json({ posts: await toPostDTOs(a, page), nextOffset: offset + limit < posts.length ? offset + limit : null });
}

/** 投稿。multipart/form-data: image, text, tags, w, h */
export async function POST(req: Request) {
  const a = await authed(req);
  if (a instanceof Response) return a;
  const fd = await req.formData().catch(() => null);
  const file = fd?.get("image");
  if (!fd || !(file instanceof File) || file.size === 0 || !file.type.startsWith("image/")) return fail("image");
  if (file.size > MAX_BYTES) return fail("too_big", 413);
  const post = await createPost(
    {
      text: String(fd.get("text") ?? "").slice(0, 500),
      tags: parseTags(String(fd.get("tags") ?? "")),
      w: Math.max(1, Math.min(10000, Number(fd.get("w")) || 1)),
      h: Math.max(1, Math.min(10000, Number(fd.get("h")) || 1)),
      author: a.pid,
    },
    file,
  );
  return json({ post: (await toPostDTOs(a, [post]))[0] }, 201);
}

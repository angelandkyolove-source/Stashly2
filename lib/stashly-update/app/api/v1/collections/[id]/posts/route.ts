import { authed, json, toPostDTOs, visiblePosts } from "@/lib/api";
import { collectionIds, getPost, type Post } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const a = await authed(req);
  if (a instanceof Response) return a;
  const ids = await collectionIds(a.uid, (await params).id);
  const posts = (await Promise.all(ids.map(getPost))).filter((p): p is Post => !!p && !p.hidden);
  return json({ posts: await toPostDTOs(a, await visiblePosts(a, posts)) });
}

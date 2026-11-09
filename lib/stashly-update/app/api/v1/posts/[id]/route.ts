import { authed, body, fail, json, parseTags, toPostDTOs } from "@/lib/api";
import { deletePost, getPost, updatePost } from "@/lib/store";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Ctx) {
  const a = await authed(req);
  if (a instanceof Response) return a;
  const post = await getPost((await params).id);
  if (!post || (post.hidden && post.author !== a.pid)) return fail("not_found", 404);
  return json({ post: (await toPostDTOs(a, [post]))[0] });
}

/** テキストとタグの編集（自分の投稿のみ） */
export async function PATCH(req: Request, { params }: Ctx) {
  const a = await authed(req);
  if (a instanceof Response) return a;
  const b = await body<{ text?: string; tags?: string }>(req);
  const post = await updatePost(a.uid, (await params).id, {
    text: String(b.text ?? "").slice(0, 500),
    tags: parseTags(String(b.tags ?? "")),
  });
  if (!post) return fail("forbidden", 403);
  return json({ post: (await toPostDTOs(a, [post]))[0] });
}

export async function DELETE(req: Request, { params }: Ctx) {
  const a = await authed(req);
  if (a instanceof Response) return a;
  if (!(await deletePost(a.uid, (await params).id))) return fail("forbidden", 403);
  return json({ ok: true });
}

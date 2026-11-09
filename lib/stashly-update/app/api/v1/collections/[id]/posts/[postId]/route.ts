import { authed, fail, json } from "@/lib/api";
import { toggleSave } from "@/lib/store";

export const dynamic = "force-dynamic";

/** 投稿をコレクションに入れる／外す（切替） */
export async function POST(req: Request, { params }: { params: Promise<{ id: string; postId: string }> }) {
  const a = await authed(req);
  if (a instanceof Response) return a;
  const { id, postId } = await params;
  const r = await toggleSave(a.uid, id, postId, a.defaultName);
  return r === null ? fail("invalid") : json({ saved: r });
}

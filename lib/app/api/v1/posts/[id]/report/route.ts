import { reportPost } from "@/lib/account";
import { authed, body, fail, json } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const a = await authed(req);
  if (a instanceof Response) return a;
  const b = await body<{ reason?: string }>(req);
  const r = await reportPost(a.uid, (await params).id, String(b.reason ?? ""));
  return r.ok ? json({ ok: true }) : fail("not_reportable", 400);
}

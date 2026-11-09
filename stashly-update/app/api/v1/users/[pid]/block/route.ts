import { toggleBlock } from "@/lib/account";
import { authed, fail, json } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ pid: string }> }) {
  const a = await authed(req);
  if (a instanceof Response) return a;
  const r = await toggleBlock(a.uid, (await params).pid);
  return r === null ? fail("self", 400) : json({ blocked: r });
}

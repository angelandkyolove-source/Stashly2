import { authed, body, fail, json } from "@/lib/api";
import { deleteCollection, renameCollection } from "@/lib/store";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const a = await authed(req);
  if (a instanceof Response) return a;
  const b = await body<{ name?: string }>(req);
  return (await renameCollection(a.uid, (await params).id, String(b.name ?? ""), a.defaultName)) ? json({ ok: true }) : fail("invalid");
}

export async function DELETE(req: Request, { params }: Ctx) {
  const a = await authed(req);
  if (a instanceof Response) return a;
  return (await deleteCollection(a.uid, (await params).id, a.defaultName)) ? json({ ok: true }) : fail("invalid");
}

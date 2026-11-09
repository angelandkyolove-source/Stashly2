import { authed, body, fail, json } from "@/lib/api";
import { collectionIds, createCollection, getCollections, MAX_COLLECTIONS } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const a = await authed(req);
  if (a instanceof Response) return a;
  const cols = await getCollections(a.uid, a.defaultName);
  const counts = await Promise.all(cols.map(async (c) => (await collectionIds(a.uid, c.id)).length));
  return json({ max: MAX_COLLECTIONS, collections: cols.map((c, i) => ({ ...c, count: counts[i] })) });
}

export async function POST(req: Request) {
  const a = await authed(req);
  if (a instanceof Response) return a;
  const b = await body<{ name?: string }>(req);
  const c = await createCollection(a.uid, String(b.name ?? ""), a.defaultName);
  return c ? json({ collection: c }, 201) : fail("limit_or_name");
}

import { getBlocks } from "@/lib/account";
import { authed, guestName, json } from "@/lib/api";
import { getNames } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const a = await authed(req);
  if (a instanceof Response) return a;
  const pids = await getBlocks(a.uid);
  const names = await getNames(pids);
  return json({ blocks: pids.map((pid) => ({ pid, name: names[pid] ?? guestName(a.lang, pid) })) });
}

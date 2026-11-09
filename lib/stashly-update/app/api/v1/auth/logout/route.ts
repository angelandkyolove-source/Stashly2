import { logoutToken } from "@/lib/account";
import { bearer, json } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  await logoutToken(bearer(req));
  return json({ ok: true });
}

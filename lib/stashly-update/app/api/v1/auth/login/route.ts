import { loginUser } from "@/lib/account";
import { body, fail, json } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const b = await body<{ email?: string; password?: string }>(req);
  const r = await loginUser(String(b.email ?? ""), String(b.password ?? ""));
  if (!r.ok) return fail(r.error, r.error === "locked" ? 429 : 401);
  return json({ token: r.token });
}

import { registerUser } from "@/lib/account";
import { body, fail, json } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const b = await body<{ email?: string; password?: string; acceptTerms?: boolean }>(req);
  const r = await registerUser(String(b.email ?? ""), String(b.password ?? ""), b.acceptTerms === true);
  if (!r.ok) return fail(r.error, r.error === "exists" ? 409 : 400);
  return json({ token: r.token }, 201);
}

import { deleteAccount } from "@/lib/account";
import { authed, body, fail, guestName, json } from "@/lib/api";
import { followerCount, getFollowing, getNames, setName } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const a = await authed(req);
  if (a instanceof Response) return a;
  const [names, following, followers] = await Promise.all([getNames([a.pid]), getFollowing(a.uid), followerCount(a.pid)]);
  return json({
    pid: a.pid, email: a.email, name: names[a.pid] ?? guestName(a.lang, a.pid),
    followingCount: following.length, followerCount: followers,
  });
}

export async function PATCH(req: Request) {
  const a = await authed(req);
  if (a instanceof Response) return a;
  const b = await body<{ name?: string }>(req);
  if (!(await setName(a.uid, String(b.name ?? "")))) return fail("name");
  return json({ ok: true });
}

/** アカウント削除。パスワードの確認が必要 */
export async function DELETE(req: Request) {
  const a = await authed(req);
  if (a instanceof Response) return a;
  const b = await body<{ password?: string }>(req);
  if (!(await deleteAccount(a.uid, String(b.password ?? "")))) return fail("password", 403);
  return json({ ok: true });
}

import { cookies } from "next/headers";
import { getT, guestName } from "./i18n";
import { getCollections, getFollowing, getMembership, getNames, pidOf, type Collection, type Post } from "./store";

export type UserData = { uid?: string; pid?: string; following: string[]; cols: Collection[]; membership: Record<string, string[]> };

export async function loadUser(): Promise<UserData> {
  const { t } = await getT();
  const uid = (await cookies()).get("uid")?.value;
  if (!uid) return { uid, following: [], cols: [], membership: {} };
  const cols = await getCollections(uid, t.defaultName);
  const [membership, following] = await Promise.all([getMembership(uid, cols), getFollowing(uid)]);
  return { uid, pid: pidOf(uid), following, cols, membership };
}

/** 作者ID → 表示名（未設定の人は「ゲスト-xxxx」） */
export async function resolveNames(posts: Pick<Post, "author">[], extra: string[] = []): Promise<Record<string, string>> {
  const { t } = await getT();
  const pids = [...posts.map((p) => p.author), ...extra].filter((x): x is string => !!x);
  const stored = await getNames(pids);
  return Object.fromEntries(pids.map((p) => [p, stored[p] ?? guestName(t, p)]));
}

import { getBlocks } from "@/lib/account";
import { authed, guestName, json } from "@/lib/api";
import { followerCount, getFollowing, getNames, listPosts } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ pid: string }> }) {
  const a = await authed(req);
  if (a instanceof Response) return a;
  const { pid } = await params;
  const [names, followers, following, blocks, posts] = await Promise.all([
    getNames([pid]), followerCount(pid), getFollowing(a.uid), getBlocks(a.uid), listPosts(),
  ]);
  return json({
    pid, name: names[pid] ?? guestName(a.lang, pid), isMe: pid === a.pid,
    postCount: posts.filter((p) => p.author === pid).length, followerCount: followers,
    isFollowing: following.includes(pid), isBlocked: blocks.includes(pid),
  });
}

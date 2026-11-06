import Link from "next/link";
import Header from "@/components/Header";
import Feed from "@/components/Feed";
import { getT, saveLabels } from "@/lib/i18n";
import { loadUser, resolveNames } from "@/lib/user-data";
import { listPosts, matches, isLocalMode, MAX_COLLECTIONS } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: Promise<{ q?: string; f?: string }> }) {
  const { q = "", f } = await searchParams;
  const followingOnly = f === "1";
  const { t } = await getT();
  const [all, user] = await Promise.all([listPosts(), loadUser()]);
  let posts = followingOnly ? all.filter((p) => p.author && user.following.includes(p.author)) : all;
  if (q.trim()) posts = posts.filter((p) => matches(p, q));
  const names = await resolveNames(posts);

  const counts = new Map<string, number>();
  for (const p of all) for (const tag of p.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  const topTags = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);

  return (
    <>
      <Header q={q} />
      <main className="main">
        {q.trim() ? (
          <div className="result-bar">
            <h1>{t.results(q)}</h1>
            <Link href="/">{t.clear}</Link>
          </div>
        ) : (
          <section className="hero">
            <h1>{t.tagline}</h1>
          </section>
        )}
        <div className="feed-tabs" role="tablist">
          <Link href="/" role="tab" aria-selected={!followingOnly} className={!followingOnly ? "on" : ""}>{t.all}</Link>
          <Link href="/?f=1" role="tab" aria-selected={followingOnly} className={followingOnly ? "on" : ""}>
            {t.followingTab}{user.following.length > 0 && <span>{user.following.length}</span>}
          </Link>
        </div>
        {topTags.length > 0 && (
          <div className="chips">
            {topTags.map(([tag]) => (
              <Link key={tag} href={`/?q=${encodeURIComponent(tag)}`} className={q === tag ? "on" : ""}>
                #{tag}
              </Link>
            ))}
          </div>
        )}
        <Feed
          posts={posts}
          collections={user.cols}
          membership={user.membership}
          labels={saveLabels(t, MAX_COLLECTIONS)}
          names={names}
          empty={q.trim() ? t.noResults : followingOnly ? t.emptyFollowing : t.empty}
        />
        {isLocalMode && <p className="note">{t.storageNote}</p>}
      </main>
    </>
  );
}

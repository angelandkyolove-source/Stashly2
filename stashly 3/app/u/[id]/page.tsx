import Link from "next/link";
import type { Metadata } from "next";
import Header from "@/components/Header";
import Feed from "@/components/Feed";
import FollowButton from "@/components/FollowButton";
import ProfileName from "@/components/ProfileName";
import { getT, saveLabels } from "@/lib/i18n";
import { loadUser, resolveNames } from "@/lib/user-data";
import { followerCount, listPosts, MAX_COLLECTIONS } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return { title: (await resolveNames([], [id]))[id] };
}

export default async function Profile({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { t } = await getT();
  const [user, all, followers] = await Promise.all([loadUser(), listPosts(), followerCount(id)]);
  const posts = all.filter((p) => p.author === id);
  const isMe = user.pid === id;
  const names = await resolveNames(posts, [id, ...(isMe ? user.following : [])]);

  return (
    <>
      <Header />
      <main className="main">
        <section className="profile">
          {isMe ? (
            <ProfileName
              key={names[id]}
              name={names[id]}
              t={{ rename: t.rename, renameOk: t.rename_ok, cancel: t.cancel, displayName: t.displayName }}
            />
          ) : (
            <div className="col-head">
              <h1>{names[id]}</h1>
              <FollowButton pid={id} initial={user.following.includes(id)} labels={{ follow: t.follow, following: t.followingState }} />
            </div>
          )}
          <p className="stats">
            <span>{t.postsN(posts.length)}</span>
            <span>{t.followersN(followers)}</span>
            {isMe && <span>{t.followingN(user.following.length)}</span>}
            {isMe && <span className="badge">{t.you}</span>}
          </p>
          {isMe && (
            <div className="chips left">
              {user.following.length === 0 ? (
                <span className="muted small">{t.noFollowing}</span>
              ) : (
                user.following.map((p) => (
                  <Link key={p} href={`/u/${p}`}>{names[p]}</Link>
                ))
              )}
            </div>
          )}
        </section>
        <Feed
          posts={posts}
          collections={user.cols}
          membership={user.membership}
          labels={saveLabels(t, MAX_COLLECTIONS)}
          names={names}
          empty={t.noPostsYet}
        />
      </main>
    </>
  );
}

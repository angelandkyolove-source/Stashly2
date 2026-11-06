import Link from "next/link";
import type { Metadata } from "next";
import Header from "@/components/Header";
import SaveMenu from "@/components/SaveMenu";
import { getT, saveLabels } from "@/lib/i18n";
import { loadUser, resolveNames } from "@/lib/user-data";
import FollowButton from "@/components/FollowButton";
import PostBody from "@/components/PostBody";
import { getPost, MAX_COLLECTIONS } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const p = await getPost((await params).id);
  return p ? { title: p.text.slice(0, 40) || "Post", openGraph: { images: [p.image] } } : {};
}

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { t } = await getT();
  const post = await getPost(id);
  const user = await loadUser();
  const colIds = user.membership[id] ?? [];
  const names = post ? await resolveNames([post]) : {};
  return (
    <>
      <Header />
      <main className="main narrow">
        <Link href="/" className="back">{t.back}</Link>
        {!post ? (
          <p className="empty">{t.notFound}</p>
        ) : (
          <article className="detail">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={post.image} alt={post.text || post.tags.join(" ")} width={post.w} height={post.h} />
            <div className="detail-bar">
              <SaveMenu postId={post.id} collections={user.cols} initial={colIds} labels={saveLabels(t, MAX_COLLECTIONS)} />
              <span className="muted">{t.saves(post.saves)}</span>
            </div>
            {post.author && (
              <div className="author-row">
                <Link href={`/u/${post.author}`} className="author">{names[post.author]}</Link>
                {post.author !== user.pid && (
                  <FollowButton pid={post.author} initial={user.following.includes(post.author)} labels={{ follow: t.follow, following: t.followingState }} />
                )}
              </div>
            )}
            <PostBody
              key={post.text + post.tags.join()}
              postId={post.id}
              text={post.text}
              tags={post.tags}
              isOwn={!!post.author && post.author === user.pid}
              t={{
                edit: t.edit, save: t.rename_ok, cancel: t.cancel, del: t.del, delSure: t.delPostSure, delDo: t.delDo,
                text: t.text, textPh: t.textPh, tags: t.tags, tagsPh: t.tagsPh,
              }}
            />
          </article>
        )}
      </main>
    </>
  );
}

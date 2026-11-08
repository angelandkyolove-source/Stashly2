import Link from "next/link";
import type { Collection, Post } from "@/lib/store";
import type { SaveLabels } from "@/lib/i18n";
import SaveMenu from "./SaveMenu";

export default function PostCard({
  post,
  collections,
  colIds,
  labels,
  authorName,
}: {
  post: Post;
  collections: Collection[];
  colIds: string[];
  labels: SaveLabels;
  authorName?: string;
}) {
  return (
    <article className="card">
      <div className="card-media">
        <Link href={`/post/${post.id}`} className="card-img" style={{ aspectRatio: `${post.w} / ${post.h}` }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={post.image} alt={post.text || post.tags.join(" ")} width={post.w} height={post.h} loading="lazy" />
        </Link>
        <SaveMenu postId={post.id} collections={collections} initial={colIds} labels={labels} variant="overlay" />
      </div>
      {(post.text || post.tags.length > 0 || (post.author && authorName)) && (
        <div className="card-body">
          {post.text && <p>{post.text}</p>}
          {post.author && authorName && (
            <Link href={`/u/${post.author}`} className="author">
              {authorName}
            </Link>
          )}
          {post.tags.length > 0 && (
            <div className="tags">
              {post.tags.map((t) => (
                <Link key={t} href={`/?q=${encodeURIComponent(t)}`}>
                  #{t}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </article>
  );
}

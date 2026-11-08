import type { Collection, Post } from "@/lib/store";
import type { SaveLabels } from "@/lib/i18n";
import PostCard from "./PostCard";

export default function Feed({
  posts,
  collections,
  membership,
  labels,
  empty,
  names = {},
}: {
  posts: Post[];
  collections: Collection[];
  membership: Record<string, string[]>;
  labels: SaveLabels;
  empty: string;
  names?: Record<string, string>;
}) {
  if (!posts.length) return <p className="empty">{empty}</p>;
  return (
    <div className="masonry">
      {posts.map((p) => (
        <PostCard key={p.id} post={p} collections={collections} colIds={membership[p.id] ?? []} labels={labels} authorName={p.author ? names[p.author] : undefined} />
      ))}
    </div>
  );
}

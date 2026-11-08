import Link from "next/link";
import Header from "@/components/Header";
import Feed from "@/components/Feed";
import { CollectionHeader, NewCollection } from "@/components/CollectionBar";
import { getT, saveLabels } from "@/lib/i18n";
import { loadUser } from "@/lib/user-data";
import { collectionIds, getPost, MAX_COLLECTIONS } from "@/lib/store";
import type { Post } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function Saved({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const { c } = await searchParams;
  const { t } = await getT();
  const user = await loadUser();
  const active = user.cols.find((x) => x.id === c) ?? user.cols[0];
  const ids = user.uid && active ? await collectionIds(user.uid, active.id) : [];
  const posts = (await Promise.all(ids.map(getPost))).filter((p): p is Post => !!p);

  const counts: Record<string, number> = {};
  for (const list of Object.values(user.membership)) for (const id of list) counts[id] = (counts[id] ?? 0) + 1;

  const ui = {
    rename: t.rename, renameOk: t.rename_ok, cancel: t.cancel, del: t.del, delSure: t.delSure, delDo: t.delDo,
    newCollection: t.newCollection, collectionPh: t.collectionPh, create: t.create,
    limit: t.limit(MAX_COLLECTIONS), count: t.count(user.cols.length, MAX_COLLECTIONS),
  };

  return (
    <>
      <Header />
      <main className="main">
        {active && (
          <>
            <div className="col-tabs">
              {user.cols.map((x) => (
                <Link key={x.id} href={`/saved?c=${x.id}`} className={x.id === active.id ? "on" : ""}>
                  {x.name} <span>{counts[x.id] ?? 0}</span>
                </Link>
              ))}
              <NewCollection count={user.cols.length} max={MAX_COLLECTIONS} t={ui} />
            </div>
            <CollectionHeader key={active.id + active.name} id={active.id} name={active.name} canDelete={user.cols.length > 1} t={ui} />
          </>
        )}
        <Feed
          posts={posts}
          collections={user.cols}
          membership={user.membership}
          labels={saveLabels(t, MAX_COLLECTIONS)}
          empty={t.savedEmpty}
        />
      </main>
    </>
  );
}

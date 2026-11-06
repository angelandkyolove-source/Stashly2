import { cookies, headers } from "next/headers";

export const LOCALES = ["ja", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const dict = {
  ja: {
    appName: "Stashly",
    tagline: "好きを集めて、わたしの棚をつくる。",
    feed: "フィード",
    saved: "コレクション",
    post: "投稿する",
    search: "タグやキーワードで検索",
    searchBtn: "検索",
    results: (q: string) => `「${q}」の検索結果`,
    clear: "クリア",
    empty: "まだ投稿がありません。最初の1枚を投稿してみましょう。",
    noResults: "見つかりませんでした。",
    savedEmpty: "保存した投稿はまだありません。気になった投稿の「保存」を押してみましょう。",
    save: "保存",
    savedState: "保存済み",
    saves: (n: number) => `${n}件の保存`,
    newTitle: "新しい投稿",
    image: "画像",
    chooseImage: "画像を選択、またはここにドロップ",
    text: "テキスト",
    textPh: "ひとこと添えてみましょう…",
    tags: "タグ",
    tagsPh: "カンマかスペースで区切る  例: 旅行, 朝焼け",
    submit: "投稿",
    posting: "投稿中…",
    errNoImage: "画像を選択してください。",
    errTooBig: "画像が大きすぎます。",
    errGeneric: "投稿に失敗しました。もう一度お試しください。",
    back: "← 戻る",
    notFound: "投稿が見つかりません。",
    storageNote: "ストレージ未設定のためローカル保存で動作中です。",
    language: "言語",
    defaultName: "お気に入り",
    saveTo: "保存先のコレクション",
    newCollection: "新しいコレクション",
    collectionPh: "コレクション名",
    create: "作成",
    limit: (max: number) => `コレクションは最大${max}個までです。`,
    count: (n: number, max: number) => `${n} / ${max}`,
    rename: "名前を変更",
    rename_ok: "保存",
    cancel: "キャンセル",
    del: "削除",
    delSure: "このコレクションを削除しますか？保存した投稿は残ります。",
    delDo: "削除する",
    done: "完了",
    guest: "ゲスト",
    all: "すべて",
    followingTab: "フォロー中",
    follow: "フォロー",
    followingState: "フォロー中",
    profile: "プロフィール",
    you: "あなた",
    postsN: (n: number) => `${n}件の投稿`,
    followersN: (n: number) => `フォロワー ${n}人`,
    followingN: (n: number) => `フォロー中 ${n}人`,
    emptyFollowing: "フォロー中の人の投稿がここに並びます。気になった投稿の作者名からプロフィールを開いて、フォローしてみましょう。",
    noPostsYet: "まだ投稿がありません。",
    displayName: "表示名",
    followingList: "フォローしている人",
    noFollowing: "まだ誰もフォローしていません。",
    edit: "編集",
    delPostSure: "この投稿を削除しますか？画像も削除され、元に戻せません。",
  },
  en: {
    appName: "Stashly",
    tagline: "Collect what you love. Build your own shelf.",
    feed: "Feed",
    saved: "Collection",
    post: "Post",
    search: "Search by tag or keyword",
    searchBtn: "Search",
    results: (q: string) => `Results for “${q}”`,
    clear: "Clear",
    empty: "No posts yet. Share the first one.",
    noResults: "Nothing found.",
    savedEmpty: "Nothing saved yet. Tap “Save” on a post you like.",
    save: "Save",
    savedState: "Saved",
    saves: (n: number) => `${n} ${n === 1 ? "save" : "saves"}`,
    newTitle: "New post",
    image: "Image",
    chooseImage: "Choose an image or drop it here",
    text: "Text",
    textPh: "Add a few words…",
    tags: "Tags",
    tagsPh: "Separate with commas or spaces  e.g. travel, sunrise",
    submit: "Post",
    posting: "Posting…",
    errNoImage: "Please choose an image.",
    errTooBig: "The image is too large.",
    errGeneric: "Something went wrong. Please try again.",
    back: "← Back",
    notFound: "Post not found.",
    storageNote: "Storage isn't configured, so data is stored locally.",
    language: "Language",
    defaultName: "Favorites",
    saveTo: "Save to collection",
    newCollection: "New collection",
    collectionPh: "Collection name",
    create: "Create",
    limit: (max: number) => `You can have up to ${max} collections.`,
    count: (n: number, max: number) => `${n} / ${max}`,
    rename: "Rename",
    rename_ok: "Save",
    cancel: "Cancel",
    del: "Delete",
    delSure: "Delete this collection? The posts themselves are kept.",
    delDo: "Delete",
    done: "Done",
    guest: "Guest",
    all: "All",
    followingTab: "Following",
    follow: "Follow",
    followingState: "Following",
    profile: "Profile",
    you: "You",
    postsN: (n: number) => `${n} ${n === 1 ? "post" : "posts"}`,
    followersN: (n: number) => `${n} ${n === 1 ? "follower" : "followers"}`,
    followingN: (n: number) => `${n} following`,
    emptyFollowing: "Posts from people you follow show up here. Open an author's profile from a post and follow them.",
    noPostsYet: "No posts yet.",
    displayName: "Display name",
    followingList: "People you follow",
    noFollowing: "You aren't following anyone yet.",
    edit: "Edit",
    delPostSure: "Delete this post? Its image is removed too, and this can't be undone.",
  },
} as const;

export type Dict = (typeof dict)[Locale];

export type SaveLabels = {
  save: string; savedState: string; saveTo: string; newCollection: string; collectionPh: string;
  create: string; limit: string; done: string;
};
export function saveLabels(t: Dict, max: number): SaveLabels {
  return {
    save: t.save, savedState: t.savedState, saveTo: t.saveTo, newCollection: t.newCollection,
    collectionPh: t.collectionPh, create: t.create, limit: t.limit(max), done: t.done,
  };
}

export const guestName = (t: Dict, pid: string) => `${t.guest}-${pid.slice(0, 4)}`;

export async function getLocale(): Promise<Locale> {
  const c = (await cookies()).get("locale")?.value;
  if (c === "ja" || c === "en") return c;
  const al = (await headers()).get("accept-language") ?? "";
  return al.toLowerCase().startsWith("ja") ? "ja" : "en";
}

export async function getT() {
  const locale = await getLocale();
  return { locale, t: dict[locale] as Dict };
}

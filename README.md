# Stashly ♡

画像とテキストを投稿して、気になった投稿を「保存」して自分のコレクションに。タグ・キーワード検索、日本語/English 対応。
Next.js 15 (App Router) + Vercel Blob (画像) + Upstash Redis (データ)。

## ローカル開発
```bash
npm install
npm run dev   # http://localhost:3000
```
環境変数が未設定の場合、データは `.data/db.json`、画像は `public/uploads/` に保存されます（開発専用）。
※ `next start` ではビルド後に追加された `public/uploads` は配信されません。ローカル確認は `npm run dev` で。

## Vercel へのデプロイ
1. このリポジトリを GitHub に push し、Vercel で **Import**。
2. プロジェクトの **Storage** タブで
   - **Blob** を作成 → `BLOB_READ_WRITE_TOKEN` が自動設定
   - Marketplace から **Upstash for Redis** を追加 → `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`（または `KV_REST_API_*`）が自動設定
3. Deploy（再デプロイ）。

## 仕様メモ
- ユーザー登録なし。`uid` Cookie（匿名ID）ごとにコレクションを保持します（Cookie を消すとコレクションも見えなくなります）。
- 画像はブラウザ側で最長辺1600pxに縮小し WebP 化してから送信（Vercel の 4.5MB 制限対策）。
- 言語は Cookie `locale`（初回は Accept-Language）で切替。辞書は `lib/i18n.ts`。
- 検索は直近500件をタグ・本文の部分一致で絞り込み（AND検索）。投稿が増えたら検索インデックスの導入を検討してください。

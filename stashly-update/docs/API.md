# Stashly API v1（iPhone アプリ用）

ベースURL: `https://<デプロイ先>/api/v1`
認証: ログイン後に受け取った `token` を、すべてのリクエストに `Authorization: Bearer <token>` で付ける（登録・ログイン以外）。
言語: `Accept-Language: ja` / `en`（既定コレクション名と「ゲスト」名に使う）。
エラー: `{ "error": "<コード>" }`。主なコードは下記。

## アカウント
| メソッド | パス | 本文 | 結果 |
|---|---|---|---|
| POST | `/auth/register` | `{ email, password(8文字以上), acceptTerms: true }` | 201 `{ token }` / 400 `terms\|email\|password` / 409 `exists` |
| POST | `/auth/login` | `{ email, password }` | `{ token }` / 401 `invalid` / 429 `locked`（15分に10回失敗） |
| POST | `/auth/logout` | – | このトークンを無効化 |
| GET | `/me` | – | `{ pid, email, name, followingCount, followerCount }` |
| PATCH | `/me` | `{ name }` | 表示名の変更（30文字まで） |
| DELETE | `/me` | `{ password }` | **アカウント削除**。投稿・保存・フォロー・コレクションも削除。403 `password` |

## 投稿
| メソッド | パス | 説明 |
|---|---|---|
| GET | `/posts?q=&following=1&author=<pid>&offset=&limit=` | フィード。ブロックした人・自分が通報した投稿は除外。`nextOffset` で続きを取得 |
| POST | `/posts` | multipart: `image`(必須・4MBまで), `text`, `tags`, `w`, `h` |
| GET | `/posts/{id}` | 1件 |
| PATCH | `/posts/{id}` | `{ text, tags }`（自分の投稿のみ。403 `forbidden`） |
| DELETE | `/posts/{id}` | 自分の投稿のみ |
| POST | `/posts/{id}/report` | `{ reason }`。別々の3人が通報すると全員から非表示 |

## 人
| メソッド | パス | 説明 |
|---|---|---|
| GET | `/users/{pid}` | `{ name, postCount, followerCount, isFollowing, isBlocked, isMe }` |
| POST | `/users/{pid}/follow` | 切替 → `{ following }` |
| POST | `/users/{pid}/block` | 切替 → `{ blocked }`（ブロックするとフォローも外れる） |
| GET | `/me/blocks` | ブロック一覧 |

## コレクション（最大20個）
| メソッド | パス | 説明 |
|---|---|---|
| GET | `/collections` | `{ max, collections: [{ id, name, count }] }` |
| POST | `/collections` | `{ name }` → 201 / 400 `limit_or_name` |
| PATCH | `/collections/{id}` | `{ name }` |
| DELETE | `/collections/{id}` | 最後の1つは削除不可 |
| GET | `/collections/{id}/posts` | 中の投稿 |
| POST | `/collections/{id}/posts/{postId}` | 入れる／外す（切替）→ `{ saved }` |

## 投稿の形（PostDTO）
`{ id, text, tags[], image(URL), w, h, createdAt, saves, author: { pid, name } | null, collections: [コレクションID], mine }`

## 運営メモ
- 通報は `reportlog`（Redis のキー）に記録される。審査対応のため、運営が通報を確認して削除する手順が別途必要。
- パスワード再設定にはメール送信サービスが必要（未実装）。

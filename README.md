# firegym

パーソナルジムの顧客・セッション・売上を管理するWebアプリ。
Next.js 16 + Supabase + FullCalendar。

## 何ができる

- カレンダー（週/日/月、PC・タブレット・スマホ対応）でセッション予約を登録
- 1日の終わりに各セッションに対し「実施 / 当日キャンセル(消化) / キャンセル(返却)」をボタンで確定
- 顧客ごとの残チケット枚数・最終来店・チケット販売履歴の確認
- 個人プラン・ペア専用プラン両対応。顧客個別の単価オーバーライドあり
- 月別売上（稼働ベース：セッション消化時に計上）の表示
- Googleログイン、オーナー/スタッフのロール分離

## セットアップ

### 1. Supabaseプロジェクトを作る

1. [supabase.com](https://supabase.com) でプロジェクトを作成
2. **Project Settings → API** から以下をコピー
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 2. スキーマを流し込む

Supabase の **SQL Editor** で以下のファイルを順に実行してください。

1. `supabase/migrations/20260519000000_init.sql`
2. `supabase/seed.sql`（任意。4プランの雛形が入ります）

### 3. Google認証を有効化

1. Supabase ダッシュボードの **Authentication → Providers → Google** をオン
2. Google Cloud Console で OAuth 2.0 クライアントIDを作成
   - 承認済みリダイレクトURI: `https://<PROJECT-REF>.supabase.co/auth/v1/callback`
3. Client ID / Client Secret を Supabase の Google プロバイダに登録
4. **Authentication → URL Configuration** で
   - Site URL: `http://localhost:3000`（ローカル）／`https://your-domain` （本番）
   - Redirect URLs: `http://localhost:3000/auth/callback` などを許可リストに追加

### 4. ローカルで起動

```bash
cp .env.local.example .env.local
# .env.local にSupabaseのURL/anonキーを記入
npm install
npm run dev
```

[http://localhost:3000](http://localhost:3000) で確認。

### 5. オーナー権限の付与

初回ログイン時にユーザは `staff` ロールで自動登録されます。
オーナー権限（売上ダッシュボード・プラン管理）を持たせるには、Supabase SQL Editor で：

```sql
update public.profiles set role = 'owner' where email = 'your@email.com';
```

## デプロイ (Vercel)

1. このリポジトリを [vercel.com](https://vercel.com) でインポート
2. Environment Variables に `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` を設定
3. Supabase の **Authentication → URL Configuration** に本番URLを追加
4. Deploy

## 運用フロー

1. **顧客を登録**: `/customers/new`
2. **チケット販売を記録**: 顧客詳細から「チケット販売」、または `/tickets/new`
3. **セッションを予約**: `/calendar` で空きスロットをタップ → 顧客・チケット選択
4. **当日確定**: `/today` で当日の各セッションを「実施 / 当日キャンセル(消化) / キャンセル(返却)」のいずれかでボタン確定
5. **売上を確認**: `/dashboard`

### ペアセッション

- **ペア専用プラン (1枚で2人)**: `/pair-groups` でペア組を登録 → `/tickets/new` でペア組を対象にペア専用プランを購入 → カレンダーでセッション作成時に両者を選び、同じペアチケットを指定（1枚消費）
- **通常チケット×2枚同時消費（例外組）**: 両者にそれぞれ通常チケットを販売 → カレンダーで両者を選び、それぞれ自分の通常チケットを指定（各自1枚消費）

## データモデル

| テーブル | 役割 |
|---|---|
| `profiles` | アプリ利用者（オーナー / スタッフ） |
| `customers` | 顧客 |
| `pair_groups` | ペア専用プランを共有する2名の組 |
| `plans` | 回数券プランマスタ |
| `ticket_bundles` | 購入された回数券（個人 or ペア組に紐付く） |
| `sessions` | セッション予定／実績 |
| `session_participants` | セッション参加者(1〜2名)とチケット消費・売上 |

詳細は `supabase/migrations/20260519000000_init.sql` を参照。

## 開発コマンド

```bash
npm run dev       # 開発サーバ
npm run build     # 本番ビルド
npm run start     # 本番ビルドの起動
npm run lint      # ESLint
npx tsc --noEmit  # 型チェック
```

## Supabase型の更新

スキーマを変更した場合は型定義 `src/lib/types/database.ts` を更新するか、
Supabase CLI で自動生成してください：

```bash
npx supabase gen types typescript --project-id <PROJECT-REF> > src/lib/types/database.ts
```

# Blueclaw 運用マニュアル

[BLUECLAW_DEPLOY.md](BLUECLAW_DEPLOY.md) の続編。日常運用、ユーザー管理、Web ダッシュボード、トラブルシューティングをまとめる。

このドキュメントを読めば、新しいオペレーターでも全タスクを実行できる。

---

## システム構成（概観）

```
Vultr サーバー (45.32.24.119, Ubuntu 24.04)
├── /root/nanoclaw/                  # コードリポジトリ
│   ├── src/                         # NanoClaw 本体
│   ├── container/                   # コンテナイメージのソース
│   ├── web/                         # Next.js Web ダッシュボード
│   ├── groups/                      # グループフォルダ
│   │   ├── main/CLAUDE.md           # 管理者用テンプレート（git管理）
│   │   ├── blueclaw_template/       # 一般ユーザー用テンプレート（git管理）
│   │   ├── discord_main/            # 管理者の実データ（git無視）
│   │   ├── discord_user-1/          # ユーザー1の実データ（git無視）
│   │   └── ...
│   ├── store/messages.db            # SQLite DB（メッセージ・タスク・トークン）
│   ├── data/                        # ランタイムデータ（IPC、セッション）
│   └── .env                         # 環境変数（DISCORD_BOT_TOKEN, ANTHROPIC_API_KEY 等）
│
├── systemd サービス
│   ├── nanoclaw.service            # NanoClaw 本体（メッセージ処理、コンテナ管理）
│   └── blueclaw-web.service        # Next.js Web ダッシュボード
│
└── Docker
    └── nanoclaw-agent:latest        # エージェントが動くコンテナイメージ
```

**重要なポート**:
- **3000**: Web ダッシュボード（外部公開）
- **3001**: Credential proxy（Docker → ホスト、UFW で 172.17.0.0/16 から許可）
- **22**: SSH

---

## SSH 接続

```bash
ssh -i ~/.ssh/blueclaw-vultr root@45.32.24.119
```

---

## コードを更新する（最重要パターン）

何を変えたかで再起動・再ビルドの粒度が変わる。

### パターン A: NanoClaw 本体（src/）の変更

```bash
ssh -i ~/.ssh/blueclaw-vultr root@45.32.24.119 '
  cd /root/nanoclaw && git pull -q && npm run build 2>&1 | tail -1
  systemctl restart nanoclaw
'
```

### パターン B: コンテナ内で動くコード（container/agent-runner/）の変更

コンテナイメージの再ビルドが必要。さらに各グループの `agent-runner-src` キャッシュをクリアする。**これを忘れるとコンテナが古いコードを使い続ける**。

```bash
ssh -i ~/.ssh/blueclaw-vultr root@45.32.24.119 '
  cd /root/nanoclaw && git pull -q
  ./container/build.sh 2>&1 | tail -1
  # キャッシュクリア（重要）
  rm -rf /root/nanoclaw/data/sessions/*/agent-runner-src/
  docker stop $(docker ps -q) 2>/dev/null
  systemctl restart nanoclaw
'
```

### パターン C: CLAUDE.md / manual/ の変更

git管理されているのは `groups/main/` と `groups/blueclaw_template/` のみ。実際にエージェントが読むのは各グループフォルダ（`discord_*`）にコピーされたもの。**git pull の後に手動コピーが必要**。

```bash
ssh -i ~/.ssh/blueclaw-vultr root@45.32.24.119 '
  cd /root/nanoclaw && git checkout -- groups/ && git pull -q
  # 管理者は main からコピー
  cp groups/main/CLAUDE.md groups/discord_main/CLAUDE.md
  cp -r groups/main/manual/ groups/discord_main/manual/
  # 一般ユーザーは template からコピー（全ユーザー分）
  for d in discord_user-1 discord_user-2 discord_user-3 discord_user-4 discord_user-5; do
    if [ -d "groups/$d" ]; then
      cp groups/blueclaw_template/CLAUDE.md "groups/$d/CLAUDE.md"
      cp -r groups/blueclaw_template/manual/ "groups/$d/manual/"
    fi
  done
  chmod -R 777 groups/ data/
  systemctl restart nanoclaw
'
```

### パターン D: Web ダッシュボード（web/）の変更

Next.js の standalone ビルドが必要。さらに静的ファイルとpublicを手動でコピーする必要がある（standalone モードの仕様）。

```bash
ssh -i ~/.ssh/blueclaw-vultr root@45.32.24.119 '
  cd /root/nanoclaw && git pull -q
  cd web && npm run build 2>&1 | tail -1
  cp -r .next/static .next/standalone/web/.next/static 2>/dev/null
  cp -r public .next/standalone/web/public 2>/dev/null
  systemctl restart blueclaw-web
'
```

### パターン E: package.json の変更（npm install が必要）

```bash
# NanoClaw
ssh ... 'cd /root/nanoclaw && git pull -q && npm install && npm run build && systemctl restart nanoclaw'

# Web
ssh ... 'cd /root/nanoclaw && git pull -q && cd web && npm install && npm run build && cp -r .next/static .next/standalone/web/.next/static && cp -r public .next/standalone/web/public && systemctl restart blueclaw-web'
```

---

## 新規ユーザーの追加（完全手順）

詳細は [BLUECLAW_ONBOARDING.md](BLUECLAW_ONBOARDING.md) にあるが、実際に動作する完全版は以下:

### 1. ユーザーが Discord で Bot に DM を送る

ユーザーのアクション。送るとサーバーログにチャネル ID が記録される。

### 2. チャネル ID を取得

ユーザーが「開発者モード」を有効化してチャネル ID をコピーするか、サーバーログから取得:

```bash
journalctl -u nanoclaw --since "5 min ago" | grep "chatJid" | tail -3
```

### 3. グループ登録 + Web トークン発行（一括スクリプト）

`USER_NUM` と `CHANNEL_ID` を埋めて実行:

```bash
USER_NUM=6
CHANNEL_ID=1234567890123456789
USER_LABEL="User $USER_NUM"
FOLDER="discord_user-$USER_NUM"

ssh -i ~/.ssh/blueclaw-vultr root@45.32.24.119 "
  cd /root/nanoclaw
  cp -r groups/blueclaw_template/ groups/$FOLDER/
  chmod -R 777 groups/$FOLDER/
  
  npx tsx setup/index.ts --step register -- \
    --jid 'dc:$CHANNEL_ID' \
    --name '$USER_LABEL' \
    --folder '$FOLDER' \
    --trigger '@Blueclaw' \
    --channel discord \
    --no-trigger-required 2>&1 | grep STATUS
  
  chmod -R 777 data/
  systemctl restart nanoclaw
"

# Web token を発行
curl -s -b "blueclaw-token=blueclaw-owner-2026" \
  -X POST "http://45.32.24.119:3000/api/user-tokens" \
  -H "Content-Type: application/json" \
  -d "{\"groupFolder\":\"$FOLDER\",\"label\":\"$USER_LABEL\"}"
```

### 4. ユーザーに送る情報

- **Discord**: Bot に DM するだけ（既にやっているはず）
- **Web ログイン URL**: `http://45.32.24.119:3000/auth/<返ってきたトークン>` （これ1つで自動ログイン）

### 5. 初回対話で Blueclaw が勝手にやること（CLAUDE.md の指示）

1. 自己紹介
2. 使い方アドバイス（「何でも口に出して」「音声入力おすすめ」）
3. **タイムゾーンを聞く**（必須・最優先 — 答えるまで進まない）
4. ファイル初期化（kanban.md, USER.md, errands.md）
5. 基本情報ヒアリング → USER.md
6. スケジュールタスク登録（`timezone` パラメータでユーザーのIANA TZ を渡す）
7. 初回の朝セッション開始

---

## ユーザーの削除

```bash
ssh -i ~/.ssh/blueclaw-vultr root@45.32.24.119 "
  FOLDER='discord_user-N'
  sqlite3 /root/nanoclaw/store/messages.db \"DELETE FROM registered_groups WHERE folder='$FOLDER'\"
  sqlite3 /root/nanoclaw/store/messages.db \"DELETE FROM scheduled_tasks WHERE group_folder='$FOLDER'\"
  sqlite3 /root/nanoclaw/store/messages.db \"UPDATE user_tokens SET active=0 WHERE group_folder='$FOLDER'\"
  systemctl restart nanoclaw
  # データを残したい場合: groups/$FOLDER/ はそのまま
  # 完全削除する場合: rm -rf /root/nanoclaw/groups/$FOLDER/
"
```

---

## 認証システム（重要）

3種類のトークンが共存している:

| トークン種別 | アクセス範囲 | 環境変数/DB |
|------------|-------------|------------|
| **Owner token** | 全グループ、全機能 | `.env` の `BLUECLAW_OWNER_TOKEN`（現在: `blueclaw-owner-2026`） |
| **User token** | 1つのグループ（自分のもの） | DB: `user_tokens` テーブル |
| **Share token** | 1つのグループ（権限指定可） | DB: `share_tokens` テーブル |

### Magic auth URL（ログイン省略）

`http://45.32.24.119:3000/auth/<token>` を開くと cookie が設定されてダッシュボードにリダイレクトされる。Owner token、User token どちらでも動く。

### User token の管理（API）

```bash
# 一覧
curl -s -b "blueclaw-token=blueclaw-owner-2026" "http://45.32.24.119:3000/api/user-tokens"

# 作成
curl -s -b "blueclaw-token=blueclaw-owner-2026" \
  -X POST "http://45.32.24.119:3000/api/user-tokens" \
  -H "Content-Type: application/json" \
  -d '{"groupFolder":"discord_user-N","label":"User N"}'

# 無効化
curl -s -b "blueclaw-token=blueclaw-owner-2026" \
  -X DELETE "http://45.32.24.119:3000/api/user-tokens?token=<token>"
```

---

## データベース（SQLite）の主要テーブル

`/root/nanoclaw/store/messages.db` に全データが入っている。

```bash
# 登録グループ一覧
sqlite3 /root/nanoclaw/store/messages.db "SELECT jid, name, folder FROM registered_groups"

# あるグループのスケジュールタスク
sqlite3 /root/nanoclaw/store/messages.db \
  "SELECT id, schedule_type, schedule_value, timezone, status, next_run \
   FROM scheduled_tasks WHERE group_folder='discord_user-1'"

# Web ユーザートークン一覧
sqlite3 /root/nanoclaw/store/messages.db "SELECT token, group_folder, label, active FROM user_tokens"

# あるグループの最近のメッセージ
sqlite3 /root/nanoclaw/store/messages.db \
  "SELECT timestamp, sender_name, substr(content,1,80) FROM messages \
   WHERE chat_jid='dc:XXX' ORDER BY timestamp DESC LIMIT 10"
```

---

## タイムゾーン処理（最重要・複雑）

### 基本ルール

- **サーバーの TZ**: `America/New_York` (EDT = UTC-4)。`.env` の `TZ` で設定
- **AI は時刻変換しない**: `schedule_task` の `timezone` パラメータに USER.md のタイムゾーンを渡すだけ
- **システムが自動変換**: cron は cron-parser に `{ tz: <userTz> }` を渡す。once は Intl.DateTimeFormat で変換

### よくあるバグ（過去に発生したもの）

1. **once が二重変換される** → ipc.ts の修正済み（`Date.UTC` + `formatToParts` でオフセット計算）
2. **AI が変換表を見て手動計算 → 間違える** → CLAUDE.md から変換表削除済み
3. **systemd の TZ が読まれない** → `EnvironmentFile=/root/nanoclaw/.env` で解決済み
4. **cron が UTC で計算される** → `task-scheduler.ts` で `{ tz: task.timezone || TIMEZONE }` 使用

### TZ を変更する手順

`.env` の `TZ=` を変更して両サービス再起動するだけ:

```bash
ssh -i ~/.ssh/blueclaw-vultr root@45.32.24.119 "
  sed -i 's/^TZ=.*/TZ=Asia/Tokyo/' /root/nanoclaw/.env
  systemctl restart nanoclaw blueclaw-web
"
```

ただし既存の cron タスクは手動で `next_run=NULL` にして再計算させる必要がある。

---

## コスト最適化

### `CLAUDE_CODE_AUTO_COMPACT_WINDOW`

セッション履歴のコンパクション閾値。**デフォルト 165,000 → 25,000 に下げている**（2026-04-13 時点）。コードと各グループの settings.json 両方に反映が必要。

```bash
# コード側（src/container-runner.ts と container/agent-runner/src/index.ts）は git で管理
# 既存グループの settings.json を一括更新するスクリプト:
ssh ... '
  for f in /root/nanoclaw/data/sessions/*/.claude/settings.json; do
    python3 -c "
import json, sys
with open(sys.argv[1]) as fh: d = json.load(fh)
d[\"env\"][\"CLAUDE_CODE_AUTO_COMPACT_WINDOW\"] = \"25000\"
with open(sys.argv[1], \"w\") as fh: json.dump(d, fh, indent=2); fh.write(\"\n\")
" "$f" 2>/dev/null
  done
'
```

### Anthropic キャッシュの仕組み

- 同じプレフィックスの2回目以降は **1/10 のコスト**
- ただしキャッシュは **5分で切れる**
- だから「アイドル状態 → 久しぶりにメッセージ」は毎回フルコスト
- `once` タスクは新規コンテナ起動なのでキャッシュなし

### モデル選択

現在は Sonnet（claude-sonnet-4-6）デフォルト。`agent-runner/src/index.ts` で `model` オプションを明示すれば変更可能。

---

## ログとデバッグ

### NanoClaw 本体のログ

```bash
journalctl -u nanoclaw -f                      # リアルタイム
journalctl -u nanoclaw --since "5 min ago"     # 最近5分
journalctl -u nanoclaw --since "2026-04-15"    # 特定日以降
```

### Web ダッシュボードのログ

```bash
journalctl -u blueclaw-web -f
```

### コンテナのログ

```bash
docker ps                              # 動いているコンテナ
docker logs <container-id> 2>&1 | tail -30
docker logs -f <container-id>          # リアルタイム
```

エージェントの内部動作 (`[agent-runner] ...` ログ) はコンテナのログに出る。

### よくある「返信がこない」のトラブルシュート手順

1. メッセージは保存されたか? → host log で `Discord message stored`
2. NanoClaw は新メッセージを検知したか? → host log で `New messages`
3. コンテナは起動したか? → host log で `Spawning container agent`
4. コンテナのログは? → `docker logs $(docker ps -q --latest)`
5. コンテナのログに `api_retry` が連続? → UFW 問題（下記）
6. コンテナのログに `Result #N` がある? → エージェントは応答した
7. `Result #N` に `text=` がない? → AI がツール操作だけで終わった（CLAUDE.md の「鉄則: テキスト返信必須」が効いていない）
8. host log に `Agent output: N chars` → Discord への送信成功

---

## 既知の落とし穴と解決策

### 1. UFW がコンテナ → ホストの通信をブロック

**症状**: コンテナログに `api_retry` が無限ループ。credential proxy に到達できない。

**解決**:
```bash
ufw allow from 172.17.0.0/16 to any port 3001
```

### 2. IPC ディレクトリのパーミッション

**症状**: コンテナログに `Failed to process input file ... EACCES: permission denied, unlink`。

**解決**: ホストが root、コンテナが node (uid 1000) で動くため、IPC ディレクトリを 777 にする必要がある。新規グループ追加時に必ず実行:

```bash
chmod -R 777 /root/nanoclaw/data/ /root/nanoclaw/groups/
```

container-runner.ts は新規 IPC ディレクトリ作成時に自動で 777 にする実装済み（既存ディレクトリには適用されない）。

### 3. standalone ビルドの静的ファイル

**症状**: Web ダッシュボードで CSS が当たらない、画像が出ない。

**解決**: `next build` の後に手動コピー:
```bash
cp -r .next/static .next/standalone/web/.next/static
cp -r public .next/standalone/web/public
```

### 4. `process.cwd()` がプロジェクトルートと違う

**症状**: Web の API で「File not found」。

**解決**: standalone モードでは `process.cwd()` が `.next/standalone/web/` になる。`web/src/lib/files.ts` で `NANOCLAW_GROUP_PATH` の親ディレクトリから groups を解決する実装済み。

### 5. Cookie の Secure フラグ

**症状**: HTTP（HTTPS でない）アクセスでログインできない。

**解決**: `web/src/app/api/auth/route.ts` で `secure: false` 固定済み。

### 6. Clipboard API が HTTP で使えない

**症状**: 共有 URL のコピーボタンで `Cannot read properties of undefined`。

**解決**: `share-list.tsx` で `document.execCommand('copy')` フォールバック実装済み。

### 7. ホストの session キャッシュが残る

**症状**: DB の sessions テーブルを消してもエージェントが古いセッションを使う。

**解決**: NanoClaw を再起動する（`systemctl restart nanoclaw`）。`index.ts` がメモリ上にセッションIDを保持しているため。

### 8. AI がユーザー名でサブフォルダを作る

**症状**: `groups/discord_user-1/田中/kanban.md` のような構造になる。

**解決**: CLAUDE.md に「ファイルはルート直下、ユーザー名サブフォルダ禁止」を明記済み。

### 9. AI が `Agent output` なしで終わる（無言応答）

**症状**: Discord に返信が来ない。コンテナログでは `Result #N` だが `text=` がない。

**解決**: CLAUDE.md に「ユーザーのメッセージには必ずテキストで返信」を明記済み。再発する場合はテンプレート末尾に念押しを追加する。

### 10. OAuth トークン vs API キー

**症状**: 401 エラーが頻発。

**解決**: API キー（`sk-ant-api03-...`）を使う。OAuth トークンは数時間で切れることがある。`.env` の `ANTHROPIC_API_KEY=` を設定。

### 11. Anthropic クレジット残高エラー

**症状**: `credit balance is too low` エラー。残高補充後も継続。

**解決**: API キーを再発行する。残高情報のキャッシュがリセットされる。

### 12. 既存グループの settings.json が更新されない

**症状**: コードで `CLAUDE_CODE_AUTO_COMPACT_WINDOW` 等を変更しても反映されない。

**原因**: `container-runner.ts` の settings.json 作成は `if (!fs.existsSync(settingsFile))` の中なので既存ファイルには適用されない。

**解決**: 既存ファイルを手動で更新する（前述のスクリプト）。

---

## サーバーが落ちた時の復旧手順

```bash
ssh -i ~/.ssh/blueclaw-vultr root@45.32.24.119

# サービスステータス確認
systemctl status nanoclaw blueclaw-web docker

# 順番に起動
systemctl start docker
systemctl start nanoclaw
systemctl start blueclaw-web

# ログ確認
journalctl -u nanoclaw --since "5 min ago" | head -50
```

サーバーごと再起動した場合:
- Vultr のコンソールから OS reboot
- 各サービスは `enable` 済みなので自動起動するはず
- 起動後、Discord での疎通確認、Web ダッシュボードへのアクセス確認

---

## バックアップすべきもの

サーバーが完全に消えた時のために残しておくべきデータ:

1. **`/root/nanoclaw/store/messages.db`** — 全メッセージ・スケジュールタスク・トークン
2. **`/root/nanoclaw/groups/discord_*/`** — 各ユーザーの kanban.md, USER.md, errands.md, daily/, weekly/
3. **`/root/nanoclaw/.env`** — API キー、Discord token、TZ
4. **`/root/nanoclaw/data/`** — セッションファイル（あれば履歴維持）

リポジトリ自体は GitHub にあるのでバックアップ不要。

簡易バックアップコマンド（ローカルから実行）:

```bash
mkdir -p ~/blueclaw-backup/$(date +%Y-%m-%d)
cd ~/blueclaw-backup/$(date +%Y-%m-%d)
scp -i ~/.ssh/blueclaw-vultr root@45.32.24.119:/root/nanoclaw/store/messages.db .
scp -i ~/.ssh/blueclaw-vultr root@45.32.24.119:/root/nanoclaw/.env .
rsync -av -e "ssh -i ~/.ssh/blueclaw-vultr" root@45.32.24.119:/root/nanoclaw/groups/discord_main/ ./groups/discord_main/
# ユーザーフォルダもrsync...
```

---

## アーキテクチャの理解で重要な点

### NanoClaw の思想

- **コード変更 = カスタマイズ**: 設定ファイルを増やさず、コードを変える
- **思想的にやっていいこと**: フォークでコード変更、CLAUDE.md カスタマイズ、スキル追加
- **思想に反すること**: 機能を本体に追加する代わりにスキルとして外出しすべき

### 1インスタンスマルチユーザー

- グループは独立したコンテナで動く（ファイルシステム隔離）
- DB は共通（messages, scheduled_tasks, user_tokens 等は group_folder で区別）
- API キーは1つ（コストはオーナーが負担）

### CLAUDE.md と USER.md の関係

- **CLAUDE.md**: テンプレート（git管理）。グループフォルダにコピーして使う。Blueclaw の人格・行動原則
- **USER.md**: ランタイムデータ（git無視）。各ユーザーのプロファイル、タイムゾーン、特性
- AI は両方読む。ただし USER.md は明示的に読む必要がある（CLAUDE.md は自動）

### スケジュールタスクの timezone 仕組み（2026-04-16 に大幅改修）

旧: AI が JST→EDT 等を手計算 → 頻繁にミス
新: AI は `timezone: "Asia/Tokyo"` パラメータを渡すだけ。システムが変換

```typescript
// ipc.ts
const taskTz = data.timezone || TIMEZONE;
// cron: { tz: taskTz } で cron-parser に解釈させる
// once: Date.UTC + Intl.DateTimeFormat.formatToParts でオフセット計算
```

タスクには `timezone` カラムがあり、`task-scheduler.ts` の `computeNextRun` でも使う。

---

## ドキュメント間の関係

| ドキュメント | 用途 |
|------------|-----|
| [BLUECLAW_DEPLOY.md](BLUECLAW_DEPLOY.md) | 初回デプロイ手順、サーバー設定、systemd |
| [BLUECLAW_ONBOARDING.md](BLUECLAW_ONBOARDING.md) | 新規ユーザー追加（ユーザー向け案内テンプレート含む） |
| [BLUECLAW_OPERATIONS.md](BLUECLAW_OPERATIONS.md) | この文書。日常運用、トラブルシューティング |
| [groups/main/CLAUDE.md](../groups/main/CLAUDE.md) | 管理者用 Blueclaw 人格 |
| [groups/blueclaw_template/CLAUDE.md](../groups/blueclaw_template/CLAUDE.md) | 一般ユーザー用 Blueclaw 人格テンプレート |

---

## このシステムの「触るな危険」リスト

以下を変更する時は十分注意:

- **`.env`**: API キー・Discord トークン・TZ。間違えると全部止まる
- **`store/messages.db`**: SQLite DB。バックアップなしで消したら全データロスト
- **`src/index.ts`**: NanoClaw の中核。慎重に
- **`src/container-runner.ts`**: コンテナ起動ロジック + 認証 proxy 連携
- **`container/agent-runner/src/`**: コンテナ内コード。変更後は必ず container イメージ再ビルド + agent-runner-src キャッシュクリア
- **`web/src/middleware.ts`**: 認証パススルーのロジック。間違えると全 API が 401 になる

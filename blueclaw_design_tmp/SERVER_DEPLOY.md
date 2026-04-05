# Blueclaw サーバーデプロイガイド

このガイドに従えば、Linux サーバー上で Blueclaw（NanoClaw ベース）を Discord 経由で動かせる状態になる。

---

## 前提条件

- Linux サーバー（Ubuntu 22.04+ 推奨）
- root または sudo アクセス
- サーバーへの SSH アクセス

---

## ステップ 1: サーバーの基本セットアップ

```bash
# システム更新
sudo apt update && sudo apt upgrade -y

# Node.js 22 をインストール
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# Git をインストール（なければ）
sudo apt install -y git

# Docker をインストール
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# ログアウトして再ログイン（docker グループを反映）
```

再ログイン後、Docker が動くことを確認:

```bash
docker run hello-world
```

## ステップ 2: Claude Code をインストール

```bash
npm install -g @anthropic-ai/claude-code
```

Anthropic の認証をセットアップ:

```bash
claude setup-token
```

ここで長期有効な OAuth トークンまたは API キーを設定する。`claude setup-token` が対話的に案内してくれる。

**重要**: 短期トークンは数時間で切れてコンテナが 401 エラーを出す。必ず長期トークンを使うこと。

## ステップ 3: リポジトリをクローン

```bash
git clone https://github.com/blu3mo/nanoclaw.git
cd nanoclaw
```

## ステップ 4: Discord Bot を作成

1. [Discord Developer Portal](https://discord.com/developers/applications) を開く
2. **New Application** → 名前を「Blueclaw」にする
3. **Bot** タブ:
   - **Reset Token** → トークンをコピー（一度しか表示されない！）
   - **Privileged Gateway Intents** で以下を有効化:
     - **Message Content Intent** (必須)
     - **Server Members Intent** (任意)
4. **OAuth2** > **URL Generator**:
   - Scopes: `bot` を選択
   - Bot Permissions: `Send Messages`, `Read Message History`, `View Channels` を選択
   - 生成された URL をブラウザで開き、ボットをサーバーに招待する
5. ボットを使いたいテキストチャネルの **チャネル ID** を取得:
   - Discord の **ユーザー設定** > **詳細設定** > **開発者モード** を有効化
   - チャネル名を右クリック > **チャネルIDをコピー**

## ステップ 5: .env を作成

```bash
cd ~/nanoclaw
cp .env.example .env
```

`.env` を編集:

```bash
ASSISTANT_NAME=Blueclaw
DISCORD_BOT_TOKEN=ここにステップ4でコピーしたトークンを貼り付ける
TZ=Asia/Tokyo
```

**TZ**: スケジュールタスク（朝8:00、夜23:00）の時刻に使われる。自分のタイムゾーンに合わせること。`Asia/Tokyo`, `America/New_York`, `Europe/London` 等の IANA 形式。

## ステップ 6: /setup を実行

```bash
cd ~/nanoclaw
claude
```

Claude Code のプロンプト内で:

```
/setup
```

Claude が以下を自動で行う:
- npm install（依存関係インストール）
- コンテナイメージのビルド（`./container/build.sh`）
- OneCLI Agent Vault のセットアップ（API キー管理）
- systemd サービスの設定

**`/setup` が途中で質問してきた場合**:
- チャネル: 「Discord を使う」と答える
- メインチャネル: 「Discord のこのチャネルをメインにしたい」と答え、チャネル ID を伝える
- トリガーワード: `@Blueclaw`

## ステップ 7: Discord チャネルの登録

`/setup` がチャネル登録まで自動でやらなかった場合、手動で登録する:

```bash
# nanoclaw ディレクトリにいることを確認
cd ~/nanoclaw

# 登録コマンドを実行（<channel-id> を実際の ID に置き換え）
npx tsx setup/index.ts --step register -- \
  --jid "dc:<channel-id>" \
  --name "Blueclaw Main" \
  --folder "discord_main" \
  --trigger "@Blueclaw" \
  --channel discord \
  --no-trigger-required \
  --is-main
```

**`--no-trigger-required`**: メインチャネルなので全メッセージを処理。`@Blueclaw` なしでも反応する。

## ステップ 8: サービスの起動と確認

```bash
# systemd でサービス起動
systemctl --user start nanoclaw
systemctl --user enable nanoclaw  # 自動起動を有効化

# ログを確認
journalctl --user -u nanoclaw -f
```

または `claude` を起動して `/debug` で状態確認。

## ステップ 9: 動作確認

Discord の登録したチャネルに以下を送信:

```
初めまして
```

Blueclaw が CLAUDE.md の「初回セットアップ」手順に従って応答するはず:
1. 自己紹介
2. kanban.md, USER.md の初期化
3. ユーザー情報のヒアリング
4. 朝・夜セッションのスケジュール登録
5. 初回の朝セッション開始

**応答がない場合のデバッグ**:

```bash
# サービスが動いているか
systemctl --user status nanoclaw

# ログを確認
journalctl --user -u nanoclaw --since "5 min ago"

# Discord トークンが正しいか
grep DISCORD_BOT_TOKEN .env

# チャネルが登録されているか
sqlite3 store/messages.db "SELECT * FROM registered_groups"

# Claude Code で /debug を実行
claude
/debug
```

---

## 日常のメンテナンス

### ログの確認

```bash
journalctl --user -u nanoclaw -f              # リアルタイムログ
journalctl --user -u nanoclaw --since today    # 今日のログ
```

### サービスの再起動

```bash
systemctl --user restart nanoclaw
```

### コードの更新

```bash
cd ~/nanoclaw
git pull
npm install
npm run build
./container/build.sh    # コンテナ再ビルド
systemctl --user restart nanoclaw
```

### CLAUDE.md の編集

Blueclaw の振る舞いを調整したい場合:

```bash
# 直接編集
nano groups/main/CLAUDE.md

# またはClaude Codeに頼む
claude
> CLAUDE.md の「朝のセッション」の開始時間を7:00に変えて
```

### スケジュールタスクの確認

Discord チャネルで:

```
@Blueclaw スケジュールされているタスクを全部リストして
```

または直接 DB を確認:

```bash
sqlite3 store/messages.db "SELECT id, prompt, schedule_type, schedule_value, status, next_run FROM scheduled_tasks"
```

---

## トラブルシューティング

### Bot が応答しない

1. **サービスが動いているか**: `systemctl --user status nanoclaw`
2. **Discord トークンが正しいか**: `.env` の `DISCORD_BOT_TOKEN` を確認
3. **Message Content Intent が有効か**: Discord Developer Portal > Bot タブ > Privileged Gateway Intents
4. **チャネルが登録されているか**: `sqlite3 store/messages.db "SELECT * FROM registered_groups WHERE jid LIKE 'dc:%'"`
5. **コンテナが起動できるか**: `docker run hello-world` で Docker 自体が動くか確認

### コンテナが 401 エラーを出す

Anthropic API の認証が切れている。

```bash
claude setup-token    # トークンを再設定
# もしくは OneCLI を使っている場合:
onecli --help
```

### スケジュールタスクが実行されない

```bash
# タスクの状態を確認
sqlite3 store/messages.db "SELECT id, status, next_run FROM scheduled_tasks WHERE status='active'"

# next_run が過去の時刻なのに実行されていない場合、サービスを再起動
systemctl --user restart nanoclaw
```

### ディスク容量

会話ログやコンテナログが蓄積する。定期的に確認:

```bash
du -sh ~/nanoclaw/groups/main/conversations/
du -sh ~/nanoclaw/groups/main/logs/
```

必要に応じて古いログを削除。

---

## セキュリティに関する注意

- **API キー**: `.env` ファイルに記載。サーバーのファイル権限を適切に設定する (`chmod 600 .env`)
- **Discord トークン**: Bot トークンが漏洩するとボットを乗っ取られる。`.env` を公開リポジトリにプッシュしないこと（`.gitignore` に含まれている）
- **コンテナ隔離**: エージェントは Docker コンテナ内で実行される。ホストのファイルシステムには明示的にマウントされたディレクトリしかアクセスできない

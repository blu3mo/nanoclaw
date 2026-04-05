# Blueclaw デプロイ & 運用ガイド

NanoClaw ベースの Blueclaw を Linux サーバーにデプロイし、運用するための手順。

---

## サーバー要件

- Linux（Ubuntu 22.04+ 推奨）
- Node.js 22+
- Docker
- 最低スペック: 1 vCPU / 1GB RAM / 25GB SSD（Vultr vc2-1c-1gb 等）

---

## 初回デプロイ

### 1. サーバー準備

```bash
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs git sqlite3
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# 再ログインして docker グループを反映
```

### 2. Claude Code インストール & 認証

```bash
npm install -g @anthropic-ai/claude-code
```

API キー認証（推奨 — OAuth トークンは期限切れしやすい）:
- https://console.anthropic.com/settings/keys から取得

### 3. リポジトリクローン & ビルド

```bash
git clone https://github.com/blu3mo/nanoclaw.git
cd nanoclaw
npm install
npm run build
./container/build.sh
```

### 4. .env 設定

```bash
cp .env.example .env
```

`.env` を編集:

```bash
ASSISTANT_NAME=Blueclaw
DISCORD_BOT_TOKEN=<Discord Bot Token>
TZ=America/New_York
ANTHROPIC_API_KEY=<Anthropic API Key>
```

**TZ について**: スケジュールタスク（朝8:00、夜23:00、チェックイン等）は全てこのタイムゾーンで動く。IANA 形式で指定（`Asia/Tokyo`, `America/New_York`, `Europe/London` 等）。サーバーの OS タイムゾーンが UTC でも、この設定が Node.js プロセスに渡される。

### 5. Discord Bot 作成

1. https://discord.com/developers/applications → New Application
2. **Bot** タブ → Reset Token → コピー
3. **Privileged Gateway Intents** → **Message Content Intent** を有効化
4. **OAuth2** > **URL Generator** → Scopes: `bot` → Permissions: `Send Messages`, `Read Message History`, `View Channels` → URL を開いてサーバーに招待
5. Discord で **開発者モード** を有効化 → チャネルを右クリック → チャネル ID をコピー

### 6. チャネル登録

```bash
npx tsx setup/index.ts --step register -- \
  --jid "dc:<channel-id>" \
  --name "Blueclaw Main" \
  --folder "discord_main" \
  --trigger "@Blueclaw" \
  --channel discord \
  --no-trigger-required \
  --is-main
```

### 7. CLAUDE.md をグループにコピー

```bash
cp groups/main/CLAUDE.md groups/discord_main/CLAUDE.md
cp -r groups/main/manual/ groups/discord_main/manual/
```

### 8. systemd サービス作成

```bash
cat > /etc/systemd/system/nanoclaw.service << 'EOF'
[Unit]
Description=NanoClaw Blueclaw AI Manager
After=network.target docker.service
Requires=docker.service

[Service]
Type=simple
WorkingDirectory=/root/nanoclaw
EnvironmentFile=/root/nanoclaw/.env
ExecStart=/usr/bin/node /root/nanoclaw/dist/index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable nanoclaw
systemctl start nanoclaw
```

**重要**: `EnvironmentFile` で `.env` を読み込む。TZ を含む全環境変数がプロセスに渡される。

### 9. Web ダッシュボードのデプロイ

```bash
cd web
npm install
npm run build
cp -r .next/static .next/standalone/web/.next/static
cp -r public .next/standalone/web/public

cat > /etc/systemd/system/blueclaw-web.service << 'EOF'
[Unit]
Description=Blueclaw Web Dashboard
After=network.target nanoclaw.service

[Service]
Type=simple
WorkingDirectory=/root/nanoclaw/web
EnvironmentFile=/root/nanoclaw/.env
ExecStart=/usr/bin/node /root/nanoclaw/web/.next/standalone/web/server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=NANOCLAW_DB_PATH=/root/nanoclaw/store/messages.db
Environment=NANOCLAW_GROUP_PATH=/root/nanoclaw/groups/discord_main
Environment=BLUECLAW_OWNER_TOKEN=<任意のトークン>
Environment=NEXT_PUBLIC_BASE_URL=http://<server-ip>:3000

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable blueclaw-web
systemctl start blueclaw-web
```

### 10. ファイアウォール設定

```bash
# Docker コンテナ → ホスト（credential proxy 用）
ufw allow from 172.17.0.0/16 to any port 3001

# Web ダッシュボード
ufw allow 3000/tcp
```

---

## 既知の落とし穴

### タイムゾーン

`new Date("2026-04-05T18:50:00")` のようなZサフィックスなしの時刻は Node.js プロセスの `TZ` 環境変数で解釈される。サーバーの OS が UTC でも、systemd の `EnvironmentFile` で `.env` の `TZ` が渡されるので正しく動く。

**TZ を変更する場合**: `.env` の `TZ=` を書き換えて `systemctl restart nanoclaw blueclaw-web` するだけ。

### Docker → ホスト通信（credential proxy）

NanoClaw の credential proxy（ポート3001）がホスト上で動き、Docker コンテナがそこに接続して API 認証を受ける。UFW のデフォルトポリシーが DROP だと、コンテナからホストへの通信がブロックされる。

```bash
ufw allow from 172.17.0.0/16 to any port 3001
```

**症状**: コンテナログに `api_retry` が無限に繰り返される。`curl` で proxy に到達できない。

### OAuth トークン vs API キー

OAuth トークン（`sk-ant-oat01-...`）は期限切れしやすく 401 エラーの原因になる。API キー（`sk-ant-api03-...`）の方が安定。

### IPC パーミッション

ホストが root で動き、コンテナが node ユーザー（uid 1000）で動く場合、IPC ディレクトリの書き込み権限が合わないことがある。

```bash
chmod -R 777 /root/nanoclaw/data/
```

### Bot 応答の DB 保存

NanoClaw v1.2.50 + Blueclaw 修正で、bot の応答を `messages` テーブルに `is_bot_message=1` で保存するようにしている。これがないと Web チャット画面に bot の発言が表示されない。

### standalone ビルドの構造

`next build` で `output: "standalone"` を使う場合、static ファイルを手動でコピーする必要がある:

```bash
cp -r .next/static .next/standalone/web/.next/static
cp -r public .next/standalone/web/public
```

server.js は `.next/standalone/web/server.js` にある（`web/` サブディレクトリ）。

---

## 日常運用

### コード更新

```bash
cd /root/nanoclaw
git pull
npm install
npm run build
systemctl restart nanoclaw

# Web も更新する場合
cd web
npm install
npm run build
cp -r .next/static .next/standalone/web/.next/static
cp -r public .next/standalone/web/public
systemctl restart blueclaw-web
```

### コンテナイメージ更新

agent-runner や Dockerfile を変更した場合:

```bash
./container/build.sh
systemctl restart nanoclaw
```

### CLAUDE.md の変更反映

```bash
# グループフォルダにもコピー
cp groups/main/CLAUDE.md groups/discord_main/CLAUDE.md
cp -r groups/main/manual/ groups/discord_main/manual/
systemctl restart nanoclaw
```

### ログ確認

```bash
journalctl -u nanoclaw -f              # NanoClaw リアルタイム
journalctl -u blueclaw-web -f          # Web ダッシュボード
docker logs <container-name>           # 個別コンテナ
```

### スケジュールタスク確認

```bash
sqlite3 store/messages.db "SELECT id, substr(prompt,1,50), schedule_type, schedule_value, status, next_run FROM scheduled_tasks"
```

### タイムゾーン変更

`.env` の `TZ=` を変更して再起動:

```bash
# .env を編集
nano .env  # TZ=Asia/Tokyo 等に変更

# 両サービス再起動
systemctl restart nanoclaw blueclaw-web
```

既存の cron タスクの `next_run` は自動で次回実行時に再計算される。`once` タスクは手動で修正が必要な場合がある。

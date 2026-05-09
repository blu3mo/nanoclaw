# Blueclaw — リモート MCP サーバーのセットアップ

OAuth が必要なリモート MCP サーバー（north 等）をコンテナ内のエージェントから使えるようにする手順。

---

## 仕組み

- コンテナの中で `mcp-remote` パッケージが動いて、HTTP MCP サーバーをローカル MCP（stdio）に橋渡しする
- OAuth トークンはコンテナ内の `/home/node/.mcp-auth/` に保存される
- ホスト側では `data/sessions/<group_folder>/.mcp-auth/` にマウントされ、グループごとに独立したトークン管理

**問題**: コンテナはヘッドレスでブラウザがないので、OAuth の認証フロー（ブラウザでサイトを開いて認可）が完結しない。

**解決策**: 初回認証はローカル環境で実行し、生成された `.mcp-auth/` ディレクトリをサーバーにコピーする。

---

## 現在対応している MCP サーバー

| サーバー | URL | コード |
|---------|-----|--------|
| north (タスク管理) | `https://usenorth.app/api/mcp` | `mcp__north__*` |

新しく追加するには `container/agent-runner/src/index.ts` の `mcpServers` に追加し、`allowedTools` に `mcp__<name>__*` を追加する。

---

## 初回 OAuth セットアップ手順

各ユーザーごとに1回だけ実行する。

### ローカル PC で

mcp-remote をインストール（最初の1回のみ）:

```bash
npm install -g mcp-remote
```

ホームディレクトリの既存 `.mcp-auth/` をバックアップ（既に他のサービスを使っている場合）:

```bash
mv ~/.mcp-auth ~/.mcp-auth.bak 2>/dev/null
```

クリーンな状態で north を認証:

```bash
mkdir -p ~/.mcp-auth
mcp-remote https://usenorth.app/api/mcp
```

これでブラウザが開く（または URL が表示される）ので、north にログインして認可。

完了すると `~/.mcp-auth/` 配下にトークンファイルができる。Ctrl+C で mcp-remote を止める。

### サーバーにコピー

特定のグループ（例: `discord_user-1`）に north アクセス権を渡す:

```bash
USER_FOLDER="discord_user-1"

scp -i ~/.ssh/<your-key> -r ~/.mcp-auth/* \
  root@<SERVER_IP>:/root/nanoclaw/data/sessions/$USER_FOLDER/.mcp-auth/

ssh -i ~/.ssh/<your-key> root@<SERVER_IP> "
  chmod -R 777 /root/nanoclaw/data/sessions/$USER_FOLDER/.mcp-auth/
"
```

### 動作確認

サーバーで該当ユーザーの Discord に「north のタスク一覧見せて」等と送る。

ログでエラーが出ていないか確認:

```bash
ssh -i ~/.ssh/<your-key> root@<SERVER_IP> \
  'docker logs $(docker ps -q -f name=user-1) 2>&1 | grep -iE "north|mcp-remote|oauth"'
```

### 元に戻す

ローカルの自分用の `.mcp-auth/` を復元:

```bash
rm -rf ~/.mcp-auth
mv ~/.mcp-auth.bak ~/.mcp-auth 2>/dev/null
```

---

## トークンが切れた場合

OAuth トークンには有効期限がある（north の場合は通常自動 refresh される）。401 エラーが頻発する場合:

1. ローカルで再認証（上記手順）
2. サーバーの該当グループの `.mcp-auth/` を新しいトークンで上書き

---

## 全ユーザー共通の north アカウントを使う場合

各ユーザーが個別の north アカウントを持つのではなく、1つの共有 north アカウントを使う場合は:

```bash
# 全グループに同じトークンをコピー
for d in discord_main discord_user-1 discord_user-2; do
  ssh -i ~/.ssh/<your-key> root@<SERVER_IP> "
    rm -rf /root/nanoclaw/data/sessions/$d/.mcp-auth
    mkdir -p /root/nanoclaw/data/sessions/$d/.mcp-auth
  "
  scp -i ~/.ssh/<your-key> -r ~/.mcp-auth/* \
    root@<SERVER_IP>:/root/nanoclaw/data/sessions/$d/.mcp-auth/
done

ssh -i ~/.ssh/<your-key> root@<SERVER_IP> \
  'chmod -R 777 /root/nanoclaw/data/sessions/'
```

---

## 新しい MCP サーバーを追加する手順

例: `https://example.com/api/mcp` という名前 `example` のサーバーを追加する場合。

### 1. `container/agent-runner/src/index.ts` を編集

`mcpServers` に追加:

```typescript
mcpServers: {
  nanoclaw: { ... },
  north: { ... },
  example: {
    command: 'npx',
    args: ['-y', 'mcp-remote', 'https://example.com/api/mcp'],
  },
},
```

`allowedTools` に追加:

```typescript
allowedTools: [
  ...
  'mcp__example__*',
],
```

### 2. ビルド・デプロイ

```bash
ssh -i ~/.ssh/<your-key> root@<SERVER_IP> '
  cd /root/nanoclaw && git pull -q
  ./container/build.sh 2>&1 | tail -1
  rm -rf /root/nanoclaw/data/sessions/*/agent-runner-src/
  docker stop $(docker ps -q) 2>/dev/null
  systemctl restart nanoclaw
'
```

### 3. 各ユーザーの OAuth セットアップ

上記の「初回 OAuth セットアップ手順」を `https://example.com/api/mcp` で実行。

---

## トラブルシューティング

### コンテナログに `OAuth required` や `not authenticated`

`.mcp-auth/` が空、またはトークンが切れている。再認証して上書き。

### `mcp-remote: command not found`

コンテナイメージが古い。`./container/build.sh` で再ビルド。

### `EACCES: permission denied`

`.mcp-auth/` のパーミッション。`chmod -R 777 /root/nanoclaw/data/sessions/<folder>/.mcp-auth/` で修正。

### エージェントが MCP ツールを呼ばない

CLAUDE.md にツールの存在と使い方を書く。例: 「`mcp__north__*` ツール群でタスクを操作できる」。

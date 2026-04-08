# Blueclaw 新規ユーザー追加ガイド

Blueclaw を新しいユーザーに提供する手順。Discord DM で1対1のAIマネージャーとして動作する。

---

## 前提

- Blueclaw が既にサーバーで動作していること（[BLUECLAW_DEPLOY.md](BLUECLAW_DEPLOY.md) 参照）
- Discord Bot がサーバーに招待済みであること
- 管理者がサーバーに SSH アクセスできること

## 手順

### 1. ユーザーに Discord で Bot に DM を送ってもらう

ユーザーに以下を伝える:

> Discord で Blueclaw Bot のプロフィールを開いて「メッセージを送信」をクリックし、何か一言送ってください（「こんにちは」等）。

これで Bot と DM チャネルが作成される。

### 2. DM のチャネル ID を取得する

ユーザーか管理者が DM のチャネル ID を取得する:

**方法 A: ユーザーに取得してもらう**
1. Discord の **ユーザー設定** > **詳細設定** > **開発者モード** を有効化
2. Blueclaw との DM を開く
3. チャネル名（上部の Bot 名）を右クリック > **チャネルIDをコピー**

**方法 B: サーバーログから取得**
ユーザーが DM を送った後、サーバーログにチャネル ID が記録される:
```bash
journalctl -u nanoclaw --since "5 min ago" | grep "Discord message stored"
```
`chatJid: "dc:XXXXXXXXX"` の数字部分がチャネル ID。

### 3. グループフォルダを作成

```bash
cd /root/nanoclaw

# ユーザー名に合わせてフォルダ名を決める（例: discord_taro）
USER_FOLDER="discord_taro"

# テンプレートからコピー
cp -r groups/blueclaw_template/ "groups/${USER_FOLDER}/"
```

これで以下が作成される:
```
groups/discord_taro/
├── CLAUDE.md       # Blueclaw の人格・行動原則
├── manual/
│   ├── morning.md  # 朝セッション手順
│   ├── evening.md  # 夜セッション手順
│   └── avoidance.md # 回避パターン対応
```

### 4. チャネルを登録

```bash
npx tsx setup/index.ts --step register -- \
  --jid "dc:<channel-id>" \
  --name "<ユーザー名>" \
  --folder "discord_<ユーザー名>" \
  --trigger "@Blueclaw" \
  --channel discord \
  --no-trigger-required
```

**注意**: `--is-main` は付けない。メインチャネルは管理者のみ。

### 5. パーミッション修正

```bash
chmod -R 777 /root/nanoclaw/groups/discord_<ユーザー名>/
chmod -R 777 /root/nanoclaw/data/
```

### 6. NanoClaw を再起動

```bash
systemctl restart nanoclaw
```

### 7. ユーザーに最初のメッセージを送ってもらう

ユーザーに DM で何か送ってもらう。Blueclaw が初回セットアップを開始する:
1. 自己紹介
2. kanban.md, USER.md, errands.md の初期化
3. ユーザー情報のヒアリング
4. 朝・夜セッション、heartbeat のスケジュール登録
5. タイムゾーンの確認
6. 初回の朝セッション開始

---

## ユーザーへの案内テンプレート

以下をユーザーに送る:

```
Blueclaw はあなたのタスク管理を手伝う AI マネージャーです。

## セットアップ

1. Discord で Blueclaw Bot に DM を送ってください
2. 最初に基本情報を聞かれるので答えてください
3. その後は普通にチャットで対話します

## Blueclaw がやること

- **朝セッション**（毎朝）: 今日やること3つを聞いて、計画を一緒に立てる
- **作業中チェックイン**: 宣言した作業時間に「始めた？」「終わった？」と確認
- **夜セッション**（毎晩）: 今日の振り返り。やれたこと・やれなかったことを一緒に分析
- **Heartbeat**: しばらく何も報告がないと「何やってる？」と声をかけてくる
- **タスク管理**: kanban.md にプロジェクト、errands.md に雑務を記録・追跡
- **雑務の催促**: 5分で終わるのに溜めてるタスクを指摘してくる

## 一番大事なこと: 何でも口に出す

Blueclaw を最大限活用するコツは、**思ったことを全部そのまま言う**ことです。

- 「気が乗らない」「めんどくさい」「やりたくない」→ そのまま言ってOK。Blueclaw はそれを受け止めた上で、じゃあどうするかを一緒に考えます
- 「あ、あれやらなきゃ」→ 言った瞬間に雑務リストに追加されます
- 「今日もうダメだ」→ じゃあ最低限これだけやろう、と調整してくれます
- きれいに報告する必要はありません。雑でいい。思いついた順でいい

逆に、**黙っているのが一番よくない**。何も言わないと Blueclaw は状況が分からないので助けられません。

## おすすめ: 音声入力を使う

テキストを打つのがめんどくさくて返信しなくなる、というのが一番のリスクです。音声入力を使うとハードルが下がります。

- **iOS / macOS**: キーボードのマイクボタン（標準機能）
- **Typeless**: https://typeless.ch — 音声でテキスト入力するアプリ
- **Discord のボイスメッセージ**: 長押しで録音 → テキスト変換はされないが、Blueclaw は音声を処理できる場合がある

「めんどくさいな〜」と声に出すだけで報告になります。打つより楽。

## 注意

- Blueclaw は「有能な上司」として振る舞います。甘やかしません
- 「後でやる」は許されません。いつやるかを決めさせられます
- 返信がないと声をかけてきます
- ただし敵意ではなく期待を持って接します。一緒にやろう、というスタンスです
```

---

## ユーザーの削除

ユーザーを削除する場合:

```bash
# 1. DB からグループ登録を削除
sqlite3 /root/nanoclaw/store/messages.db "DELETE FROM registered_groups WHERE folder='discord_<ユーザー名>'"

# 2. スケジュールタスクを削除
sqlite3 /root/nanoclaw/store/messages.db "DELETE FROM scheduled_tasks WHERE group_folder='discord_<ユーザー名>'"

# 3. NanoClaw を再起動
systemctl restart nanoclaw

# 4. グループフォルダは残しておく（ユーザーのデータ）
# 削除する場合: rm -rf /root/nanoclaw/groups/discord_<ユーザー名>/
```

---

## トラブルシューティング

### Bot が DM に応答しない

1. チャネル ID が正しく登録されているか確認:
   ```bash
   sqlite3 /root/nanoclaw/store/messages.db "SELECT * FROM registered_groups WHERE folder LIKE 'discord_%'"
   ```
2. ログを確認:
   ```bash
   journalctl -u nanoclaw --since "5 min ago" | grep "discord_<ユーザー名>"
   ```
3. パーミッション:
   ```bash
   chmod -R 777 /root/nanoclaw/groups/discord_<ユーザー名>/
   chmod -R 777 /root/nanoclaw/data/
   ```

### ユーザーのスケジュールタスクが他のユーザーに影響しないか

各グループのスケジュールタスクは `group_folder` と `chat_jid` で隔離されている。ユーザー A の heartbeat がユーザー B のチャネルにメッセージを送ることはない。

### API コスト

各ユーザーの会話・スケジュールタスクは同じ API キーを使う。ユーザーが増えるとコストも比例して増える。目安: 1ユーザーあたり $1-3/日（使い方による）。

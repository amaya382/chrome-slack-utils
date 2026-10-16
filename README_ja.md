<p align="right"><a href="README.md">English</a> / <strong>日本語</strong></p>

<h1 align="center">💬 Slack Utils Chrome Extension</h1>

<p align="center"><strong>ブラウザー版 Slack で、送信ミスを減らしてきれいにコピー</strong></p>

Slack Utils は plain JavaScript で書いた Manifest V3 の Chrome 拡張機能である。ビルドは不要で、リポジトリのディレクトリがそのまま拡張機能になる。

## ✨ Features

- **Send Preview** — 1 回目の `Enter` では送信せず、送信後の見た目の preview を入力欄の上に出す。メンションの宛先違いや書式の崩れに、誰かの目に触れる前に気づける。preview は Slack 自身の表示で描画し、メンションは入力欄が認識したとおりに表示する
- **Markdown でコピー** — メッセージ全体、または選択した部分だけを、Slack のメッセージメニューや右クリックメニューから Markdown でコピーする。書式、リスト、コードブロック、リンク、絵文字を保つので、ドキュメントや issue にそのまま貼れる
- **Open Links in Browser** — Slack のメッセージのリンクを、デスクトップアプリを起動するページと「Open Slack.app?」ダイアログを経ずに、ブラウザの Slack で直接開く

<img src="./img/preview.png" width="60%">

<img src="./img/copy-message-as-markdown.png" width="65%">

## 🚀 Quick Start

**前提**：デスクトップ版の Chrome と、ブラウザで `https://app.slack.com/` を開いた Slack。Slack のデスクトップアプリには対応しない

1. このリポジトリを clone する

   ```bash
   git clone https://github.com/amaya382/chrome-slack-utils.git
   ```

2. `chrome://extensions/` を開く
3. 「デベロッパー モード」をオンにする
4. 「パッケージ化されていない拡張機能を読み込む」を押し、clone したディレクトリを選ぶ

導入前から開いていた Slack のタブは再読み込みが要る。メッセージを入力して `Enter` を押し、送信されずにオレンジの枠付きの preview が出れば動いている。

更新するときは `git pull` してから、`chrome://extensions/` の拡張機能カードにある再読み込みボタンを押す。

## ⚙️ Configuration

ツールバーにある拡張機能のアイコンを押すと popup が開く。

| 設定 | 既定値 | 説明 |
| --- | --- | --- |
| Send preview | オン | 1 回目の `Enter` で preview を出す |
| Open links in browser | オン | Slack のメッセージのリンクをデスクトップアプリではなくブラウザで開く |

設定は `chrome.storage.sync` に保存するので、同じ Chrome プロファイルでログインしたすべての端末に同期される。開いている Slack のタブは、再読み込みしなくても変更を反映する。

## 🔒 Permissions

- `clipboardWrite` — 変換した Markdown をコピーする
- `contextMenus` — 右クリックメニューに「Copy selected as Markdown」を加える
- `storage` — 設定を保存して同期する
- `declarativeNetRequest` — メッセージのリンクをブラウザへ転送する
- `https://*.slack.com/*` へのアクセス — Slack にメニュー項目と preview を加え、workspace のドメインでメッセージのリンクを転送する

## 🔧 Troubleshooting

### Slack で何も起きない

拡張機能が動くのは `https://app.slack.com/` の上だけで、Slack のデスクトップアプリでは動かない。導入や更新のあとに Slack のタブを再読み込みしたかを確かめる。

### preview が出ない

popup で「Send preview」がオンになっているかを確かめる。補完のポップアップが開いている間と、送信済みメッセージの編集中も preview は出ない。

### メッセージのリンクがデスクトップアプリで開く

popup で「Open links in browser」がオンになっているかを確かめる。転送するのは `https://<workspace>.slack.com/archives/...` と `https://<workspace>.slack.com/app_redirect?channel=...` へのリンクだけである。

### ツールバーで付けた書式が preview に出ない

preview は、メッセージを `*bold*` のような Slack のマークアップのテキストとして読む。書式ツールバーやキーボードショートカットで付けた書式は preview には出ないが、送信されるメッセージには反映される。

### Slack の更新のあとで機能が動かなくなった

Slack Utils は、Slack のメニューと入力欄を DOM の構造と class 名で探している。Slack がそれらを変えると、拡張機能を更新するまで機能が動かなくなることがある。

## 🧪 Development

編集したら `chrome://extensions/` の拡張機能カードにある再読み込みボタンを押し、Slack のタブを再読み込みする。

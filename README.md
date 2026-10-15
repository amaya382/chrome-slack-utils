<p align="right"><strong>English</strong> / <a href="README_ja.md">日本語</a></p>

<h1 align="center">💬 Slack Utils Chrome Extension</h1>

<p align="center"><strong>Fewer slips and cleaner copies in Slack on the web.</strong></p>

Slack Utils is a Manifest V3 Chrome extension written in plain JavaScript. There is no build step: the repository directory is the extension.

## ✨ Features

- **Send Preview** — the first `Enter` shows the message above the input as it will look once sent, instead of sending it, so wrong mentions and broken formatting are caught before anyone sees them. The preview uses Slack's own rendering and shows mentions exactly as the input recognized them
- **Copy as Markdown** — copy a whole message, or only the selected part, as Markdown from Slack's message menu or the right-click menu. Formatting, lists, code blocks, links, and emoji are kept, so the text can be pasted into documents and issues as is
- **Open Links in Browser** — Slack message links open directly in Slack in the browser, skipping the page that launches the desktop app and its "Open Slack.app?" dialog

<img src="./img/preview.png" width="60%">

<img src="./img/copy-message-as-markdown.png" width="65%">

## 🚀 Quick Start

**Requirements:** desktop Chrome, and Slack opened in the browser at `https://app.slack.com/`. The Slack desktop app is not supported.

1. Clone this repository

   ```bash
   git clone https://github.com/amaya382/chrome-slack-utils.git
   ```

2. Open `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the cloned directory

Slack tabs that were already open before installing need a reload. Type a message and press `Enter`; a preview with an orange frame appears instead of the message being sent if the extension is active.

To update, run `git pull` and click the reload button on the extension's card in `chrome://extensions/`.

## ⚙️ Configuration

Click the extension's icon in the toolbar to open its popup.

| Setting | Default | Description |
| --- | --- | --- |
| Send preview | On | Show the preview on the first `Enter` |
| Open links in browser | On | Open Slack message links in the browser instead of the desktop app |

Settings are stored in `chrome.storage.sync`, so it follows the Chrome profile to every device signed in to it. Open Slack tabs pick up a change without a reload.

## 🔒 Permissions

- `clipboardWrite` — copy the converted Markdown
- `contextMenus` — add "Copy selected as Markdown" to the right-click menu
- `storage` — save and sync the settings
- `declarativeNetRequest` — redirect message links to the browser
- Access to `https://*.slack.com/*` — add the menu items and the preview to Slack, and redirect message links on workspace domains

## 🔧 Troubleshooting

### Nothing happens in Slack

The extension works only on `https://app.slack.com/`, not in the Slack desktop app. Check that the Slack tab was reloaded after installing or updating the extension.

### The preview does not appear

Check that "Send preview" is on in the popup. The preview is also skipped while an autocomplete popup is open and while editing a sent message.

### Message links still open the desktop app

Check that "Open links in browser" is on in the popup. Only links to `https://<workspace>.slack.com/archives/...` are redirected.

### Formatting applied from the toolbar is missing in the preview

The preview reads the message as Slack markup text, such as `*bold*`. Formatting applied with the formatting toolbar or keyboard shortcuts is not shown in the preview, but the message is still sent with it.

### A feature stopped working after a Slack update

Slack Utils finds Slack's menus and message input by their DOM structure and class names. When Slack changes them, a feature can stop working until the extension is updated.

## 🧪 Development

After editing, click the reload button on the extension's card in `chrome://extensions/`, then reload the Slack tab.

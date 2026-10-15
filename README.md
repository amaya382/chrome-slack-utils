<p align="right"><strong>English</strong> / <a href="README_ja.md">日本語</a></p>

<h1 align="center">💬 Slack Utils</h1>

<p align="center">
  <strong>Small utilities for Slack in Chrome.</strong><br/>
  Copy messages as Markdown, preview a message before it is sent, and open Slack links in the browser.
</p>

Slack Utils is a Manifest V3 Chrome extension written in plain JavaScript. There is no build step: the repository directory is the extension.

## Why Slack Utils?

- **Built into Slack's own UI** — the copy commands appear in Slack's message menu, and the preview appears right above the message input
- **Preview that looks like the sent message** — the preview is drawn with Slack's own rendering classes, and mentions follow what the message input has recognized
- **Small surface** — the extension runs only on Slack's own domains and sends no network requests of its own

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

## 📖 Usage

### Copy as Markdown

The ⋮ menu that appears on a message gets "Copy message as Markdown", which copies the whole message. When text is selected, "Copy selected message as Markdown" also appears and copies only the selection. The same selection copy is available as "Copy selected as Markdown" in the browser's right-click menu on Slack pages.

The conversion covers bold, italic, strikethrough, inline code, code blocks, blockquotes, links, bulleted, numbered, and checklist items with nesting, and emoji as `:name:`. Mentions and channels are copied as their plain text, such as `@name` and `#channel`. A toast in the bottom-right corner confirms the copy.

<img src="./img/copy-message-as-markdown.png" width="65%">

### Send Preview

Pressing `Enter` in the message input shows a rendered preview above the input and frames the input in orange, without sending. Pressing `Enter` again, or clicking the send button, sends the message. `Esc`, editing the message, or moving focus away from the input closes the preview.

The preview shows:

- Mentions, `@here` / `@channel`, and channels, exactly as the message input has marked them, whether they were typed or picked from autocomplete
- Links written as `[text](url)`, `<url|text>`, or a bare URL
- Bold, italic, strikethrough, inline code, code blocks, blockquotes (`>` and `>>>`), nested lists, and emoji
- Attachments: image thumbnails, other files with their name and type, and link previews

The preview is skipped for `Shift` + `Enter` (a new line), while an autocomplete popup is open, while editing a sent message, and for an empty message.

<img src="./img/preview.png" width="60%">

### Open Links in Browser

Opening a message link such as `https://<workspace>.slack.com/archives/...` normally shows a page that launches the Slack desktop app, along with the browser's "Open Slack.app?" dialog. The extension redirects these links to `https://<workspace>.slack.com/messages/...` before that page loads, so the message opens in Slack in the browser without the dialog.

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

| File | Role |
| --- | --- |
| `manifest.json` | Extension manifest |
| `content.js` | Markdown conversion, menu items, and Send Preview on Slack pages |
| `background.js` | Right-click menu entry, and switching the redirect rule on and off |
| `rules.json` | Redirect rule for Open Links in Browser |
| `popup.html` / `popup.js` | Popup with the setting toggles |
| `icons/` | Extension icons |
| `img/` | Screenshots for this README |

After editing, click the reload button on the extension's card in `chrome://extensions/`, then reload the Slack tab.

## 📄 License

[MIT](LICENSE)

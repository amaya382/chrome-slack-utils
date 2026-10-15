// Context menu for "Copy selected message as Markdown"
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "copy_selection_as_markdown",
    title: "Copy selected as Markdown",
    contexts: ["selection"],
    documentUrlPatterns: ["https://app.slack.com/*"],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "copy_selection_as_markdown" && tab?.id != null) {
    chrome.tabs.sendMessage(tab.id, {
      action: "copy_selection_as_markdown",
    });
  }
});

// Redirect workspace archive links past the "open in the app" page
const OPEN_IN_BROWSER_RULESET = "open_in_browser";

function syncOpenInBrowser() {
  chrome.storage.sync.get({ openInBrowserEnabled: true }, (data) => {
    chrome.declarativeNetRequest.updateEnabledRulesets(
      data.openInBrowserEnabled
        ? { enableRulesetIds: [OPEN_IN_BROWSER_RULESET] }
        : { disableRulesetIds: [OPEN_IN_BROWSER_RULESET] }
    );
  });
}

// The enabled rulesets reset to the manifest default on every extension update
chrome.runtime.onInstalled.addListener(syncOpenInBrowser);
chrome.runtime.onStartup.addListener(syncOpenInBrowser);
chrome.storage.onChanged.addListener((changes) => {
  if (changes.openInBrowserEnabled) {
    syncOpenInBrowser();
  }
});

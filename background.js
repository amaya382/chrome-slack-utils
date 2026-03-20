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

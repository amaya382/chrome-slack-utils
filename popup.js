const toggles = [
  { id: "sendPreview", key: "sendPreviewEnabled" },
  { id: "openInBrowser", key: "openInBrowserEnabled" },
];

for (const { id, key } of toggles) {
  const checkbox = document.getElementById(id);

  chrome.storage.sync.get({ [key]: true }, (data) => {
    checkbox.checked = data[key];
  });

  checkbox.addEventListener("change", () => {
    chrome.storage.sync.set({ [key]: checkbox.checked });
  });
}

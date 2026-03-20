const sendPreviewCheckbox = document.getElementById("sendPreview");

chrome.storage.sync.get({ sendPreviewEnabled: true }, (data) => {
  sendPreviewCheckbox.checked = data.sendPreviewEnabled;
});

sendPreviewCheckbox.addEventListener("change", () => {
  chrome.storage.sync.set({ sendPreviewEnabled: sendPreviewCheckbox.checked });
});

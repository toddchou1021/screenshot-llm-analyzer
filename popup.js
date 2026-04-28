const popupTitle = document.querySelector("#popupTitle");
const popupMeta = document.querySelector("#popupMeta");
const popupImage = document.querySelector("#popupImage");
const popupResult = document.querySelector("#popupResult");
const openScreenshotButton = document.querySelector("#openScreenshotButton");

let activeEntry;

window.screenshotApp.onPopupEntry((entry) => {
  activeEntry = entry;
  popupTitle.textContent = entry.error ? "Analysis Error" : "Analysis Result";
  popupMeta.textContent = `${new Date(entry.createdAt).toLocaleString()} · ${entry.model}`;
  popupResult.textContent = entry.error || entry.result || "No text result";
  popupResult.className = entry.error ? "error" : "";

  if (entry.screenshotUrl) {
    popupImage.src = entry.screenshotUrl;
    popupImage.hidden = false;
  } else {
    popupImage.hidden = true;
  }
});

openScreenshotButton.addEventListener("click", () => {
  if (activeEntry?.screenshotPath) {
    window.screenshotApp.openPath(activeEntry.screenshotPath);
  }
});

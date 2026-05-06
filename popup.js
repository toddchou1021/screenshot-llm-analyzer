const popupTitle = document.querySelector("#popupTitle");
const popupMeta = document.querySelector("#popupMeta");
const popupImage = document.querySelector("#popupImage");
const popupResult = document.querySelector("#popupResult");
const popupModelInput = document.querySelector("#popupModelInput");
const popupPromptInput = document.querySelector("#popupPromptInput");
const openScreenshotButton = document.querySelector("#openScreenshotButton");
const previousResultButton = document.querySelector("#previousResultButton");
const nextResultButton = document.querySelector("#nextResultButton");
const retryButton = document.querySelector("#retryButton");

let activeEntry;
let isRerunning = false;

function applyTheme(theme) {
  const normalizedTheme = theme === "industrial" ? "industrial" : "cyberpunk";
  document.documentElement.dataset.theme = normalizedTheme;
  document.body.dataset.theme = normalizedTheme;
}

window.screenshotApp.onPopupEntry((entry) => {
  renderEntry(entry);
});

openScreenshotButton.addEventListener("click", () => {
  if (activeEntry?.screenshotPath) {
    window.screenshotApp.openPath(activeEntry.screenshotPath);
  }
});

previousResultButton.addEventListener("click", () => {
  loadAdjacentResult("previous");
});

nextResultButton.addEventListener("click", () => {
  loadAdjacentResult("next");
});

retryButton.addEventListener("click", async () => {
  if (!activeEntry || isRerunning) return;

  isRerunning = true;
  setControlsDisabled(true);
  popupTitle.textContent = "Rerunning Analysis";
  popupResult.textContent = "Rerunning...";
  popupResult.className = "is-rerunning";

  try {
    const entry = await window.screenshotApp.retryAnalysis(activeEntry.id, {
      model: popupModelInput.value,
      prompt: popupPromptInput.value,
    });
    renderEntry(entry);
  } catch (error) {
    popupTitle.textContent = "Analysis Error";
    popupResult.textContent = error.message || String(error);
    popupResult.className = "error";
  } finally {
    isRerunning = false;
    setControlsDisabled(false);
    updateNavigationState();
  }
});

async function loadAdjacentResult(direction) {
  if (!activeEntry || isRerunning) return;

  const entry = await window.screenshotApp.getAdjacentEntry(activeEntry.id, direction);
  if (entry) {
    renderEntry(entry);
  }
}

function renderEntry(entry) {
  activeEntry = entry;
  applyTheme(entry.uiTheme);
  popupTitle.textContent = entry.error ? "Analysis Error" : "Analysis Result";
  popupMeta.textContent = `${new Date(entry.createdAt).toLocaleString()} · ${entry.model}`;
  setModelValue(entry.model);
  popupPromptInput.value = entry.prompt || "";
  popupResult.textContent = entry.error || entry.result || "No text result";
  popupResult.className = entry.error ? "error" : "";

  if (entry.screenshotUrl) {
    popupImage.src = entry.screenshotUrl;
    popupImage.hidden = false;
  } else {
    popupImage.hidden = true;
  }

  updateNavigationState();
}

async function updateNavigationState() {
  if (!activeEntry || isRerunning) {
    previousResultButton.disabled = true;
    nextResultButton.disabled = true;
    return;
  }

  const state = await window.screenshotApp.getEntryNavigation(activeEntry.id);
  previousResultButton.disabled = !state?.previous;
  nextResultButton.disabled = !state?.next;
}

function setControlsDisabled(disabled) {
  previousResultButton.disabled = disabled;
  nextResultButton.disabled = disabled;
  retryButton.disabled = disabled;
  popupModelInput.disabled = disabled;
  popupPromptInput.disabled = disabled;
}

function setModelValue(model) {
  const value = String(model || "").trim();
  if (!value) return;

  if (![...popupModelInput.options].some((option) => option.value === value)) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    popupModelInput.append(option);
  }

  popupModelInput.value = value;
}

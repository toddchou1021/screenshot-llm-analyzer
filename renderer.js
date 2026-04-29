const apiKeyInput = document.querySelector("#apiKeyInput");
const modelInput = document.querySelector("#modelInput");
const hotkeyInput = document.querySelector("#hotkeyInput");
const promptInput = document.querySelector("#promptInput");
const saveButton = document.querySelector("#saveButton");
const saveStatus = document.querySelector("#saveStatus");
const captureButton = document.querySelector("#captureButton");
const folderButton = document.querySelector("#folderButton");
const clearButton = document.querySelector("#clearButton");
const hotkeyStatus = document.querySelector("#hotkeyStatus");
const promptList = document.querySelector("#promptList");
const historyList = document.querySelector("#historyList");
const latestResult = document.querySelector("#latestResult");
const latestTime = document.querySelector("#latestTime");

const LIST_BATCH_SIZE = 20;

let currentState;
let visiblePromptCount = LIST_BATCH_SIZE;
let visibleHistoryCount = LIST_BATCH_SIZE;

function renderState(state) {
  currentState = state;
  const { settings, history, registeredHotkey } = state;

  if (document.activeElement !== apiKeyInput) apiKeyInput.value = settings.apiKey || "";
  if (document.activeElement !== modelInput) setModelValue(settings.model || "");
  if (document.activeElement !== hotkeyInput) hotkeyInput.value = settings.hotkey || "";
  if (document.activeElement !== promptInput) promptInput.value = settings.systemPrompt || "";

  hotkeyStatus.textContent = registeredHotkey
    ? `Running in background. Press ${registeredHotkey}, then drag to select an area.`
    : "No global hotkey registered. Use the Capture button.";

  renderHistory(history || []);
  renderPromptHistory(settings.promptHistory || [], settings.systemPrompt || "");
  renderLatest((history || [])[0]);
}

function setModelValue(model) {
  if (!model) return;

  if (![...modelInput.options].some((option) => option.value === model)) {
    const option = document.createElement("option");
    option.value = model;
    option.textContent = model;
    modelInput.append(option);
  }

  modelInput.value = model;
}

function renderHistory(history) {
  historyList.innerHTML = "";
  if (!history.length) {
    const empty = document.createElement("div");
    empty.className = "empty-history";
    empty.textContent = "Analysis runs will appear here.";
    historyList.append(empty);
    return;
  }

  const visibleHistory = history.slice(0, visibleHistoryCount);
  for (const entry of visibleHistory) {
    const item = document.createElement("div");
    item.className = `history-item${entry.error ? " has-error" : ""}`;
    const thumbnail = entry.thumbnailUrl
      ? `<img class="history-thumbnail" src="${entry.thumbnailUrl}" alt="">`
      : `<span class="history-thumbnail is-empty" aria-hidden="true"></span>`;
    item.innerHTML = `
      <button class="history-delete" type="button" aria-label="Delete analysis">x</button>
      <span class="history-date">${formatDate(entry.createdAt)}</span>
      <span class="history-preview">${escapeHtml(entry.error || entry.result || "No text result")}</span>
      ${thumbnail}
    `;
    item.addEventListener("click", () => window.screenshotApp.showEntryPopup(entry.id));
    item.querySelector(".history-delete").addEventListener("click", async (event) => {
      event.stopPropagation();
      await window.screenshotApp.deleteEntry(entry.id);
    });
    historyList.append(item);
  }

  if (history.length > visibleHistory.length) {
    historyList.append(
      createShowMoreButton(history.length - visibleHistory.length, () => {
        visibleHistoryCount += LIST_BATCH_SIZE;
        renderHistory(history);
      })
    );
  }
}

function renderPromptHistory(prompts, activePrompt) {
  promptList.innerHTML = "";
  if (!prompts.length) {
    const empty = document.createElement("div");
    empty.className = "empty-history";
    empty.textContent = "Saved prompts will appear here.";
    promptList.append(empty);
    return;
  }

  const visiblePrompts = prompts.slice(0, visiblePromptCount);
  visiblePrompts.forEach((prompt, index) => {
    const item = document.createElement("div");
    item.className = `prompt-item${prompt === activePrompt ? " is-active" : ""}`;
    item.innerHTML = `
      <button class="prompt-delete" type="button" aria-label="Delete prompt">x</button>
      <span class="prompt-index">${index === 0 ? "Newest" : `#${index + 1}`}</span>
      <span class="prompt-preview">${escapeHtml(prompt)}</span>
    `;
    item.addEventListener("click", async () => {
      promptInput.value = prompt;
      saveStatus.textContent = "Prompt selected";
      const state = await window.screenshotApp.activatePrompt(prompt);
      renderState({ ...currentState, ...state });
      setTimeout(() => {
        saveStatus.textContent = "";
      }, 1800);
    });
    item.querySelector(".prompt-delete").addEventListener("click", async (event) => {
      event.stopPropagation();
      saveStatus.textContent = "Deleting prompt...";
      const state = await window.screenshotApp.deletePrompt(prompt);
      renderState({ ...currentState, ...state });
      saveStatus.textContent = "Prompt deleted";
      setTimeout(() => {
        saveStatus.textContent = "";
      }, 1800);
    });
    promptList.append(item);
  });

  if (prompts.length > visiblePrompts.length) {
    promptList.append(
      createShowMoreButton(prompts.length - visiblePrompts.length, () => {
        visiblePromptCount += LIST_BATCH_SIZE;
        renderPromptHistory(prompts, activePrompt);
      })
    );
  }
}

function createShowMoreButton(remainingCount, onClick) {
  const button = document.createElement("button");
  button.className = "list-more-button";
  button.type = "button";
  button.textContent = `Show ${Math.min(LIST_BATCH_SIZE, remainingCount)} More`;
  button.addEventListener("click", onClick);
  return button;
}

function renderLatest(entry) {
  if (!entry) {
    latestTime.textContent = "";
    latestResult.className = "result-body muted";
    latestResult.textContent = "No captures yet.";
    return;
  }

  latestTime.textContent = formatDate(entry.createdAt);
  latestResult.className = `result-body${entry.error ? " error" : ""}`;
  latestResult.textContent = entry.error || entry.result || "No text result";
}

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function saveSettings() {
  saveButton.disabled = true;
  saveStatus.textContent = "Saving...";
  try {
    const state = await window.screenshotApp.saveSettings({
      apiKey: apiKeyInput.value,
      model: modelInput.value,
      hotkey: hotkeyInput.value,
      systemPrompt: promptInput.value,
    });
    renderState({ ...currentState, ...state });
    saveStatus.textContent = "Saved";
  } catch (error) {
    saveStatus.textContent = error.message || "Save failed";
  } finally {
    saveButton.disabled = false;
    setTimeout(() => {
      saveStatus.textContent = "";
    }, 2200);
  }
}

saveButton.addEventListener("click", saveSettings);
modelInput.addEventListener("change", async () => {
  saveStatus.textContent = "Saving model...";
  try {
    const state = await window.screenshotApp.saveSettings({
      model: modelInput.value,
    });
    renderState({ ...currentState, ...state });
    saveStatus.textContent = "Model saved";
  } catch (error) {
    saveStatus.textContent = error.message || "Model save failed";
  } finally {
    setTimeout(() => {
      saveStatus.textContent = "";
    }, 2200);
  }
});
captureButton.addEventListener("click", () => window.screenshotApp.startCapture());
folderButton.addEventListener("click", () => window.screenshotApp.openScreenshotsFolder());
clearButton.addEventListener("click", () => {
  if (confirm("Clear the visible analysis history? Screenshots already saved on disk are not deleted.")) {
    window.screenshotApp.clearHistory();
  }
});

window.screenshotApp.onAppState(renderState);
window.screenshotApp.onStatus((message) => {
  saveStatus.textContent = message;
});

window.screenshotApp.getState().then(renderState);

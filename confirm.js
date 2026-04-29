const confirmImage = document.querySelector("#confirmImage");
const confirmPromptList = document.querySelector("#confirmPromptList");
const confirmPromptInput = document.querySelector("#confirmPromptInput");
const analyzeButton = document.querySelector("#analyzeButton");
const cancelButton = document.querySelector("#cancelButton");

let activeId = "";
let selectedPrompt = "";
let settled = false;

window.screenshotApp.onConfirmEntry((entry) => {
  activeId = entry.id;
  selectedPrompt = entry.prompt || "";
  confirmImage.src = entry.screenshotUrl;
  confirmPromptInput.value = selectedPrompt;
  renderPromptList(entry);
});

window.addEventListener("keydown", (event) => {
  if (event.target === confirmPromptInput && event.key === "Enter" && !event.ctrlKey) {
    return;
  }
  if (event.key === "Enter") {
    accept();
  }
  if (event.key === "Escape") {
    cancel();
  }
});

analyzeButton.addEventListener("click", accept);
cancelButton.addEventListener("click", cancel);

function accept() {
  if (!activeId || settled) return;
  settled = true;
  selectedPrompt = confirmPromptInput.value;
  window.screenshotApp.acceptConfirmation(activeId, selectedPrompt);
}

function cancel() {
  if (!activeId || settled) return;
  settled = true;
  window.screenshotApp.cancelConfirmation(activeId);
}

function renderPromptList(entry) {
  const prompts = buildPromptChoices(entry.prompt, entry.promptHistory || []);
  confirmPromptList.innerHTML = "";

  if (!prompts.length) {
    const empty = document.createElement("p");
    empty.className = "empty-history";
    empty.textContent = "No saved prompts.";
    confirmPromptList.append(empty);
    return;
  }

  prompts.forEach((prompt, index) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = `confirm-prompt-item${prompt === selectedPrompt ? " is-active" : ""}`;
    item.title = prompt;
    item.innerHTML = `
      <span class="confirm-prompt-label">${index === 0 ? "Current" : `Saved #${index}`}</span>
      <span class="confirm-prompt-preview">${escapeHtml(formatPromptPreview(prompt))}</span>
    `;
    item.addEventListener("click", () => {
      selectedPrompt = prompt;
      confirmPromptInput.value = prompt;
      renderPromptList({ ...entry, promptHistory: prompts });
    });
    confirmPromptList.append(item);
  });
}

function buildPromptChoices(activePrompt, promptHistory) {
  const seen = new Set();
  const result = [];

  for (const prompt of [activePrompt, ...promptHistory]) {
    const text = String(prompt || "").trim();
    if (!text || seen.has(text)) continue;
    seen.add(text);
    result.push(text);
  }

  return result;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatPromptPreview(prompt) {
  const text = String(prompt || "").replace(/\s+/g, " ").trim();
  const maxLength = 62;

  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3).trimEnd()}...`;
}

const {
  app,
  BrowserWindow,
  Tray,
  Menu,
  Notification,
  nativeImage,
  ipcMain,
  globalShortcut,
  screen,
  desktopCapturer,
  shell,
} = require("electron");
const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");

const DEFAULT_SYSTEM_PROMPT =
  "Translate the text in the screenshot into Traditional Chinese. If the text is Japanese, provide romaji. For images, explain what they are.";

const FIXED_OUTPUT_INSTRUCTION =
  "Your task is to follow USER PROMPT defined below and provide only the final output. Do not show self-checks, reasoning, drafts, options, constraints, notes, or meta-commentary. Do not repeat the final output.";

const DEFAULT_SETTINGS = {
  apiKey: "",
  model: "gemma-4-31b-it",
  hotkey: "Alt+S",
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
  promptHistory: [],
};

let mainWindow;
let overlayWindow;
let tray;
let isQuitting = false;
let settings = { ...DEFAULT_SETTINGS };
let history = [];
let registeredHotkey = "";
let hotkeyRegistrationPaused = false;
let overlayCaptureInProgress = false;
let hotkeyResumeTimer = null;
const pendingConfirmations = new Map();
const APP_ICON_PATH = path.join(__dirname, "assets", "icon.ico");
const APP_ICON_PNG_PATH = path.join(__dirname, "assets", "icon.png");

app.setName("Screenshot Analyzer");

if (process.platform === "win32") {
  app.setAppUserModelId("com.toddchou.screenshot-llm-analyzer");
}

function settingsPath() {
  return path.join(app.getPath("userData"), "settings.json");
}

function historyPath() {
  return path.join(app.getPath("userData"), "history.json");
}

function screenshotsDir() {
  return path.join(app.getPath("userData"), "screenshots");
}

async function migrateLegacyUserData() {
  const currentDir = app.getPath("userData");
  const legacyDir = path.join(app.getPath("appData"), "local-check-app");

  if (path.resolve(currentDir) === path.resolve(legacyDir)) return;

  const legacySettings = path.join(legacyDir, "settings.json");
  const legacyHistory = path.join(legacyDir, "history.json");
  const legacyScreenshots = path.join(legacyDir, "screenshots");
  const currentSettings = settingsPath();
  const currentHistory = historyPath();
  const currentScreenshots = screenshotsDir();

  if (await pathExists(legacySettings)) {
    await copyIfMissing(legacySettings, currentSettings);
  }

  if (await pathExists(legacyHistory)) {
    await copyIfMissing(legacyHistory, currentHistory);
  }

  if ((await pathExists(legacyScreenshots)) && !(await pathExists(currentScreenshots))) {
    await fs.cp(legacyScreenshots, currentScreenshots, { recursive: true });
  }
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function copyIfMissing(sourcePath, targetPath) {
  if (await pathExists(targetPath)) return;
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.copyFile(sourcePath, targetPath);
}

async function readJson(file, fallback) {
  try {
    const raw = await fs.readFile(file, "utf8");
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

async function writeJson(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function deleteScreenshotIfManaged(filePath) {
  if (!filePath) return;

  const screenshotFile = path.resolve(filePath);
  const managedDir = path.resolve(screenshotsDir());
  const relative = path.relative(managedDir, screenshotFile);
  const isManagedFile = relative && !relative.startsWith("..") && !path.isAbsolute(relative);

  if (isManagedFile) {
    await fs.unlink(screenshotFile).catch(() => {});
  }
}

async function loadState() {
  settings = { ...DEFAULT_SETTINGS, ...(await readJson(settingsPath(), {})) };
  settings.model = normalizeModel(settings.model);
  settings.model = normalizeGeminiModel(settings.model);
  settings.hotkey = normalizeHotkey(settings.hotkey);
  settings.systemPrompt = normalizePrompt(settings.systemPrompt) || DEFAULT_SYSTEM_PROMPT;
  settings.promptHistory = normalizePromptHistory(settings.promptHistory, settings.systemPrompt);
  const loadedHistory = await readJson(historyPath(), []);
  history = Array.isArray(loadedHistory) ? loadedHistory : [];
}

async function saveSettings(nextSettings, { rememberPrompt = true } = {}) {
  const nextPrompt = normalizePrompt(nextSettings.systemPrompt ?? settings.systemPrompt);
  const model = normalizeGeminiModel(nextSettings.model ?? settings.model);
  settings = {
    ...settings,
    ...nextSettings,
    apiKey: String(nextSettings.apiKey ?? settings.apiKey ?? "").trim(),
    model,
    hotkey: normalizeHotkey(nextSettings.hotkey ?? settings.hotkey),
    systemPrompt: nextPrompt || DEFAULT_SYSTEM_PROMPT,
  };
  settings.promptHistory = normalizePromptHistory(settings.promptHistory, settings.systemPrompt);
  if (rememberPrompt && Object.hasOwn(nextSettings, "systemPrompt")) {
    rememberPromptText(settings.systemPrompt);
  }
  await writeJson(settingsPath(), settings);
  registerCaptureHotkey();
  sendAppState();
  return { settings, registeredHotkey };
}

async function activatePrompt(prompt) {
  const normalizedPrompt = normalizePrompt(prompt);
  if (!normalizedPrompt) return { settings, registeredHotkey };

  settings.systemPrompt = normalizedPrompt;
  settings.promptHistory = normalizePromptHistory(settings.promptHistory, settings.systemPrompt);
  await writeJson(settingsPath(), settings);
  sendAppState();
  return { settings, registeredHotkey };
}

async function deletePrompt(prompt) {
  const normalizedPrompt = normalizePrompt(prompt);
  if (!normalizedPrompt) return { settings, registeredHotkey };

  settings.promptHistory = (settings.promptHistory || []).filter(
    (savedPrompt) => savedPrompt !== normalizedPrompt
  );

  if (settings.systemPrompt === normalizedPrompt) {
    settings.systemPrompt = settings.promptHistory[0] || DEFAULT_SYSTEM_PROMPT;
    settings.promptHistory = normalizePromptHistory(
      settings.promptHistory,
      settings.promptHistory.length ? settings.systemPrompt : ""
    );
  }

  await writeJson(settingsPath(), settings);
  sendAppState();
  return { settings, registeredHotkey };
}

function normalizePrompt(prompt) {
  return String(prompt ?? "").trim();
}

function normalizePromptHistory(promptHistory, activePrompt) {
  const seen = new Set();
  const prompts = Array.isArray(promptHistory) ? promptHistory : [];
  const normalized = [];

  for (const prompt of prompts) {
    const text = normalizePrompt(prompt);
    if (!text || seen.has(text)) continue;
    seen.add(text);
    normalized.push(text);
  }

  const active = normalizePrompt(activePrompt);
  if (active && !seen.has(active)) {
    normalized.unshift(active);
  }

  return normalized.slice(0, 60);
}

function rememberPromptText(prompt) {
  const text = normalizePrompt(prompt);
  if (!text) return;

  settings.promptHistory = [
    text,
    ...(settings.promptHistory || []).filter((savedPrompt) => savedPrompt !== text),
  ].slice(0, 60);
}

function appState() {
  return {
    settings,
    history: history.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    registeredHotkey,
    paths: {
      settings: settingsPath(),
      history: historyPath(),
      screenshots: screenshotsDir(),
    },
  };
}

function sendAppState() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("app-state", appState());
  }
}

function pauseCaptureHotkey() {
  hotkeyRegistrationPaused = true;
  if (hotkeyResumeTimer) {
    clearTimeout(hotkeyResumeTimer);
    hotkeyResumeTimer = null;
  }
  globalShortcut.unregisterAll();
}

function resumeCaptureHotkey(delayMs = 900) {
  if (hotkeyResumeTimer) clearTimeout(hotkeyResumeTimer);
  hotkeyResumeTimer = setTimeout(() => {
    hotkeyRegistrationPaused = false;
    hotkeyResumeTimer = null;
    registerCaptureHotkey();
  }, delayMs);
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 760,
    minWidth: 920,
    minHeight: 620,
    title: "Screenshot Analyzer",
    icon: APP_ICON_PATH,
    backgroundColor: "#f7f7f2",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, "index.html"));

  mainWindow.on("close", (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      notify("Screenshot Analyzer is still running in the tray.");
    }
  });

  mainWindow.webContents.on("did-finish-load", sendAppState);
}

function createTray() {
  tray = new Tray(loadAppIcon());
  tray.setToolTip("Screenshot Analyzer");
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: "Open", click: showMainWindow },
      { label: "Capture now", click: startCaptureOverlay },
      { type: "separator" },
      {
        label: "Quit",
        click: () => {
          isQuitting = true;
          app.quit();
        },
      },
    ])
  );
  tray.on("double-click", showMainWindow);
}

function showMainWindow() {
  if (!mainWindow) createMainWindow();
  mainWindow.show();
  mainWindow.focus();
}

function notify(body) {
  if (Notification.isSupported()) {
    new Notification({ title: "Screenshot Analyzer", body, icon: APP_ICON_PATH }).show();
  }
}

function loadAppIcon() {
  const icon = nativeImage.createFromPath(APP_ICON_PATH);
  if (!icon.isEmpty()) return icon;
  return nativeImage.createFromPath(APP_ICON_PNG_PATH);
}

function registerCaptureHotkey() {
  globalShortcut.unregisterAll();
  registeredHotkey = "";

  if (hotkeyRegistrationPaused) {
    sendAppState();
    return;
  }

  const preferred = normalizeHotkey(settings.hotkey);
  const candidates = [...new Set([preferred, "Alt+S", "CommandOrControl+Shift+S"])];

  for (const candidate of candidates) {
    try {
      if (globalShortcut.register(candidate, startCaptureOverlay)) {
        registeredHotkey = candidate;
        break;
      }
    } catch {
      // Try the next candidate. Some platforms reject modifier-only accelerators.
    }
  }

  sendAppState();
}

function virtualBounds() {
  const displays = screen.getAllDisplays();
  const left = Math.min(...displays.map((display) => display.bounds.x));
  const top = Math.min(...displays.map((display) => display.bounds.y));
  const right = Math.max(...displays.map((display) => display.bounds.x + display.bounds.width));
  const bottom = Math.max(...displays.map((display) => display.bounds.y + display.bounds.height));
  return { x: left, y: top, width: right - left, height: bottom - top };
}

async function startCaptureOverlay() {
  if (overlayCaptureInProgress || hotkeyRegistrationPaused) {
    return;
  }

  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.focus();
    return;
  }

  pauseCaptureHotkey();
  const bounds = virtualBounds();
  let previewScreens = [];
  try {
    previewScreens = await captureOverlayPreview(bounds);
  } catch (error) {
    sendTransientStatus(error.message || "Could not capture screen preview.");
  }
  overlayWindow = new BrowserWindow({
    ...bounds,
    frame: false,
    icon: APP_ICON_PATH,
    transparent: false,
    resizable: false,
    movable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    focusable: true,
    show: false,
    backgroundColor: "#101214",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  overlayWindow.setAlwaysOnTop(true, "screen-saver");
  overlayWindow.loadFile(path.join(__dirname, "overlay.html"));
  overlayWindow.once("ready-to-show", () => {
    overlayWindow.show();
    overlayWindow.focus();
    overlayWindow.webContents.send("overlay-ready", {
      bounds,
      screens: previewScreens,
    });
  });
  overlayWindow.on("closed", () => {
    overlayWindow = null;
  });
}

async function captureOverlayPreview(bounds) {
  const displays = screen.getAllDisplays();
  const screens = [];

  for (const display of displays) {
    const scaleFactor = display.scaleFactor || 1;
    const thumbnailSize = {
      width: Math.ceil(display.bounds.width * scaleFactor),
      height: Math.ceil(display.bounds.height * scaleFactor),
    };
    const sources = await desktopCapturer.getSources({
      types: ["screen"],
      thumbnailSize,
    });
    const source =
      sources.find((item) => String(item.display_id) === String(display.id)) || sources[0];

    if (!source || source.thumbnail.isEmpty()) continue;

    screens.push({
      x: display.bounds.x - bounds.x,
      y: display.bounds.y - bounds.y,
      width: display.bounds.width,
      height: display.bounds.height,
      dataUrl: source.thumbnail.toDataURL(),
    });
  }

  return screens;
}

function closeOverlay({ resumeHotkey = true } = {}) {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.close();
  }
  if (resumeHotkey && !overlayCaptureInProgress) {
    resumeCaptureHotkey();
  }
}

async function captureSelection(selection) {
  const normalized = normalizeRect(selection);
  if (normalized.width < 8 || normalized.height < 8) {
    throw new Error("The selected area is too small.");
  }

  const display = screen.getDisplayMatching(normalized);
  const scaleFactor = display.scaleFactor || 1;
  const thumbnailSize = {
    width: Math.ceil(display.bounds.width * scaleFactor),
    height: Math.ceil(display.bounds.height * scaleFactor),
  };

  const sources = await desktopCapturer.getSources({
    types: ["screen"],
    thumbnailSize,
  });
  const source =
    sources.find((item) => String(item.display_id) === String(display.id)) || sources[0];

  if (!source || source.thumbnail.isEmpty()) {
    throw new Error("Could not capture the selected screen.");
  }

  const imageSize = source.thumbnail.getSize();
  const ratioX = imageSize.width / display.bounds.width;
  const ratioY = imageSize.height / display.bounds.height;
  const crop = {
    x: Math.max(0, Math.round((normalized.x - display.bounds.x) * ratioX)),
    y: Math.max(0, Math.round((normalized.y - display.bounds.y) * ratioY)),
    width: Math.max(1, Math.round(normalized.width * ratioX)),
    height: Math.max(1, Math.round(normalized.height * ratioY)),
  };

  crop.width = Math.min(crop.width, imageSize.width - crop.x);
  crop.height = Math.min(crop.height, imageSize.height - crop.y);

  const screenshot = source.thumbnail.crop(crop);
  await fs.mkdir(screenshotsDir(), { recursive: true });
  const fileName = `screenshot-${new Date().toISOString().replace(/[:.]/g, "-")}.png`;
  const filePath = path.join(screenshotsDir(), fileName);
  await fs.writeFile(filePath, screenshot.toPNG());
  return filePath;
}

function normalizeRect(rect) {
  const x1 = Number(rect.x);
  const y1 = Number(rect.y);
  const x2 = Number(rect.x + rect.width);
  const y2 = Number(rect.y + rect.height);
  return {
    x: Math.round(Math.min(x1, x2)),
    y: Math.round(Math.min(y1, y2)),
    width: Math.round(Math.abs(x2 - x1)),
    height: Math.round(Math.abs(y2 - y1)),
  };
}

async function analyzeScreenshot(filePath, prompt = settings.systemPrompt) {
  if (!settings.apiKey) {
    throw new Error("Paste and save your Gemini API key before running analysis.");
  }

  const base64Image = await fs.readFile(filePath, "base64");
  const model = normalizeModel(settings.model);
  const userPrompt = normalizePrompt(prompt) || settings.systemPrompt;
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model
    )}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": settings.apiKey,
      },
      body: JSON.stringify({
        system_instruction: {
          parts: [
            {
              text: `${FIXED_OUTPUT_INSTRUCTION}\n\nUser prompt:\n${userPrompt}`,
            },
          ],
        },
        contents: [
          {
            role: "user",
            parts: [
              {
                inline_data: {
                  mime_type: "image/png",
                  data: base64Image,
                },
              },
            ],
          },
        ],
      }),
    }
  );

  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = json?.error?.message || `Gemini API returned HTTP ${response.status}.`;
    throw new Error(message);
  }

  const text =
    json?.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || "")
      .filter(Boolean)
      .join("\n\n")
      .trim() || "";

  return cleanAnalysisText(text) || JSON.stringify(json, null, 2);
}

function normalizeModel(model) {
  return String(model || DEFAULT_SETTINGS.model)
    .trim()
    .replace(/^models\//i, "")
    .toLowerCase();
}

function normalizeGeminiModel(model) {
  const normalizedModel = normalizeModel(model);
  return normalizedModel.startsWith("gemma-") ? normalizedModel : DEFAULT_SETTINGS.model;
}

function normalizeHotkey(hotkey) {
  const value = String(hotkey || DEFAULT_SETTINGS.hotkey).trim();
  return value.toLowerCase() === "alt" ? "Alt+S" : value || DEFAULT_SETTINGS.hotkey;
}

function cleanAnalysisText(value) {
  let text = String(value || "").trim();
  const markers = ["*   Text:", "* Text:", "Text:", "テキスト:", "本文:"];

  for (const marker of markers) {
    const index = text.indexOf(marker);
    if (index > 0 && /system instructions?|input:/i.test(text.slice(0, index))) {
      text = text.slice(index + marker.length).trim();
      break;
    }
  }

  return text
    .replace(/^\*\s+Input:[\s\S]*?(?=\n\s*\*\s+(Text|Result|Translation|翻訳|結果):)/i, "")
    .trim();
}

async function runAnalysisFromSelection(selection) {
  if (overlayCaptureInProgress) return;
  overlayCaptureInProgress = true;

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  let screenshotPath = "";
  let errorEntry;

  try {
    closeOverlay({ resumeHotkey: false });
    await new Promise((resolve) => setTimeout(resolve, 160));
    screenshotPath = await captureSelection(selection);
    overlayCaptureInProgress = false;
    resumeCaptureHotkey(250);
    showConfirmationWindow({
      id,
      createdAt,
      screenshotPath,
      model: settings.model,
      prompt: settings.systemPrompt,
    });
    return;
  } catch (error) {
    errorEntry = {
      id,
      createdAt,
      screenshotPath,
      model: settings.model,
      prompt: settings.systemPrompt,
      result: "",
      error: error.message || String(error),
    };
  } finally {
    if (overlayCaptureInProgress) {
      overlayCaptureInProgress = false;
      resumeCaptureHotkey(250);
    }
  }

  history.unshift(errorEntry);
  await writeJson(historyPath(), history);
  showResultPopup(errorEntry);
  sendAppState();
}

function showConfirmationWindow(pending) {
  const confirmWindow = new BrowserWindow({
    width: 760,
    height: 450,
    minWidth: 620,
    minHeight: 360,
    title: "Confirm Screenshot",
    icon: APP_ICON_PATH,
    alwaysOnTop: true,
    backgroundColor: "#fafaf7",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const record = { ...pending, window: confirmWindow, settled: false };
  pendingConfirmations.set(pending.id, record);

  confirmWindow.loadFile(path.join(__dirname, "confirm.html"));
  confirmWindow.webContents.once("did-finish-load", () => {
    confirmWindow.webContents.send("confirm-entry", {
      id: pending.id,
      createdAt: pending.createdAt,
      screenshotPath: pending.screenshotPath,
      screenshotUrl: nativeImage.createFromPath(pending.screenshotPath).toDataURL(),
      prompt: settings.systemPrompt,
      promptHistory: settings.promptHistory || [],
    });
  });

  confirmWindow.on("closed", () => {
    const current = pendingConfirmations.get(pending.id);
    if (current && !current.settled) {
      cancelConfirmation(pending.id);
    }
  });
}

async function acceptConfirmation(id, prompt) {
  const pending = pendingConfirmations.get(id);
  if (!pending || pending.settled) return;

  const selectedPrompt = normalizePrompt(prompt) || settings.systemPrompt;
  pending.prompt = selectedPrompt;
  settings.systemPrompt = selectedPrompt;
  settings.promptHistory = normalizePromptHistory(settings.promptHistory, settings.systemPrompt);
  await writeJson(settingsPath(), settings);
  sendAppState();

  pending.settled = true;
  pendingConfirmations.delete(id);
  if (pending.window && !pending.window.isDestroyed()) {
    pending.window.close();
  }

  analyzeConfirmedScreenshot(pending);
}

async function cancelConfirmation(id) {
  const pending = pendingConfirmations.get(id);
  if (!pending || pending.settled) return;

  pending.settled = true;
  pendingConfirmations.delete(id);
  if (pending.window && !pending.window.isDestroyed()) {
    pending.window.close();
  }

  if (pending.screenshotPath) {
    await fs.unlink(pending.screenshotPath).catch(() => {});
  }
  sendTransientStatus("Screenshot analysis canceled.");
}

async function analyzeConfirmedScreenshot(pending) {
  sendTransientStatus("Analyzing screenshot...");
  let entry;
  const prompt = normalizePrompt(pending.prompt) || settings.systemPrompt;

  try {
    const result = await analyzeScreenshot(pending.screenshotPath, prompt);
    entry = {
      id: pending.id,
      createdAt: pending.createdAt,
      screenshotPath: pending.screenshotPath,
      model: settings.model,
      prompt,
      result,
      error: "",
    };
  } catch (error) {
    entry = {
      id: pending.id,
      createdAt: pending.createdAt,
      screenshotPath: pending.screenshotPath,
      model: settings.model,
      prompt,
      result: "",
      error: error.message || String(error),
    };
  }

  history.unshift(entry);
  await writeJson(historyPath(), history);
  showResultPopup(entry);
  sendAppState();
}

function sendTransientStatus(message) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("status", message);
  }
}

function showResultPopup(entry) {
  const popup = new BrowserWindow({
    width: 760,
    height: 620,
    minWidth: 520,
    minHeight: 420,
    title: entry.error ? "Screenshot Analysis Error" : "Screenshot Analysis",
    icon: APP_ICON_PATH,
    parent: mainWindow && mainWindow.isVisible() ? mainWindow : undefined,
    backgroundColor: "#fafaf7",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  popup.loadFile(path.join(__dirname, "popup.html"));
  popup.webContents.once("did-finish-load", () => {
    popup.webContents.send("popup-entry", toRendererEntry(entry));
  });
}

function toRendererEntry(entry) {
  return {
    ...entry,
    screenshotUrl: entry.screenshotPath ? nativeImage.createFromPath(entry.screenshotPath).toDataURL() : "",
  };
}

ipcMain.handle("get-state", () => appState());

ipcMain.handle("save-settings", async (_event, nextSettings) => {
  return saveSettings(nextSettings);
});

ipcMain.handle("activate-prompt", async (_event, prompt) => {
  return activatePrompt(prompt);
});

ipcMain.handle("delete-prompt", async (_event, prompt) => {
  return deletePrompt(prompt);
});

ipcMain.handle("start-capture", () => {
  startCaptureOverlay();
  return { ok: true };
});

ipcMain.handle("open-path", async (_event, targetPath) => {
  if (targetPath) {
    await shell.openPath(targetPath);
  }
});

ipcMain.handle("open-screenshots-folder", async () => {
  await fs.mkdir(screenshotsDir(), { recursive: true });
  await shell.openPath(screenshotsDir());
});

ipcMain.handle("get-entry", (_event, id) => {
  const entry = history.find((item) => item.id === id);
  return entry ? toRendererEntry(entry) : null;
});

ipcMain.handle("show-entry-popup", (_event, id) => {
  const entry = history.find((item) => item.id === id);
  if (entry) showResultPopup(entry);
});

ipcMain.handle("delete-entry", async (_event, id) => {
  const index = history.findIndex((item) => item.id === id);
  if (index === -1) return { ok: false };

  const [entry] = history.splice(index, 1);
  await deleteScreenshotIfManaged(entry.screenshotPath);
  await writeJson(historyPath(), history);
  sendAppState();
  return { ok: true };
});

ipcMain.handle("clear-history", async () => {
  history = [];
  await writeJson(historyPath(), history);
  sendAppState();
});

ipcMain.on("overlay-cancel", closeOverlay);
ipcMain.on("overlay-selection", (_event, selection) => {
  runAnalysisFromSelection(selection);
});
ipcMain.on("confirm-accept", (_event, id, prompt) => {
  acceptConfirmation(id, prompt).catch((error) => {
    console.error("Failed to accept screenshot confirmation:", error);
  });
});
ipcMain.on("confirm-cancel", (_event, id) => {
  cancelConfirmation(id);
});

app.whenReady().then(async () => {
  await migrateLegacyUserData();
  await loadState();
  createMainWindow();
  createTray();
  registerCaptureHotkey();
});

app.on("activate", showMainWindow);

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});

app.on("window-all-closed", () => {});

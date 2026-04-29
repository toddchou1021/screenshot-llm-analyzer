const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("screenshotApp", {
  getState: () => ipcRenderer.invoke("get-state"),
  saveSettings: (settings) => ipcRenderer.invoke("save-settings", settings),
  activatePrompt: (prompt) => ipcRenderer.invoke("activate-prompt", prompt),
  deletePrompt: (prompt) => ipcRenderer.invoke("delete-prompt", prompt),
  startCapture: () => ipcRenderer.invoke("start-capture"),
  openPath: (targetPath) => ipcRenderer.invoke("open-path", targetPath),
  openScreenshotsFolder: () => ipcRenderer.invoke("open-screenshots-folder"),
  showEntryPopup: (id) => ipcRenderer.invoke("show-entry-popup", id),
  deleteEntry: (id) => ipcRenderer.invoke("delete-entry", id),
  clearHistory: () => ipcRenderer.invoke("clear-history"),
  sendOverlaySelection: (selection) => ipcRenderer.send("overlay-selection", selection),
  cancelOverlay: () => ipcRenderer.send("overlay-cancel"),
  acceptConfirmation: (id, prompt) => ipcRenderer.send("confirm-accept", id, prompt),
  cancelConfirmation: (id) => ipcRenderer.send("confirm-cancel", id),
  onAppState: (callback) => {
    ipcRenderer.on("app-state", (_event, state) => callback(state));
  },
  onStatus: (callback) => {
    ipcRenderer.on("status", (_event, message) => callback(message));
  },
  onOverlayReady: (callback) => {
    ipcRenderer.on("overlay-ready", (_event, bounds) => callback(bounds));
  },
  onPopupEntry: (callback) => {
    ipcRenderer.on("popup-entry", (_event, entry) => callback(entry));
  },
  onConfirmEntry: (callback) => {
    ipcRenderer.on("confirm-entry", (_event, entry) => callback(entry));
  },
});

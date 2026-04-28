const selection = document.querySelector("#selection");
const previewLayer = document.querySelector("#previewLayer");

let virtualBounds = { x: 0, y: 0, width: window.innerWidth, height: window.innerHeight };
let startPoint = null;
let currentRect = null;

window.screenshotApp.onOverlayReady((payload) => {
  virtualBounds = payload.bounds || payload;
  renderPreview(payload.screens || []);
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    window.screenshotApp.cancelOverlay();
  }
});

window.addEventListener("mousedown", (event) => {
  if (event.button !== 0) return;
  startPoint = { x: event.clientX, y: event.clientY };
  currentRect = { x: event.clientX, y: event.clientY, width: 0, height: 0 };
  drawSelection(currentRect);
});

window.addEventListener("mousemove", (event) => {
  if (!startPoint) return;
  currentRect = {
    x: Math.min(startPoint.x, event.clientX),
    y: Math.min(startPoint.y, event.clientY),
    width: Math.abs(event.clientX - startPoint.x),
    height: Math.abs(event.clientY - startPoint.y),
  };
  drawSelection(currentRect);
});

window.addEventListener("mouseup", (event) => {
  if (event.button !== 0 || !startPoint || !currentRect) return;
  const rect = {
    x: currentRect.x + virtualBounds.x,
    y: currentRect.y + virtualBounds.y,
    width: currentRect.width,
    height: currentRect.height,
  };
  startPoint = null;
  window.screenshotApp.sendOverlaySelection(rect);
});

function drawSelection(rect) {
  selection.style.display = "block";
  selection.style.left = `${rect.x}px`;
  selection.style.top = `${rect.y}px`;
  selection.style.width = `${rect.width}px`;
  selection.style.height = `${rect.height}px`;
}

function renderPreview(screens) {
  previewLayer.innerHTML = "";

  for (const screen of screens) {
    const image = document.createElement("img");
    image.className = "screen-preview";
    image.src = screen.dataUrl;
    image.draggable = false;
    image.style.left = `${screen.x}px`;
    image.style.top = `${screen.y}px`;
    image.style.width = `${screen.width}px`;
    image.style.height = `${screen.height}px`;
    previewLayer.append(image);
  }
}

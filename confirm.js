const confirmImage = document.querySelector("#confirmImage");
const analyzeButton = document.querySelector("#analyzeButton");
const cancelButton = document.querySelector("#cancelButton");

let activeId = "";
let settled = false;

window.screenshotApp.onConfirmEntry((entry) => {
  activeId = entry.id;
  confirmImage.src = entry.screenshotUrl;
});

window.addEventListener("keydown", (event) => {
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
  window.screenshotApp.acceptConfirmation(activeId);
}

function cancel() {
  if (!activeId || settled) return;
  settled = true;
  window.screenshotApp.cancelConfirmation(activeId);
}

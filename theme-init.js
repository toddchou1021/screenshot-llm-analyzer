(function () {
  const theme =
    window.screenshotApp && typeof window.screenshotApp.getInitialTheme === "function"
      ? window.screenshotApp.getInitialTheme()
      : "cyberpunk";
  document.documentElement.dataset.theme = theme === "industrial" ? "industrial" : "cyberpunk";
})();

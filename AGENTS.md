# Repository Guidelines

## Project Structure & Module Organization

This is a Windows-focused Electron app for capturing a selected screen region and sending it to Gemini/Gemma models.

- `main.js` contains the Electron main process, tray behavior, capture flow, and storage.
- `preload.js` exposes the safe renderer bridge.
- `renderer.js`, `index.html`, and `styles.css` drive the main settings/history UI.
- `popup.*` and `confirm.*` support secondary app windows.
- `overlay.js`, `overlay.html`, and `overlay.css` implement region selection.
- `assets/` contains app icons and UI imagery.
- `scripts/afterPack.js` stamps Windows executable metadata.
- `dist/`, `node_modules/`, logs, env files, and shortcut files are local artifacts; do not commit them.

## Build, Test, and Development Commands

- `npm install` installs Electron, Electron Builder, and packaging helpers.
- `npm start` runs the app locally in developer mode.
- `npm run check` performs JavaScript syntax checks across the main app scripts.
- `npm run pack` creates an unpacked Electron build in `dist/`.
- `npm run dist` creates the Windows NSIS installer in `dist/`.

Run `npm run check` before committing JavaScript changes and `npm run dist` before publishing a release installer.

## Coding Style & Naming Conventions

Use CommonJS modules, as configured by `"type": "commonjs"`. Match the existing style: two-space indentation, semicolons, descriptive camelCase names, and uppercase constants for fixed app identifiers or model IDs. Keep window-specific logic in its matching file.

Do not introduce a formatter or linter configuration unless it is applied consistently to the existing codebase.

## Testing Guidelines

There is no dedicated test suite yet; automated coverage is limited to syntax validation:

```powershell
npm run check
```

For behavior changes, manually verify with `npm start`: save settings, trigger `Alt+S`, select a region, confirm or cancel analysis, and check history. For packaging changes, run `npm run dist` and verify the `.exe` under `dist/`.

## Commit & Pull Request Guidelines

Use short, imperative commit messages matching the current history, such as `Fix Windows app identity icon` or `Simplify README for external users`. Keep commits focused on one change.

Pull requests should include a clear summary, tests performed, and screenshots or short recordings for visible UI changes. Mention installer impact when packaging, icons, or app identity changes.

## Security & Configuration Tips

Never commit `.env` files, API keys, generated screenshots, `dist/`, or `node_modules/`. User settings and screenshots are stored under `%APPDATA%\screenshot-llm-analyzer`. Do not hard-code API keys.

## Agent-Specific Instructions

After changing the codebase, review this `AGENTS.md` file before finishing. Update it when the change affects project structure, commands, testing, packaging, security, or contributor workflow. Do not edit it for changes that leave these guidelines accurate.

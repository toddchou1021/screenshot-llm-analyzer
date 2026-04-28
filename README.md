# Screenshot LLM Analyzer

A local Electron app for capturing a selected screen region and sending the screenshot to Gemini for analysis using a saved prompt.

## Features

- Runs as a desktop app with a tray icon.
- Press `Alt+S` to start a region capture.
- Drag to select a screen area.
- Preview the screenshot before sending it.
- Press `Enter` to analyze or `Esc` to cancel.
- Save a Gemini API key and reusable prompts.
- Switch between supported Gemma models.
- View previous analysis results in chronological history.
- Delete history entries and their saved screenshots.

## Requirements

- Windows
- Node.js and npm
- A Gemini API key

## Setup

```powershell
npm install
npm start
```

The app stores settings and screenshots under:

```text
%APPDATA%\local-check-app
```

API keys are saved locally in that settings folder and are not stored in this repository.

## Usage

1. Start the app with `npm start`.
2. Paste your Gemini API key.
3. Choose a model.
4. Enter or select a saved system prompt.
5. Click `Save Settings`.
6. Press `Alt+S`.
7. Drag to select an area.
8. Press `Enter` to analyze the screenshot or `Esc` to cancel.

## Notes

- The app uses a frozen screen preview for selecting a region. This avoids transparent-overlay rendering problems with many video sites.
- DRM-protected video, such as some Netflix playback, may still appear black in screenshots because the operating system or browser blocks app-level capture of protected video frames.
- `node_modules` is intentionally not committed. Recreate it with `npm install`.

## Development

Run syntax checks:

```powershell
npm run check
```

## License

MIT

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
- A Gemini API key

## Getting a free Gemini API key

1. Go to [Google AI Studio](https://aistudio.google.com/).
2. Sign in with your Google account.
3. Open the [API keys page](https://aistudio.google.com/app/apikey).
4. Click **Create API key**.
5. Copy the key and paste it into the **Gemini API key** field in this app.

Google offers a Gemini API free tier in eligible countries with lower rate limits for testing. See the official [Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing) and [rate limits](https://ai.google.dev/gemini-api/docs/quota) pages for the current free-tier details.

As of 2026/04/29, Google provides 1,500 free requests per day for each of the two built-in Gemma 4 models listed below. Google can change free-tier quotas over time, and your active limits can be checked in Google AI Studio.

## Installation

Download the latest Windows installer from the [Releases page](https://github.com/toddchou1021/screenshot-llm-analyzer/releases/latest) (`Screenshot.Analyzer.Setup.1.0.4.exe`).

The app stores settings and screenshots under:

```text
%APPDATA%\screenshot-llm-analyzer
```

API keys are saved locally in that settings folder and are not stored in this repository.

## Developer Mode

To run the project from source:

```powershell
npm install
npm start
```

## Built-in models

The app includes two selectable Gemini API model IDs:

- `gemma-4-31b-it`
- `gemma-4-26b-a4b-it`

`gemma-4-26b-a4b-it` is the recommended default. `gemma-4-31b-it` is also available if you want to compare output quality for a specific screenshot or prompt.

## Usage

1. Start Screenshot Analyzer.
2. Paste your Gemini API key.
3. Choose a model.
4. Enter or select a saved system prompt.
5. Click `Save Settings`.
6. Press `Alt+S`.
7. Drag to select an area.
8. Press `Enter` to analyze the screenshot or `Esc` to cancel.

## Notes

- Screen selection uses a frozen preview of the current display.
- DRM-protected video, such as some Netflix playback, may still appear black in screenshots because the operating system or browser blocks app-level capture of protected video frames.

## License

MIT

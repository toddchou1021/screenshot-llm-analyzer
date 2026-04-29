# Screenshot LLM Analyzer

A local Electron app for capturing a selected screen region and sending the screenshot to Gemini for analysis using a saved prompt.

----------

這是一個本機 Electron 應用程式，可擷取螢幕上的指定區域，並使用儲存好的提示詞將截圖送到 Gemini 進行分析。

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

----------

- 以桌面應用程式執行，並顯示系統匣圖示。
- 按 `Alt+S` 開始選取螢幕區域。
- 拖曳滑鼠選擇要擷取的範圍。
- 送出前可先預覽截圖。
- 按 `Enter` 分析，或按 `Esc` 取消。
- 儲存 Gemini API key 與可重複使用的提示詞。
- 可切換支援的 Gemma 模型。
- 依時間順序查看過去的分析結果。
- 刪除歷史紀錄及其已儲存的截圖。

## Requirements

- Windows
- A Gemini API key

----------

- Windows
- Gemini API key

## Getting a free Gemini API key

1. Go to [Google AI Studio](https://aistudio.google.com/).
2. Sign in with your Google account.
3. Open the [API keys page](https://aistudio.google.com/app/apikey).
4. Click **Create API key**.
5. Copy the key and paste it into the **Gemini API key** field in this app.

Google offers a Gemini API free tier in eligible countries with lower rate limits for testing. See the official [Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing) and [rate limits](https://ai.google.dev/gemini-api/docs/quota) pages for the current free-tier details.

As of 2026/04/29, Google provides 1,500 free requests per day for each of the two built-in Gemma 4 models listed below. Google can change free-tier quotas over time, and your active limits can be checked in Google AI Studio.

----------

1. 前往 [Google AI Studio](https://aistudio.google.com/)。
2. 使用你的 Google 帳號登入。
3. 開啟 [API keys 頁面](https://aistudio.google.com/app/apikey)。
4. 點選 **Create API key**。
5. 複製 API key，並貼到本應用程式的 **Gemini API key** 欄位。

Google 在符合資格的國家或地區提供 Gemini API 免費方案，適合測試使用，但速率限制較低。請參考官方 [Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing) 與 [rate limits](https://ai.google.dev/gemini-api/docs/quota) 頁面確認目前的免費方案細節。

截至 2026/04/29，Google 針對下方兩個內建 Gemma 4 模型各提供每日 1,500 次免費請求。Google 可能隨時調整免費額度，你可以在 Google AI Studio 查看目前帳號的實際限制。

## Installation

Download the latest Windows installer from the [Releases page](https://github.com/toddchou1021/screenshot-llm-analyzer/releases/latest) (`Screenshot.Analyzer.Setup.1.0.4.exe`).

The app stores settings and screenshots under:

```text
%APPDATA%\screenshot-llm-analyzer
```

API keys are saved locally in that settings folder and are not stored in this repository.

----------

請從 [Releases page](https://github.com/toddchou1021/screenshot-llm-analyzer/releases/latest) 下載最新的 Windows 安裝檔（`Screenshot.Analyzer.Setup.1.0.4.exe`）。

應用程式會將設定與截圖儲存在：

```text
%APPDATA%\screenshot-llm-analyzer
```

API key 只會儲存在本機設定資料夾中，不會存放在此 GitHub repository。

## Developer Mode

To run the project from source:

```powershell
npm install
npm start
```

----------

若要從原始碼執行專案：

```powershell
npm install
npm start
```

## Built-in models

The app includes two selectable Gemini API model IDs:

- `gemma-4-31b-it`
- `gemma-4-26b-a4b-it`

`gemma-4-26b-a4b-it` is the recommended default. `gemma-4-31b-it` is also available if you want to compare output quality for a specific screenshot or prompt.

----------

本應用程式內建兩個可選的 Gemini API model ID：

- `gemma-4-31b-it`
- `gemma-4-26b-a4b-it`

建議預設使用 `gemma-4-26b-a4b-it`。如果你想針對特定截圖或提示詞比較輸出品質，也可以選擇 `gemma-4-31b-it`。

## Usage

1. Start Screenshot Analyzer.
2. Paste your Gemini API key.
3. Choose a model.
4. Enter or select a saved system prompt.
5. Click `Save Settings`.
6. Press `Alt+S`.
7. Drag to select an area.
8. Press `Enter` to analyze the screenshot or `Esc` to cancel.

----------

1. 啟動 Screenshot Analyzer。
2. 貼上你的 Gemini API key。
3. 選擇模型。
4. 輸入或選擇已儲存的 system prompt。
5. 點選 `Save Settings`。
6. 按 `Alt+S`。
7. 拖曳選取要分析的區域。
8. 按 `Enter` 分析截圖，或按 `Esc` 取消。

## Notes

- Screen selection uses a frozen preview of the current display.
- DRM-protected video, such as some Netflix playback, may still appear black in screenshots because the operating system or browser blocks app-level capture of protected video frames.

----------

- 螢幕選取會使用目前畫面的凍結預覽。
- DRM 保護的影片，例如部分 Netflix 播放內容，仍可能在截圖中顯示為黑畫面，因為作業系統或瀏覽器會阻擋應用程式層級擷取受保護的影像畫面。

## License

MIT

----------

MIT

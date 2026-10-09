# Google Docs Always Word Count (Chrome Extension)

A lightweight Google Chrome extension that automatically enables Google Docs' native live word count view on **every** document you open.

---

## The Problem
In Google Docs, the **"Display word count while typing"** feature is only saved on a per-document basis. Whenever you create a new document (e.g., via `docs.new`) or open someone else's document, the live word count view is turned off by default. Google provides no global or account-level setting to keep it turned on.

## The Solution
This extension runs automatically whenever you open any Google Doc:
1. It detects if the native floating word count widget is already visible in the bottom-left corner.
2. If not visible, it automatically and silently activates the native **"Display word count while typing"** option.
3. Because it activates Google Docs' built-in counter, it is **100% accurate**, tracks typing in real-time on Google's canvas engine, and lets you click the counter to switch between words, pages, and characters.

---

## Installation Guide (Chrome Developer Mode)

1. Open Google Chrome.
2. Navigate to:
   ```
   chrome://extensions
   ```
3. In the top-right corner, toggle **Developer mode** to **ON**.
4. Click the **Load unpacked** button in the top-left corner.
5. In the file picker, select this directory:
   ```
   /home/akclark/source/repos/GDocWordCount
   ```
6. The extension is now installed! You will see **Google Docs Always Word Count** in your extensions toolbar.

---

## How to Test and Verify

1. Open a new document in Chrome by typing [`docs.new`](https://docs.new) in your address bar.
2. When the document loads, the extension will automatically enable the word count view.
3. Notice the persistent word count pill appear in the bottom-left corner of the document editor showing `0 words` (or current count).
4. Type some text into the document and watch the counter update in real-time.
5. Click on the extension icon in Chrome's toolbar to see the live status for the active document or toggle preferences.

---

## Features

- **Automatic Activation:** Ensures the word count is enabled on every new or existing Google Doc.
- **Stealth Mode (Default):** Silently toggles the setting in the background without flickering the dialog box or disturbing your workflow.
- **Zero Typing Interruption:** Restores your cursor and editor focus immediately.
- **Smart Session Memory:** Only runs once per document load. If you intentionally hide the word count during an editing session, the extension respects your choice.
- **Extension Popup:** Shows live status for the current document, lets you manually trigger activation, and provides a quick shortcut to create a new document (`docs.new`).
- **Options Page:** Configure auto-enable, stealth mode, and optional toast notifications.
- **100% Local & Private:** No external network requests, no analytics, no tracking. Runs entirely inside your browser.

---

## File Structure

```
GDocWordCount/
├── manifest.json       # Chrome Manifest V3 configuration
├── background.js       # Background service worker (badge & defaults)
├── content.js          # Content script automating the word count toggle
├── content.css         # Stealth mode styles and notification toast
├── icons/              # Extension icons (16px, 32px, 48px, 128px)
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
├── popup/              # Toolbar popup interface
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
├── options/            # Options & documentation page
│   ├── options.html
│   ├── options.css
│   └── options.js
├── PRIVACY.md          # Privacy Policy
└── README.md           # Documentation & installation instructions
```

---

## Privacy & Security

This extension is 100% private, local, and open-source:
- **No Document Reading:** It does not read, inspect, or copy your document contents.
- **No Analytics or Telemetry:** Zero tracking scripts, ads, or cookies.
- **No Remote Network Requests:** Runs strictly inside your browser session.
- See our full [Privacy Policy](PRIVACY.md).

---

## Troubleshooting

- **The counter didn't appear immediately:** Google Docs takes 1–2 seconds to load its menubar on slow connections. The extension retries up to 8 seconds after page load. You can also click **"Enable Word Count Now"** in the extension popup.
- **View-only / Read-only documents:** On documents where you only have "View" permissions, Google Docs disables the Tools menu settings persistence. The extension safely skips read-only documents without throwing errors.
- **Manual Shortcut:** You can always open Google Docs' native word count dialog manually at any time by pressing <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>C</kbd> (Windows/Linux/ChromeOS) or <kbd>Cmd</kbd> + <kbd>Shift</kbd> + <kbd>C</kbd> (Mac).

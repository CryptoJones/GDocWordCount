# Privacy Policy for Google Docs Always Word Count

**Last updated:** October 9, 2026

## 1. Overview
**Google Docs Always Word Count** ("the Extension") is committed to protecting your privacy. This extension is designed to be 100% private, local, and transparent. It runs entirely inside your browser and does **not** collect, store, transmit, or sell any personal data or document content.

## 2. Information Collection and Usage
- **No Document Content Collection:** The Extension does not read, copy, analyze, or transmit any text or content from your Google Documents.
- **No Personal Data Collection:** The Extension does not collect personal information (such as your name, email address, IP address, browsing history, or Google account information).
- **No Telemetry or Analytics:** The Extension contains no analytics tracking, no performance metrics reporting, no cookies, and no third-party tracking scripts.
- **No External Network Requests:** The Extension does not make any external network or HTTP requests to remote servers. All operations execute strictly locally within your browser.

## 3. Permissions Used
The Extension requests only the minimum permissions necessary to automate the native Google Docs word count display:

- **`storage`**: Used solely to save your local extension preferences (such as toggling auto-enable, stealth mode, or notification toasts) via `chrome.storage.sync`. These settings remain within your Chrome profile and are never transmitted to any external server.
- **`activeTab`**: Used only when clicking the extension toolbar icon or popup button to interact with your currently open Google Doc tab.
- **Host Permission (`*://docs.google.com/document/*`)**: Required so the extension's content script can load on Google Docs pages to detect if the native word count pill is active and toggle it on if hidden. It does not execute on any other website.

## 4. Remote Code
The Extension does **not** use or execute remote code. All JavaScript and CSS are packaged statically within the extension bundle in strict compliance with Chrome Web Store Manifest V3 policies.

## 5. Third-Party Sharing
Because no information is collected, no information is ever shared with, sold to, or disclosed to third parties.

## 6. Open Source
The source code for this extension is completely open-source and publicly auditable on GitHub:
[https://github.com/CryptoJones/GDocWordCount](https://github.com/CryptoJones/GDocWordCount)

## 7. Contact
If you have any questions or feedback regarding this privacy policy, please contact:
- **Developer:** Aaron Kingsley Clark
- **Email:** [aaron.kingsley.clark@gmail.com](mailto:aaron.kingsley.clark@gmail.com)
- **GitHub:** [https://github.com/CryptoJones/GDocWordCount](https://github.com/CryptoJones/GDocWordCount)

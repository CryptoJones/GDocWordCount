/**
 * Google Docs Always Word Count - Content Script
 * Automatically enables the native "Display word count while typing" view on every Google Doc.
 */

(function () {
  'use strict';

  // Prevent multiple injections
  if (window.__gdoc_always_word_count_injected__) return;
  window.__gdoc_always_word_count_injected__ = true;

  // Settings with defaults
  let settings = {
    autoEnable: true,
    stealthMode: true,
    showNotification: false,
    preferredMetric: 'words' // 'words', 'pages', 'characters', 'characters_no_spaces'
  };

  // State tracking
  let currentDocId = null;
  let isAutomating = false;
  const processedDocs = new Set();

  /**
   * Load user settings from chrome.storage
   */
  async function loadSettings() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
        const stored = await chrome.storage.sync.get([
          'autoEnable',
          'stealthMode',
          'showNotification',
          'preferredMetric'
        ]);
        settings = { ...settings, ...stored };
      }
    } catch (e) {
      console.warn('[GDocWordCount] Could not load sync settings, using defaults', e);
    }
  }

  /**
   * Extract Google Doc ID from the URL
   */
  function getDocId() {
    const match = window.location.pathname.match(/\/document\/(?:u\/\d+\/)?d\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  }

  /**
   * Helper: check if a DOM element is visible
   */
  function isVisible(el) {
    if (!el) return false;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
      return false;
    }
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  /**
   * Helper: simulate a full user mouse/pointer click sequence
   */
  function simulateClick(el) {
    if (!el) return;
    const opts = { bubbles: true, cancelable: true, view: window };
    el.dispatchEvent(new PointerEvent('pointerdown', opts));
    el.dispatchEvent(new MouseEvent('mousedown', opts));
    el.dispatchEvent(new PointerEvent('pointerup', opts));
    el.dispatchEvent(new MouseEvent('mouseup', opts));
    el.dispatchEvent(new MouseEvent('click', opts));
  }

  /**
   * Helper: simulate keyboard shortcut (Ctrl+Shift+C or Cmd+Shift+C)
   */
  function dispatchWordCountShortcut() {
    const isMac = navigator.platform.toUpperCase().includes('MAC');
    const eventInit = {
      key: 'C',
      code: 'KeyC',
      keyCode: 67,
      which: 67,
      ctrlKey: !isMac,
      metaKey: isMac,
      shiftKey: true,
      altKey: false,
      bubbles: true,
      cancelable: true
    };

    const targets = [
      document.activeElement,
      document.querySelector('.docs-texteventtarget-iframe')?.contentDocument,
      document.querySelector('.docs-texteventtarget-iframe'),
      document.querySelector('.kix-appview-editor'),
      document.body,
      document,
      window
    ].filter(Boolean);

    for (const target of targets) {
      try {
        target.dispatchEvent(new KeyboardEvent('keydown', eventInit));
        target.dispatchEvent(new KeyboardEvent('keypress', eventInit));
        target.dispatchEvent(new KeyboardEvent('keyup', eventInit));
      } catch (err) {}
    }
  }

  /**
   * Check if the word count floating pill is already visible in the bottom-left area
   */
  function isWordCountAlreadyVisible() {
    // 1. Check known class names and attributes
    const candidateSelectors = [
      '.docs-wordcount-bubble',
      '.docs-word-count-bubble',
      '.kix-wordcount-bubble',
      '.kix-word-count-bubble',
      '[aria-label*="word count" i]',
      '[aria-label*="display word count" i]',
      '[class*="wordcount" i]',
      '[class*="word-count" i]',
      '[id*="wordcount" i]',
      '[id*="word-count" i]'
    ];

    for (const sel of candidateSelectors) {
      const elements = document.querySelectorAll(sel);
      for (const el of elements) {
        if (isVisible(el)) {
          return true;
        }
      }
    }

    // 2. Positional check: Google Docs places the pill in the bottom-left corner
    const windowH = window.innerHeight;
    const allDivs = document.querySelectorAll('div, span, button');
    for (const el of allDivs) {
      const rect = el.getBoundingClientRect();
      // Must be near bottom-left: left < 320px, bottom within 160px of screen bottom
      if (
        rect.width > 20 &&
        rect.height > 15 &&
        rect.left >= 0 &&
        rect.left <= 320 &&
        rect.bottom >= windowH - 160 &&
        rect.bottom <= windowH
      ) {
        const text = (el.innerText || el.textContent || '').trim().toLowerCase();
        // Check for patterns like "123 words", "0 words", "4 pages", "1,200 characters"
        if (/\b\d[\d,]*\s*(words?|characters?|chars?|pages?)\b/i.test(text)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Locate the "Tools" menu in Google Docs menubar
   */
  function findToolsMenu() {
    // Direct ID check
    const toolsById = document.getElementById('docs-tools-menu');
    if (toolsById && isVisible(toolsById)) return toolsById;

    // Menubar query check
    const menubar = document.getElementById('docs-menubar') || document.querySelector('.docs-menubar');
    if (menubar) {
      const buttons = menubar.querySelectorAll('.menu-button, [role="menuitem"], .goog-control');
      for (const btn of buttons) {
        const text = (btn.textContent || '').trim().toLowerCase();
        const label = (btn.getAttribute('aria-label') || '').trim().toLowerCase();
        if (
          text === 'tools' ||
          label === 'tools' ||
          text === 'herramientas' ||
          text === 'outils' ||
          text === 'werkzeuge' ||
          text === 'strumenti' ||
          text === 'ferramentas' ||
          text === 'инструменты' ||
          text === '工具' ||
          text === 'ツール'
        ) {
          return btn;
        }
      }
    }

    return document.querySelector('#docs-menubar .menu-button:nth-child(6)') || null;
  }

  /**
   * Locate the "Word count" menu item inside an opened Tools dropdown menu
   */
  function findWordCountMenuItem() {
    const items = document.querySelectorAll('.goog-menuitem, [role="menuitem"], .docs-material-menu-item');
    const knownNames = [
      'word count',
      'recuento de palabras',
      'nombre de mots',
      'wörter zählen',
      'conteggio parole',
      'contagem de palavras',
      'статистика',
      '字数',
      '文字カウント',
      '단어 수'
    ];

    for (const item of items) {
      if (!isVisible(item)) continue;
      const text = (item.textContent || '').trim().toLowerCase();

      // Check for known name translations
      if (knownNames.some(name => text.includes(name))) {
        return item;
      }

      // Check for accelerator / keyboard shortcut indicators
      if (
        text.includes('ctrl+shift+c') ||
        text.includes('cmd+shift+c') ||
        text.includes('shift+c') ||
        text.includes('⇧⌘c') ||
        text.includes('shift + c')
      ) {
        return item;
      }
    }

    return null;
  }

  /**
   * Locate the active Word Count modal dialog
   */
  function findWordCountDialog() {
    const dialogs = document.querySelectorAll('.modal-dialog, [role="dialog"], .docs-material-dialog');
    for (const dialog of dialogs) {
      if (!isVisible(dialog)) continue;
      const text = (dialog.textContent || '').toLowerCase();
      if (
        text.includes('word count') ||
        text.includes('display word count') ||
        text.includes('while typing') ||
        text.includes('recuento de palabras') ||
        text.includes('nombre de mots') ||
        text.includes('wörter zählen')
      ) {
        return dialog;
      }
    }
    return null;
  }

  /**
   * Locate the "Display word count while typing" checkbox inside the dialog
   */
  function findDialogCheckbox(dialog) {
    // 1. Native input[type="checkbox"]
    const inputs = dialog.querySelectorAll('input[type="checkbox"]');
    if (inputs.length === 1) return inputs[0];
    if (inputs.length > 1) {
      for (const input of inputs) {
        const parentText = (input.closest('label, tr, div')?.textContent || '').toLowerCase();
        if (parentText.includes('display') || parentText.includes('while typing') || parentText.includes('word count')) {
          return input;
        }
      }
      return inputs[0];
    }

    // 2. ARIA or Closure checkboxes
    const customBoxes = dialog.querySelectorAll('[role="checkbox"], .goog-checkbox, .docs-material-checkbox');
    if (customBoxes.length > 0) {
      for (const box of customBoxes) {
        const parentText = (box.closest('label, tr, div')?.textContent || '').toLowerCase();
        if (parentText.includes('display') || parentText.includes('while typing') || parentText.includes('word count')) {
          return box;
        }
      }
      return customBoxes[0];
    }

    // 3. Clickable label text
    const labels = dialog.querySelectorAll('label, span, div');
    for (const lbl of labels) {
      const text = (lbl.textContent || '').trim().toLowerCase();
      if (text.includes('display word count while typing') || text.includes('while typing')) {
        return lbl;
      }
    }

    return null;
  }

  /**
   * Determine if the checkbox is currently checked
   */
  function isCheckboxChecked(el) {
    if (!el) return false;
    if (el.tagName === 'INPUT') return el.checked;
    if (el.getAttribute('aria-checked') === 'true') return true;
    if (el.classList.contains('goog-checkbox-checked') || el.classList.contains('checked')) return true;

    // Check inner input if element is a wrapper
    const innerInput = el.querySelector('input[type="checkbox"]');
    if (innerInput) return innerInput.checked;

    return false;
  }

  /**
   * Locate the "OK" button inside the dialog
   */
  function findDialogOkButton(dialog) {
    // Named button
    const okNamed = dialog.querySelector('button[name="ok"], button[name="OK"]');
    if (okNamed && isVisible(okNamed)) return okNamed;

    // Buttons inside .modal-dialog-buttons
    const buttonContainers = dialog.querySelectorAll('.modal-dialog-buttons, .docs-material-dialog-buttons');
    for (const container of buttonContainers) {
      const btns = Array.from(container.querySelectorAll('button, div[role="button"]')).filter(isVisible);
      for (const btn of btns) {
        const text = (btn.textContent || '').trim().toLowerCase();
        if (['ok', 'done', 'aceptar', 'valider', '确定', '確認'].includes(text)) {
          return btn;
        }
      }
      if (btns.length > 0) {
        // In Google Docs Closure dialogs, the OK button is typically the first or default button
        return btns[0];
      }
    }

    // General fallback for all buttons in dialog
    const allButtons = Array.from(dialog.querySelectorAll('button, div[role="button"]')).filter(isVisible);
    for (const btn of allButtons) {
      const text = (btn.textContent || '').trim().toLowerCase();
      if (['ok', 'done', 'aceptar', 'valider', '确定', '確認'].includes(text)) {
        return btn;
      }
    }

    return null;
  }

  /**
   * Show a subtle toast notification when word count is auto-enabled
   */
  function showToast(message) {
    const existing = document.querySelector('.gdoc-wc-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'gdoc-wc-toast';
    toast.innerHTML = `<span class="gdoc-wc-toast-icon"></span><span>${message}</span>`;
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.add('show');
    });

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 2800);
  }

  /**
   * Close the Tools menu if it remained open
   */
  function closeOpenMenu() {
    const escEvent = new KeyboardEvent('keydown', {
      key: 'Escape',
      code: 'Escape',
      keyCode: 27,
      which: 27,
      bubbles: true,
      cancelable: true
    });
    document.dispatchEvent(escEvent);
  }

  /**
   * Main routine to turn on the Word Count view
   */
  async function enableWordCount(force = false) {
    if (isAutomating) return false;

    const docId = getDocId();
    if (!docId && !force) return false;

    // Check if already visible
    if (!force && isWordCountAlreadyVisible()) {
      if (docId) processedDocs.add(docId);
      return true;
    }

    // Check if previously handled in this session
    if (!force && docId && processedDocs.has(docId)) {
      return true;
    }

    isAutomating = true;
    const prevActiveElement = document.activeElement;

    // Apply stealth styling if enabled
    if (settings.stealthMode) {
      document.documentElement.classList.add('gdoc-wc-automating');
    }

    // Auto-cleanup timer to ensure stealth class is never left stuck
    const cleanupTimer = setTimeout(() => {
      document.documentElement.classList.remove('gdoc-wc-automating');
    }, 1500);

    try {
      // Step 1: Open dialog using Tools Menu (Strategy A) or Shortcut (Strategy B)
      let dialog = findWordCountDialog();

      if (!dialog) {
        const toolsMenu = findToolsMenu();
        if (toolsMenu) {
          simulateClick(toolsMenu);
          await new Promise(r => setTimeout(r, 80));

          const wordCountItem = findWordCountMenuItem();
          if (wordCountItem) {
            simulateClick(wordCountItem);
          } else {
            // Close tools menu and try shortcut
            closeOpenMenu();
            dispatchWordCountShortcut();
          }
        } else {
          dispatchWordCountShortcut();
        }

        // Wait up to 500ms for dialog to appear
        for (let i = 0; i < 10; i++) {
          await new Promise(r => setTimeout(r, 50));
          dialog = findWordCountDialog();
          if (dialog) break;
        }
      }

      // If dialog still not found, try keyboard shortcut directly
      if (!dialog) {
        dispatchWordCountShortcut();
        for (let i = 0; i < 10; i++) {
          await new Promise(r => setTimeout(r, 50));
          dialog = findWordCountDialog();
          if (dialog) break;
        }
      }

      // Step 2: Handle the dialog if opened
      if (dialog) {
        const checkbox = findDialogCheckbox(dialog);
        if (checkbox) {
          const isChecked = isCheckboxChecked(checkbox);
          if (!isChecked) {
            simulateClick(checkbox);
            if (checkbox.tagName === 'INPUT' && !checkbox.checked) {
              checkbox.checked = true;
              checkbox.dispatchEvent(new Event('change', { bubbles: true }));
            }
            await new Promise(r => setTimeout(r, 40));
          }
        }

        const okBtn = findDialogOkButton(dialog);
        if (okBtn) {
          simulateClick(okBtn);
        } else {
          // Fallback: press Enter to submit modal dialog
          const enterEvent = new KeyboardEvent('keydown', {
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            which: 13,
            bubbles: true,
            cancelable: true
          });
          dialog.dispatchEvent(enterEvent);
        }

        await new Promise(r => setTimeout(r, 120));

        if (docId) {
          processedDocs.add(docId);
          try {
            sessionStorage.setItem('gdoc_wc_handled_' + docId, 'true');
          } catch (e) {}
        }

        if (settings.showNotification) {
          showToast('Word count view enabled');
        }

        return true;
      } else {
        // Document might be view-only or still loading
        console.info('[GDocWordCount] Word count dialog not accessible yet.');
        return false;
      }
    } catch (err) {
      console.error('[GDocWordCount] Error enabling word count:', err);
      return false;
    } finally {
      clearTimeout(cleanupTimer);
      document.documentElement.classList.remove('gdoc-wc-automating');
      isAutomating = false;

      // Restore focus to editor element
      if (prevActiveElement && typeof prevActiveElement.focus === 'function') {
        try {
          prevActiveElement.focus();
        } catch (e) {}
      }
    }
  }

  /**
   * Monitor document readiness and auto-enable
   */
  async function initForCurrentDocument() {
    await loadSettings();
    if (!settings.autoEnable) return;

    const docId = getDocId();
    if (!docId) return;

    // Check if session storage already has this doc handled
    try {
      if (sessionStorage.getItem('gdoc_wc_handled_' + docId) === 'true') {
        processedDocs.add(docId);
        if (isWordCountAlreadyVisible()) return;
      }
    } catch (e) {}

    currentDocId = docId;

    // Polling until Google Docs UI is ready (menubar or editor loaded)
    let attempts = 0;
    const maxAttempts = 25; // up to ~8 seconds
    const interval = 320;

    const pollTimer = setInterval(async () => {
      attempts++;

      // If document changed during polling, abort this poll
      if (getDocId() !== docId) {
        clearInterval(pollTimer);
        return;
      }

      // Check if already visible
      if (isWordCountAlreadyVisible()) {
        processedDocs.add(docId);
        clearInterval(pollTimer);
        return;
      }

      // Check if Google Docs UI is ready
      const toolsMenu = findToolsMenu();
      const editorReady = document.querySelector('.kix-appview-editor') ||
                          document.querySelector('#docs-editor') ||
                          document.querySelector('.docs-texteventtarget-iframe') ||
                          document.querySelector('canvas');

      if (toolsMenu || editorReady || attempts > 6) {
        clearInterval(pollTimer);
        // Small delay to ensure event listeners are bound
        await new Promise(r => setTimeout(r, 400));
        const success = await enableWordCount(false);
        if (!success && attempts < maxAttempts) {
          // Retry once more after brief delay
          setTimeout(() => enableWordCount(false), 1200);
        }
      } else if (attempts >= maxAttempts) {
        clearInterval(pollTimer);
      }
    }, interval);
  }

  /**
   * Handle SPA URL changes (when navigating between docs in the same tab)
   */
  let lastUrl = window.location.href;
  setInterval(() => {
    const currentUrl = window.location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
      const newDocId = getDocId();
      if (newDocId && newDocId !== currentDocId) {
        currentDocId = newDocId;
        initForCurrentDocument();
      }
    }
  }, 1000);

  /**
   * Listen for messages from popup or background script
   */
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'GET_STATUS') {
        const isDoc = !!getDocId();
        const visible = isWordCountAlreadyVisible();
        sendResponse({
          isDoc,
          docId: getDocId(),
          wordCountVisible: visible,
          settings
        });
        return true;
      }

      if (request.action === 'TRIGGER_ENABLE') {
        enableWordCount(true).then(success => {
          sendResponse({
            success,
            wordCountVisible: isWordCountAlreadyVisible()
          });
        });
        return true; // Keep message channel open for async response
      }

      if (request.action === 'SETTINGS_UPDATED') {
        loadSettings().then(() => {
          sendResponse({ status: 'ok', settings });
        });
        return true;
      }
    });
  }

  // Start initialization
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initForCurrentDocument);
  } else {
    initForCurrentDocument();
  }
})();

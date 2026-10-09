/**
 * Google Docs Always Word Count - Popup Script
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Elements
  const statusDot = document.getElementById('status-dot');
  const statusTitle = document.getElementById('status-title');
  const statusDesc = document.getElementById('status-desc');
  const btnTrigger = document.getElementById('btn-trigger');
  const btnTriggerText = document.getElementById('btn-trigger-text');
  const btnOpenDoc = document.getElementById('btn-open-doc');

  const toggleAuto = document.getElementById('toggle-auto');
  const toggleStealth = document.getElementById('toggle-stealth');
  const toggleToast = document.getElementById('toggle-toast');
  const linkOptions = document.getElementById('link-options');

  let currentTab = null;

  // 1. Load saved settings into toggles
  try {
    const settings = await chrome.storage.sync.get({
      autoEnable: true,
      stealthMode: true,
      showNotification: false
    });
    toggleAuto.checked = !!settings.autoEnable;
    toggleStealth.checked = !!settings.stealthMode;
    toggleToast.checked = !!settings.showNotification;
  } catch (err) {
    console.warn('[Popup] Error reading storage:', err);
  }

  // 2. Add event listeners for toggles
  async function updateSetting(key, val) {
    await chrome.storage.sync.set({ [key]: val });
    if (currentTab && currentTab.id) {
      chrome.tabs.sendMessage(currentTab.id, { action: 'SETTINGS_UPDATED' }).catch(() => {});
    }
  }

  toggleAuto.addEventListener('change', () => updateSetting('autoEnable', toggleAuto.checked));
  toggleStealth.addEventListener('change', () => updateSetting('stealthMode', toggleStealth.checked));
  toggleToast.addEventListener('change', () => updateSetting('showNotification', toggleToast.checked));

  // 3. Open Options link
  linkOptions.addEventListener('click', (e) => {
    e.preventDefault();
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open(chrome.runtime.getURL('options/options.html'));
    }
  });

  // 4. Open new doc button
  btnOpenDoc.addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://docs.new' });
    window.close();
  });

  // 5. Query active tab
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    currentTab = tabs[0];

    if (!currentTab || !currentTab.url) {
      showNotDocState();
      return;
    }

    const isGoogleDoc = currentTab.url.includes('docs.google.com/document/');

    if (isGoogleDoc) {
      // Query content script for status
      chrome.tabs.sendMessage(currentTab.id, { action: 'GET_STATUS' }, (response) => {
        if (chrome.runtime.lastError || !response) {
          // Content script not loaded or tab loading
          statusDot.className = 'status-indicator-dot inactive';
          statusTitle.textContent = 'Google Doc Detected';
          statusDesc.textContent = 'Tab is loading or refreshing. Click below to activate.';
          btnTrigger.style.display = 'flex';
          btnTriggerText.textContent = 'Enable Word Count';
        } else {
          updateDocUI(response);
        }
      });
    } else {
      showNotDocState();
    }
  } catch (err) {
    console.error('[Popup] Error determining tab status:', err);
    showNotDocState();
  }

  function updateDocUI(status) {
    if (status.wordCountVisible) {
      statusDot.className = 'status-indicator-dot active';
      statusTitle.textContent = 'Word Count Active';
      statusDesc.textContent = 'Live word count view is currently displayed on this document.';
      btnTrigger.style.display = 'flex';
      btnTriggerText.textContent = 'Re-check Word Count';
    } else {
      statusDot.className = 'status-indicator-dot inactive';
      statusTitle.textContent = 'Word Count Inactive';
      statusDesc.textContent = 'Word count view is currently hidden on this document.';
      btnTrigger.style.display = 'flex';
      btnTriggerText.textContent = 'Enable Word Count Now';
    }
  }

  function showNotDocState() {
    statusDot.className = 'status-indicator-dot neutral';
    statusTitle.textContent = 'No Active Google Doc';
    statusDesc.textContent = 'Open any Google Docs document to see live counter controls.';
    btnTrigger.style.display = 'none';
    btnOpenDoc.style.display = 'flex';
  }

  // 6. Manual trigger button action
  btnTrigger.addEventListener('click', () => {
    if (!currentTab) return;

    btnTrigger.disabled = true;
    btnTriggerText.textContent = 'Enabling...';

    chrome.tabs.sendMessage(currentTab.id, { action: 'TRIGGER_ENABLE' }, (res) => {
      btnTrigger.disabled = false;
      if (chrome.runtime.lastError || !res) {
        statusDesc.textContent = 'Could not communicate with tab. Try refreshing the Google Doc.';
        btnTriggerText.textContent = 'Retry';
      } else {
        if (res.wordCountVisible || res.success) {
          statusDot.className = 'status-indicator-dot active';
          statusTitle.textContent = 'Word Count Active';
          statusDesc.textContent = 'Successfully enabled word count display!';
          btnTriggerText.textContent = 'Active ✓';
          setTimeout(() => {
            btnTriggerText.textContent = 'Re-check Word Count';
          }, 2000);
        } else {
          statusDesc.textContent = 'Could not enable automatically (document may be read-only).';
          btnTriggerText.textContent = 'Try Again';
        }
      }
    });
  });
});

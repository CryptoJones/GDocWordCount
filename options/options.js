/**
 * Google Docs Always Word Count - Options Script
 */

document.addEventListener('DOMContentLoaded', async () => {
  const optAutoEnable = document.getElementById('opt-auto-enable');
  const optStealthMode = document.getElementById('opt-stealth-mode');
  const optNotifications = document.getElementById('opt-notifications');
  const saveStatus = document.getElementById('save-status');

  let statusTimeout = null;

  // Load existing settings
  try {
    const settings = await chrome.storage.sync.get({
      autoEnable: true,
      stealthMode: true,
      showNotification: false
    });

    optAutoEnable.checked = !!settings.autoEnable;
    optStealthMode.checked = !!settings.stealthMode;
    optNotifications.checked = !!settings.showNotification;
  } catch (err) {
    console.warn('[Options] Error loading settings:', err);
  }

  // Save settings when changed
  async function saveSettings() {
    const settings = {
      autoEnable: optAutoEnable.checked,
      stealthMode: optStealthMode.checked,
      showNotification: optNotifications.checked
    };

    try {
      await chrome.storage.sync.set(settings);

      // Show temporary confirmation
      saveStatus.style.display = 'block';
      clearTimeout(statusTimeout);
      statusTimeout = setTimeout(() => {
        saveStatus.style.display = 'none';
      }, 2500);

      // Notify all Google Docs tabs of the updated settings
      const tabs = await chrome.tabs.query({ url: '*://docs.google.com/document/*' });
      for (const tab of tabs) {
        chrome.tabs.sendMessage(tab.id, { action: 'SETTINGS_UPDATED' }).catch(() => {});
      }
    } catch (err) {
      console.error('[Options] Error saving settings:', err);
    }
  }

  optAutoEnable.addEventListener('change', saveSettings);
  optStealthMode.addEventListener('change', saveSettings);
  optNotifications.addEventListener('change', saveSettings);
});

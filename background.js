/**
 * Google Docs Always Word Count - Background Service Worker
 */

chrome.runtime.onInstalled.addListener(async (details) => {
  // Set default configuration on first install or update
  const defaults = {
    autoEnable: true,
    stealthMode: true,
    showNotification: false,
    preferredMetric: 'words'
  };

  try {
    const existing = await chrome.storage.sync.get(Object.keys(defaults));
    const toSet = {};
    for (const [key, value] of Object.entries(defaults)) {
      if (existing[key] === undefined) {
        toSet[key] = value;
      }
    }
    if (Object.keys(toSet).length > 0) {
      await chrome.storage.sync.set(toSet);
    }
  } catch (err) {
    console.error('[GDocWordCount] Error initializing default storage:', err);
  }
});

// Update badge or title when active on a Google Docs tab
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    if (tab.url.includes('docs.google.com/document/')) {
      chrome.action.setBadgeText({ tabId, text: 'ON' });
      chrome.action.setBadgeBackgroundColor({ tabId, color: '#4285F4' });
      chrome.action.setTitle({ tabId, title: 'Google Docs Always Word Count: Active' });
    } else {
      chrome.action.setBadgeText({ tabId, text: '' });
      chrome.action.setTitle({ tabId, title: 'Google Docs Always Word Count' });
    }
  }
});

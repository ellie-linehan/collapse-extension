// Background service worker for Collapse extension

// Chrome tab group colors (as per Chrome's palette)
const GROUP_COLORS = [
  'grey', 'blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan', 'orange'
];

// Cache for domain to color mapping
const domainColorCache = new Map();

// Get domain from URL
function getDomain(url) {
  try {
    const domain = new URL(url).hostname.replace('www.', '');
    return domain;
  } catch (e) {
    return '';
  }
}

// Simple hash function to map domain to a color index
function getColorIndex(domain) {
  if (!domain) return 0; // Default to grey
  
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < domain.length; i++) {
    hash = (hash << 5) - hash + domain.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  
  return Math.abs(hash) % GROUP_COLORS.length;
}

// Get color for domain (cached)
function getColorForDomain(domain) {
  if (domainColorCache.has(domain)) {
    return domainColorCache.get(domain);
  }
  
  const colorIndex = getColorIndex(domain);
  const color = GROUP_COLORS[colorIndex];
  domainColorCache.set(domain, color);
  return color;
}

// Save window and tab state for undo
async function saveStateForUndo({ scope, windowId } = {}) {
  const timestamp = Date.now();
 
  if (scope === 'window') {
    const tabs = await chrome.tabs.query({ windowId });
    const groups = await chrome.tabGroups.query({ windowId });

    const state = {
      timestamp,
      scope: 'window',
      windowId,
      tabs: tabs.map(tab => ({
        id: tab.id,
        url: tab.url,
        pinned: tab.pinned,
        index: tab.index,
        groupId: tab.groupId,
        active: tab.active
      })),
      groups: groups.map(group => ({
        id: group.id,
        title: group.title,
        color: group.color,
        collapsed: group.collapsed
      }))
    };

    await chrome.storage.local.set({ lastState: state });
    return state;
  }

  const windows = await chrome.windows.getAll({ populate: true });
  const state = {
    timestamp,
    scope: 'all',
    windows: await Promise.all(windows.map(async window => ({
      id: window.id,
      focused: window.focused,
      tabs: window.tabs?.map(tab => ({
        id: tab.id,
        url: tab.url,
        pinned: tab.pinned,
        index: tab.index,
        windowId: tab.windowId,
        groupId: tab.groupId,
        active: tab.active
      })) || []
    })))
  };
 
  await chrome.storage.local.set({ lastState: state });
  return state;
}

// Restore state from undo
async function restoreFromUndo() {
  const { lastState } = await chrome.storage.local.get('lastState');
  if (!lastState) return false;

  if (lastState.scope === 'window') {
    const { windowId, tabs: tabStates, groups: groupStates } = lastState;
    if (!windowId || !Array.isArray(tabStates)) return false;

    const currentTabs = await chrome.tabs.query({ windowId });
    const tabIdsToUngroup = currentTabs.filter(t => t.groupId !== -1).map(t => t.id);
    if (tabIdsToUngroup.length > 0) {
      await chrome.tabs.ungroup(tabIdsToUngroup);
    }

    // Restore ordering of tabs (best-effort: some tabs may have been closed)
    const existingStates = tabStates
      .filter(t => typeof t.id === 'number')
      .sort((a, b) => a.index - b.index);

    for (let desiredIndex = 0; desiredIndex < existingStates.length; desiredIndex++) {
      const tabState = existingStates[desiredIndex];
      try {
        await chrome.tabs.move(tabState.id, { windowId, index: desiredIndex });
      } catch (_) {
        // Ignore tabs that no longer exist
      }
    }

    // Restore groups (best-effort)
    const tabsAfterMove = await chrome.tabs.query({ windowId });
    const tabsByOriginalGroup = new Map();
    for (const tabState of tabStates) {
      if (tabState.groupId === -1) continue;
      if (tabState.pinned) continue; // pinned tabs can't be grouped
      if (!tabsByOriginalGroup.has(tabState.groupId)) {
        tabsByOriginalGroup.set(tabState.groupId, []);
      }
      tabsByOriginalGroup.get(tabState.groupId).push(tabState.id);
    }

    const existingTabIdSet = new Set(tabsAfterMove.map(t => t.id));
    for (const [originalGroupId, ids] of tabsByOriginalGroup.entries()) {
      const tabIds = ids.filter(id => existingTabIdSet.has(id));
      if (tabIds.length < 2) continue;

      const group = await chrome.tabs.group({ tabIds });
      const groupMeta = (groupStates || []).find(g => g.id === originalGroupId);
      if (groupMeta) {
        await chrome.tabGroups.update(group, {
          title: groupMeta.title,
          color: groupMeta.color,
          collapsed: groupMeta.collapsed
        });
      }
    }

    const activeTab = tabStates.find(t => t.active);
    if (activeTab) {
      try {
        await chrome.tabs.update(activeTab.id, { active: true });
      } catch (_) {
        // Ignore
      }
    }

    await chrome.storage.local.remove('lastState');
    return true;
  }
  
  // Clear existing state
  const currentWindows = await chrome.windows.getAll();
  for (const window of currentWindows) {
    await chrome.windows.remove(window.id);
  }
  
  // Restore windows and tabs
  for (const windowState of lastState.windows) {
    const createdWindow = await chrome.windows.create({ focused: windowState.focused });
    
    // Restore tabs in the window
    for (const tabState of windowState.tabs) {
      await chrome.tabs.create({
        url: tabState.url,
        pinned: tabState.pinned,
        windowId: createdWindow.id,
        active: false
      });
    }
  }
  
  // Clear the undo state
  await chrome.storage.local.remove('lastState');
  return true;
}

async function collapseTabsInCurrentWindow() {
  const currentWindow = await chrome.windows.getCurrent({ populate: false });
  if (!currentWindow?.id) return;

  // Save state for undo (window-scoped)
  await saveStateForUndo({ scope: 'window', windowId: currentWindow.id });

  const tabs = await chrome.tabs.query({ windowId: currentWindow.id });
  const tabsToUngroup = tabs.filter(t => t.groupId !== -1).map(t => t.id);
  if (tabsToUngroup.length > 0) {
    await chrome.tabs.ungroup(tabsToUngroup);
  }

  const tabsByDomain = new Map();
  for (const tab of tabs) {
    if (tab.id === chrome.tabs.TAB_ID_NONE) continue;
    if (tab.pinned) continue; // pinned tabs can't be grouped

    const domain = getDomain(tab.url);
    if (!tabsByDomain.has(domain)) tabsByDomain.set(domain, []);
    tabsByDomain.get(domain).push(tab);
  }

  for (const [domain, domainTabs] of tabsByDomain.entries()) {
    if (domainTabs.length < 2) continue;
    const tabIds = domainTabs.map(t => t.id);
    const color = getColorForDomain(domain);
    const group = await chrome.tabs.group({ tabIds });
    await chrome.tabGroups.update(group, { title: domain, color, collapsed: true });
  }
}

async function collapseTabsAcrossAllWindowsIntoFocusedWindow() {
  // Save state for undo (full)
  await saveStateForUndo({ scope: 'all' });

  const windows = await chrome.windows.getAll({ populate: true });
  const focusedWindow = windows.find(w => w.focused) || windows[0];
  if (!focusedWindow) return;

  const tabsByDomain = new Map();
  const windowIds = windows.map(w => w.id);

  for (const window of windows) {
    if (!window.tabs) continue;
    for (const tab of window.tabs) {
      if (tab.id === chrome.tabs.TAB_ID_NONE) continue;
      const domain = getDomain(tab.url);
      if (!tabsByDomain.has(domain)) tabsByDomain.set(domain, []);
      tabsByDomain.get(domain).push({ ...tab, originalWindowId: window.id });
    }
  }

  // Move tabs to focused window (keep pinned as-is; they will be moved but not grouped)
  const movedTabIds = [];
  for (const [, tabs] of tabsByDomain.entries()) {
    tabs.sort((a, b) => {
      if (a.originalWindowId !== b.originalWindowId) return a.originalWindowId - b.originalWindowId;
      return a.index - b.index;
    });
    for (const tab of tabs) {
      if (tab.windowId !== focusedWindow.id) {
        await chrome.tabs.move(tab.id, { windowId: focusedWindow.id, index: -1 });
      }
      movedTabIds.push(tab.id);
    }
  }

  // Ungroup everything in the focused window before regrouping
  const focusedTabsNow = await chrome.tabs.query({ windowId: focusedWindow.id });
  const focusedToUngroup = focusedTabsNow.filter(t => t.groupId !== -1).map(t => t.id);
  if (focusedToUngroup.length > 0) {
    await chrome.tabs.ungroup(focusedToUngroup);
  }

  // Group by domain (skip pinned tabs)
  for (const [domain, tabs] of tabsByDomain.entries()) {
    const groupableTabIds = tabs.filter(t => !t.pinned).map(t => t.id);
    if (groupableTabIds.length < 2) continue;

    const color = getColorForDomain(domain);
    const group = await chrome.tabs.group({ tabIds: groupableTabIds });
    await chrome.tabGroups.update(group, { title: domain, color, collapsed: true });
  }

  // Close now-empty other windows (re-query tabs to be sure)
  for (const windowId of windowIds) {
    if (windowId === focusedWindow.id) continue;
    try {
      const remainingTabs = await chrome.tabs.query({ windowId });
      if (!remainingTabs || remainingTabs.length === 0) {
        await chrome.windows.remove(windowId);
      }
    } catch (_) {
      // Ignore windows that were already closed
    }
  }

  // Ensure some tab is active
  const focusedTabsFinal = await chrome.tabs.query({ windowId: focusedWindow.id });
  const active = focusedTabsFinal.find(t => t.active);
  if (!active && focusedTabsFinal.length > 0) {
    await chrome.tabs.update(focusedTabsFinal[0].id, { active: true });
  }
}

async function closeEverything() {
  // Intentionally no undo for this action.
  await chrome.storage.local.remove('lastState');

  // First, clean up all tab groups by ungrouping all tabs
  const windows = await chrome.windows.getAll();
  for (const window of windows) {
    try {
      const tabs = await chrome.tabs.query({ windowId: window.id });
      const tabsToUngroup = tabs.filter(t => t.groupId !== -1).map(t => t.id);
      if (tabsToUngroup.length > 0) {
        await chrome.tabs.ungroup(tabsToUngroup);
      }
    } catch (error) {
      console.error('Error cleaning up tab groups:', error);
    }
  }

  // Then create the new timeline window
  const url = chrome.runtime.getURL('new-timeline.html');
  const newWindow = await chrome.windows.create({
    url,
    focused: true,
    type: 'normal',
    state: 'maximized'
  });

  // Close all other windows
  for (const window of windows) {
    if (newWindow?.id && window.id === newWindow.id) continue;
    try {
      await chrome.windows.remove(window.id);
    } catch (_) {
      // Ignore windows that were already closed
    }
  }
}

// Remove empty tab groups when all their tabs are closed
chrome.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
  try {
    // Get all tab groups in the window where the tab was closed
    const groups = await chrome.tabGroups.query({ windowId: removeInfo.windowId });
    
    // Check each group to see if it's now empty
    for (const group of groups) {
      const tabs = await chrome.tabs.query({ groupId: group.id });
      if (tabs.length === 0) {
        // Group is empty, remove it
        await chrome.tabs.ungroup(group.id);
      }
    }
  } catch (error) {
    console.error('Error cleaning up empty tab groups:', error);
  }
});

// Message handling
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'collapse') {
    const mode = request.mode || 'current';
    const collapsePromise = mode === 'all'
      ? collapseTabsAcrossAllWindowsIntoFocusedWindow()
      : collapseTabsInCurrentWindow();
    collapsePromise.then(() => sendResponse({ success: true }));
    return true; // Will respond asynchronously
  } else if (request.action === 'closeEverything') {
    closeEverything().then(() => sendResponse({ success: true }));
    return true;
  } else if (request.action === 'undo') {
    restoreFromUndo().then(success => sendResponse({ success }));
    return true; // Will respond asynchronously
  } else if (request.action === 'hasUndoState') {
    chrome.storage.local.get('lastState', (result) => {
      sendResponse({ hasState: !!result.lastState });
    });
    return true; // Will respond asynchronously
  }
});

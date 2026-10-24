// Shared rule matching: fsFindMatchingRule, fsRuleMatchesUrl, fsParsePattern
importScripts('rules.js');

// URLs of matching sites visited in each tab, waiting to be deleted from history when the tab closes.
// Kept in storage.local (not memory) because MV3 service workers are shut down when idle,
// and so anything left over after a browser restart can still be cleaned up.
const PENDING_KEY = 'pendingHistory';
const BOSS_KEY_SETTINGS = ['bossKeyAction', 'bossKeyRedirectUrl', 'bossKeyMute', 'bossKeyBlur'];

// Serialize read-modify-write on the pending list so rapid tab events don't overwrite each other
let queue = Promise.resolve();
function withPending(fn) {
    queue = queue.then(async () => {
        const data = await chrome.storage.local.get(PENDING_KEY);
        const pending = data[PENDING_KEY] || {};
        const changed = await fn(pending);
        if (changed) {
            await chrome.storage.local.set({ [PENDING_KEY]: pending });
        }
    }).catch(err => console.log("Ninja Tab: history queue error -", err));
    return queue;
}

function deleteUrls(urls) {
    return Promise.all(urls.map(url => chrome.history.deleteUrl({ url }).then(() => {
        console.log("Ninja Tab: Auto-deleted URL from history -", url);
    })));
}

// Delete every past visit to the enabled rules' sites. This also clears them from address-bar
// suggestions and the new-tab "most visited" tiles, which Chrome builds from history.
async function sweepHistory() {
    const { rules = [] } = await chrome.storage.sync.get('rules');
    const urls = new Set();
    for (const rule of rules) {
        if (rule.enabled === false || !rule.targetDomain) continue;
        // history.search matches text anywhere in the URL or title, so search the longest literal part
        const { host } = fsParsePattern(rule.targetDomain);
        const text = host.split('*').sort((a, b) => b.length - a.length)[0].replace(/^\.+|\.+$/g, '');
        const items = await chrome.history.search({ text, startTime: 0, maxResults: 100000 });
        items.forEach(item => {
            if (fsRuleMatchesUrl(rule, item.url)) urls.add(item.url);
        });
    }
    await deleteUrls([...urls]);
    return urls.size;
}

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
    if (!changeInfo.url) return;

    // Path rules can start or stop matching on in-page (SPA) navigation, so let the page re-check
    chrome.tabs.sendMessage(tabId, { action: "reevaluate" }).catch(() => {
        // No content script on this page (e.g. chrome:// pages) or it hasn't loaded yet
    });

    // Record every matching URL the tab navigates to, for deletion when it closes
    const data = await chrome.storage.sync.get(['historySwitch', 'rules', 'masterSwitch']);
    if (data.masterSwitch === false || data.historySwitch !== true) return;
    if (!fsFindMatchingRule(data.rules || [], changeInfo.url)) return;

    withPending(pending => {
        const urls = pending[tabId] || [];
        if (urls.includes(changeInfo.url)) return false;
        urls.push(changeInfo.url);
        pending[tabId] = urls;
        return true;
    });
});

// When a tab is closed, delete every matching URL it visited
chrome.tabs.onRemoved.addListener((tabId) => {
    withPending(async pending => {
        const urls = pending[tabId];
        if (!urls) return false;
        delete pending[tabId];
        await deleteUrls(urls);
        return true;
    });
});

chrome.runtime.onStartup.addListener(async () => {
    // Tab IDs don't survive a browser restart, so clean up anything left from the last session
    withPending(async pending => {
        const urls = Object.values(pending).flat();
        if (urls.length === 0) return false;
        for (const key of Object.keys(pending)) delete pending[key];
        await deleteUrls(urls);
        return true;
    });

    // Then catch anything that slipped through (e.g. Chrome crashed before tabs closed)
    const data = await chrome.storage.sync.get(['historySwitch', 'masterSwitch']);
    if (data.masterSwitch !== false && data.historySwitch === true) {
        sweepHistory();
    }
});

// The toolbar icon mirrors the on/off switch: the ninja's eyes are open when on, asleep when off
function updateToolbarIcon(on) {
    const suffix = on ? '' : '-sleep';
    chrome.action.setIcon({ path: { 16: `icons/icon16${suffix}.png`, 32: `icons/icon32${suffix}.png` } });
}

chrome.storage.sync.get('masterSwitch').then(data => updateToolbarIcon(data.masterSwitch !== false));

chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync' && changes.masterSwitch) {
        updateToolbarIcon(changes.masterSwitch.newValue !== false);
    }
});

// Run the Boss Key on one tab. mode "toggle" flips it; mode "on" (panic) always hides.
async function bossKeyOnTab(tab, data, mode) {
    if (data.bossKeyAction === 'redirect') {
        if (data.bossKeyMute) {
            chrome.tabs.update(tab.id, {muted: true});
        }
        let targetUrl = data.bossKeyRedirectUrl || 'https://www.google.com';
        if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
            targetUrl = 'https://' + targetUrl;
        }
        const currentUrl = tab.url;
        await chrome.tabs.update(tab.id, {url: targetUrl});
        // Delete original from history
        if (currentUrl && !currentUrl.startsWith('chrome://')) {
            await chrome.history.deleteUrl({ url: currentUrl });
            console.log("Ninja Tab: Panic Redirect deleted URL from history -", currentUrl);
        }
        return;
    }

    // Disguise action (default)
    const action = mode === 'on' ? "boss-key-on" : "toggle-boss-key";
    try {
        const response = await chrome.tabs.sendMessage(tab.id, { action, blur: data.bossKeyBlur === true });
        if (data.bossKeyMute && response) {
            chrome.tabs.update(tab.id, {muted: response.isDisguised});
        }
    } catch (err) {
        // Content script might not be loaded on this page (e.g., chrome:// pages)
        console.log("Could not send boss key command to tab.");
    }
}

// Panic: hide every open tab whose site matches an enabled rule
async function panicAll() {
    const data = await chrome.storage.sync.get([...BOSS_KEY_SETTINGS, 'rules']);
    const tabs = await chrome.tabs.query({});
    const targets = tabs.filter(tab => tab.url && fsFindMatchingRule(data.rules || [], tab.url));
    await Promise.all(targets.map(tab => bossKeyOnTab(tab, data, 'on')));
    return targets.length;
}

chrome.commands.onCommand.addListener(async (command) => {
    if (command === "toggle-boss-key") {
        const data = await chrome.storage.sync.get(BOSS_KEY_SETTINGS);
        const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
        if (tab) bossKeyOnTab(tab, data, 'toggle');
    } else if (command === "panic-all") {
        panicAll();
    }
});

// Icons shipped inside the extension that presets can use ("bundled:<file>" in a rule)
const BUNDLED_ICONS = ['outlook.png'];

async function bundledIconDataUrl(name) {
    const response = await fetch(chrome.runtime.getURL('icons/' + name));
    const bytes = new Uint8Array(await response.arrayBuffer());
    let binary = '';
    for (let i = 0; i < bytes.length; i += 0x8000) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    }
    return 'data:image/png;base64,' + btoa(binary);
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Our own content script asking for a bundled icon (only names on the list above)
    if (request.action === "bundled-icon" && sender.id === chrome.runtime.id) {
        if (!BUNDLED_ICONS.includes(request.name)) return;
        bundledIconDataUrl(request.name)
            .then(dataUrl => sendResponse({ dataUrl }))
            .catch(() => sendResponse({ dataUrl: '' }));
        return true;
    }

    // Everything else comes from the popup (only accepted from the extension's own pages, never from web pages)
    if (!sender.url || !sender.url.startsWith(chrome.runtime.getURL(''))) return;

    if (request.action === "panic") {
        panicAll().then(count => sendResponse({ count }));
        return true;
    }
    if (request.action === "sweep-history") {
        sweepHistory().then(count => sendResponse({ count }));
        return true;
    }
});

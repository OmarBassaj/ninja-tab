// Rule matching (fsFindMatchingRule) comes from rules.js, loaded before this file

let originalTitle = null;
let originalFavicons = [];
let isDisguised = false;
let isBossKeyActive = false;
// The title/favicon currently being enforced while disguised (empty string = leave the page's own)
let activeSpoof = { title: '', favicon: '' };

// Marks the <link> tags this extension adds, so the observer doesn't remove its own icons
const OWN_ICON_ATTR = 'data-ninja-tab';
const ICON_SELECTOR = 'link[rel~="icon"], link[rel="apple-touch-icon"]';
const BLUR_STYLE_ID = 'ninja-tab-blur';
const BOSS_TITLE = "Google";
const BOSS_FAVICON = "https://www.google.com/favicon.ico";

// Uploaded icons are referenced as "custom:<id>" in rules and stored in storage.local.
// Icons shipped with the extension are "bundled:<file>" and handed over by the background
// worker as data URLs, so web pages never get a chrome-extension:// link they could detect.
const bundledIconCache = {};
async function resolveFavicon(value) {
    if (!value) return '';
    if (value.startsWith('custom:')) {
        const { customIcons = {} } = await chrome.storage.local.get('customIcons');
        return customIcons[value.slice('custom:'.length)] || '';
    }
    if (value.startsWith('bundled:')) {
        const name = value.slice('bundled:'.length);
        if (!bundledIconCache[name]) {
            try {
                const response = await chrome.runtime.sendMessage({ action: 'bundled-icon', name });
                bundledIconCache[name] = (response && response.dataUrl) || '';
            } catch (e) {
                bundledIconCache[name] = '';
            }
        }
        return bundledIconCache[name];
    }
    return value;
}

// Save the page's own title and icons, right before disguising it
function saveOriginalElements() {
    originalTitle = document.title || "";
    saveOriginalFaviconsOnly();
}

function saveOriginalFaviconsOnly() {
    originalFavicons = [];
    document.querySelectorAll(ICON_SELECTOR).forEach(icon => {
        if (icon.hasAttribute(OWN_ICON_ATTR)) return;
        originalFavicons.push({
            rel: icon.getAttribute('rel'),
            href: icon.getAttribute('href'),
            type: icon.getAttribute('type'),
            sizes: icon.getAttribute('sizes')
        });
    });
}

// Function to change favicon
function changeFavicon(url) {
    if (!url || !document.head) return;

    // Remove existing favicons and apple touch icons
    document.querySelectorAll(ICON_SELECTOR).forEach(icon => icon.remove());

    // Add new favicon, plus shortcut icon just in case for older engines
    ['icon', 'shortcut icon'].forEach(rel => {
        const link = document.createElement('link');
        link.rel = rel;
        link.href = url;
        link.setAttribute(OWN_ICON_ATTR, '');
        document.head.appendChild(link);
    });
}

// Remove our favicons and put the page's original ones back (including apple touch icons)
function restoreOriginalFavicons() {
    document.querySelectorAll(ICON_SELECTOR).forEach(icon => icon.remove());
    if (!document.head) return;
    originalFavicons.forEach(iconData => {
        const icon = document.createElement('link');
        icon.rel = iconData.rel || 'icon';
        if (iconData.href) icon.href = iconData.href;
        if (iconData.type) icon.type = iconData.type;
        if (iconData.sizes) icon.setAttribute('sizes', iconData.sizes);
        document.head.appendChild(icon);
    });
}

// Function to revert to original
function revertDisguise() {
    if (!isDisguised && !isBossKeyActive) return;

    // Clear the flags first so the observer treats the restored elements as the page's own
    isDisguised = false;
    isBossKeyActive = false;
    activeSpoof = { title: '', favicon: '' };

    // Revert title
    if (originalTitle !== null) {
        document.title = originalTitle;
    }
    restoreOriginalFavicons();
}

// Apply the camouflage
function applyDisguise(title, faviconUrl) {
    // Only capture originals when the page isn't already disguised, so we never save our own spoof
    if (!isDisguised && !isBossKeyActive) {
        saveOriginalElements();
    }
    const previousSpoof = activeSpoof;
    activeSpoof = { title: title || '', favicon: faviconUrl || '' };

    if (title) {
        document.title = title;
    } else if (previousSpoof.title && originalTitle !== null) {
        // Switched to a disguise that doesn't change the title
        document.title = originalTitle;
    }

    if (faviconUrl) {
        changeFavicon(faviconUrl);
    } else if (previousSpoof.favicon) {
        // Switched to a disguise that doesn't change the favicon
        restoreOriginalFavicons();
    }

    isDisguised = true;
}

function setBlur(on) {
    const existing = document.getElementById(BLUR_STYLE_ID);
    if (!on) {
        if (existing) existing.remove();
        return;
    }
    if (existing || !document.documentElement) return;
    const style = document.createElement('style');
    style.id = BLUR_STYLE_ID;
    style.textContent = 'html { filter: blur(24px) !important; }';
    document.documentElement.appendChild(style);
}

// Main logic to check rules and apply
let evaluateSeq = 0;
async function evaluateRules() {
    // If Boss Key is active, don't override it with rules
    if (isBossKeyActive) return;
    const seq = ++evaluateSeq;

    const data = await chrome.storage.sync.get(['masterSwitch', 'rules', 'disguiseMode']);
    const matchedRule = data.masterSwitch === false ? null : fsFindMatchingRule(data.rules || [], location.href);
    // In "background only" mode the real page shows while you're looking at it
    const shouldDisguise = matchedRule && (data.disguiseMode !== 'background' || document.hidden);
    const favicon = shouldDisguise ? await resolveFavicon(matchedRule.spoofFavicon) : '';

    // A newer evaluation or the Boss Key took over while we were waiting on storage
    if (seq !== evaluateSeq || isBossKeyActive) return;

    if (shouldDisguise) {
        applyDisguise(matchedRule.spoofTitle, favicon);
    } else {
        revertDisguise();
    }
}

// Run initially
// Need to wait for DOM to be ready enough to modify HEAD
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', evaluateRules);
} else {
    evaluateRules();
}

// For "background only" mode: disguise when you switch away, reveal when you come back
document.addEventListener('visibilitychange', evaluateRules);

function isTitleMutation(mutation) {
    const target = mutation.target;
    return target.nodeName === 'TITLE' || (target.parentNode && target.parentNode.nodeName === 'TITLE');
}

// Listen for dynamically changed titles and favicons (e.g., SPAs like React/Vue apps)
const observer = new MutationObserver((mutations) => {
    if (isDisguised || isBossKeyActive) {
        let titleChanged = false;
        let iconChanged = false;

        mutations.forEach(mutation => {
            if (isTitleMutation(mutation)) {
                titleChanged = true;
            }
            mutation.addedNodes.forEach(node => {
                if (node.nodeName === 'TITLE') {
                    titleChanged = true;
                }
                if (node.nodeName === 'LINK' && node.matches(ICON_SELECTOR) && !node.hasAttribute(OWN_ICON_ATTR)) {
                    iconChanged = true;
                }
            });
        });

        if (titleChanged) {
            if (activeSpoof.title) {
                if (document.title !== activeSpoof.title) document.title = activeSpoof.title;
            } else {
                // This disguise leaves the title alone, so keep tracking the page's real one
                originalTitle = document.title;
            }
        }
        if (iconChanged) {
            if (activeSpoof.favicon) {
                // Prevent the page's new icon from overriding ours
                changeFavicon(activeSpoof.favicon);
            } else {
                saveOriginalFaviconsOnly();
            }
        }
    } else {
        // Update original title if it changes naturally while not disguised
        if (mutations.some(isTitleMutation)) {
            originalTitle = document.title;
        }
    }
});

// At document_start <head> usually doesn't exist yet, so wait for it before observing
function startObserver() {
    observer.observe(document.head, { childList: true, subtree: true, characterData: true });
}

if (document.head) {
    startObserver();
} else if (document.documentElement) {
    const headWaiter = new MutationObserver(() => {
        if (document.head) {
            headWaiter.disconnect();
            startObserver();
        }
    });
    headWaiter.observe(document.documentElement, { childList: true });
}


// Listen for storage changes to apply/revert immediately
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync' && (changes.masterSwitch || changes.rules || changes.disguiseMode)) {
        evaluateRules();
    }
    if (namespace === 'local' && changes.customIcons) {
        evaluateRules();
    }
});

function setBossKey(on, blur) {
    if (on && !isBossKeyActive) {
        // Apply generic Boss Key disguise (Google Search)
        applyDisguise(BOSS_TITLE, BOSS_FAVICON);
        isBossKeyActive = true;
        setBlur(blur);
    } else if (!on && isBossKeyActive) {
        // Undo the Boss Key fully, then re-apply any normal rule from the page's real state
        setBlur(false);
        revertDisguise();
        evaluateRules();
    }
}

// Messages from background.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "toggle-boss-key") {
        setBossKey(!isBossKeyActive, request.blur === true);
        sendResponse({ isDisguised: isBossKeyActive });
    } else if (request.action === "boss-key-on") {
        // Panic button: always hide, never toggle back
        setBossKey(true, request.blur === true);
        sendResponse({ isDisguised: isBossKeyActive });
    } else if (request.action === "reevaluate") {
        // The tab's URL changed without a reload (SPA), so path rules may now match differently
        evaluateRules();
    }
});

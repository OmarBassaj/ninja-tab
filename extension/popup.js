document.addEventListener('DOMContentLoaded', () => {
  const $ = (id) => document.getElementById(id);

  const masterSwitch = $('master-switch');
  const historySwitch = $('history-switch');
  const brandStatus = $('brand-status');
  const ninja = $('ninja');
  const panicBtn = $('panic-btn');

  const targetDomainInput = $('target-domain');
  const currentSiteBtn = $('current-site-btn');
  const presetGrid = $('preset-grid');
  const spoofTitleInput = $('spoof-title');
  const spoofFaviconInput = $('spoof-favicon');
  const faviconPreview = $('favicon-preview');
  const uploadIconBtn = $('upload-icon-btn');
  const uploadIconInput = $('upload-icon-input');
  const addRuleBtn = $('add-rule-btn');
  const cancelEditBtn = $('cancel-edit-btn');
  const rulesList = $('rules-list');
  const ruleCount = $('rule-count');
  const noRules = $('no-rules');

  const pinScreen = $('pin-screen');
  const mainScreen = $('main-screen');
  const settingsScreen = $('settings-screen');
  const pinInput = $('pin-input');
  const pinDots = $('pin-dots');
  const pinError = $('pin-error');

  const openSettingsBtn = $('open-settings-btn');
  const closeSettingsBtn = $('close-settings-btn');

  const pinSwitch = $('pin-switch');
  const pinSetupGroup = $('pin-setup-group');
  const newPinInput = $('new-pin');
  const savePinBtn = $('save-pin-btn');
  const relockGroup = $('relock-group');
  const pinRelock = $('pin-relock');
  const disguiseBackgroundSwitch = $('disguise-background-switch');
  const bossKeyAction = $('boss-key-action');
  const redirectUrlGroup = $('redirect-url-group');
  const bossKeyRedirect = $('boss-key-redirect');
  const bossKeyMute = $('boss-key-mute');
  const bossKeyBlur = $('boss-key-blur');
  const blurRow = $('blur-row');
  const changeShortcutsBtn = $('change-shortcuts-btn');
  const cleanHistoryBtn = $('clean-history-btn');
  const exportBtn = $('export-btn');
  const importBtn = $('import-btn');
  const importInput = $('import-input');

  const bossKeyShortcut = $('boss-key-shortcut');
  const toastEl = $('toast');
  const toastText = $('toast-text');
  const dialog = $('dialog');
  const dialogText = $('dialog-text');
  const dialogCancel = $('dialog-cancel');
  const dialogConfirm = $('dialog-confirm');

  // popup.html#tab is the same page opened as a normal tab (used for file pickers, see needsTabForFiles)
  const isTabMode = location.hash === '#tab';
  if (isTabMode) document.body.classList.add('tab-mode');

  // PIN is stored as a salted SHA-256 hash, never as plain text
  let currentPinHash = '';
  let currentPinSalt = '';
  const MAX_PIN_ATTEMPTS = 5;
  const PIN_LOCKOUT_MS = 60 * 1000;
  const RELOCK_OPTIONS = [0, 1, 5, 15, 60];

  // Id of the rule currently loaded into the form for editing (null = adding a new rule)
  let editingId = null;
  let rulesCache = [];
  // Uploaded favicons, kept in storage.local because storage.sync items are limited to 8 KB.
  // Rules refer to them as "custom:<id>". Icons shipped with the extension are "bundled:<file>".
  let customIcons = {};

  const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
  const ICON_SIZE = 64;
  const FALLBACK_ICON = 'icons/icon16.png';

  // Settings that are synced, exported and imported (the PIN is deliberately left out)
  const SETTING_KEYS = ['masterSwitch', 'historySwitch', 'rules', 'language', 'bossKeyAction',
    'bossKeyRedirectUrl', 'bossKeyMute', 'bossKeyBlur', 'disguiseMode', 'pinRelockMinutes'];

  const BACKUP_APP_IDS = ['ninja-tab', 'favicon-swapper'];

  const PRESETS = [
    { name: 'Google Docs', title: 'Untitled document - Google Docs', favicon: 'https://ssl.gstatic.com/docs/documents/images/kix-favicon7.ico' },
    { name: 'Google Sheets', title: 'Untitled spreadsheet - Google Sheets', favicon: 'https://ssl.gstatic.com/docs/spreadsheets/favicon3.ico' },
    { name: 'Google Slides', title: 'Untitled presentation - Google Slides', favicon: 'https://ssl.gstatic.com/docs/presentations/images/favicon5.ico' },
    { name: 'Google Drive', title: 'My Drive - Google Drive', favicon: 'https://ssl.gstatic.com/images/branding/product/1x/drive_2020q4_32dp.png' },
    { name: 'Gmail', title: 'Inbox - Gmail', favicon: 'https://ssl.gstatic.com/ui/v1/icons/mail/rfr/gmail.ico' },
    { name: 'Google Classroom', title: 'Classes', favicon: 'https://ssl.gstatic.com/classroom/favicon.png' },
    { name: 'Google Search', title: 'Google', favicon: 'https://www.google.com/favicon.ico' },
    { name: 'Wikipedia', title: 'Wikipedia, the free encyclopedia', favicon: 'https://en.wikipedia.org/static/favicon/wikipedia.ico' },
    { name: 'Google Translate', title: 'Google Translate', favicon: 'https://ssl.gstatic.com/translate/favicon.ico' },
    { name: 'Outlook', title: 'Mail - Outlook', favicon: 'bundled:outlook.png' }
  ];

  const i18n = {
    en: {
      appTitle: "Ninja Tab",
      enterPin: "Enter PIN",
      incorrectPin: "Incorrect PIN",
      tooManyAttempts: "Too many attempts. Try again in {s}s",
      lockedFor: "Too many attempts. Locked for {s}s",
      settings: "Settings",
      back: "Back",
      masterToggle: "Turn all disguises on or off",
      statusOn: "Active · {n} rules",
      statusOff: "Paused",
      autoDeleteHistory: "Auto-delete history on close",
      panicBtn: "Hide all matching tabs now",
      panicDone: "Hid {n} tab(s)",
      panicNone: "No open tabs match your rules",
      addNewRule: "New rule",
      targetDomainPlaceholder: "Site, e.g. example.com",
      useCurrentSite: "Use current site",
      currentSiteUnavailable: "Open a normal web page first",
      patternHint: "*.site.com for subdomains only, site.com/path for one section",
      disguiseAs: "Disguise as",
      spoofTitlePlaceholder: "Tab title",
      spoofFaviconPlaceholder: "Icon URL or site",
      uploadIcon: "Upload an image",
      imageUploaded: "Image added",
      imageTooLarge: "Image is too large (max 2 MB)",
      imageInvalid: "That file isn't a usable image",
      addRuleBtn: "Add rule",
      saveRuleBtn: "Save changes",
      cancelEdit: "Cancel",
      ruleAdded: "Rule added",
      ruleSaved: "Rule saved",
      ruleDeleted: "Rule deleted",
      activeRules: "Rules",
      noRules: "No rules yet. Add a site above to disguise it.",
      titleUnchanged: "Keeps its own title",
      ruleToggle: "Turn this rule on or off",
      edit: "Edit",
      delete: "Delete",
      alertTargetDomain: "Enter a site first",
      saveFailed: "Couldn't save. Chrome's sync storage may be full",
      bossKey: "Boss key",
      shortcutNotSet: "Not set",
      security: "Security",
      lockWithPin: "Lock with PIN",
      enterPinPlaceholder: "4-digit PIN",
      savePin: "Save",
      changePin: "Change",
      pinMustBe4: "PIN must be exactly 4 digits",
      pinSaved: "PIN saved",
      pinRemoved: "PIN lock turned off",
      confirmPinOff: "Turn off the PIN lock?",
      turnOff: "Turn off",
      askPinAgain: "Ask for PIN again",
      relock0: "Every time",
      relock1: "After 1 minute",
      relock5: "After 5 minutes",
      relock15: "After 15 minutes",
      relock60: "After 1 hour",
      disguise: "Disguise",
      backgroundOnly: "Only when tab is in background",
      backgroundOnlyHint: "You see the real page while you're on the tab. It disguises itself when you switch away.",
      bossKeyActionTitle: "Boss key",
      actionType: "Action",
      disguiseTab: "Disguise tab",
      panicRedirect: "Redirect away",
      redirectPlaceholder: "Redirect to, e.g. google.com",
      autoMute: "Mute tab",
      blurPage: "Blur page content",
      changeShortcuts: "Keyboard shortcuts",
      historyTitle: "History",
      cleanHistoryBtn: "Clean matching history now",
      cleanHistoryHint: "Deletes all past visits to your rule sites, so they also disappear from address-bar suggestions and new-tab shortcuts.",
      cleanHistoryDone: "Deleted {n} history entries",
      backup: "Backup",
      exportBtn: "Export rules and settings",
      importBtn: "Import from file",
      exportDone: "Backup downloaded (PIN not included)",
      importConfirm: "Replace your current rules and settings with this backup?",
      replace: "Replace",
      importDone: "Imported {n} rule(s)",
      importInvalid: "This isn't a Ninja Tab backup"
    },
    tr: {
      appTitle: "Ninja Tab",
      enterPin: "PIN girin",
      incorrectPin: "Yanlış PIN",
      tooManyAttempts: "Çok fazla deneme. {s} sn sonra tekrar deneyin",
      lockedFor: "Çok fazla deneme. {s} sn kilitlendi",
      settings: "Ayarlar",
      back: "Geri",
      masterToggle: "Tüm kamuflajları aç veya kapat",
      statusOn: "Etkin · {n} kural",
      statusOff: "Duraklatıldı",
      autoDeleteHistory: "Kapatınca geçmişi otomatik sil",
      panicBtn: "Eşleşen tüm sekmeleri şimdi gizle",
      panicDone: "{n} sekme gizlendi",
      panicNone: "Kurallarınızla eşleşen açık sekme yok",
      addNewRule: "Yeni kural",
      targetDomainPlaceholder: "Site, örn. example.com",
      useCurrentSite: "Geçerli siteyi kullan",
      currentSiteUnavailable: "Önce normal bir web sayfası açın",
      patternHint: "Yalnızca alt alan adları için *.site.com, tek bölüm için site.com/yol",
      disguiseAs: "Şuna benzet",
      spoofTitlePlaceholder: "Sekme başlığı",
      spoofFaviconPlaceholder: "Simge URL'si veya site",
      uploadIcon: "Resim yükle",
      imageUploaded: "Resim eklendi",
      imageTooLarge: "Resim çok büyük (en fazla 2 MB)",
      imageInvalid: "Bu dosya kullanılabilir bir resim değil",
      addRuleBtn: "Kural ekle",
      saveRuleBtn: "Değişiklikleri kaydet",
      cancelEdit: "İptal",
      ruleAdded: "Kural eklendi",
      ruleSaved: "Kural kaydedildi",
      ruleDeleted: "Kural silindi",
      activeRules: "Kurallar",
      noRules: "Henüz kural yok. Gizlemek için yukarıdan bir site ekleyin.",
      titleUnchanged: "Kendi başlığını korur",
      ruleToggle: "Bu kuralı aç veya kapat",
      edit: "Düzenle",
      delete: "Sil",
      alertTargetDomain: "Önce bir site girin",
      saveFailed: "Kaydedilemedi. Chrome senkronizasyon alanı dolu olabilir",
      bossKey: "Patron tuşu",
      shortcutNotSet: "Ayarlanmadı",
      security: "Güvenlik",
      lockWithPin: "PIN ile kilitle",
      enterPinPlaceholder: "4 haneli PIN",
      savePin: "Kaydet",
      changePin: "Değiştir",
      pinMustBe4: "PIN tam olarak 4 rakam olmalıdır",
      pinSaved: "PIN kaydedildi",
      pinRemoved: "PIN kilidi kapatıldı",
      confirmPinOff: "PIN kilidi kapatılsın mı?",
      turnOff: "Kapat",
      askPinAgain: "PIN'i tekrar sor",
      relock0: "Her seferinde",
      relock1: "1 dakika sonra",
      relock5: "5 dakika sonra",
      relock15: "15 dakika sonra",
      relock60: "1 saat sonra",
      disguise: "Kamuflaj",
      backgroundOnly: "Yalnızca sekme arka plandayken",
      backgroundOnlyHint: "Sekmedeyken gerçek sayfayı görürsünüz. Başka sekmeye geçince kendini gizler.",
      bossKeyActionTitle: "Patron tuşu",
      actionType: "Eylem",
      disguiseTab: "Sekmeyi gizle",
      panicRedirect: "Başka yere yönlendir",
      redirectPlaceholder: "Yönlendirilecek adres, örn. google.com",
      autoMute: "Sekmeyi sessize al",
      blurPage: "Sayfa içeriğini bulanıklaştır",
      changeShortcuts: "Klavye kısayolları",
      historyTitle: "Geçmiş",
      cleanHistoryBtn: "Eşleşen geçmişi şimdi temizle",
      cleanHistoryHint: "Kural sitelerinize yapılan tüm geçmiş ziyaretleri siler; böylece adres çubuğu önerilerinden ve yeni sekme kısayollarından da kalkarlar.",
      cleanHistoryDone: "{n} geçmiş kaydı silindi",
      backup: "Yedekleme",
      exportBtn: "Kuralları ve ayarları dışa aktar",
      importBtn: "Dosyadan içe aktar",
      exportDone: "Yedek indirildi (PIN dahil değil)",
      importConfirm: "Mevcut kurallarınız ve ayarlarınız bu yedekle değiştirilsin mi?",
      replace: "Değiştir",
      importDone: "{n} kural içe aktarıldı",
      importInvalid: "Bu bir Ninja Tab yedeği değil"
    }
  };

  let currentLang = 'en';

  function t(key, vars = {}) {
    let text = i18n[currentLang][key] || i18n.en[key] || key;
    Object.keys(vars).forEach(name => { text = text.replace('{' + name + '}', vars[name]); });
    return text;
  }

  function applyLanguage(lang) {
    currentLang = i18n[lang] ? lang : 'en';
    document.documentElement.lang = currentLang;
    document.querySelectorAll('[data-i18n]').forEach(el => {
      el.textContent = t(el.getAttribute('data-i18n'));
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      el.setAttribute('placeholder', t(el.getAttribute('data-i18n-placeholder')));
    });
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      el.setAttribute('title', t(el.getAttribute('data-i18n-title')));
    });

    document.querySelectorAll('.lang-option').forEach(el => {
      el.classList.toggle('active', el.getAttribute('data-lang') === currentLang);
    });

    showBossKeyShortcut();
    syncPinSwitch();
    renderRules(rulesCache);
  }

  // Show the shortcut actually assigned in Chrome, since users can change it
  function showBossKeyShortcut() {
    chrome.commands.getAll((commands) => {
      const cmd = commands.find(c => c.name === 'toggle-boss-key');
      bossKeyShortcut.textContent = (cmd && cmd.shortcut) || t('shortcutNotSet');
    });
  }

  // In-app notification, used instead of Chrome's alert() box
  let toastTimer = null;
  function toast(message, type = 'success') {
    toastText.textContent = message;
    toastEl.classList.toggle('error', type === 'error');
    toastEl.querySelector('use').setAttribute('href', type === 'error' ? '#i-alert' : '#i-check');
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2600);
  }

  // In-app confirmation, used instead of Chrome's confirm() box. Resolves true if confirmed.
  function confirmDialog(message, confirmLabel) {
    return new Promise(resolve => {
      dialogText.textContent = message;
      dialogConfirm.textContent = confirmLabel;
      setHidden(dialog, false);
      dialogConfirm.focus();

      const finish = (result) => {
        setHidden(dialog, true);
        dialogConfirm.removeEventListener('click', onConfirm);
        dialogCancel.removeEventListener('click', onCancel);
        dialog.removeEventListener('click', onBackdrop);
        document.removeEventListener('keydown', onKey);
        resolve(result);
      };
      const onConfirm = () => finish(true);
      const onCancel = () => finish(false);
      const onBackdrop = (e) => { if (e.target === dialog) finish(false); };
      const onKey = (e) => { if (e.key === 'Escape') finish(false); };

      dialogConfirm.addEventListener('click', onConfirm);
      dialogCancel.addEventListener('click', onCancel);
      dialog.addEventListener('click', onBackdrop);
      document.addEventListener('keydown', onKey);
    });
  }

  // File pickers close the toolbar popup on macOS and Linux, so there we open the page as a tab first
  function needsTabForFiles() {
    return !isTabMode && !/^Win/i.test(navigator.platform);
  }

  function openFullTab() {
    chrome.tabs.create({ url: chrome.runtime.getURL('popup.html#tab') });
    window.close();
  }

  function setHidden(el, hidden) {
    el.classList.toggle('hidden', hidden);
  }

  function svgIcon(name) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'icon');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', '#i-' + name);
    svg.appendChild(use);
    return svg;
  }

  function updateBrandStatus() {
    const on = masterSwitch.checked;
    const activeCount = rulesCache.filter(r => r.enabled !== false).length;
    brandStatus.textContent = on ? t('statusOn', { n: activeCount }) : t('statusOff');
    brandStatus.classList.toggle('on', on);
    ninja.classList.toggle('awake', on);
  }

  function setEditing(id) {
    editingId = id;
    const key = id ? 'saveRuleBtn' : 'addRuleBtn';
    addRuleBtn.setAttribute('data-i18n', key);
    addRuleBtn.textContent = t(key);
    setHidden(cancelEditBtn, !id);
  }

  function clearRuleForm() {
    targetDomainInput.value = '';
    spoofTitleInput.value = '';
    spoofFaviconInput.value = '';
    updateFaviconPreview();
  }

  // Strip the scheme and trailing slash, keep any path (for path rules)
  function cleanPattern(value) {
    return value.trim().toLowerCase().replace(/^[a-z]+:\/\//, '').replace(/\/+$/, '');
  }

  function faviconSrc(value) {
    if (!value) return FALLBACK_ICON;
    if (value.startsWith('custom:')) return customIcons[value.slice('custom:'.length)] || FALLBACK_ICON;
    if (value.startsWith('bundled:')) return 'icons/' + value.slice('bundled:'.length);
    return value;
  }

  // Also highlights the preset tile that matches the current icon
  function updateFaviconPreview() {
    const value = spoofFaviconInput.value.trim();
    faviconPreview.src = faviconSrc(value);
    presetGrid.querySelectorAll('.preset-tile').forEach(tile => {
      tile.setAttribute('aria-pressed', String(tile.dataset.favicon === value));
    });
  }
  // Fall back once only, so a missing fallback can't loop
  faviconPreview.onerror = () => { if (!faviconPreview.src.endsWith(FALLBACK_ICON)) faviconPreview.src = FALLBACK_ICON; };

  // Turn whatever was typed into a usable favicon URL
  function normalizeFavicon(spoofFavicon) {
    if (!spoofFavicon || spoofFavicon.startsWith('custom:') || spoofFavicon.startsWith('bundled:')) return spoofFavicon;
    const isImage = /\.(png|ico|jpg|jpeg|gif|svg|webp)(\?.*)?$/i.test(spoofFavicon);
    const isApi = spoofFavicon.includes('google.com/s2/favicons');
    if (!isImage && !isApi) {
      // A plain site address: use Google's favicon service to fetch that site's icon
      try {
        const urlString = spoofFavicon.startsWith('http') ? spoofFavicon : 'https://' + spoofFavicon;
        const domain = new URL(urlString).hostname;
        return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
      } catch (e) {
        return spoofFavicon.startsWith('http') ? spoofFavicon : 'https://' + spoofFavicon;
      }
    }
    return spoofFavicon.startsWith('http') ? spoofFavicon : 'https://' + spoofFavicon;
  }

  async function saveRules(rules) {
    try {
      await chrome.storage.sync.set({ rules });
    } catch (e) {
      toast(t('saveFailed'), 'error');
      throw e;
    }
    renderRules(rules);
    pruneCustomIcons(rules);
  }

  // Delete uploaded icons no rule (or the form) uses any more
  function pruneCustomIcons(rules) {
    const used = new Set(rules.map(r => r.spoofFavicon).concat(spoofFaviconInput.value.trim())
      .filter(v => v && v.startsWith('custom:')).map(v => v.slice('custom:'.length)));
    const unused = Object.keys(customIcons).filter(id => !used.has(id));
    if (unused.length === 0) return;
    unused.forEach(id => delete customIcons[id]);
    chrome.storage.local.set({ customIcons });
  }

  async function hashPin(pin, salt) {
    const bytes = new TextEncoder().encode(salt + ':' + pin);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  function newSalt() {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  function showPinScreen() {
    setHidden(mainScreen, true);
    setHidden(pinScreen, false);
    pinInput.focus();
  }

  function showMainScreen() {
    setHidden(pinScreen, true);
    setHidden(settingsScreen, true);
    setHidden(mainScreen, false);
  }

  function setBossActionUI(action) {
    setHidden(redirectUrlGroup, action !== 'redirect');
    // Blur only applies when the tab is disguised, not when it's redirected away
    setHidden(blurRow, action === 'redirect');
  }

  // Put stored settings into the UI (used on open and after an import)
  function applySettingsToUI(data) {
    bossKeyAction.value = data.bossKeyAction === 'redirect' ? 'redirect' : 'disguise';
    setBossActionUI(bossKeyAction.value);
    bossKeyRedirect.value = data.bossKeyRedirectUrl || '';
    bossKeyMute.checked = data.bossKeyMute === true;
    bossKeyBlur.checked = data.bossKeyBlur === true;
    disguiseBackgroundSwitch.checked = data.disguiseMode === 'background';
    pinRelock.value = String(RELOCK_OPTIONS.includes(data.pinRelockMinutes) ? data.pinRelockMinutes : 0);

    masterSwitch.checked = data.masterSwitch !== false; // default true
    historySwitch.checked = data.historySwitch === true; // default false

    rulesCache = data.rules || [];
    applyLanguage(data.language || 'en'); // also renders the rules and status
  }

  function buildPresetTiles() {
    PRESETS.forEach(preset => {
      const tile = document.createElement('button');
      tile.type = 'button';
      tile.className = 'preset-tile';
      tile.title = preset.name;
      tile.dataset.favicon = preset.favicon;
      tile.setAttribute('aria-pressed', 'false');
      const img = document.createElement('img');
      img.src = faviconSrc(preset.favicon);
      img.alt = preset.name;
      tile.appendChild(img);
      tile.addEventListener('click', () => {
        spoofTitleInput.value = preset.title;
        spoofFaviconInput.value = preset.favicon;
        updateFaviconPreview();
      });
      presetGrid.appendChild(tile);
    });
  }

  // Load existing data
  async function init() {
    buildPresetTiles();

    const [data, local, session] = await Promise.all([
      chrome.storage.sync.get([...SETTING_KEYS, 'pin', 'pinHash', 'pinSalt']),
      chrome.storage.local.get('customIcons'),
      chrome.storage.session.get('unlockedUntil')
    ]);
    customIcons = local.customIcons || {};

    if (data.pin && !data.pinHash) {
      // Migrate a plain-text PIN from older versions to a hash
      data.pinSalt = newSalt();
      data.pinHash = await hashPin(data.pin, data.pinSalt);
      chrome.storage.sync.set({ pinHash: data.pinHash, pinSalt: data.pinSalt });
      chrome.storage.sync.remove('pin');
    }
    currentPinHash = data.pinHash || '';
    currentPinSalt = data.pinSalt || '';

    applySettingsToUI(data);

    // Main screen stays hidden until we know whether a PIN is needed
    const stillUnlocked = Date.now() < (session.unlockedUntil || 0);
    if (currentPinHash && !stillUnlocked) {
      showPinScreen();
    } else {
      showMainScreen();
    }
  }
  init();

  // Language switch listeners
  document.querySelectorAll('.lang-option').forEach(el => {
    el.addEventListener('click', () => {
      const lang = el.getAttribute('data-lang');
      applyLanguage(lang);
      chrome.storage.sync.set({ language: lang });
    });
  });

  // Toggle listeners
  masterSwitch.addEventListener('change', (e) => {
    chrome.storage.sync.set({ masterSwitch: e.target.checked });
    updateBrandStatus();
  });

  historySwitch.addEventListener('change', (e) => {
    chrome.storage.sync.set({ historySwitch: e.target.checked });
  });

  panicBtn.addEventListener('click', async () => {
    const response = await chrome.runtime.sendMessage({ action: 'panic' });
    const count = (response && response.count) || 0;
    if (count === 0) {
      toast(t('panicNone'), 'error');
      return;
    }
    toast(t('panicDone', { n: count }));
    if (!isTabMode) setTimeout(() => window.close(), 900);
  });

  // Fill the site field from the tab you're looking at
  currentSiteBtn.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    try {
      const url = new URL(tab.url);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('not a web page');
      targetDomainInput.value = url.hostname.replace(/^www\./, '');
      spoofTitleInput.focus();
    } catch (e) {
      toast(t('currentSiteUnavailable'), 'error');
    }
  });

  spoofFaviconInput.addEventListener('input', updateFaviconPreview);

  // Shrink an uploaded image to a small square PNG so it stays light in storage
  function imageToIconDataUrl(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = ICON_SIZE;
        const width = img.naturalWidth || ICON_SIZE;
        const height = img.naturalHeight || ICON_SIZE;
        const scale = Math.min(ICON_SIZE / width, ICON_SIZE / height);
        const w = width * scale;
        const h = height * scale;
        canvas.getContext('2d').drawImage(img, (ICON_SIZE - w) / 2, (ICON_SIZE - h) / 2, w, h);
        URL.revokeObjectURL(objectUrl);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Not an image'));
      };
      img.src = objectUrl;
    });
  }

  uploadIconBtn.addEventListener('click', () => {
    if (needsTabForFiles()) {
      openFullTab();
      return;
    }
    uploadIconInput.click();
  });

  uploadIconInput.addEventListener('change', async () => {
    const file = uploadIconInput.files[0];
    uploadIconInput.value = '';
    if (!file) return;
    if (file.size > MAX_UPLOAD_BYTES) {
      toast(t('imageTooLarge'), 'error');
      return;
    }
    let dataUrl;
    try {
      dataUrl = await imageToIconDataUrl(file);
    } catch (e) {
      toast(t('imageInvalid'), 'error');
      return;
    }
    const id = Date.now().toString(36);
    customIcons[id] = dataUrl;
    await chrome.storage.local.set({ customIcons });
    spoofFaviconInput.value = 'custom:' + id;
    updateFaviconPreview();
    toast(t('imageUploaded'));
  });

  // Add or save rule
  addRuleBtn.addEventListener('click', async () => {
    const targetDomain = cleanPattern(targetDomainInput.value);
    if (!targetDomain) {
      toast(t('alertTargetDomain'), 'error');
      targetDomainInput.focus();
      return;
    }

    const { rules = [] } = await chrome.storage.sync.get('rules');
    const existingIndex = editingId ? rules.findIndex(r => r.id === editingId) : -1;
    const newRule = {
      id: editingId || Date.now().toString(),
      targetDomain: targetDomain,
      spoofTitle: spoofTitleInput.value.trim(),
      spoofFavicon: normalizeFavicon(spoofFaviconInput.value.trim()),
      enabled: existingIndex >= 0 ? rules[existingIndex].enabled !== false : true
    };

    // When editing, replace the rule in place; if it was deleted meanwhile, add it back
    if (existingIndex >= 0) {
      rules[existingIndex] = newRule;
    } else {
      rules.push(newRule);
    }
    const wasEditing = !!editingId;
    clearRuleForm();
    setEditing(null);
    await saveRules(rules);
    toast(t(wasEditing ? 'ruleSaved' : 'ruleAdded'));
  });

  cancelEditBtn.addEventListener('click', () => {
    clearRuleForm();
    setEditing(null);
  });

  function renderRules(rules) {
    rulesCache = rules;
    rulesList.innerHTML = '';
    setHidden(noRules, rules.length > 0);
    ruleCount.textContent = rules.length ? String(rules.length) : '';
    updateBrandStatus();

    rules.forEach(rule => {
      const enabled = rule.enabled !== false;
      const li = document.createElement('li');
      li.className = 'rule' + (enabled ? '' : ' disabled');

      const img = document.createElement('img');
      img.className = 'rule-img';
      img.src = faviconSrc(rule.spoofFavicon);
      img.alt = '';
      img.onerror = () => { if (!img.src.endsWith(FALLBACK_ICON)) img.src = FALLBACK_ICON; };

      const text = document.createElement('div');
      text.className = 'rule-text';
      const pattern = document.createElement('div');
      pattern.className = 'rule-pattern';
      pattern.textContent = rule.targetDomain;
      pattern.title = rule.targetDomain;
      const sub = document.createElement('div');
      sub.className = 'rule-sub';
      sub.textContent = rule.spoofTitle || t('titleUnchanged');
      text.appendChild(pattern);
      text.appendChild(sub);

      const actions = document.createElement('div');
      actions.className = 'rule-actions';

      // Per-rule on/off switch
      const toggleLabel = document.createElement('label');
      toggleLabel.className = 'switch small';
      toggleLabel.title = t('ruleToggle');
      const toggle = document.createElement('input');
      toggle.type = 'checkbox';
      toggle.checked = enabled;
      toggle.addEventListener('change', () => setRuleEnabled(rule.id, toggle.checked));
      const slider = document.createElement('span');
      slider.className = 'slider';
      toggleLabel.appendChild(toggle);
      toggleLabel.appendChild(slider);

      const editBtn = document.createElement('button');
      editBtn.className = 'icon-btn small';
      editBtn.title = t('edit');
      editBtn.appendChild(svgIcon('pencil'));
      editBtn.onclick = () => {
        targetDomainInput.value = rule.targetDomain;
        spoofTitleInput.value = rule.spoofTitle || '';
        spoofFaviconInput.value = rule.spoofFavicon || '';
        updateFaviconPreview();
        targetDomainInput.focus();
        // Keep the rule saved until "Save changes" is clicked, so closing the popup doesn't lose it
        setEditing(rule.id);
      };

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'icon-btn small delete';
      deleteBtn.title = t('delete');
      deleteBtn.appendChild(svgIcon('trash'));
      deleteBtn.onclick = () => deleteRule(rule.id);

      actions.appendChild(toggleLabel);
      actions.appendChild(editBtn);
      actions.appendChild(deleteBtn);

      li.appendChild(img);
      li.appendChild(text);
      li.appendChild(actions);
      rulesList.appendChild(li);
    });
  }

  async function setRuleEnabled(id, enabled) {
    const { rules = [] } = await chrome.storage.sync.get('rules');
    await saveRules(rules.map(r => r.id === id ? { ...r, enabled } : r));
  }

  async function deleteRule(id) {
    const { rules = [] } = await chrome.storage.sync.get('rules');
    if (editingId === id) {
      clearRuleForm();
      setEditing(null);
    }
    await saveRules(rules.filter(r => r.id !== id));
    toast(t('ruleDeleted'));
  }

  // PIN Login Logic
  function updatePinDots() {
    const length = pinInput.value.length;
    pinDots.querySelectorAll('span').forEach((dot, i) => dot.classList.toggle('filled', i < length));
  }

  function rejectPin(message) {
    pinError.textContent = message;
    pinDots.classList.remove('shake');
    void pinDots.offsetWidth; // restart the animation
    pinDots.classList.add('shake');
  }

  // Failed attempts are kept in storage so closing and reopening the popup doesn't reset the lockout
  pinInput.addEventListener('input', async () => {
    pinInput.value = pinInput.value.replace(/\D/g, '');
    updatePinDots();
    const val = pinInput.value;
    pinError.textContent = '';
    if (val.length !== 4) return;
    pinInput.value = '';
    updatePinDots();

    const { pinFails = 0, pinLockUntil = 0 } = await chrome.storage.local.get(['pinFails', 'pinLockUntil']);
    if (Date.now() < pinLockUntil) {
      rejectPin(t('tooManyAttempts', { s: Math.ceil((pinLockUntil - Date.now()) / 1000) }));
      return;
    }

    if (await hashPin(val, currentPinSalt) === currentPinHash) {
      chrome.storage.local.set({ pinFails: 0, pinLockUntil: 0 });
      // Stay unlocked for the chosen time (storage.session is wiped when the browser closes)
      const minutes = Number(pinRelock.value);
      if (minutes > 0) {
        chrome.storage.session.set({ unlockedUntil: Date.now() + minutes * 60 * 1000 });
      }
      showMainScreen();
    } else {
      const fails = pinFails + 1;
      if (fails >= MAX_PIN_ATTEMPTS) {
        chrome.storage.local.set({ pinFails: 0, pinLockUntil: Date.now() + PIN_LOCKOUT_MS });
        rejectPin(t('lockedFor', { s: PIN_LOCKOUT_MS / 1000 }));
      } else {
        chrome.storage.local.set({ pinFails: fails });
        rejectPin(t('incorrectPin'));
      }
    }
  });

  // Settings Logic

  // Show the PIN switch as on only when a PIN is actually saved
  function syncPinSwitch() {
    pinSwitch.checked = !!currentPinHash;
    setHidden(pinSetupGroup, !pinSwitch.checked);
    setHidden(relockGroup, !currentPinHash);
    const key = currentPinHash ? 'changePin' : 'savePin';
    savePinBtn.setAttribute('data-i18n', key);
    savePinBtn.textContent = t(key);
    newPinInput.value = '';
  }

  openSettingsBtn.addEventListener('click', () => {
    syncPinSwitch();
    setHidden(mainScreen, true);
    setHidden(settingsScreen, false);
  });

  closeSettingsBtn.addEventListener('click', () => {
    // Explicitly save all settings just in case 'change' events were missed
    chrome.storage.sync.set({
      bossKeyAction: bossKeyAction.value,
      bossKeyRedirectUrl: bossKeyRedirect.value.trim(),
      bossKeyMute: bossKeyMute.checked,
      bossKeyBlur: bossKeyBlur.checked
    });
    showMainScreen();
  });

  pinSwitch.addEventListener('change', async () => {
    if (pinSwitch.checked) {
      // Nothing is locked until a PIN is entered and saved
      setHidden(pinSetupGroup, false);
      newPinInput.focus();
      return;
    }
    if (!currentPinHash) {
      setHidden(pinSetupGroup, true);
      return;
    }
    if (!await confirmDialog(t('confirmPinOff'), t('turnOff'))) {
      pinSwitch.checked = true;
      return;
    }
    await chrome.storage.sync.remove(['pin', 'pinHash', 'pinSalt']);
    chrome.storage.session.remove('unlockedUntil');
    currentPinHash = '';
    currentPinSalt = '';
    syncPinSwitch();
    toast(t('pinRemoved'));
  });

  savePinBtn.addEventListener('click', async () => {
    const newPin = newPinInput.value;
    if (!/^\d{4}$/.test(newPin)) {
      toast(t('pinMustBe4'), 'error');
      newPinInput.focus();
      return;
    }
    const salt = newSalt();
    const hash = await hashPin(newPin, salt);
    await chrome.storage.sync.set({ pinHash: hash, pinSalt: salt });
    chrome.storage.sync.remove('pin');
    chrome.storage.session.remove('unlockedUntil');
    currentPinHash = hash;
    currentPinSalt = salt;
    syncPinSwitch();
    toast(t('pinSaved'));
  });

  newPinInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') savePinBtn.click();
  });

  pinRelock.addEventListener('change', () => {
    chrome.storage.sync.set({ pinRelockMinutes: Number(pinRelock.value) });
    chrome.storage.session.remove('unlockedUntil');
  });

  disguiseBackgroundSwitch.addEventListener('change', (e) => {
    chrome.storage.sync.set({ disguiseMode: e.target.checked ? 'background' : 'always' });
  });

  bossKeyAction.addEventListener('change', (e) => {
    const action = e.target.value;
    chrome.storage.sync.set({ bossKeyAction: action });
    setBossActionUI(action);
  });

  bossKeyRedirect.addEventListener('input', (e) => {
    chrome.storage.sync.set({ bossKeyRedirectUrl: e.target.value.trim() });
  });

  bossKeyMute.addEventListener('change', (e) => {
    chrome.storage.sync.set({ bossKeyMute: e.target.checked });
  });

  bossKeyBlur.addEventListener('change', (e) => {
    chrome.storage.sync.set({ bossKeyBlur: e.target.checked });
  });

  changeShortcutsBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
  });

  cleanHistoryBtn.addEventListener('click', async () => {
    cleanHistoryBtn.disabled = true;
    const response = await chrome.runtime.sendMessage({ action: 'sweep-history' });
    cleanHistoryBtn.disabled = false;
    toast(t('cleanHistoryDone', { n: (response && response.count) || 0 }));
  });

  // Backup: export
  exportBtn.addEventListener('click', async () => {
    const settings = await chrome.storage.sync.get(SETTING_KEYS);
    const usedIcons = {};
    (settings.rules || []).forEach(rule => {
      const id = rule.spoofFavicon && rule.spoofFavicon.startsWith('custom:') && rule.spoofFavicon.slice('custom:'.length);
      if (id && customIcons[id]) usedIcons[id] = customIcons[id];
    });
    const backup = {
      app: 'ninja-tab',
      version: 1,
      exportedAt: new Date().toISOString(),
      settings,
      customIcons: usedIcons
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ninja-tab-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast(t('exportDone'));
  });

  // Backup: import. Everything is checked field by field, so a hand-edited or hostile file
  // can't put unexpected values into storage.
  function sanitizeRule(rule) {
    if (!rule || typeof rule.targetDomain !== 'string' || !cleanPattern(rule.targetDomain)) return null;
    const favicon = typeof rule.spoofFavicon === 'string' && /^(https?:\/\/|custom:|bundled:[\w-]+\.png$)/i.test(rule.spoofFavicon)
      ? rule.spoofFavicon : '';
    return {
      id: typeof rule.id === 'string' && rule.id ? rule.id : Date.now().toString() + Math.random().toString(36).slice(2, 6),
      targetDomain: cleanPattern(rule.targetDomain),
      spoofTitle: typeof rule.spoofTitle === 'string' ? rule.spoofTitle.slice(0, 300) : '',
      spoofFavicon: favicon,
      enabled: rule.enabled !== false
    };
  }

  function sanitizeSettings(s) {
    const out = { rules: (Array.isArray(s.rules) ? s.rules : []).map(sanitizeRule).filter(Boolean) };
    ['masterSwitch', 'historySwitch', 'bossKeyMute', 'bossKeyBlur'].forEach(key => {
      if (typeof s[key] === 'boolean') out[key] = s[key];
    });
    if (i18n[s.language]) out.language = s.language;
    if (['disguise', 'redirect'].includes(s.bossKeyAction)) out.bossKeyAction = s.bossKeyAction;
    if (typeof s.bossKeyRedirectUrl === 'string') out.bossKeyRedirectUrl = s.bossKeyRedirectUrl.slice(0, 2000);
    if (['always', 'background'].includes(s.disguiseMode)) out.disguiseMode = s.disguiseMode;
    if (RELOCK_OPTIONS.includes(s.pinRelockMinutes)) out.pinRelockMinutes = s.pinRelockMinutes;
    return out;
  }

  importBtn.addEventListener('click', () => {
    if (needsTabForFiles()) {
      openFullTab();
      return;
    }
    importInput.click();
  });

  importInput.addEventListener('change', async () => {
    const file = importInput.files[0];
    importInput.value = '';
    if (!file) return;

    let backup;
    try {
      backup = JSON.parse(await file.text());
    } catch (e) {
      backup = null;
    }
    // Backups made before the rename say 'favicon-swapper'
    if (!backup || !BACKUP_APP_IDS.includes(backup.app) || typeof backup.settings !== 'object' || !backup.settings) {
      toast(t('importInvalid'), 'error');
      return;
    }
    if (!await confirmDialog(t('importConfirm'), t('replace'))) return;

    const settings = sanitizeSettings(backup.settings);
    const importedIcons = {};
    Object.entries(backup.customIcons || {}).forEach(([id, dataUrl]) => {
      if (typeof dataUrl === 'string' && dataUrl.startsWith('data:image/') && dataUrl.length < 200000) {
        importedIcons[id] = dataUrl;
      }
    });

    customIcons = { ...customIcons, ...importedIcons };
    await chrome.storage.local.set({ customIcons });
    try {
      await chrome.storage.sync.set(settings);
    } catch (e) {
      toast(t('saveFailed'), 'error');
      return;
    }
    const data = await chrome.storage.sync.get(SETTING_KEYS);
    applySettingsToUI(data);
    pruneCustomIcons(data.rules || []);
    toast(t('importDone', { n: settings.rules.length }));
  });
});

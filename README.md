<p align="center">
  <img src="extension/icons/icon128.png" width="96" alt="Ninja Tab icon">
</p>

<h1 align="center">Ninja Tab</h1>

<p align="center">
  A Chrome extension that disguises your tabs as Google Docs, Gmail, Outlook and more.<br>
  Boss Key, panic button, PIN lock and history cleanup. Works in Chrome, Edge, Brave and Opera.
</p>

---

## Features

- **Disguise any site.** Change a site's tab title and icon. Pick one of ten ready-made looks (Google Docs, Sheets, Slides, Drive, Gmail, Classroom, Google Search, Wikipedia, Google Translate, Outlook), type your own, or upload an image.
- **Flexible rules.** `example.com` covers the site and its subdomains, `*.example.com` only the subdomains, and `example.com/some/path` just one section. Each rule can be switched on or off.
- **Boss Key** (`Alt+Shift+B`). Instantly turns the current tab into Google search. It can also mute the tab and blur the page, or redirect away instead.
- **Panic button.** Hides every open tab that matches a rule at once.
- **History cleanup.** Deletes visits to your disguised sites when the tab closes, and can clean up past visits too.
- **Background mode.** Shows the real page while you use it and disguises it only when you switch to another tab.
- **PIN lock.** Protects the settings with a 4-digit PIN (stored as a salted hash), with an optional grace period.
- **Backup.** Export and import your rules and settings as a file.
- **English and Turkish.** Light and dark themes.

The ninja in the toolbar shows the state at a glance: eyes open when Ninja Tab is on, asleep when it's off.

## Install

Ninja Tab isn't in the Chrome Web Store yet, so you add it by hand:

1. Download `Ninja-Tab-v1.1.0.zip` from the [latest release](../../releases/latest) (or from the website) and unzip it. You'll get a `ninja-tab` folder.
2. Open `chrome://extensions` and turn on **Developer mode** (top right).
3. Click **Load unpacked** and choose the `ninja-tab` folder.

To run it straight from this repository instead, choose the `extension` folder in step 3.

In Edge, Brave or Opera, use `edge://extensions`, `brave://extensions` or `opera://extensions`.

### Updating

Replace the folder with the new version, then click the reload arrow on Ninja Tab at `chrome://extensions`. Your rules and settings stay.

## Privacy

Ninja Tab has no servers, no account and no tracking. Rules and settings are saved by Chrome (`chrome.storage`) and follow you through Chrome sync if you use it. Preset icons load from the sites they belong to, the same way any page loads its icon.

What the permissions are for:

| Permission | Why |
| --- | --- |
| `storage` | Save your rules and settings |
| `tabs` | Read tab addresses to match rules, and run the Boss Key and panic button |
| `history` | Delete visits to disguised sites |
| Access to all sites | Change the title and icon on the sites you choose |

Ninja Tab changes what the tab bar and your history show. The address bar still shows the real address.

## Project layout

```
extension/   The extension itself (Manifest V3)
  manifest.json
  background.js   History cleanup, Boss Key, panic button, toolbar icon
  content.js      Swaps titles and icons on matching pages
  rules.js        Rule matching shared by all parts
  popup.html/.css/.js   The popup and settings
  icons/
docs/        The website (served by GitHub Pages)
```

## License

[MIT](LICENSE)

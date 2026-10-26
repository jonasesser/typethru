# Store listing

Texts and assets for the Chrome Web Store and Microsoft Edge Add-ons.
Field limits can change; check them in the developer dashboards when submitting.

## Assets

| Asset | Chrome Web Store | Edge Add-ons | File |
|---|---|---|---|
| Store icon / logo | 128×128 (96×96 artwork) | 300×300 | `images/chrome-store-icon-128.png`, `images/edge-logo-300.png` |
| Small promo tile | 440×280 | 440×280 | `images/small-tile-440x280.png` |
| Marquee / large promo tile | 1400×560 | 1400×560 | `images/marquee-1400x560.png` |
| Screenshots | 1280×800, 1–5 | 1280×800, up to 6 | `images/screenshot-1-password.png` … `images/screenshot-5-status.png` |

Screenshots, in this order:

1. `screenshot-1-password.png` – popup over a login screen, password field
2. `screenshot-2-layouts.png` – keyboard layouts and AltGr characters (dark mode)
3. `screenshot-3-scripts.png` – Script mode with progress
4. `screenshot-4-admin.png` – settings page: allowed hosts and About
5. `screenshot-5-status.png` – status when no web console is open

The popup in the screenshots is the real extension UI rendered with example data
(`vcenter.example.com`); the VM screen behind it is an illustration. They show version
1.0.0 – recreate them if the store release has another version.

## Common texts

**Name**

TypeThru – Paste text into the vSphere web console

**Short description / summary** (max. 132 characters)

Types text such as passwords, commands or license keys into the vSphere HTML5 web console, where copy and paste is not available.

**Category**

Developer Tools

**Language**

English

**Website / homepage**

https://relyper.de/projects/typethru (project page; source code: https://github.com/jonasesser/typethru)

**Support**

https://github.com/jonasesser/typethru/issues

**Privacy policy**

https://github.com/jonasesser/typethru/blob/main/store/PRIVACY.md

## Detailed description

```
The vSphere HTML5 web console has no clipboard support for the guest. Long passwords, shell commands, license keys or IP configurations have to be typed by hand – slow and error-prone, especially on login screens, during OS installation or in recovery consoles without VMware Tools.

TypeThru fixes that. Open the web console, click the TypeThru icon, enter your text and press Enter. TypeThru sends it to the console as keystrokes.

KEYBOARD LAYOUTS
The console sends characters as US key positions. If the guest uses another layout, many characters arrive wrong. TypeThru types every character as the right physical key for the keyboard layout set inside the VM – including AltGr characters like @ { } [ ] \ | – so the right characters appear:
• German (Germany, Austria)
• Swiss German
• French (AZERTY)
• English (UK)
• Spanish
• Italian
• US

FEATURES
• Types any text into the vSphere web console
• Script mode: multi-line text and scripts, line by line, with speed setting, progress and cancel
• Keyboard layouts including AltGr characters and dead keys
• Shows and switches the console's "Enforce US Keyboard Layout" button
• Shows the target page before sending
• Allowed hosts configurable in the options or centrally by enterprise policy
• Keyboard shortcut Ctrl+Shift+Y

PRIVACY AND SECURITY
• Only three permissions: activeTab, scripting and storage – no access to other sites
• Works only on the tab you are on, after you click the icon
• No network requests, no analytics, no remote code
• Your text is never stored; only your settings are remembered
• Open source: https://github.com/jonasesser/typethru

USE CASES
• Passwords on Windows and Linux login screens
• Commands, scripts and configuration snippets
• License and product keys during OS installation
• IP addresses, hostnames and domain-join details

LIMITATIONS
• Characters that are not on the VM's keyboard layout are rejected instead of being typed wrong.
• TypeThru uses the console's internal input functions, which may change with vSphere updates.

TypeThru is an independent open source project and is not affiliated with or endorsed by Broadcom or VMware. vSphere is a trademark of its respective owner.
```

## Chrome Web Store – Privacy practices tab

Field by field, in the order of the form ("Datenschutz" in the German dashboard).

### Single purpose (Alleiniger Zweck)

```
TypeThru has a single purpose: it types text that the user enters in its popup (for example a password, a command or a script) into the VMware vSphere HTML5 web console open in the current tab, as key presses for the keyboard layout set inside the virtual machine. The vSphere web console has no clipboard support, so this replaces typing the text by hand.
```

### Permission justification (Gründe für die Berechtigung)

**activeTab**

```
Gives access to the current tab only after the user clicks the TypeThru icon or presses its keyboard shortcut. TypeThru needs this to find the vSphere web console on that page and to type the user's text into it. TypeThru requests no host permissions and cannot access any other tab or website.
```

**scripting**

```
Used to run small functions that are packaged with the extension in the current tab: finding the web console, reading and switching the console's own "Enforce US Keyboard Layout" button, and passing the user's text to the console as key presses. No remote code is loaded.
```

**storage**

```
Saves the user's settings on the device: the selected VM keyboard layout, popup preferences and the list of allowed vCenter hosts. Also reads settings that an administrator provides by enterprise policy (managed storage). The text the user types is never stored.
```

Host permissions: none (do not add any).

### Remote code (Nutzt du Remote Code?)

**No, I am not using remote code** (Nein, ich verwende "Remote Code" nicht).

All JavaScript is part of the package; there are no external scripts, no `eval` and no code downloaded at runtime.

### Data types (Welche Nutzerdaten …)

The Chrome Web Store requires disclosure even when data is only handled locally and never
transmitted. TypeThru handles the text the user types – typically passwords – so declare:

| Data type | Select? | Reason |
|---|---|---|
| Personenidentifizierbare Informationen | no | not handled |
| Gesundheitsinformationen | no | not handled |
| Finanzdaten und Zahlungsinformationen | no | not handled |
| **Authentifizierungsdaten** | **yes** | Passwords the user types into the popup are passed to the console in the current tab. They are not stored or transmitted anywhere else. |
| Persönliche Kommunikation | no | not handled |
| Ort | no | not handled |
| Webprotokoll | no | the current tab's host is only compared with the allowed hosts in memory, nothing is recorded |
| Nutzeraktivität | no | no keyboard or mouse monitoring; only the text entered in the popup is sent |
| Websitecontent | no | page content is not read or collected (only the console widget and its layout button are used) |

### Certifications (Ich bestätige …)

Confirm all three:

- [x] I do not sell or transfer user data to third parties, outside of the approved use cases
- [x] I do not use or transfer user data for purposes that are unrelated to my item's single purpose
- [x] I do not use or transfer user data to determine creditworthiness or for lending purposes

### Privacy policy (Datenschutzbestimmungen)

```
https://github.com/jonasesser/typethru/blob/main/store/PRIVACY.md
```

## Edge Add-ons – Properties and listing

**Display name**

TypeThru – Paste text into the vSphere web console

**Short description**

Types text such as passwords, commands or license keys into the vSphere HTML5 web console, where copy and paste is not available.

**Description**

Use the detailed description above.

**Search terms**

```
vsphere, vcenter, web console, paste, keyboard layout, sysadmin, password
```

**Category**

Developer tools

**Privacy policy required**

Yes – the extension handles user-entered text. Use the privacy policy URL above.

**Notes for certification**

```
TypeThru works only on the VMware vSphere HTML5 web console (vCenter "Launch Web Console"). To test without a vCenter:
1. Load the extension and open any web page.
2. Click the icon: the popup reports "No vSphere web console found in this tab." This is expected.
The full source code and build instructions are available at https://github.com/jonasesser/typethru. The package is built with "npm run build" (esbuild, not minified) from the TypeScript sources.
```

## Submission checklist

- [ ] `npm test`, `npm run check` and `npm run build` pass
- [ ] Version in `package.json` bumped
- [ ] Tag the version and use `typethru-extension-<version>.zip` from the GitHub release (manifest.json at the zip root)
- [ ] Screenshots added
- [ ] Privacy policy URL reachable
- [ ] Chrome: developer account registered (one-time fee)
- [ ] Edge: Partner Center account registered (free, personal GitHub or Microsoft account)

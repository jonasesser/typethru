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

https://github.com/jonasesser/typethru

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

**Single purpose**

```
TypeThru has a single purpose: typing text that the user enters in the popup into the vSphere HTML5 web console open in the current tab, typed as the keys of the keyboard layout set inside the VM.
```

**Permission justification: activeTab**

```
Used to access the current tab only after the user clicks the TypeThru icon or presses its shortcut, to find the vSphere web console on that page. TypeThru has no host permissions and cannot access any other tab or site.
```

**Permission justification: scripting**

```
Used to run small functions in the current tab: detecting the web console, reading and switching the console's keyboard layout button, and passing the user's text to the console's input function. No remote code is loaded; all code is packaged with the extension.
```

**Permission justification: storage**

```
Used to save the user's settings on the device: the selected guest keyboard layout and the list of allowed vCenter hosts. Also used to read settings provided by an enterprise policy (managed storage). The entered text is never stored.
```

**Remote code**

No, I am not using remote code.

**Data usage**

TypeThru does not collect or transmit user data. The text the user enters is only passed to the console in the current tab and is not stored or sent anywhere. Only settings (selected keyboard layout, allowed hosts) are saved locally.

Suggested answers: leave all data types unchecked, then confirm the three certifications (no sale of data, no use unrelated to the single purpose, no use for creditworthiness or lending). Re-check this against the current Chrome Web Store definitions before submitting, because the popup handles passwords.

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

# TypeThru

**Paste text into the vSphere web console.**

The vSphere HTML5 web console has no clipboard support for the guest. TypeThru is a
small browser extension that sends text to the console as keystrokes, so you don't
have to type long passwords, commands or license keys by hand.

It also handles a common problem for non-US users: when the guest uses a German
keyboard layout, it converts the text so the right characters arrive.

> TypeThru is an independent project and is not affiliated with or endorsed by
> Broadcom or VMware. vSphere and vCenter are trademarks of their respective owners.

## Use cases

- Passwords on Windows and Linux login screens
- Commands and one-liners in a shell or PowerShell
- License and product keys during OS installation
- IP addresses, hostnames and domain-join details
- Recovery consoles and guests without VMware Tools

## Features

- Sends text to the web console as keystrokes
- Optional German (DE) → US keyboard layout conversion
- Shows and switches the console's own "Enforce US Keyboard Layout" button
- Shows the target before sending, optional host allowlist
- Minimal permissions, no network access, nothing stored
- Bookmarklet version for browsers where extensions cannot be installed

## Installation

### Extension (Chrome / Edge)

1. Download or clone this repository.
2. Open `chrome://extensions` or `edge://extensions`.
3. Turn on **Developer mode**.
4. Click **Load unpacked** and select the `extension` folder.
5. Optional: pin TypeThru to the toolbar.

Store releases are planned.

### Bookmarklet

If your browser does not allow extensions, open
[`bookmarklet/install.html`](bookmarklet/install.html) in the browser and drag one of
the buttons onto the favorites bar. See [Bookmarklet](#bookmarklet-1) below.

## Usage

1. Open the VM with **Launch Web Console** and click once into the console.
2. Click the TypeThru icon or press **Ctrl+Shift+Y**.
3. Check that the **Target** line shows your vCenter.
4. Enter the text and press **Enter** or click **Send**.
5. Click back into the console.

Test with a visible text field first (for example a text editor in the guest) before
sending a password.

## Keyboard layouts

The console sends characters as US key positions. If the guest uses a German layout,
enable **Convert German (DE) → US layout**: each character is replaced by the US
character on the same physical key. Turn it off for US guests. The setting is
remembered.

With conversion enabled, these characters are rejected instead of being typed wrong:

- Characters that need AltGr: `@ € { [ ] } \ ~ | µ ² ³`
- The ISO `< >` key

Support for these is tracked in [#6](https://github.com/jonasesser/typethru/issues/6).

### Console layout button

The web console has its own **Enforce US Keyboard Layout** button. The popup checkbox
**Console: enforce US keyboard layout** shows its state and switches it for you.

## Configuration

Restrict TypeThru to your own vCenter hosts in `extension/popup.js`:

```js
const ALLOWED_HOSTS = ['vcenter.example.local'];
```

Reload the extension after changing it. An empty list (default) accepts any page with
a web console.

## Bookmarklet

The bookmarklet offers the core function without installing anything:

- Built from [`bookmarklet/typethru.js`](bookmarklet/typethru.js) with
  `npm run build:bookmarklet`
- Two variants: with DE → US conversion and without
- The browser's input dialog shows the text in clear text
- No control of the console layout button

## Security

TypeThru needs only `activeTab` and `scripting`, has no host permissions, no network
access, no background worker and never stores the text. Details, residual risks and
recommendations are in [SECURITY.md](SECURITY.md).

## Development

```
extension/        Browser extension (Manifest V3)
  manifest.json
  popup.html
  popup.js        Console detection, layout button, sending
  layout.js       Keyboard layout conversion
bookmarklet/      Bookmarklet source, build script and install page
test/             Unit tests and manual test matrix
tools/            DevTools scripts for diagnostics and manual tests
```

Run the unit tests (Node 18 or newer, no dependencies):

```
npm test
```

Manual tests against a real console are described in
[test/MANUAL-TESTS.md](test/MANUAL-TESTS.md). The scripts in `tools/` help with
troubleshooting:

- `tools/console-diagnostics.js` reports where the console widget lives, its input
  methods and the layout button state. It does not type anything.
- `tools/send-test-string.js` sends a test string to the guest without conversion.

## Troubleshooting

| Message | Cause / fix |
|---|---|
| No vSphere web console found in this tab. | Open the VM with **Launch Web Console** and use TypeThru in that tab. |
| More than one console found in this tab. | Open each console in its own tab. |
| Cannot access this tab | The browser blocks extensions on this page (for example `chrome://` pages). |
| Not supported (AltGr / <> key) | The text contains a character that cannot be sent with conversion enabled. |
| Wrong characters in the guest | Match the conversion setting to the guest's keyboard layout. |
| "Load unpacked" does nothing | Your browser may be managed by a policy that blocks unpacked extensions. Use the bookmarklet or ask your administrator. |

Please include the output of `tools/console-diagnostics.js` when reporting a problem.

## Roadmap

- Multi-line input (send line by line with Enter)
- More layouts (Swiss German, French, UK, …)
- Adjustable typing speed for slow guests
- Command snippets (never passwords)
- Chrome Web Store and Edge Add-ons releases

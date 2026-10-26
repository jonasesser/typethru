# TypeThru

**Paste text into the vSphere web console.**

The vSphere HTML5 web console has no clipboard support for the guest. TypeThru is a
small browser extension that sends text to the console as keystrokes, so you don't
have to type long passwords, commands or license keys by hand.

It also handles a common problem for non-US users: when the guest uses another
keyboard layout (German, Swiss German, French, UK, Spanish, Italian), it converts the
text so the right characters arrive.

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
- Keyboard layout conversion for German, Swiss German, French (AZERTY), UK, Spanish and Italian guests
- Shows and switches the console's own "Enforce US Keyboard Layout" button
- Shows the target before sending, optional host allowlist
- Minimal permissions, no network access, nothing stored
- Bookmarklet version for browsers where extensions cannot be installed

## Installation

### Extension (Chrome / Edge)

1. Download or clone this repository.
2. Open `chrome://extensions` or `edge://extensions`.
3. Turn on **Developer mode**.
4. Click **Load unpacked** and select the `dist/extension` folder.
5. Optional: pin TypeThru to the toolbar.

The `dist` folder is created by the build (see [Development](#development)). Store
releases are planned.

### Bookmarklet

If your browser does not allow extensions, open `dist/bookmarklet/install.html` in
the browser and drag one of the buttons onto the favorites bar. See
[Bookmarklet](#bookmarklet-1) below.

## Usage

1. Open the VM with **Launch Web Console** and click once into the console.
2. Click the TypeThru icon or press **Ctrl+Shift+Y**.
3. Check that the **Target** line shows your vCenter.
4. Enter the text and press **Enter** or click **Send**.
5. Click back into the console.

Test with a visible text field first (for example a text editor in the guest) before
sending a password.

## Keyboard layouts

The console sends characters as US key positions. Select the guest's layout under
**Guest keyboard layout** and TypeThru replaces each character with the US character
on the same physical key, so the guest receives what you typed. The selection is
remembered.

| Layout | Notes |
|---|---|
| US (no conversion) | Text is sent as-is |
| German (Germany, Austria) | |
| Swiss German | |
| French (AZERTY) | |
| English (UK) | |
| Spanish | |
| Italian | |

Dead keys (for example `^`, `´`, `` ` ``, `¨`) are sent followed by a space so the
character itself appears.

With conversion, some characters cannot be sent and are rejected instead of being
typed wrong:

- Characters that need AltGr (for example `@ € { [ ] } \ ~ |` on German)
- Characters on the extra key next to left Shift (`< >` on most layouts, `\ |` on UK)
- Characters that are not on the selected keyboard at all

Support for AltGr characters is tracked in
[#6](https://github.com/jonasesser/typethru/issues/6). Layouts are defined as key
tables in `src/extension/layout.ts`; new layouts are welcome.

### Console layout button

The web console has its own **Enforce US Keyboard Layout** button. The popup checkbox
**Console: enforce US keyboard layout** shows its state and switches it for you.

## Configuration

Restrict TypeThru to your own vCenter hosts in `src/extension/popup.ts`:

```ts
const ALLOWED_HOSTS: string[] = ['vcenter.example.local'];
```

Rebuild and reload the extension after changing it. An empty list (default) accepts
any page with a web console.

## Bookmarklet

The bookmarklet offers the core function without installing anything:

- Built from [`src/bookmarklet/typethru.ts`](src/bookmarklet/typethru.ts); it uses
  the same layout module as the extension
- One bookmarklet per guest layout
- The browser's input dialog shows the text in clear text
- No control of the console layout button

## Security

TypeThru needs only `activeTab` and `scripting`, has no host permissions, no network
access, no background worker and never stores the text. Details, residual risks and
recommendations are in [SECURITY.md](SECURITY.md).

## Development

TypeThru is written in TypeScript and built with esbuild. Requires Node 20 or newer.

```
npm install
npm run build     # builds dist/extension, dist/bookmarklet, dist/tools
npm test          # unit tests
npm run check     # type check
```

```
src/
  extension/      Browser extension (Manifest V3)
    manifest.json
    popup.html
    popup.ts      Popup logic
    page.ts       Functions injected into the console page
    layout.ts     Keyboard layout conversion
    wmks.ts       Types for the console widget
  bookmarklet/    Bookmarklet source
  tools/          DevTools scripts for diagnostics and manual tests
scripts/build.ts  Build script
test/             Unit tests and manual test matrix
```

Functions in `page.ts` are serialized and run inside the console page, so they must
stay self-contained (no imports other than types). The build does not minify the
extension, so the shipped code stays readable for review.

Manual tests against a real console are described in
[test/MANUAL-TESTS.md](test/MANUAL-TESTS.md). After building, these scripts help with
troubleshooting (paste them into the DevTools console of the console tab):

- `dist/tools/console-diagnostics.js` reports where the console widget lives, its
  input methods and the layout button state. It does not type anything.
- `dist/tools/send-test-string.js` sends a test string to the guest without
  conversion.

## Troubleshooting

| Message | Cause / fix |
|---|---|
| No vSphere web console found in this tab. | Open the VM with **Launch Web Console** and use TypeThru in that tab. |
| More than one console found in this tab. | Open each console in its own tab. |
| Cannot access this tab | The browser blocks extensions on this page (for example `chrome://` pages). |
| Not supported with this layout | The text contains a character that cannot be typed with the selected guest layout. |
| Wrong characters in the guest | Select the guest's keyboard layout in the popup. |
| "Load unpacked" does nothing | Your browser may be managed by a policy that blocks unpacked extensions. Use the bookmarklet or ask your administrator. |

Please include the output of `dist/tools/console-diagnostics.js` when reporting a
problem.

## Roadmap

- Multi-line input (send line by line with Enter)
- More layouts (Nordic, Belgian, …)
- Adjustable typing speed for slow guests
- Command snippets (never passwords)
- Chrome Web Store and Edge Add-ons releases

## License

[MIT](LICENSE)

# Security

TypeThru handles sensitive text such as passwords. This document describes what it
can access, how the text is handled and which risks remain.

## Permissions

| Item | Details |
|---|---|
| Permissions | `activeTab`, `scripting`, `storage` |
| Host permissions | None. TypeThru can only access the tab you are on, and only after you click its icon or press its shortcut. |
| Network | None. No requests, no telemetry, no remote code. |
| Storage | Only settings: the selected VM keyboard layout and the allowed hosts (extension storage on the device). The text is never stored. |
| Clipboard | Not used. |
| Background code | None. There is no service worker; code only runs while the popup is open. |
| Content Security Policy | The popup allows only its own scripts (no inline or remote scripts). |

## Handling of the text

- The text exists only in the popup's input field and in local variables.
- In Script mode the prepared chunks are handed to the console page at once, so sending
  can continue when the popup closes. They are kept in the page only until the script
  is sent or cancelled, then discarded.
- Detecting the console and reading the layout button never receives the text.
- Layout conversion runs inside the extension, not in the web page.
- The text is passed only to the single frame where the console was found.
- After sending, the field is cleared and the popup closes.

## Residual risks

- **The page receives the text.** To type into the console, the text must be handed
  to the page's own console widget. Scripts running on that page could read it. This
  is the same exposure as typing into the console by hand. Use TypeThru only on
  vCenter instances you trust.
- **Look-alike pages.** A malicious page could imitate a web console. The popup shows
  the target origin before sending, and you can restrict TypeThru to your hosts with
  the allowed hosts in the options or by enterprise policy (see README). Using the
  allowlist is recommended; administrators can enforce it for all users.
- **Focus in the guest.** The text goes wherever the guest has keyboard focus. If the
  cursor is in a visible field, a password will be shown in clear text.
- **Show text.** This option displays the text in the popup. Leave it off for
  passwords when others can see your screen.
- **Bookmarklet.** The browser's input dialog shows the text in clear text.
- **Unpacked installs.** Loading from source is intended for review and testing.
  Follow your organization's policy for browser extensions.
- **Undocumented console API.** TypeThru types through the console widget's internal
  connection (raw scan codes via `onKeyVScan`, fallback `sendInputString`). These are
  not public APIs and may change with vSphere updates. TypeThru then reports that no
  console was found. It never uses the console's Unicode key event, which disconnects
  the console.
- **Modifier keys.** Every key stroke presses and releases its keys (including Shift
  and AltGr) in one step, so no modifier stays pressed when sending stops, fails or is
  cancelled.

## Reporting a vulnerability

Please do not open a public issue for security problems. Use GitHub's
**Report a vulnerability** function (Security tab) to contact the maintainer privately.

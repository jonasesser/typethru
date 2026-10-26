# Manual tests

These checks need a real vSphere web console and are not covered by `npm test`.

## Setup

1. Open the VM with **Launch Web Console**.
2. Inside the guest, open a visible text editor (Notepad, `nano`, …). Do not test in a password field.
3. Optional: run [`tools/console-diagnostics.js`](../tools/console-diagnostics.js) in DevTools and keep the output.

## Test strings

Full set, including AltGr characters and the `< >` key:

```
yzYZ!"§$%&/()=?ß+*#'-_.:,;äöüÄÖÜ@€{[]}\~|<>µ²³°^
```

Supported with DE → US conversion:

```
yzYZ!"§$%&/()=?ß+*#'-_.:,;äöüÄÖÜ°^
```

A US-only string (for US guests):

```
abcXYZ0123!@#$%^&*()-_=+[]{};:'",.<>/?\|`~
```

## Matrix

Send the string with the extension, the bookmarklet or [`tools/send-test-string.js`](../tools/send-test-string.js) and compare what appears in the editor.

| Guest layout | Enforce US layout (console button) | TypeThru conversion | String | Expected |
|---|---|---|---|---|
| DE | off | on | supported set | exact match |
| DE | off | on | full set | rejected by TypeThru |
| DE | on | off | full set | to be determined (#6) |
| DE | off | off | full set | wrong characters on DE-specific keys |
| US | off | off | US-only string | exact match |

Record the result for each row (browser, vSphere version, guest OS) in the related issue.

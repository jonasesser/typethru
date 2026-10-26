# Manual tests

These checks need a real vSphere web console and are not covered by `npm test`.

## Setup

1. Open the VM with **Launch Web Console**.
2. Inside the guest, open a visible text editor (Notepad, `nano`, …). Do not test in a password field.
3. Optional: open **Diagnostics** in the TypeThru popup and keep the report.

## Test strings

Full set, including AltGr characters and the `< >` key:

```
yzYZ!"§$%&/()=?ß+*#'-_.:,;äöüÄÖÜ@€{[]}\~|<>µ²³°^
```

Supported with the German layout selected:

```
yzYZ!"§$%&/()=?ß+*#'-_.:,;äöüÄÖÜ°^
```

A US-only string (for US guests):

```
abcXYZ0123!@#$%^&*()-_=+[]{};:'",.<>/?\|`~
```

## Matrix

Send the string with the extension, the bookmarklet or `dist/tools/send-test-string.js` and compare what appears in the editor.

| Guest layout | Enforce US layout (console button) | TypeThru layout | String | Expected |
|---|---|---|---|---|
| DE | off | German | supported set | exact match |
| DE | off | German | full set | rejected by TypeThru |
| DE | on | US (no conversion) | full set | to be determined (#6) |
| DE | off | US (no conversion) | full set | wrong characters on DE-specific keys |
| US | off | US (no conversion) | US-only string | exact match |
| other | off | matching layout | letters, digits, punctuation of that layout | exact match |

Record the result for each row (browser, vSphere version, guest OS) in the related issue.

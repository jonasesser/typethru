# Manual tests

These checks need a real vSphere web console and are not covered by `npm test`.

To test without installing the extension, use the DevTools test kit described in
[CONSOLE-TESTING.md](CONSOLE-TESTING.md). It includes these cases as `typethru.test()`.

## Setup

1. Open the VM with **Launch Web Console**.
2. Inside the guest, open a visible text editor (Notepad, `nano`, …). Do not test in a password field.
3. Optional: open **Diagnostics** in the TypeThru popup and keep the report.

## Test strings

German full set, including AltGr characters and the `< >` key:

```
yzYZ!"§$%&/()=?ß+*#'-_.:,;äöüÄÖÜ@€{[]}\~|<>µ²³°^´`
```

All printable ASCII characters:

```
!"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\]^_`abcdefghijklmnopqrstuvwxyz{|}~
```

## Matrix

Send the string with the extension, the bookmarklet or the test kit and compare what
appears in the editor.

| Guest layout | TypeThru layout | Method | String | Expected |
|---|---|---|---|---|
| DE | German | scan codes | German full set | exact match |
| DE | German | scan codes | printable ASCII | exact match |
| US | US | scan codes | printable ASCII | exact match |
| other | matching layout | scan codes | printable ASCII and the layout's own characters | exact match |
| DE | German | fallback | German full set | AltGr characters and `< >` rejected |

"Enforce US Keyboard Layout" should not change the result with scan codes; test it
once with the switch on.

Record the result for each row (browser, vSphere version, guest OS) in the related issue.

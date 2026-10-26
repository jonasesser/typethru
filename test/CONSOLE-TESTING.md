# Testing in a real web console without the extension

The test kit offers the functions of TypeThru in the DevTools console (F12), so you can
test against a real vSphere web console before installing the extension.

## Get the script

Either

- download `typethru-tools-<version>.zip` from the
  [latest release](https://github.com/jonasesser/typethru/releases/latest) and unzip it, or
- build it: `npm install` and `npm run build`, then use `dist/tools/typethru-console.js`.

Do not paste `src/tools/typethru-console.ts`: it is the TypeScript source and fails with
"Cannot use import statement outside a module".

## Load it

1. Open the VM with **Launch Web Console** (it opens in its own tab).
2. Inside the VM, open a visible text editor (Notepad, `nano`, …) and click into it.
   Do not use a password field for the tests.
3. Press **F12**, switch to **Console**.
4. If the browser asks, type `allow pasting` and press Enter.
5. Paste the content of `typethru-console.js` and press Enter.

You should see `TypeThru test kit loaded – console found`. If it says *NOT found*,
select the frame of the console in the context dropdown at the top of the DevTools
console (default is `top`) and paste again.

Type `typethru.help()` for all commands.

## Everyday use

```js
typethru.send('P@ss{1}', 'de')   // German guest
typethru.send('P@ss{1}', 'us')   // US guest
typethru.prompt('de')            // enter the text in a dialog instead
typethru.check('P@ss{1}', 'de')  // check whether every character can be typed
```

After running a command you have **3 seconds** to click into the editor inside the VM.

Layout ids: `us`, `de`, `de-ch`, `fr`, `uk`, `es`, `it`.

## Scripts and multi-line text

```js
typethru.script(`Get-Service
Get-Process`, 'us')                                   // US guest
typethru.script(myText, 'de', { speed: 'slow' })       // German guest, slow
typethru.script(myText, 'us', { stripIndent: true })   // editor with auto-indent
typethru.cancel()                                      // stop
```

The text is sent line by line; every line break presses Enter. Type into an editor
inside the VM (Notepad, PowerShell ISE, nano) rather than a shell, where every line
runs immediately. Use `enter: true` to press Enter after the last line too.

`typethru.check(myText, 'de')` shows whether every character is on the keyboard layout.

## Password test on the login screen

Use this to check whether a password arrives correctly before you are logged in.
Nothing is sent with Enter, so a wrong result does not count as a failed login.

1. In the VM, click into the password field of the login screen.
2. Run the test and enter the password in the dialog:

   ```js
   await typethru.password()                   // VM with German layout
   await typethru.password('us')               // VM with US (English) layout
   await typethru.password('de', 'fallback')   // previous method, for comparison (no AltGr characters)
   ```

   The argument is the keyboard layout **set inside the VM**, not your PC's layout.

3. Within 3 seconds, click into the password field again if needed.
4. Click the eye icon in the password field (Windows 10/11) to reveal the password and
   compare it. Then clear the field or press Enter yourself if it is correct.

The dialog keeps the password out of the DevTools console history. Make sure Caps Lock
is off in the VM.

Do **not** use `typethru.test()` on the login screen: it presses Enter after every
line, which counts as failed logins and can lock the account.

## Test cases (text editor)

`typethru.tests()` lists the cases, `typethru.test('T1')` runs one case,
`typethru.test()` runs all of them. Each case types one line into the guest editor,
starting with the case id. The DevTools console shows what was sent and what is
expected.

Run them in a visible text editor inside the VM (Notepad, gedit, …), never on a login
screen or in a shell: each line ends with Enter. The cases assume a guest with a
**German** keyboard layout.

| Case | Method | Checks | Expected in the guest |
|---|---|---|---|
| T1 | scan codes | German full set incl. AltGr and `< >` | `yzYZ!"§$%&/()=?ß+*#'-_.:,;äöüÄÖÜ°@€{[]}\~\|<>µ²³` |
| T2 | scan codes | dead keys | `` ^´` `` |
| T3 | scan codes | all printable ASCII | `!"#$%&'()*+,-./0-9:;<=>?@A-Z[\]^_`a-z{\|}~` |
| T4 | fallback | supported characters with the previous method | `yzYZ!"§$%&/()=?ß+*#'-_.:,;äöüÄÖÜ°` |
| T5 | fallback, no conversion | baseline | wrong characters on German keys (the original problem) |

## VMs with another layout

The cases above assume a German VM. For a VM with another keyboard layout, pass the
layout as second argument; only the scan code cases that fit the layout are run:

```js
typethru.test(undefined, 'us')   // all fitting cases, e.g. T3 (all printable ASCII)
typethru.test('T3', 'us')        // one case
await typethru.password('us')    // password on the login screen
```

## Reporting results

For each case, note what appeared in the guest editor and add it to a new issue
together with:

- the output of `typethru.diagnose()`
- browser and version
- vSphere / vCenter version (if known)
- guest OS and its keyboard layout

Do not include real passwords, hostnames or company names.

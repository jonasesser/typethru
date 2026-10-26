# Testing in a real web console without the extension

The test kit offers the functions of TypeThru in the DevTools console (F12), so you can
test against a real vSphere web console before installing the extension.

## Get the script

Either

- download `typethru-tools-<version>.zip` from the
  [latest release](https://github.com/jonasesser/typethru/releases/latest) and unzip it, or
- build it: `npm install` and `npm run build`, then use `dist/tools/typethru-console.js`.

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
typethru.send('Secret!', 'de')   // German guest: convert and send
typethru.send('Secret!', 'us')   // US guest: send as-is
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

Scripts often contain `{ } [ ] \ | @`. On a **German** guest, characters that need
AltGr are not supported with conversion yet (#6) – check first with
`typethru.check(myText, 'de')`.

## Password test on the login screen

Use this to check whether a password arrives correctly before you are logged in.
Nothing is sent with Enter, so a wrong result does not count as a failed login.

1. In the VM, click into the password field of the login screen.
2. Run one of the two tests and enter the password in the dialog:

   ```js
   await typethru.password()            // Enforce US OFF + German conversion (current behaviour)
   await typethru.password('enforce')   // Enforce US ON + no conversion (candidate fix, #6)
   ```

3. Within 3 seconds, click into the password field again if needed.
4. Click the eye icon in the password field (Windows 10/11) to reveal the password and
   compare it. Then clear the field or press Enter yourself if it is correct.

The dialog keeps the password out of the DevTools console history. Passwords with
`@ { } [ ] \ ~ | < >` show the difference between the two modes best: the first test
rejects them, the second one shows whether Enforce US solves it.

Do **not** use `typethru.test()` on the login screen: it presses Enter after every
line, which counts as failed logins and can lock the account.

## Test cases (text editor)

`typethru.tests()` lists the cases, `typethru.test('T3')` runs one case,
`typethru.test()` runs all of them. Each case switches the console's
**Enforce US Keyboard Layout** button to the required state, then types one line into
the guest editor, starting with the case id. The DevTools console shows what was sent
and what is expected.

Run them in a visible text editor inside the VM (Notepad, gedit, …), never on a login
screen or in a shell: each line ends with Enter. The cases assume a guest with a
**German** keyboard layout.

| Case | Enforce US | Sent | Checks | Expected in the guest |
|---|---|---|---|---|
| T1 | OFF | converted (de) | supported characters | `yzYZ!"§$%&/()=?ß+*#'-_.:,;äöüÄÖÜ°` |
| T2 | OFF | converted (de) | dead keys | `` ^´` `` |
| T3 | ON | raw | AltGr and `< >` characters | `@€{[]}\~\|<>µ²³` (to be determined) |
| T4 | ON | raw | full set | supported + AltGr characters (to be determined) |
| T5 | OFF | raw | baseline | wrong characters on German keys (the original problem) |
| T6 | ON | converted (de) | conversion combined with Enforce US | to be determined |

T3, T4 and T6 answer the open question in
[#6](https://github.com/jonasesser/typethru/issues/6): if T3 and T4 arrive correctly,
"Enforce US Keyboard Layout" + sending without conversion supports every character,
including AltGr characters.

## Reporting results

For each case, note what appeared in the guest editor and add it to issue #6 together
with:

- the output of `typethru.diagnose()`
- browser and version
- vSphere / vCenter version (if known)
- guest OS and its keyboard layout

Do not include real passwords, hostnames or company names.

When you are done, switch **Enforce US Keyboard Layout** back to the state you normally
use (`typethru.enforce(false)` or `typethru.enforce(true)`).

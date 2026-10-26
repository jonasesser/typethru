// Builds the bookmarklet install page from typethru.js.
// Usage: node bookmarklet/build.js
'use strict';
const fs = require('fs');
const path = require('path');

const dir = __dirname;
const src = fs.readFileSync(path.join(dir, 'typethru.js'), 'utf8');

function toBookmarklet(code) {
  const min = code
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n').map(l => l.trim()).filter(Boolean).join(' ');
  new Function(min); // syntax check
  return 'javascript:' + encodeURIComponent(min);
}

const esc = s => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const withConv = toBookmarklet(src);
const noConv = toBookmarklet(src.replace('var CONVERT = true;', 'var CONVERT = false;'));

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>TypeThru bookmarklet</title>
<style>
body{font:15px system-ui,sans-serif;max-width:720px;margin:40px auto;padding:0 16px;line-height:1.5}
a.bm{display:inline-block;padding:8px 14px;background:#0b5cad;color:#fff;border-radius:6px;text-decoration:none;font-weight:600;margin-right:8px}
textarea{width:100%;height:90px;font:12px monospace}code{background:#eee;padding:1px 4px;border-radius:3px}
</style></head>
<body>
<h1>TypeThru bookmarklet</h1>
<p>Types text into the vSphere HTML5 web console without installing an extension.</p>
<h2>Install</h2>
<p>Show the favorites bar (<code>Ctrl+Shift+B</code>) and drag the button that matches the guest's keyboard layout onto it:</p>
<p><a class="bm" href="${esc(withConv)}">TypeThru (DE)</a><a class="bm" href="${esc(noConv)}">TypeThru (US)</a></p>
<p>Or create a favorite manually and paste one of these as the URL:</p>
<p>German guest layout (DE &rarr; US conversion):</p>
<textarea readonly onclick="this.select()">${esc(withConv)}</textarea>
<p>US guest layout (no conversion):</p>
<textarea readonly onclick="this.select()">${esc(noConv)}</textarea>
<h2>Use</h2>
<ol>
<li>Open the VM with <i>Launch Web Console</i> and click once into the console.</li>
<li>Click the bookmarklet in the favorites bar.</li>
<li>Enter the text in the dialog and press OK.</li>
<li>Click back into the console.</li>
</ol>
<h2>Notes</h2>
<ul>
<li>The browser dialog shows the text in clear text while you type.</li>
<li>With DE &rarr; US conversion these characters are refused instead of being typed wrong: <code>@ € { [ ] } \\ ~ | &lt; &gt; µ ² ³</code></li>
<li>Nothing is stored or sent anywhere; the text only goes to the console on the current page.</li>
</ul>
</body></html>
`;

fs.writeFileSync(path.join(dir, 'install.html'), html);
console.log('Wrote bookmarklet/install.html');

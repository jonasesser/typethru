// Builds everything into dist/:
//   dist/extension/   ready for "Load unpacked"
//   dist/bookmarklet/ install page with both bookmarklet variants
//   dist/tools/       DevTools scripts as plain JavaScript
//
// Usage: npm run build

import { build } from 'esbuild';
import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'src');
const dist = join(root, 'dist');

const target = ['chrome110', 'edge110'];

async function buildExtension(): Promise<void> {
  const out = join(dist, 'extension');
  await mkdir(out, { recursive: true });
  await build({
    entryPoints: [join(src, 'extension', 'popup.ts')],
    outfile: join(out, 'popup.js'),
    bundle: true,
    format: 'iife',
    target,
    // No minification: injected functions are serialized as-is and the
    // shipped code stays readable for review.
    minify: false,
    legalComments: 'none',
  });
  await copyFile(join(src, 'extension', 'popup.html'), join(out, 'popup.html'));

  // Keep manifest version in sync with package.json
  const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8')) as { version: string };
  const manifest = JSON.parse(await readFile(join(src, 'extension', 'manifest.json'), 'utf8')) as { version: string };
  manifest.version = pkg.version;
  await writeFile(join(out, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
}

async function bundleBookmarklet(convert: boolean): Promise<string> {
  const result = await build({
    entryPoints: [join(src, 'bookmarklet', 'typethru.ts')],
    bundle: true,
    format: 'iife',
    target,
    minify: true,
    write: false,
    legalComments: 'none',
    define: { __CONVERT__: String(convert) },
  });
  const code = result.outputFiles[0].text.trim();
  return 'javascript:' + encodeURIComponent(code);
}

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

async function buildBookmarklet(): Promise<void> {
  const out = join(dist, 'bookmarklet');
  await mkdir(out, { recursive: true });
  const de = await bundleBookmarklet(true);
  const us = await bundleBookmarklet(false);

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
<p><a class="bm" href="${esc(de)}">TypeThru (DE)</a><a class="bm" href="${esc(us)}">TypeThru (US)</a></p>
<p>Or create a favorite manually and paste one of these as the URL:</p>
<p>German guest layout (DE &rarr; US conversion):</p>
<textarea readonly onclick="this.select()">${esc(de)}</textarea>
<p>US guest layout (no conversion):</p>
<textarea readonly onclick="this.select()">${esc(us)}</textarea>
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
  await writeFile(join(out, 'install.html'), html);
}

async function buildTools(): Promise<void> {
  for (const name of ['console-diagnostics', 'send-test-string']) {
    await build({
      entryPoints: [join(src, 'tools', `${name}.ts`)],
      outfile: join(dist, 'tools', `${name}.js`),
      bundle: true,
      format: 'iife',
      target,
      minify: false,
      legalComments: 'none',
    });
  }
}

await rm(dist, { recursive: true, force: true });
await buildExtension();
await buildBookmarklet();
await buildTools();
console.log('Build complete: dist/extension, dist/bookmarklet, dist/tools');

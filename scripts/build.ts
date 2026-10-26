// Builds everything into dist/:
//   dist/extension/   ready for "Load unpacked"
//   dist/bookmarklet/ install page with one bookmarklet per VM keyboard layout
//   dist/tools/       DevTools scripts as plain JavaScript
//
// Usage: npm run build

import { build } from 'esbuild';
import { LAYOUT_CHOICES } from '../src/extension/layout';
import { copyFile, cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
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
    entryPoints: {
      popup: join(src, 'extension', 'popup.ts'),
      options: join(src, 'extension', 'options.ts'),
    },
    outdir: out,
    bundle: true,
    format: 'iife',
    target,
    // No minification: injected functions are serialized as-is and the
    // shipped code stays readable for review.
    minify: false,
    legalComments: 'none',
  });
  for (const file of ['popup.html', 'options.html', 'styles.css', 'managed_schema.json']) {
    await copyFile(join(src, 'extension', file), join(out, file));
  }
  await cp(join(src, 'extension', 'icons'), join(out, 'icons'), { recursive: true });

  // Keep manifest version in sync with package.json
  const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8')) as { version: string };
  const manifest = JSON.parse(await readFile(join(src, 'extension', 'manifest.json'), 'utf8')) as { version: string };
  manifest.version = pkg.version;
  await writeFile(join(out, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
}

async function bundleBookmarklet(layoutId: string): Promise<string> {
  const result = await build({
    entryPoints: [join(src, 'bookmarklet', 'typethru.ts')],
    bundle: true,
    format: 'iife',
    target,
    minify: true,
    write: false,
    legalComments: 'none',
    define: { __LAYOUT__: JSON.stringify(layoutId) },
  });
  const code = result.outputFiles[0].text.trim();
  return 'javascript:' + encodeURIComponent(code);
}

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

async function buildBookmarklet(): Promise<void> {
  const out = join(dist, 'bookmarklet');
  await mkdir(out, { recursive: true });
  const variants: { name: string; url: string }[] = [];
  for (const choice of LAYOUT_CHOICES) {
    variants.push({ name: choice.name, url: await bundleBookmarklet(choice.id) });
  }

  const buttons = variants
    .map(v => `<li><a class="bm" href="${esc(v.url)}">TypeThru</a> ${esc(v.name)}</li>`)
    .join('\n');
  const fields = variants
    .map(v => `<p>${esc(v.name)}:</p>\n<textarea readonly onclick="this.select()">${esc(v.url)}</textarea>`)
    .join('\n');

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>TypeThru bookmarklet</title>
<style>
body{font:15px system-ui,sans-serif;max-width:720px;margin:40px auto;padding:0 16px;line-height:1.5}
ul.bms{list-style:none;padding:0}ul.bms li{margin:8px 0}
a.bm{display:inline-block;padding:6px 12px;background:#0b5cad;color:#fff;border-radius:6px;text-decoration:none;font-weight:600;margin-right:8px}
textarea{width:100%;height:70px;font:12px monospace}code{background:#eee;padding:1px 4px;border-radius:3px}
details{margin-top:12px}
</style></head>
<body>
<h1>TypeThru bookmarklet</h1>
<p>Types text into the vSphere HTML5 web console without installing an extension.</p>
<h2>Install</h2>
<p>Show the favorites bar (<code>Ctrl+Shift+B</code>) and drag the button for the keyboard layout <b>set inside the VM</b> onto it (for example German if the Windows login screen shows “DEU”). Your PC's layout does not matter. Rename the favorite if you add more than one.</p>
<ul class="bms">
${buttons}
</ul>
<details><summary>Create the favorite manually</summary>
<p>Create a favorite and paste the URL for the VM keyboard layout:</p>
${fields}
</details>
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
<li>Characters that cannot be typed with the selected layout (AltGr characters, the key next to left Shift, characters not on the keyboard) are refused instead of being typed wrong.</li>
<li>Nothing is stored or sent anywhere; the text only goes to the console on the current page.</li>
</ul>
</body></html>
`;
  await writeFile(join(out, 'install.html'), html);
}

async function buildTools(): Promise<void> {
  for (const name of ['typethru-console', 'console-diagnostics', 'send-test-string']) {
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

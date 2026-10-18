/**
 * Make this fully embedded deck usable when double-clicked (file://).
 *
 * Quarto 1.9.37 blocks every file:// OJS document, including ones whose modules
 * and data are already data: URLs. This project-specific export removes those
 * two application-level checks ONLY after verifying the expected embedded
 * attachments. The real Quarto/Observable runtime and reactive cells remain.
 * No browser settings or installed Quarto files are changed. This is not a
 * general fix for OJS documents that fetch local files or external libraries.
 *
 * Run automatically by Quarto's post-render hook (bundled Deno; no npm/Python).
 */

const marker = '<meta name="strg-portable-ojs" content="embedded-only-v1">';
const runtimeGuard = `    // Are we file://? bail
    if (window.location.protocol === "file:") {
      displayFileProtocolError();
      return;
    }`;
const fileAlert = `    if (window.location.protocol === "file:") { alert("The OJS runtime does not work with file:// URLs. Please use a web server to view this document."); }`;

function exactlyOnce(html: string, pattern: string, label: string): void {
  if (html.split(pattern).length !== 2) {
    throw new Error(`Portable OJS: expected exactly one ${label}. Quarto output changed; review the export before using it.`);
  }
}

async function portableHtml(html: string): Promise<string> {
  if (html.includes(marker)) return html;
  const resolver = html.match(/window\._ojs\.runtime\.setLocalResolver\((\{[^\n]+\})\);/);
  if (!resolver || !html.includes('window._ojs.selfContained = true;')) {
    throw new Error('Portable OJS requires embed-resources: true and embedded OJS attachments.');
  }
  const attachments = JSON.parse(resolver[1]) as Record<string, string>;
  const expected: Record<string, string> = {
    'scripts/figures.js': 'application/javascript',
    'data/paper-results.json': 'application/json',
  };
  if (Object.keys(attachments).sort().join('\n') !== Object.keys(expected).sort().join('\n')) {
    throw new Error('OJS attachments changed. Review their offline compatibility before extending this export.');
  }
  for (const [path, mime] of Object.entries(expected)) {
    const prefix = `data:${mime};base64,`;
    if (!attachments[path].startsWith(prefix)) throw new Error(`${path} was not embedded.`);
    const bytes = Uint8Array.from(atob(attachments[path].slice(prefix.length)), c => c.charCodeAt(0));
    const embedded = new TextDecoder().decode(bytes);
    if (embedded !== await Deno.readTextFile(path)) throw new Error(`${path}: embedded content differs from source.`);
    if (mime === 'application/javascript' && /\b(?:import|require|fetch)\s*(?:\(|["'{*])/.test(embedded)) {
      throw new Error(`${path}: new imports/fetches need an offline compatibility review.`);
    }
  }
  exactlyOnce(html, runtimeGuard, 'Quarto file-protocol guard');
  exactlyOnce(html, fileAlert, 'Quarto file-protocol alert');
  // Reveal's notes plugin also contains a literal </head> in a template string.
  exactlyOnce(html, '\n</head>', 'top-level HTML head');
  return html
    .replace(runtimeGuard, '    // STRG portable export: all OJS modules/data are embedded data: URLs.')
    .replace(fileAlert, '    // STRG portable export: file:// is supported for this embedded deck.')
    .replace('\n</head>', `\n${marker}\n</head>`);
}

const files = Deno.args.length ? Deno.args :
  (Deno.env.get('QUARTO_PROJECT_OUTPUT_FILES') || '').split('\n').filter(Boolean);
if (!files.length) throw new Error('No rendered files supplied. Run this through quarto render.');
for (const path of files.filter(path => path.endsWith('.html'))) {
  const html = await Deno.readTextFile(path);
  const result = await portableHtml(html);
  if (result !== html) await Deno.writeTextFile(path, result);
  // Pages needs an index at the project root; keep the descriptive local name.
  if (/(?:^|[/\\])earth-ai\.html$/.test(path)) {
    await Deno.writeTextFile(path.replace(/earth-ai\.html$/, 'index.html'), result);
    await Deno.writeTextFile(path.replace(/earth-ai\.html$/, '.nojekyll'), '');
  }
  console.log(`Portable OJS: ${path} (embedded modules + data; file:// and HTTP)`);
}

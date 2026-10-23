import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

// The export writes earth-ai.html before index.html. During a warm render,
// Quarto can also temporarily replace index.html with its website redirect.
// A marker in the first file alone therefore does not mean the export is done.
export async function waitForPortableExport({
  outputDir = '_output', afterMtime = -Infinity, ready = () => true,
  timeoutMs = 30000, pollMs = 100,
} = {}) {
  const deadline = Date.now() + timeoutMs;
  let pending = 'output files not yet available';
  while (Date.now() < deadline) {
    try {
      const [html, index, metadata] = await Promise.all([
        readFile(join(outputDir, 'earth-ai.html'), 'utf8'),
        readFile(join(outputDir, 'index.html'), 'utf8'),
        stat(join(outputDir, 'earth-ai.html')),
      ]);
      const checks = {
        'new presentation output': metadata.mtimeMs > afterMtime,
        'portable OJS marker': html.includes('name="strg-portable-ojs"'),
        'file-protocol guard removed': !html.includes('displayFileProtocolError();'),
        'matching presentation and Pages index': html === index,
        'post-render completion': ready(),
      };
      const missing = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
      if (!missing.length) return html;
      pending = missing.join(', ');
    } catch (error) {
      // Quarto moves/replaces output files while rendering.
      if (error.code !== 'ENOENT') throw error;
      pending = 'output files temporarily missing';
    }
    await delay(Math.min(pollMs, Math.max(0, deadline - Date.now())));
  }
  throw new Error(`Timed out waiting for portable export; still waiting for: ${pending}`);
}

// Optional regression tests; rendering itself needs only Quarto.
// npm ci && npx playwright install chromium && npm test
import assert from 'node:assert/strict';
import { readFile, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const browsers = await import(process.env.STRG_PLAYWRIGHT_MODULE || 'playwright');
const browserName = process.env.STRG_BROWSER_ENGINE || 'chromium';
assert.ok(['chromium', 'webkit'].includes(browserName), 'Unsupported test browser');
const html = await readFile(resolve('_output/earth-ai.html'));
assert.deepEqual(html, await readFile(resolve('_output/index.html')), 'Pages and local exports differ');
assert.match(html.toString(), /name="strg-portable-ojs"/);
const data = JSON.parse(await readFile('data/paper-results.json', 'utf8'));
const testDir = await mkdtemp(join(tmpdir(), 'strg-ojs-test-'));
const file = join(testDir, 'presentation.html');
await writeFile(file, html); // A single isolated file, without the project assets.
const server = createServer((req, res) => {
  if (req.url?.split(/[?#]/)[0] !== '/STRG/') { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(html);
});
await new Promise(done => server.listen(0, '127.0.0.1', done));
const localHttp = `http://127.0.0.1:${server.address().port}/STRG/`;
const browser = await browsers[browserName].launch({
  headless: true,
  timeout: 20000,
  ...(process.env.STRG_BROWSER_PATH ? { executablePath: process.env.STRG_BROWSER_PATH } : {}),
});

try {
  // An optional deployed URL exercises the actual public copy too.
  for (const url of [pathToFileURL(file).href, localHttp, ...process.argv.slice(2)]) {
    const context = await browser.newContext({ viewport: { width: 1600, height: 900 } });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    page.setDefaultNavigationTimeout(15000);
    const errors = [], external = [], dialogs = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('dialog', async d => { dialogs.push(d.message()); await d.dismiss(); });
    // Allow only the one HTML navigation, not its potential dependencies.
    await context.route('**/*', route => {
      const request = route.request();
      if ((request.isNavigationRequest() && request.url() === url) || request.url().startsWith('data:')) return route.continue();
      external.push(request.url()); return route.abort();
    });
    if (url.startsWith('file:')) await context.setOffline(true);
    try {
      await page.goto(url);
      await page.waitForFunction(() => window.Reveal?.isReady());
      await page.waitForFunction(() => document.querySelectorAll('.paper-chart').length === 6);
      await context.setOffline(true);
      assert.equal(await page.locator('.reveal .slides > section').count(), 24);
      assert.equal(await page.locator('.reveal .slides .notes').count(), 24);
      assert.equal(await page.evaluate(async () => (await window._ojs.runtime.value('paper')).qa.categories.length), data.qa.categories.length);

      async function select(slide, label, value, expected) {
        await page.evaluate(id => Reveal.slide(Reveal.getSlides().findIndex(s => s.id === id)), slide);
        await page.getByLabel(label, { exact: true }).selectOption(value);
        await page.waitForFunction(({ slide, expected }) => {
          const aria = document.querySelector(`#${slide} .paper-chart`)?.getAttribute('aria-label') || '';
          return expected.every(value => aria.includes(value));
        }, { slide, expected });
      }

      await select('detection', 'Detection dataset', 'DIOR', ['DIOR', '14.98', '29.39', '53.21']);
      assert.equal(await page.evaluate(() => window._ojs.runtime.value('detectionDataset')), 'DIOR');
      await select('country-transfer', 'Transfer metric', 'mape', ['MAPE', '28.03', '19.03']);
      for (const [slide, label, results] of [
        ['fema-results', 'FEMA target', data.fusion.fema],
        ['health-results', 'Health indicator', data.fusion.health],
      ]) {
        for (const [i, row] of results.targets.entries()) {
          await select(slide, label, String(i), [row.label, ...row.values.map(v => v.toFixed(2))]);
        }
        await page.getByLabel(label, { exact: true }).selectOption('mean');
      }
      for (const row of data.qa.categories) {
        await select('qa-results', 'Q&A category', row.id, [row.label, ...row.means.map(v => v.toFixed(2))]);
      }
      await page.evaluate(() => Reveal.slide(Reveal.getSlides().findIndex(s => s.id === 'crisis-results')));
      const intervals = await page.locator('#crisis-results svg line').count();
      await page.getByLabel('Crisis intervals').selectOption('no');
      await page.waitForFunction(n => document.querySelectorAll('#crisis-results svg line').length === n - 20, intervals);
      assert.deepEqual(await page.locator('.observablehq--error').allTextContents(), []);
      assert.equal(await page.locator('.reveal .slides img').evaluateAll(images => images.every(i => i.complete && i.naturalWidth > 0)), true);
      assert.deepEqual(errors, [], 'Browser JavaScript errors');
      assert.deepEqual(dialogs, [], 'Unexpected alert');
      assert.deepEqual(external, [], 'Non-embedded resource requests');
      console.log(`PASS ${browserName} ${url}: actual OJS, six controls, all published target rows, offline, no external resources`);
    } catch (error) {
      console.error(JSON.stringify({browserName, url, errors, external, dialogs,
        ojsErrors: await page.locator('.observablehq--error').allTextContents().catch(() => [])}, null, 2));
      throw error;
    } finally { await context.close(); }
  }
} finally {
  await browser.close();
  await new Promise(done => server.close(done));
  await rm(testDir, { recursive: true }); // Only the exact mkdtemp-created test directory.
}

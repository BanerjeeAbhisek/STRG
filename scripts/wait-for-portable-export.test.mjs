import assert from 'node:assert/strict';
import { mkdtemp, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import test from 'node:test';
import { waitForPortableExport } from './wait-for-portable-export.mjs';

const portable = '<html><meta name="strg-portable-ojs" content="embedded-only-v1">slides</html>';
const redirect = '<html><title>Redirect to earth-ai.html</title></html>';

async function fixture(t) {
  const outputDir = await mkdtemp(join(tmpdir(), 'strg-export-wait-'));
  t.after(() => rm(outputDir, { recursive: true })); // Only this test's temporary directory.
  const presentation = join(outputDir, 'earth-ai.html');
  const index = join(outputDir, 'index.html');
  return { outputDir, presentation, index };
}

test('waits for a delayed Pages index instead of accepting its redirect', async t => {
  const { outputDir, presentation, index } = await fixture(t);
  await writeFile(presentation, portable);
  await writeFile(index, redirect);
  let settled = false;
  const waiting = waitForPortableExport({ outputDir, timeoutMs: 2000, pollMs: 5 })
    .then(html => { settled = true; return html; });
  // Let several polls see the exact mismatched state that failed in CI.
  await delay(40);
  assert.equal(settled, false, 'Must not accept a redirect while the export is incomplete');
  await writeFile(index, portable);
  assert.equal(await waiting, portable);
});

test('waits for post-render completion even when both files already match', async t => {
  const { outputDir, presentation, index } = await fixture(t);
  await writeFile(presentation, portable);
  await writeFile(index, portable);
  let complete = false, settled = false;
  const waiting = waitForPortableExport({ outputDir, ready: () => complete, timeoutMs: 2000, pollMs: 5 })
    .then(html => { settled = true; return html; });
  await delay(40);
  assert.equal(settled, false);
  complete = true;
  assert.equal(await waiting, portable);
});

test('tolerates temporarily missing files', async t => {
  const { outputDir, presentation, index } = await fixture(t);
  const waiting = waitForPortableExport({ outputDir, timeoutMs: 2000, pollMs: 5 });
  await delay(25);
  await writeFile(presentation, portable);
  await delay(25);
  await writeFile(index, portable);
  assert.equal(await waiting, portable);
});

test('times out with a concise error when the Pages index stays wrong', async t => {
  const { outputDir, presentation, index } = await fixture(t);
  await writeFile(presentation, portable);
  await writeFile(index, redirect);
  await assert.rejects(
    waitForPortableExport({ outputDir, timeoutMs: 50, pollMs: 5 }),
    /Timed out.*matching presentation and Pages index/,
  );
});

test('does not accept an unchanged output as a new warm render', async t => {
  const { outputDir, presentation, index } = await fixture(t);
  await writeFile(presentation, portable);
  await writeFile(index, portable);
  const afterMtime = (await stat(presentation)).mtimeMs;
  await assert.rejects(
    waitForPortableExport({ outputDir, afterMtime, timeoutMs: 50, pollMs: 5 }),
    /Timed out.*new presentation output/,
  );
});

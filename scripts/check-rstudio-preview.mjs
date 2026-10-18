// Exercise the command RStudio's Render button actually uses. A render-only
// test missed that `project: type: default` skipped this project's export hook.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { readFile, stat } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';

const socket = createServer();
await new Promise(done => socket.listen(0, '127.0.0.1', done));
const port = socket.address().port;
await new Promise(done => socket.close(done));
const child = spawn(process.env.STRG_QUARTO_PATH || 'quarto', [
  'preview', 'earth-ai.qmd', '--to', 'default', '--no-watch-inputs', '--no-browse',
  '--port', String(port),
], { detached: process.platform !== 'win32', stdio: ['ignore', 'pipe', 'pipe'] });
let log = '', finished = false, spawnError;
child.stdout.on('data', chunk => { log += chunk; });
child.stderr.on('data', chunk => { log += chunk; });
child.on('error', e => { spawnError = e; finished = true; });
const closed = new Promise(done => child.on('close', () => { finished = true; done(); }));

try {
  const deadline = Date.now() + 60000;
  while (!finished && !log.includes('Listening on ') && Date.now() < deadline) await delay(100);
  if (spawnError) throw spawnError;
  assert.match(log, /Listening on /, `RStudio preview failed to start:\n${log}`);
  assert.match(log, /Portable OJS: _output\/earth-ai\.html/, `Preview skipped the portable export:\n${log}`);
  const html = await readFile('_output/earth-ai.html', 'utf8');
  assert.match(html, /name="strg-portable-ojs"/);
  assert.doesNotMatch(html, /displayFileProtocolError\(\);/);
  assert.equal(html, await readFile('_output/index.html', 'utf8'));
  // RStudio reuses a running preview instead of starting a new CLI process.
  // Exercise that hot-render endpoint too, not merely a fresh startup.
  for (let round = 1; round <= 2; round++) {
    const before = (await stat('_output/earth-ai.html')).mtimeMs;
    const response = await fetch(`http://127.0.0.1:${port}/quarto-render/`);
    assert.equal(response.status, 200);
    const renderDeadline = Date.now() + 30000;
    let current = '';
    while (Date.now() < renderDeadline) {
      try {
        current = await readFile('_output/earth-ai.html', 'utf8');
        if ((await stat('_output/earth-ai.html')).mtimeMs > before && current.includes('name="strg-portable-ojs"')) break;
      } catch (error) { if (error.code !== 'ENOENT') throw error; }
      await delay(100);
    }
    assert.match(current, /name="strg-portable-ojs"/, `Warm RStudio render ${round} skipped the export:\n${log}`);
    assert.doesNotMatch(current, /displayFileProtocolError\(\);/);
    assert.equal(current, await readFile('_output/index.html', 'utf8'));
  }
  console.log('PASS RStudio-style preview: initial render and two warm re-renders preserve direct-file OJS');
} finally {
  if (!finished) {
    // Only our freshly spawned preview process group, never the user's server.
    if (process.platform === 'win32') child.kill('SIGTERM');
    else process.kill(-child.pid, 'SIGTERM');
    await closed;
  }
}

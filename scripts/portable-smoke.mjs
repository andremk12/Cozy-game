import { spawn } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const root = process.cwd();
const executable = path.join(root, 'outputs/desktop/Little-Haven-0.1.0-x64.exe');
const server = net.createServer();
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const port = server.address().port;
await new Promise(resolve => server.close(resolve));
const environment = { ...process.env };
delete environment.ELECTRON_RUN_AS_NODE;
delete environment.LITTLE_HAVEN_DEV_URL;
const processHandle = spawn(executable, [
  `--user-data-dir=${path.join(root, 'work/portable-smoke-profile')}`,
  `--remote-debugging-port=${port}`,
  '--disable-gpu',
], { cwd: root, env: environment, windowsHide: true, stdio: 'ignore' });
let exited = false;
processHandle.on('exit', () => { exited = true; });
let browser;
try {
  const deadline = Date.now() + 60000;
  let ready = false;
  while (Date.now() < deadline && !exited) {
    try { ready = (await fetch(`http://127.0.0.1:${port}/json/version`)).ok; } catch {}
    if (ready) break;
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  assert.ok(ready, 'Portable launcher did not expose its isolated test window.');
  browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
  const pages = browser.contexts().flatMap(context => context.pages());
  const page = pages.find(candidate => candidate.url().includes('/dist/index.html'));
  assert.ok(page, 'Portable app did not load its packaged renderer.');
  await page.waitForSelector('.room-art');
  assert.equal(await page.getByRole('button', { name: 'Abrir caderno', exact: true }).count(), 1);
  assert.deepEqual(await page.evaluate(() => Object.keys(window.haven).sort()), ['getPreferences', 'savePreferences']);
  assert.ok(page.url().includes('app.asar'));
  await page.close();
  await browser.close();
  browser = null;
  for (let attempt = 0; attempt < 40 && !exited; attempt++) await new Promise(resolve => setTimeout(resolve, 250));
  assert.ok(exited, 'Portable launcher did not exit after the window closed.');
  console.log('Portable launcher passed: extracted, opened packaged React room, bridge available, closed cleanly.');
} finally {
  if (browser) await browser.close().catch(() => {});
  if (!exited && processHandle.pid) {
    const kill = spawn('taskkill', ['/pid', String(processHandle.pid), '/t', '/f'], { windowsHide: true, stdio: 'ignore' });
    await new Promise(resolve => kill.once('exit', resolve));
  }
}

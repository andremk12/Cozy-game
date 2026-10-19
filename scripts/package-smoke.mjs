import assert from 'node:assert/strict';
import { access, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { _electron as electron } from 'playwright-core';
import { expect } from '@playwright/test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const executablePath = path.join(root, 'outputs/desktop/win-unpacked/Little Haven.exe');
const profile = path.join(root, 'work/package-smoke-profile');
await access(executablePath);
await mkdir(profile, { recursive: true });
const env = Object.fromEntries(Object.entries(process.env).filter(([, value]) => typeof value === 'string'));
delete env.ELECTRON_RUN_AS_NODE;
delete env.LITTLE_HAVEN_DEV_URL;
let application;
let originalPreferences;
const canonical = (value) => path.resolve(value).toLowerCase();
const requests = [];

async function launch() {
  const instance = await electron.launch({
    executablePath,
    cwd: root,
    args: [`--user-data-dir=${profile}`, '--disable-gpu'],
    env,
    chromiumSandbox: true,
    timeout: 30_000,
  });
  const metadata = await instance.evaluate(({ app, BrowserWindow }) => {
    const window = BrowserWindow.getAllWindows()[0];
    const settings = window?.webContents.getLastWebPreferences();
    return {
      isPackaged: app.isPackaged,
      appPath: app.getAppPath(),
      userData: app.getPath('userData'),
      sandbox: settings?.sandbox,
      contextIsolation: settings?.contextIsolation,
      nodeIntegration: settings?.nodeIntegration,
      discardGuard: window?.webContents.listenerCount('will-prevent-unload'),
    };
  });
  try {
    assert.equal(metadata.isPackaged, true);
    assert.ok(metadata.appPath.endsWith('app.asar'));
    assert.equal(canonical(metadata.userData), canonical(profile), 'Profile isolation was ignored; refusing to alter preferences.');
    assert.equal(metadata.sandbox, true);
    assert.equal(metadata.contextIsolation, true);
    assert.equal(metadata.nodeIntegration, false);
    assert.equal(metadata.discardGuard, 1, 'Native draft protection was omitted from this packaged build.');
    const page = await instance.firstWindow();
    page.on('request', (request) => requests.push(request.url()));
    await expect(page.getByRole('button', { name: 'Abrir caderno', exact: true })).toBeVisible();
    assert.ok(page.url().startsWith('file:'));
    assert.ok(page.url().includes('/app.asar/dist/index.html'));
    return { instance, page, metadata };
  } catch (error) {
    await instance.close();
    throw error;
  }
}

async function assertCleanConsole(page) {
  assert.deepEqual((await page.consoleMessages()).filter((message) => message.type() === 'error').map((message) => message.text()), []);
  assert.deepEqual((await page.pageErrors()).map((error) => error.message), []);
}

try {
  const first = await launch();
  application = first.instance;
  let page = first.page;
  await expect(page.locator('.room-art')).toHaveAttribute('viewBox', '0 0 480 270');
  assert.equal(await page.locator('.brand img').evaluate((image) => image.complete && image.naturalWidth > 0), true);
  const bridge = await page.evaluate(() => Object.keys(window.haven).sort());
  assert.deepEqual(bridge, ['getPreferences', 'savePreferences']);
  assert.deepEqual(await page.evaluate(() => [typeof window.require, typeof window.process]), ['undefined', 'undefined']);
  originalPreferences = await page.evaluate(() => window.haven.getPreferences());
  await page.getByRole('button', { name: originalPreferences.lampOn ? 'Apagar luminária' : 'Acender luminária', exact: true }).click();
  await expect(page.locator('.room-night-shade')).toHaveAttribute('opacity', originalPreferences.lampOn ? '0.19' : '0');
  await page.getByRole('slider', { name: 'Volume' }).fill('0.13');
  const modified = { ...originalPreferences, lampOn: !originalPreferences.lampOn, volume: 0.13 };
  await expect.poll(() => page.evaluate(() => window.haven.getPreferences())).toEqual(modified);

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('button', { name: 'Abrir caderno', exact: true }).click();
  const sentinel = 'PACKAGE_SMOKE_PRIVATE_SENTINEL_614028';
  await page.getByRole('textbox').fill(sentinel);
  await page.getByRole('button', { name: 'Let it float', exact: true }).click();
  await expect(page.getByText('O rio segue. Você pode ficar.')).toBeVisible();
  await expect(page.getByRole('textbox')).toHaveCount(0);
  await expect(page.locator('.sailing-boat')).toHaveCount(0);
  assert.ok(!(await page.locator('body').innerText()).includes(sentinel));
  assert.ok(!(await page.evaluate(() => JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } }))).includes(sentinel));
  await page.getByRole('button', { name: 'Voltar ao quarto', exact: true }).click();
  await assertCleanConsole(page);
  await application.close();
  application = undefined;

  const preferenceFile = await readFile(path.join(profile, 'preferences.json'), 'utf8');
  assert.ok(!preferenceFile.includes(sentinel));
  assert.deepEqual(JSON.parse(preferenceFile), modified);
  const second = await launch();
  application = second.instance;
  page = second.page;
  await expect(page.getByRole('button', { name: modified.lampOn ? 'Apagar luminária' : 'Acender luminária', exact: true })).toBeVisible();
  await expect(page.getByRole('slider', { name: 'Volume' })).toHaveValue('0.13');
  assert.deepEqual(await page.evaluate(() => window.haven.getPreferences()), modified);
  await assertCleanConsole(page);
  await page.evaluate((preferences) => window.haven.savePreferences(preferences), originalPreferences);
  assert.ok(requests.every((url) => ['file:', 'data:', 'blob:'].includes(new URL(url).protocol)), 'Unexpected network request from the packaged renderer.');
  console.log(JSON.stringify({
    packaged: true,
    archive: 'app.asar',
    profile: 'isolated and verified',
    scene: 'art and interactions passed',
    ritual: 'reduced motion and privacy passed',
    preferences: 'saved, restored after relaunch, and reset',
    rendererErrors: 0,
  }, null, 2));
} finally {
  if (application) await application.close();
}

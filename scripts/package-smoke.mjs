import assert from 'node:assert/strict';
import { access, mkdir, readFile, readdir, unlink, writeFile } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { _electron as electron } from 'playwright-core';
import { expect } from '@playwright/test';
import { getDeveloperContactUrl } from '../shared/developer.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { version } = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
const executablePath = path.join(root, 'outputs/desktop/win-unpacked/Little Haven.exe');
const profile = path.join(root, 'work', `package-beta-${randomUUID()}`);
const fixturePath = path.join(profile, 'synthetic-photograph.png');
const sentinel = `SYNTHETIC_PRIVATE_PACKAGE_${randomUUID()}`;
const noteText = 'SYNTHETIC Beta: árvore e chá.\n小さな思い出';
const companionName = 'Chá de Lua Beta';
const canonical = (value) => path.resolve(value).toLowerCase();
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
const requests = [];
const env = Object.fromEntries(Object.entries(process.env).filter(([, value]) => typeof value === 'string'));
delete env.ELECTRON_RUN_AS_NODE;
delete env.LITTLE_HAVEN_DEV_URL;
await access(executablePath);
await mkdir(profile, { recursive: true });
let application;

async function launch() {
  const instance = await electron.launch({ executablePath, cwd: root,
    args: [`--user-data-dir=${profile}`, '--disable-gpu'], env, chromiumSandbox: true, timeout: 30_000 });
  try {
    const metadata = await instance.evaluate(({ app, BrowserWindow, shell }) => {
      const window = BrowserWindow.getAllWindows()[0];
      const settings = window?.webContents.getLastWebPreferences();
      // Stubs live only in this externally controlled test process. No email
      // client/browser is opened, and the product gains no testing hook.
      globalThis.__betaContactOpens = [];
      shell.openExternal = async (url) => { globalThis.__betaContactOpens.push(url); };
      return { isPackaged: app.isPackaged, version: app.getVersion(), appPath: app.getAppPath(),
        userData: app.getPath('userData'), sandbox: settings?.sandbox,
        contextIsolation: settings?.contextIsolation, nodeIntegration: settings?.nodeIntegration,
        discardGuard: window?.webContents.listenerCount('will-prevent-unload') };
    });
    assert.equal(metadata.isPackaged, true);
    assert.equal(metadata.version, version);
    assert.ok(metadata.appPath.endsWith('app.asar'));
    assert.equal(canonical(metadata.userData), canonical(profile), 'Profile isolation was ignored; refusing to alter data.');
    assert.equal(metadata.sandbox, true);
    assert.equal(metadata.contextIsolation, true);
    assert.equal(metadata.nodeIntegration, false);
    assert.equal(metadata.discardGuard, 1);
    const page = await instance.firstWindow();
    page.setDefaultTimeout(10_000);
    page.on('request', (request) => requests.push(request.url()));
    await expect(page.locator('.room-art')).toBeVisible();
    await page.context().setOffline(true);
    await page.reload();
    await expect(page.locator('.room-art')).toBeVisible();
    assert.ok(page.url().includes('/app.asar/dist/index.html'));
    await expect(page.locator('.beta-label')).toContainText(version);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.evaluate(() => {
      const Native = window.AudioContext ?? window.webkitAudioContext;
      window.__betaAudio = { contexts: [], sources: [] };
      window.AudioContext = class extends Native {
        constructor(...args) { super(...args); window.__betaAudio.contexts.push(this); }
        createBufferSource() {
          const source = super.createBufferSource();
          window.__betaAudio.sources.push(source);
          return source;
        }
      };
    });
    return { instance, page };
  } catch (error) { await instance.close(); throw error; }
}

async function audioState(page) {
  return page.evaluate(() => ({ contexts: window.__betaAudio.contexts.length,
    states: window.__betaAudio.contexts.map((context) => context.state),
    loopedDecodedSources: window.__betaAudio.sources.filter((source) => source.loop && source.buffer?.length > 0).length }));
}
async function assertCleanConsole(page) {
  assert.deepEqual((await page.consoleMessages()).filter((message) => message.type() === 'error').map((message) => message.text()), []);
  assert.deepEqual((await page.pageErrors()).map((error) => error.message), []);
}
async function navigate(page, name, selector) {
  await page.getByRole('button', { name, exact: true }).click();
  await expect(page.locator(selector)).toBeVisible();
}
async function checkLetter(page, instance) {
  const opener = page.getByRole('button', { name: 'Uma pequena surpresa', exact: true });
  await opener.click();
  const letter = page.locator('dialog.developer-letter');
  await expect(letter).toBeVisible();
  await expect(letter).toContainText('Oi! Eu sou o André.');
  assert.equal(await letter.evaluate((dialog) => dialog.contains(document.activeElement)), true);
  await letter.getByRole('link', { name: 'E-mail', exact: true }).click();
  await letter.getByRole('link', { name: /LinkedIn/ }).click();
  await expect.poll(() => instance.evaluate(() => globalThis.__betaContactOpens)).toEqual([
    getDeveloperContactUrl('email'), getDeveloperContactUrl('linkedin'),
  ]);
  for (const id of ['https://example.invalid/', 'mailto:other@example.invalid', 'file:///C:/Windows/win.ini']) {
    assert.equal(await page.evaluate(async (value) => {
      try { await window.haven.openDeveloperContact(value); return false; } catch { return true; }
    }, id), true);
  }
  assert.equal((await instance.evaluate(() => globalThis.__betaContactOpens)).length, 2);
  await page.keyboard.press('Escape');
  await expect(letter).toHaveCount(0);
  await expect(opener).toBeFocused();
  await opener.press('Enter');
  await expect(letter).toBeVisible();
  await letter.getByRole('button', { name: 'Fechar carta', exact: true }).click();
  await expect(letter).toHaveCount(0);
}
async function checkSecondInstance(instance) {
  const files = ['preferences.json', 'garden.json', path.join('memory-corner', 'board.json')];
  const snapshots = await Promise.all(files.map((name) => readFile(path.join(profile, name), 'utf8')));
  const firstId = await instance.evaluate(({ app, BrowserWindow }) => {
    globalThis.__betaSecondInstances = 0;
    app.on('second-instance', () => { globalThis.__betaSecondInstances++; });
    const window = BrowserWindow.getAllWindows()[0]; window.minimize(); return window.id;
  });
  await expect.poll(() => instance.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].isMinimized())).toBe(true);
  const secondary = spawn(executablePath, [`--user-data-dir=${profile}`, '--disable-gpu'],
    { cwd: root, env, windowsHide: true, stdio: 'ignore' });
  try {
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => { secondary.kill(); reject(new Error('Second instance did not exit.')); }, 15_000);
      secondary.once('error', (error) => { clearTimeout(timeout); reject(error); });
      secondary.once('exit', (code) => { clearTimeout(timeout); code === 0 ? resolve() : reject(new Error(`Second instance exited ${code}.`)); });
    });
  } finally { if (secondary.exitCode === null && secondary.signalCode === null) secondary.kill(); }
  await expect.poll(() => instance.evaluate(({ BrowserWindow }) => {
    const windows = BrowserWindow.getAllWindows();
    return { count: windows.length, id: windows[0]?.id, minimized: windows[0]?.isMinimized(),
      focused: windows[0]?.isFocused(), attempts: globalThis.__betaSecondInstances };
  })).toEqual({ count: 1, id: firstId, minimized: false, focused: true, attempts: 1 });
  assert.deepEqual(await Promise.all(files.map((name) => readFile(path.join(profile, name), 'utf8'))), snapshots,
    'A second launch unexpectedly changed persisted data.');
}
async function originalHash(imageId) {
  const directory = path.join(profile, 'memory-corner', 'images');
  const filename = (await readdir(directory)).find((name) => name.startsWith(`${imageId}.`));
  assert.ok(filename, 'Managed original is missing.');
  return digest(await readFile(path.join(directory, filename)));
}

try {
  let { instance, page } = await launch();
  application = instance;
  assert.deepEqual(await page.evaluate(() => Object.keys(window.haven).sort()), [
    'getGarden', 'getPreferences', 'memoryExport', 'memoryGet', 'memoryImport', 'memoryRestore', 'memorySave',
    'openDeveloperContact', 'saveGarden', 'savePreferences',
  ]);
  assert.deepEqual(await page.evaluate(() => [typeof window.require, typeof window.process]), ['undefined', 'undefined']);
  assert.equal(await page.locator('.brand img').evaluate((image) => image.complete && image.naturalWidth > 0), true);
  assert.deepEqual(await audioState(page), { contexts: 0, states: [], loopedDecodedSources: 0 });
  await page.getByRole('button', { name: 'Apagar luminária', exact: true }).click();
  await expect(page.locator('.room-night-shade')).toHaveAttribute('opacity', '0.19');
  await page.getByRole('slider', { name: 'Volume', exact: true }).fill('0.13');
  await page.getByRole('button', { name: 'Abrir Cozy Sound Mixer', exact: true }).click();
  const mixer = page.getByRole('dialog', { name: 'Cozy Sound Mixer', exact: true });
  await mixer.locator('[data-layer="rain-soft"] input').fill('31');
  await mixer.getByRole('button', { name: 'Ativar áudio', exact: true }).click();
  await expect(mixer.locator('[data-layer="rain-soft"]')).toHaveAttribute('data-status', 'playing');
  await expect.poll(() => audioState(page)).toMatchObject({ contexts: 1, states: ['running'] });
  assert.ok((await audioState(page)).loopedDecodedSources > 0, 'Packaged recordings did not decode/play.');
  assert.equal(await page.evaluate(() => window.__betaAudio.sources.some((source) => source.buffer
    && source.buffer.getChannelData(0).some((sample) => Math.abs(sample) > 0.00001))), true,
  'The decoded sound buffers contain no signal.');
  await mixer.getByRole('button', { name: 'Silenciar tudo', exact: true }).click();
  await expect(mixer.getByRole('button', { name: 'Reativar', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await mixer.getByRole('button', { name: 'Reativar', exact: true }).click();
  await mixer.getByRole('button', { name: 'Fechar mixer', exact: true }).click();
  await checkLetter(page, instance);
  assert.equal((await audioState(page)).contexts, 1, 'Letter replaced the audio context.');
  assert.deepEqual((await audioState(page)).states, ['running']);
  await page.getByRole('button', { name: 'Abrir My Companion', exact: true }).click();
  const companion = page.getByRole('dialog', { name: 'My Companion', exact: true });
  await companion.getByRole('textbox', { name: 'Nome do companheiro', exact: true }).fill(companionName);
  await companion.getByRole('button', { name: 'Confirmar nome', exact: true }).click();
  await expect(page.getByRole('button', { name: `Fazer carinho em ${companionName}`, exact: true })).toBeVisible();
  await navigate(page, 'The Garden', 'svg.garden-art');
  await page.locator('[data-slot-id="bed-1"]').first().click();
  await page.getByRole('dialog').getByRole('button', { name: 'Lavanda', exact: true }).click();
  await expect(page.locator('[data-slot-id="bed-1"]').first()).toHaveAttribute('data-stage', '0');
  await expect.poll(() => page.evaluate(async () => (await window.haven.getGarden()).garden.plants[0]?.species)).toBe('lavender');
  await navigate(page, 'The Journey', 'svg.journey-art');
  for (const scenery of ['forest', 'sunset', 'snowy-mountains', 'morning-lake', 'rainy-night']) {
    await page.getByRole('combobox', { name: 'Paisagem da viagem', exact: true }).selectOption(scenery);
    await expect(page.locator('.journey-scene')).toHaveAttribute('data-scenery', scenery);
  }
  await page.getByRole('button', { name: 'Modo Imersivo', exact: true }).click();
  await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBe(true);
  await page.keyboard.press('m');
  await expect(mixer).toBeVisible();
  await expect(mixer).toHaveAttribute('data-keyboard-lock', 'true');
  await page.keyboard.press('Escape');
  await expect(mixer).toHaveCount(0);
  assert.equal(await page.evaluate(() => Boolean(document.fullscreenElement)), true);
  await page.keyboard.press('Escape');
  await expect.poll(() => page.evaluate(() => document.fullscreenElement === null)).toBe(true);
  assert.deepEqual((await audioState(page)).states, ['running']);
  await navigate(page, 'The Memory Corner', '.memory-board');
  const syntheticBytes = Buffer.from(await page.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width = 1200; canvas.height = 800;
    const context = canvas.getContext('2d'); context.fillStyle = '#6b8d78'; context.fillRect(0, 0, 1200, 800);
    context.fillStyle = '#e3bd7e'; context.fillRect(200, 200, 800, 400);
    return canvas.toDataURL('image/png').split(',')[1];
  }), 'base64');
  await writeFile(fixturePath, syntheticBytes);
  await instance.evaluate(({ dialog }, filePath) => {
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [filePath] });
  }, fixturePath);
  await page.getByRole('button', { name: 'Add a Memory', exact: true }).click();
  await expect(page.locator('.memory-card[data-kind="photo"] img')).toBeVisible();
  await expect.poll(() => page.locator('.memory-card[data-kind="photo"] img').evaluate((image) => image.complete && image.naturalWidth > 0)).toBe(true);
  await page.getByRole('button', { name: 'Write a Note', exact: true }).click();
  await page.getByRole('textbox', { name: 'Mensagem do bilhete', exact: true }).fill(noteText);
  await page.getByRole('button', { name: 'Fixar bilhete', exact: true }).click();
  await expect(page.locator('.memory-card[data-kind="note"]')).toContainText(noteText);
  await expect.poll(() => page.evaluate(async () => (await window.haven.memoryGet()).board.items.length)).toBe(2);
  const board = await page.evaluate(async () => (await window.haven.memoryGet()).board);
  assert.ok(!JSON.stringify(board).includes(fixturePath), 'Renderer received a source file path.');
  const imageId = board.items.find((item) => item.kind === 'photo').imageId;
  assert.equal(await originalHash(imageId), digest(syntheticBytes));
  await unlink(fixturePath); // Only this generated UUID-profile fixture is removed.
  await page.locator('.memory-card[data-kind="photo"]').press('Enter');
  const original = page.locator('dialog[open] img[src*="/original"]');
  await expect.poll(() => original.evaluate((image) => [image.naturalWidth, image.naturalHeight])).toEqual([1200, 800]);
  assert.notEqual(await original.evaluate((image) => getComputedStyle(image).imageRendering), 'pixelated');
  await page.getByRole('button', { name: 'Voltar ao mural', exact: true }).click();
  await expect.poll(() => instance.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length)).toBe(1);
  await navigate(page, 'Let It Float', 'textarea');
  await page.getByRole('textbox').fill(sentinel);
  await page.getByRole('button', { name: 'The Room', exact: true }).click();
  await page.getByRole('button', { name: 'Continuar escrevendo', exact: true }).click();
  await expect(page.getByRole('textbox')).toHaveValue(sentinel);
  await page.getByRole('button', { name: 'Let it float', exact: true }).click();
  await expect(page.getByText('O rio segue. Você pode ficar.')).toBeVisible();
  await expect(page.getByRole('textbox')).toHaveCount(0);
  assert.ok(!(await page.locator('body').innerText()).includes(sentinel));
  assert.ok(!(await page.evaluate(() => JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } }))).includes(sentinel));
  await page.getByRole('button', { name: 'Voltar ao quarto', exact: true }).click();
  await expect.poll(() => page.evaluate(async () => (await window.haven.getPreferences()).companion.name)).toBe(companionName);
  const preferences = await page.evaluate(() => window.haven.getPreferences());
  assert.equal(preferences.mixer.preset, 'custom');
  assert.equal(preferences.audioEnabled, true);
  await assertCleanConsole(page);
  await checkSecondInstance(instance);
  await application.close(); application = undefined;
  assert.ok(!(await readFile(path.join(profile, 'preferences.json'), 'utf8')).includes(sentinel));
  assert.ok(!(await readFile(path.join(profile, 'memory-corner', 'board.json'), 'utf8')).includes(sentinel));
  ({ instance, page } = await launch()); application = instance;
  assert.deepEqual(await page.evaluate(() => window.haven.getPreferences()), preferences);
  assert.deepEqual(await audioState(page), { contexts: 0, states: [], loopedDecodedSources: 0 });
  await expect(page.getByRole('button', { name: `Fazer carinho em ${companionName}`, exact: true })).toBeVisible();
  await expect(page.getByRole('slider', { name: 'Volume', exact: true })).toHaveValue('0.13');
  await navigate(page, 'The Garden', 'svg.garden-art');
  assert.equal((await page.evaluate(() => window.haven.getGarden())).garden.plants[0].species, 'lavender');
  await expect(page.locator('[data-slot-id="bed-1"]').first()).toHaveAttribute('data-stage', /[0-3]/);
  await navigate(page, 'The Memory Corner', '.memory-board');
  await expect(page.locator('.memory-card[data-kind="note"]')).toContainText(noteText);
  await expect(page.locator('.memory-card[data-kind="photo"] img')).toBeVisible();
  assert.deepEqual(await page.evaluate(async () => (await window.haven.memoryGet()).board), board);
  assert.equal(await originalHash(imageId), digest(syntheticBytes));
  await page.locator('.memory-card[data-kind="photo"]').press('Enter');
  await expect.poll(() => page.locator('dialog[open] img[src*="/original"]').evaluate((image) => [image.naturalWidth, image.naturalHeight])).toEqual([1200, 800]);
  await page.getByRole('button', { name: 'Voltar ao mural', exact: true }).click();
  await assertCleanConsole(page);
  assert.ok(requests.every((url) => ['file:', 'data:', 'blob:', 'haven-memory:'].includes(new URL(url).protocol)),
    'Unexpected network request from the packaged renderer.');
  console.log(JSON.stringify({ version, packaged: true, archive: 'app.asar', profile: 'isolated UUID, verified before writes', offlineReload: true,
    scenes: ['Room', 'Garden', 'Journey (five landscapes)', 'Memory Corner', 'Let It Float'],
    audio: 'real context, decoded looping recordings, custom mix, mute, continuity, no autoplay after restart',
    letter: 'mouse/keyboard, close/Escape, exact contacts intercepted, arbitrary URLs rejected',
    persistence: 'preferences, named companion, lavender plant, Unicode note and original photo hash after restart',
    singleInstance: 'second process exited, restored existing window, same persisted snapshots', rendererErrors: 0 }, null, 2));
} finally { if (application) await application.close(); }

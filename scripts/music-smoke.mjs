// Real production renderer, isolated profile, native minimization; no product hooks.
// Optional existing packaged build: node scripts/music-smoke.mjs --packaged <exe>
import assert from 'node:assert/strict';
import { access, mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { _electron as electron } from 'playwright-core';
import { expect } from '@playwright/test';
import { createPresetMix } from '../shared/audio.js';
import { createKitchen } from '../shared/kitchen.js';
import {
  installAudioProbe, audioSnapshot, expectMaster, mixer, layerRow, openMixer, closeMixer,
} from '../tests/e2e/helpers/audio.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const packaged = process.argv[2] === '--packaged';
assert.ok(process.argv.length === 2 || (packaged && process.argv.length === 4),
  'Use node scripts/music-smoke.mjs [--packaged <existing-exe>].');
const executablePath = packaged ? path.resolve(process.argv[3]) : require('electron');
await access(executablePath);
await mkdir(path.join(root, 'work'), { recursive: true });
const profile = await mkdtemp(path.join(root, 'work', 'music-smoke-'));
const kitchen = createKitchen();
kitchen.session = {
  id: '11111111-1111-4111-8111-111111111151', recipeId: 'tea', durationMs: 300_000,
  elapsedMs: 297_000, updatedAt: Date.now(), status: 'paused', presentation: 'closed', completedAt: null,
};
await writeFile(path.join(profile, 'kitchen.json'), JSON.stringify(kitchen));
await writeFile(path.join(profile, 'preferences.json'), JSON.stringify({
  audioEnabled: true, volume: 0.4, mixer: createPresetMix('cozy-kitchen'),
  companion: { enabled: false, name: 'Mochi', appearance: 'ginger', soundEnabled: false, introduced: true },
}));
const env = Object.fromEntries(Object.entries(process.env).filter(([, value]) => typeof value === 'string'));
delete env.ELECTRON_RUN_AS_NODE;
delete env.LITTLE_HAVEN_DEV_URL;
let application;
const report = { packaged, executablePath, profile, launches: [], auditoryEvaluation: 'Pending human listening.' };
const errors = [];
const external = [];
const music = (page) => layerRow(page, 'kitchen-music');
const musicSources = (page) => page.evaluate(() => window.__havenAudioProbe.sources
  .filter(({ node, stopped }) => !stopped && node.loop && (node.buffer?.duration ?? 0) >= 120)
  .map(({ id, node }) => ({ id, duration: node.buffer.duration, channels: node.buffer.numberOfChannels })));

async function launch() {
  const instance = await electron.launch({ executablePath, cwd: root, env, chromiumSandbox: true,
    args: [...(packaged ? [] : [root]), `--user-data-dir=${profile}`, '--disable-gpu'], timeout: 30_000 });
  application = instance;
  const page = await instance.firstWindow();
  const metadata = await instance.evaluate(({ app, BrowserWindow }) => {
    const window = BrowserWindow.getAllWindows()[0];
    const settings = window.webContents.getLastWebPreferences();
    return { packaged: app.isPackaged, appPath: app.getAppPath(), profile: app.getPath('userData'),
      sandbox: settings.sandbox, contextIsolation: settings.contextIsolation, nodeIntegration: settings.nodeIntegration };
  });
  assert.equal(metadata.packaged, packaged);
  assert.equal(path.resolve(metadata.profile).toLowerCase(), profile.toLowerCase(), 'Profile isolation failed.');
  assert.equal(metadata.sandbox, true);
  assert.equal(metadata.contextIsolation, true);
  assert.equal(metadata.nodeIntegration, false);
  if (packaged) assert.ok(metadata.appPath.endsWith('app.asar'));
  page.setDefaultTimeout(15_000);
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (['http:', 'https:', 'ws:', 'wss:'].includes(url.protocol)) external.push(url.href);
  });
  // firstWindow observes creation, before main has necessarily finished its
  // initial loadFile navigation. Wait for that document before reloading it.
  await expect(page.locator('.room-art')).toBeVisible();
  await installAudioProbe(page);
  await page.context().setOffline(true);
  await page.reload();
  await expect(page.locator('.room-art')).toBeVisible();
  assert.equal((await audioSnapshot(page)).contexts, 0);
  await page.getByRole('button', { name: 'The Cozy Kitchen', exact: true }).click();
  await expect(page.locator('.kitchen-scene')).toBeVisible();
  assert.equal((await audioSnapshot(page)).contexts, 0);
  report.launches.push(metadata);
  return { instance, page };
}

try {
  let { instance, page } = await launch();
  await openMixer(page);
  await expect(music(page).getByRole('slider')).toHaveValue('30');
  await mixer(page).getByRole('button', { name: 'Ativar áudio', exact: true }).click();
  await expect(music(page)).toHaveAttribute('data-status', 'playing');
  const decoded = await musicSources(page);
  assert.equal(decoded.length, 1);
  assert.equal(decoded[0].channels, 2);
  report.score = decoded[0];
  await music(page).getByRole('slider').fill('24');
  await mixer(page).getByRole('slider', { name: 'Volume geral', exact: true }).fill('55');
  await expectMaster(page, 0.55 * 0.25);
  await closeMixer(page);
  await page.getByRole('button', { name: 'Retomar receita', exact: true }).click();
  const startTime = await page.evaluate(() => window.__havenAudioProbe.contexts[0].currentTime);
  await instance.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].minimize());
  await expect.poll(() => instance.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].isMinimized())).toBe(true);
  // Poll the main-process clock and the actual AudioContext while minimized.
  await expect.poll(() => page.evaluate(async () => (await window.haven.getKitchen()).kitchen.session.status), { timeout: 10_000 }).toBe('completed');
  const minimized = await page.evaluate(() => ({ state: window.__havenAudioProbe.contexts[0].state,
    currentTime: window.__havenAudioProbe.contexts[0].currentTime }));
  assert.equal(minimized.state, 'running');
  assert.ok(minimized.currentTime > startTime + 1, 'Authorized audio did not advance while minimized.');
  assert.deepEqual(await musicSources(page), decoded);
  await instance.evaluate(({ BrowserWindow }) => { const window = BrowserWindow.getAllWindows()[0]; window.restore(); window.show(); window.focus(); });
  await expect.poll(() => instance.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].isMinimized())).toBe(false);
  await expect(page.locator('.kitchen-completion')).toBeVisible();
  assert.deepEqual(await musicSources(page), decoded);
  await page.getByRole('button', { name: 'The Room', exact: true }).click();
  await expect.poll(async () => (await audioSnapshot(page)).sources.find(({ id }) => id === decoded[0].id))
    .toMatchObject({ stopped: true, disconnected: true, hasBuffer: false });
  await page.getByRole('button', { name: 'The Cozy Kitchen', exact: true }).click();
  await openMixer(page);
  await expect(music(page)).toHaveAttribute('data-status', 'playing');
  assert.equal((await musicSources(page)).length, 1);
  assert.equal((await audioSnapshot(page)).contexts, 1);
  await mixer(page).getByRole('button', { name: 'Silenciar tudo', exact: true }).click();
  await expectMaster(page, 0);
  await expect.poll(() => page.evaluate(async () => {
    const prefs = await window.haven.getPreferences();
    return { muted: prefs.mixer.muted, volume: prefs.mixer.layers['kitchen-music'].volume, master: prefs.volume };
  })).toEqual({ muted: true, volume: 0.24, master: 0.55 });
  await instance.close();
  application = null;
  ({ instance, page } = await launch());
  await openMixer(page);
  await expect(music(page).getByRole('slider')).toHaveValue('24');
  await expect(mixer(page).getByRole('button', { name: 'Reativar', exact: true })).toBeVisible();
  await mixer(page).getByRole('button', { name: 'Ativar áudio', exact: true }).click();
  await expect(music(page)).toHaveAttribute('data-status', 'playing');
  await expectMaster(page, 0);
  await mixer(page).getByRole('button', { name: 'Reativar', exact: true }).click();
  await expectMaster(page, 0.55 * 0.25);
  assert.equal((await musicSources(page)).length, 1);
  assert.equal((await audioSnapshot(page)).contexts, 1);
  assert.deepEqual(errors, []);
  assert.deepEqual(external, []);
  report.passed = true;
  report.checks = ['offline stereo score decoding', 'explicit consent on each opening', 'single context/source',
    'minimized playback during recipe completion', 'completion does not restart music', 'scene fade and release',
    'persistent individual/master volumes and mute', 'unchanged Electron isolation'];
  await mkdir(path.join(root, 'outputs'), { recursive: true });
  await writeFile(path.join(root, 'outputs', packaged ? 'music-smoke-packaged.json' : 'music-smoke.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Music smoke passed (${packaged ? 'packaged' : 'production build'}): ${report.checks.join(', ')}.`);
} finally {
  if (application) await application.close();
}

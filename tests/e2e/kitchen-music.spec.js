import { test, expect } from '@playwright/test';
import { createKitchen } from '../../shared/kitchen.js';
import { createPresetMix } from '../../shared/audio.js';
import {
  installAudioProbe, audioSnapshot, expectMaster, expectLayerTarget,
  mixer, layerRow, presetSelect, openMixer, closeMixer, savedPreferences,
} from './helpers/audio.js';

const kitchenNav = (page) => page.getByRole('button', { name: 'The Cozy Kitchen', exact: true });
const music = (page) => layerRow(page, 'kitchen-music');
const diagnostics = new WeakMap();

test.beforeEach(async ({ page }) => {
  const recorded = { errors: [], external: [] };
  diagnostics.set(page, recorded);
  page.on('pageerror', (error) => recorded.errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') recorded.errors.push(message.text()); });
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (['http:', 'https:', 'ws:', 'wss:'].includes(url.protocol) && url.hostname !== '127.0.0.1') recorded.external.push(url.href);
  });
  await installAudioProbe(page);
  await page.addInitScript(() => {
    const NativeContext = window.AudioContext;
    window.__musicDecodes = 0;
    window.AudioContext = class extends NativeContext {
      decodeAudioData(...args) { window.__musicDecodes += 1; return super.decodeAudioData(...args); }
    };
  });
});

test.afterEach(async ({ page }) => {
  expect(diagnostics.get(page).errors).toEqual([]);
  expect(diagnostics.get(page).external).toEqual([]);
});

async function musicSources(page) {
  return page.evaluate(() => window.__havenAudioProbe.sources
    .filter(({ node }) => node.loop && (node.buffer?.duration ?? 0) >= 120)
    .map(({ id, node, stopped }) => ({ id, stopped, channels: node.buffer.numberOfChannels,
      duration: node.buffer.duration, frames: node.buffer.length })));
}

async function prepare(page, { recipe = false } = {}) {
  const preferences = { audioEnabled: true, volume: 0.4, mixer: createPresetMix('cozy-kitchen'),
    companion: { enabled: false, name: 'Mochi', appearance: 'ginger', soundEnabled: false, introduced: true } };
  const kitchen = createKitchen();
  if (recipe) kitchen.session = {
    id: '00000000-0000-4000-8000-000000000050', recipeId: 'tea', durationMs: 300_000,
    elapsedMs: 296_000, updatedAt: Date.parse('2026-10-31T12:00:00Z'),
    status: 'paused', presentation: 'closed', completedAt: null,
  };
  await page.addInitScript(({ preferencesValue, kitchenValue }) => {
    if (!localStorage.getItem('haven.preferences.v1')) localStorage.setItem('haven.preferences.v1', JSON.stringify(preferencesValue));
    if (!localStorage.getItem('haven.kitchen.v1')) localStorage.setItem('haven.kitchen.v1', JSON.stringify(kitchenValue));
  }, { preferencesValue: preferences, kitchenValue: kitchen });
  if (recipe) await page.clock.install({ time: new Date('2026-10-31T12:00:00Z') });
  await page.goto('/');
  await kitchenNav(page).click();
  await expect(page.locator('.kitchen-scene')).toBeVisible();
}

async function activateMusic(page) {
  await openMixer(page);
  await presetSelect(page).selectOption('cozy-kitchen');
  await mixer(page).getByRole('button', { name: 'Ativar áudio', exact: true }).click();
  await expect(music(page)).toHaveAttribute('data-status', 'playing');
  await expect.poll(async () => (await musicSources(page)).length).toBe(1);
}

test('a saved kitchen preset remains silent until consent, decodes a full stereo score, and has independent controls', async ({ page }) => {
  await prepare(page);
  await openMixer(page);
  await expect(music(page).getByRole('switch', { name: 'Café na Cozinha', exact: true })).toHaveAttribute('aria-checked', 'true');
  await expect(music(page).getByRole('slider')).toHaveValue('30');
  expect((await audioSnapshot(page)).contexts).toBe(0);
  expect(await page.evaluate(() => window.__musicDecodes)).toBe(0);
  const saved = await savedPreferences(page);
  expect(Object.entries(saved.mixer.layers).filter(([, value]) => value.enabled).map(([id]) => id)).toEqual(['kitchen-music', 'kitchen-effects']);
  await mixer(page).getByRole('button', { name: 'Ativar áudio', exact: true }).click();
  await expect(music(page)).toHaveAttribute('data-status', 'playing');
  const sources = await musicSources(page);
  expect(sources).toHaveLength(1);
  expect(sources[0].channels).toBe(2);
  expect(sources[0].duration).toBeGreaterThanOrEqual(120);
  const initial = await audioSnapshot(page);
  const source = initial.sources.find(({ id }) => id === sources[0].id);
  const gain = initial.gains.find(({ id }) => id === source.gainId);
  await music(page).getByRole('slider').fill('24');
  await expect.poll(async () => (await audioSnapshot(page)).gains.find(({ id }) => id === gain.id).target)
    .toBeCloseTo(gain.target * 0.8, 6);
  await mixer(page).getByRole('slider', { name: 'Volume geral', exact: true }).fill('55');
  await expectMaster(page, 0.55 * 0.25);
  await mixer(page).getByRole('button', { name: 'Silenciar tudo', exact: true }).click();
  await expectMaster(page, 0);
  expect((await musicSources(page))[0].id).toBe(source.id);
  await mixer(page).getByRole('button', { name: 'Reativar', exact: true }).click();
  await expectMaster(page, 0.55 * 0.25);
  expect(await page.evaluate(() => window.__musicDecodes)).toBe(1);
  await page.reload();
  await kitchenNav(page).click();
  await openMixer(page);
  await expect(presetSelect(page)).toHaveValue('custom');
  await expect(music(page).getByRole('slider')).toHaveValue('24');
  await expect(mixer(page).getByRole('slider', { name: 'Volume geral', exact: true })).toHaveValue('55');
  expect((await audioSnapshot(page)).contexts).toBe(0);
  expect(await page.evaluate(() => window.__musicDecodes)).toBe(0);
});

test('music survives recipe stages, pause, completion and immersive mode without a restart', async ({ page }) => {
  await prepare(page, { recipe: true });
  await activateMusic(page);
  await closeMixer(page);
  const sourceId = (await musicSources(page))[0].id;
  await page.getByRole('button', { name: 'Retomar receita', exact: true }).click();
  await page.clock.fastForward(1_000);
  await page.getByRole('button', { name: 'Pausar receita', exact: true }).click();
  await page.clock.fastForward(10_000);
  await expect(page.locator('.kitchen-scene')).toHaveAttribute('data-status', 'paused');
  expect((await musicSources(page)).map(({ id }) => id)).toEqual([sourceId]);
  await page.getByRole('button', { name: 'Retomar receita', exact: true }).click();
  await page.clock.fastForward(4_000);
  await expect(page.locator('.kitchen-scene')).toHaveAttribute('data-status', 'completed');
  await expect(page.locator('.kitchen-completion')).toBeVisible();
  expect((await musicSources(page)).map(({ id }) => id)).toEqual([sourceId]);
  await page.getByRole('button', { name: 'Modo Imersivo', exact: true }).click();
  await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBe(true);
  await page.keyboard.press('m');
  await expect(mixer(page)).toBeVisible();
  await expect(music(page)).toHaveAttribute('data-status', 'playing');
  await page.keyboard.press('Escape');
  await expect(mixer(page)).toHaveCount(0);
  expect((await musicSources(page)).map(({ id }) => id)).toEqual([sourceId]);
  expect((await audioSnapshot(page)).contexts).toBe(1);
  expect(await page.evaluate(() => window.__musicDecodes)).toBe(1);
});

test('leaving fades and frees kitchen music, preserves Custom, and returning creates only one active source', async ({ page }) => {
  await prepare(page);
  await activateMusic(page);
  await music(page).getByRole('slider').fill('27');
  const custom = (await savedPreferences(page)).mixer;
  const musicId = (await musicSources(page))[0].id;
  const original = (await audioSnapshot(page)).sources.find(({ id }) => id === musicId);
  await closeMixer(page);
  await page.getByRole('button', { name: 'The Room', exact: true }).click();
  await expectLayerTarget(page, original.gainId, 0);
  await openMixer(page);
  await expect(music(page)).toHaveAttribute('data-status', 'idle');
  expect((await savedPreferences(page)).mixer).toEqual(custom);
  await expect.poll(async () => (await audioSnapshot(page)).sources.find(({ id }) => id === original.id))
    .toMatchObject({ stopped: true, disconnected: true, hasBuffer: false });
  await closeMixer(page);
  await kitchenNav(page).click();
  await openMixer(page);
  await expect(music(page)).toHaveAttribute('data-status', 'playing');
  await expect(music(page).getByRole('slider')).toHaveValue('27');
  expect((await musicSources(page)).filter(({ stopped }) => !stopped)).toHaveLength(1);
  const second = (await musicSources(page))[0].id;
  await closeMixer(page);
  await page.getByRole('button', { name: 'The Room', exact: true }).click();
  await kitchenNav(page).click();
  await openMixer(page);
  await expect(music(page)).toHaveAttribute('data-status', 'playing');
  const after = await musicSources(page);
  expect(after.filter(({ stopped }) => !stopped)).toHaveLength(1);
  expect(after[0].id).toBe(second);
  expect((await audioSnapshot(page)).contexts).toBe(1);
  expect((await savedPreferences(page)).mixer).toEqual(custom);
});

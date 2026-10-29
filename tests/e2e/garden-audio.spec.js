import { test, expect } from '@playwright/test';
import { installAudioProbe, audioSnapshot, openMixer, closeMixer, layerRow, presetSelect, savedPreferences } from './helpers/audio.js';

const diagnostics = new WeakMap();
test.beforeEach(async ({ page }) => {
  const recorded = { errors: [], externalRequests: [] };
  diagnostics.set(page, recorded);
  page.on('pageerror', (error) => recorded.errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') recorded.errors.push(message.text()); });
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (['http:', 'https:', 'ws:', 'wss:'].includes(url.protocol) && url.hostname !== '127.0.0.1') recorded.externalRequests.push(request.url());
  });
  await installAudioProbe(page);
});
test.afterEach(async ({ page }) => {
  const recorded = diagnostics.get(page);
  expect(recorded.errors, 'Garden audio must not produce renderer errors').toEqual([]);
  expect(recorded.externalRequests, 'Garden audio must stay entirely offline').toEqual([]);
});

async function openGarden(page) {
  await page.getByRole('button', { name: 'The Garden', exact: true }).click();
  await expect(page.locator('.garden-scene')).toBeVisible();
}
async function atmosphere(page, period, weather) {
  await page.getByRole('button', { name: 'Luz e clima', exact: true }).click();
  await page.getByRole('combobox', { name: 'Período do dia', exact: true }).selectOption(period);
  await page.getByRole('combobox', { name: 'Clima do jardim', exact: true }).selectOption(weather);
  await page.getByRole('button', { name: 'Fechar', exact: true }).click();
}
async function playingLayers(page, ids, preset, gains) {
  await openMixer(page);
  await expect(presetSelect(page)).toHaveValue(preset);
  for (const id of ids) await expect(layerRow(page, id)).toHaveAttribute('data-status', 'playing');
  await expect.poll(async () => {
    const snapshot = await audioSnapshot(page);
    return snapshot.sources.filter(({ stopped }) => !stopped)
      .map(({ gainId }) => snapshot.gains.find(({ id }) => id === gainId)?.target).filter((target) => target > 0).sort();
  }).toEqual(gains);
  await closeMixer(page);
}

test('Garden weather and wildlife presets stay silent until a gesture, share one engine and release retired layers', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Parar chuva', exact: true }).click();
  await openGarden(page);
  await atmosphere(page, 'night', 'rain');
  expect((await audioSnapshot(page)).contexts).toBe(0);
  await page.getByRole('button', { name: 'Ativar áudio', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Desativar áudio', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await playingLayers(page, ['rain-soft', 'crickets', 'wind', 'stream'], 'quiet-night', [0.1, 0.2, 0.35, 0.4]);
  const firstNight = await audioSnapshot(page);
  expect(firstNight.contexts).toBe(1);
  const rainGain = firstNight.gains.find(({ master, target }) => !master && target === 0.35).id;
  const insectGain = firstNight.gains.find(({ master, target }) => !master && target === 0.4).id;

  await atmosphere(page, 'day', 'clear');
  await playingLayers(page, ['birds', 'stream', 'wind'], 'morning-garden', [0.25, 0.35, 0.5]);
  await expect.poll(async () => (await audioSnapshot(page)).sources.filter(({ gainId }) => [rainGain, insectGain].includes(gainId))
    .every(({ stopped, disconnected, hasBuffer }) => stopped && disconnected && !hasBuffer)).toBe(true);
  await atmosphere(page, 'night', 'rain');
  await playingLayers(page, ['rain-soft', 'crickets', 'wind', 'stream'], 'quiet-night', [0.1, 0.2, 0.35, 0.4]);
  expect((await audioSnapshot(page)).contexts).toBe(1);

  const lastNight = await audioSnapshot(page);
  const retiredIds = lastNight.sources.filter(({ stopped, gainId }) => !stopped
    && lastNight.gains.find(({ id }) => id === gainId)?.target > 0).map(({ id }) => id);
  await page.getByRole('button', { name: 'The Room', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Ativar chuva', exact: true })).toBeVisible();
  await openMixer(page);
  await expect(presetSelect(page)).toHaveValue('rainy-evening');
  await expect(layerRow(page, 'rain-soft').getByRole('switch')).toHaveAttribute('aria-checked', 'false');
  await expect(layerRow(page, 'fire')).toHaveAttribute('data-status', 'playing');
  await expect(layerRow(page, 'wind')).toHaveAttribute('data-status', 'playing');
  await closeMixer(page);
  // Wind remains shared; all three Garden-only voices are retired and released.
  await expect.poll(async () => (await audioSnapshot(page)).sources.filter(({ id, stopped }) => retiredIds.includes(id) && stopped).length).toBe(3);
  expect((await audioSnapshot(page)).contexts).toBe(1);

  await openGarden(page);
  await playingLayers(page, ['rain-soft', 'crickets', 'wind', 'stream'], 'quiet-night', [0.1, 0.2, 0.35, 0.4]);
  expect((await audioSnapshot(page)).contexts).toBe(1);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Ativar áudio', exact: true })).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByText('Retomar som', { exact: true })).toBeVisible();
  await openGarden(page);
  await atmosphere(page, 'sunset', 'clear');
  expect((await savedPreferences(page)).mixer.preset).toBe('morning-garden');
  expect((await audioSnapshot(page)).contexts).toBe(0);
  expect((await audioSnapshot(page)).sources).toHaveLength(0);
});

import { test, expect } from '@playwright/test';
import {
  installAudioProbe, audioSnapshot, expectMaster, expectLayerTarget, setSlider,
  mixer, layerRow, presetSelect, openMixer, closeMixer, savedPreferences,
} from './helpers/audio.js';

const diagnostics = new WeakMap();
test.beforeEach(async ({ page }) => {
  const recorded = { errors: [], external: [] };
  diagnostics.set(page, recorded);
  page.on('pageerror', (error) => recorded.errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') recorded.errors.push(message.text()); });
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (['http:', 'https:', 'ws:', 'wss:'].includes(url.protocol) && url.hostname !== '127.0.0.1') recorded.external.push(request.url());
  });
  await installAudioProbe(page);
});
test.afterEach(async ({ page }) => {
  expect(diagnostics.get(page).errors, 'mixer must not produce renderer errors').toEqual([]);
  expect(diagnostics.get(page).external, 'sounds and preferences stay offline').toEqual([]);
});

async function startRainy(page) {
  await openMixer(page);
  await presetSelect(page).selectOption('rainy-evening');
  await mixer(page).getByRole('button', { name: 'Ativar áudio', exact: true }).click();
  for (const id of ['rain-soft', 'fire', 'wind']) await expect(layerRow(page, id)).toHaveAttribute('data-status', 'playing');
  await expectMaster(page, 0.25 * 0.25);
}

test('mixer opens silently, starts simultaneous real layers and keeps them playing after closing', async ({ page }) => {
  await page.goto('/');
  expect((await audioSnapshot(page)).contexts).toBe(0);
  await openMixer(page);
  await expect(mixer(page).getByText('Create your own little atmosphere.', { exact: true })).toBeVisible();
  await expect(mixer(page).getByText('Em silêncio', { exact: true })).toBeVisible();
  await expect(mixer(page).getByRole('switch')).toHaveCount(12);
  expect((await audioSnapshot(page)).contexts).toBe(0);
  await closeMixer(page);
  await expect(page.getByRole('button', { name: 'Abrir Cozy Sound Mixer', exact: true })).toBeFocused();
  await startRainy(page);
  const started = await audioSnapshot(page);
  expect(started.contexts).toBe(1);
  expect(started.sources).toHaveLength(3);
  expect(started.sources.every(({ loop, hasBuffer, stopped }) => loop && hasBuffer && !stopped)).toBe(true);
  expect(started.gains.filter(({ master, disconnected }) => !master && !disconnected).map(({ target }) => target).sort()).toEqual([0.15, 0.25, 0.4]);
  await closeMixer(page);
  await openMixer(page);
  expect((await audioSnapshot(page)).sources).toEqual(started.sources);
  await expect(mixer(page).getByText('Som ligado', { exact: true })).toBeVisible();
});

test('layer gains are independent, master and mute preserve the mix, and enabled zero is silent', async ({ page }) => {
  await page.goto('/');
  await startRainy(page);
  const before = await audioSnapshot(page);
  const rainGain = before.gains.find(({ master, target }) => !master && target === 0.4).id;
  const fireGain = before.gains.find(({ master, target }) => !master && target === 0.25).id;
  const windGain = before.gains.find(({ master, target }) => !master && target === 0.15).id;
  await setSlider(layerRow(page, 'rain-soft').getByRole('slider'), 25);
  await expectLayerTarget(page, rainGain, 0.25);
  await expectLayerTarget(page, fireGain, 0.25);
  await expectLayerTarget(page, windGain, 0.15);
  await setSlider(layerRow(page, 'fire').getByRole('slider'), 40);
  await expectLayerTarget(page, fireGain, 0.4);
  await expectLayerTarget(page, rainGain, 0.25);
  await expect(presetSelect(page)).toHaveValue('custom');
  await expect(layerRow(page, 'fire').locator('output')).toHaveText('40%');
  await setSlider(mixer(page).getByRole('slider', { name: 'Volume geral', exact: true }), 60);
  await expectMaster(page, 0.6 * 0.25);
  const configured = (await savedPreferences(page)).mixer;
  await mixer(page).getByRole('button', { name: 'Silenciar tudo', exact: true }).click();
  await expectMaster(page, 0);
  await expect.poll(async () => (await audioSnapshot(page)).gains.find(({ master }) => master).actual).toBe(0);
  expect((await savedPreferences(page)).mixer.layers).toEqual(configured.layers);
  expect((await audioSnapshot(page)).sources).toEqual(before.sources);
  await expect(mixer(page).getByText('Silenciado', { exact: true })).toBeVisible();
  await mixer(page).getByRole('button', { name: 'Reativar', exact: true }).click();
  await expectMaster(page, 0.6 * 0.25);
  await setSlider(layerRow(page, 'rain-soft').getByRole('slider'), 0);
  await expectLayerTarget(page, rainGain, 0);
  await expect(layerRow(page, 'rain-soft').getByRole('switch')).toHaveAttribute('aria-checked', 'true');
  await expect(layerRow(page, 'rain-soft')).toHaveAttribute('data-status', 'idle');
  await expect.poll(async () => (await audioSnapshot(page)).sources.filter(({ gainId }) => gainId === rainGain)
    .every(({ stopped, disconnected, hasBuffer }) => stopped && disconnected && !hasBuffer)).toBe(true);
  await expectLayerTarget(page, fireGain, 0.4);
  await layerRow(page, 'fire').getByRole('switch').click();
  await expect(layerRow(page, 'fire').getByRole('slider')).toBeDisabled();
  await expect(layerRow(page, 'fire').locator('output')).toHaveText('40%');
  await expectLayerTarget(page, fireGain, 0);
  await layerRow(page, 'fire').getByRole('switch').click();
  await expect(layerRow(page, 'fire').getByRole('slider')).toHaveValue('40');
  await expect(layerRow(page, 'fire')).toHaveAttribute('data-status', 'playing');
  expect((await audioSnapshot(page)).contexts).toBe(1);
});

test('custom combination survives preset changes and reload without autoplay', async ({ page }) => {
  await page.goto('/');
  await startRainy(page);
  await setSlider(layerRow(page, 'rain-soft').getByRole('slider'), 23);
  await setSlider(layerRow(page, 'fire').getByRole('slider'), 41);
  await setSlider(mixer(page).getByRole('slider', { name: 'Volume geral', exact: true }), 37);
  const custom = (await savedPreferences(page)).mixer.layers;
  for (const id of ['morning-garden', 'quiet-night', 'peaceful-journey']) {
    await presetSelect(page).selectOption(id);
    await expect(presetSelect(page)).toHaveValue(id);
    expect((await savedPreferences(page)).mixer.customLayers).toEqual(custom);
  }
  await expect(layerRow(page, 'train-track')).toHaveAttribute('data-status', 'playing');
  await expect(layerRow(page, 'train-wheels')).toHaveAttribute('data-status', 'playing');
  await presetSelect(page).selectOption('custom');
  await expect(layerRow(page, 'rain-soft').getByRole('slider')).toHaveValue('23');
  await expect(layerRow(page, 'fire').getByRole('slider')).toHaveValue('41');
  expect((await savedPreferences(page)).mixer.layers).toEqual(custom);
  await mixer(page).getByRole('button', { name: 'Silenciar tudo', exact: true }).click();
  await page.reload();
  expect((await audioSnapshot(page)).contexts).toBe(0);
  await expect(page.getByRole('button', { name: 'Ativar áudio', exact: true })).toHaveAttribute('aria-pressed', 'false');
  await openMixer(page);
  await expect(presetSelect(page)).toHaveValue('custom');
  await expect(mixer(page).getByRole('slider', { name: 'Volume geral', exact: true })).toHaveValue('37');
  await expect(mixer(page).getByRole('button', { name: 'Reativar', exact: true })).toHaveAttribute('aria-pressed', 'true');
  expect((await savedPreferences(page)).mixer.layers).toEqual(custom);
  expect((await audioSnapshot(page)).contexts).toBe(0);
});

test('custom travels intact through every world and environment presets remain an explicit suggestion', async ({ page }) => {
  await page.goto('/');
  await startRainy(page);
  await setSlider(layerRow(page, 'wind').getByRole('slider'), 19);
  const custom = (await savedPreferences(page)).mixer;
  const sourceIds = (await audioSnapshot(page)).sources.map(({ id }) => id);
  await closeMixer(page);
  for (const [world, suggestion] of [['The Garden', 'Morning Garden'], ['The Journey', 'Peaceful Journey'], ['Let It Float', 'Rainy Evening'], ['The Room', 'Rainy Evening']]) {
    await page.getByRole('button', { name: world, exact: true }).click();
    await openMixer(page);
    await expect(presetSelect(page)).toHaveValue('custom');
    await expect(mixer(page).getByRole('button', { name: `Para este lugar: ${suggestion}`, exact: false })).toBeVisible();
    expect((await savedPreferences(page)).mixer).toEqual(custom);
    expect((await audioSnapshot(page)).sources.map(({ id }) => id)).toEqual(sourceIds);
    expect((await audioSnapshot(page)).contexts).toBe(1);
    await closeMixer(page);
  }
});

test('keyboard focus stays inside the mixer and its fixed master fits smaller windows', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const opener = page.getByRole('button', { name: 'Abrir Cozy Sound Mixer', exact: true });
  await opener.focus();
  await page.keyboard.press('Enter');
  const close = mixer(page).getByRole('button', { name: 'Fechar mixer', exact: true });
  await expect(close).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(mixer(page).getByRole('button', { name: 'Silenciar tudo', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(close).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(presetSelect(page)).toBeFocused();
  expect(await presetSelect(page).evaluate((element) => getComputedStyle(element).outlineStyle)).not.toBe('none');
  const rainSlider = layerRow(page, 'rain-soft').getByRole('slider');
  await rainSlider.focus();
  await page.keyboard.press('ArrowLeft');
  await expect(rainSlider).toHaveValue('39');
  await expect(presetSelect(page)).toHaveValue('custom');
  expect(await mixer(page).evaluate((element) => getComputedStyle(element).animationName)).toBe('none');
  await page.screenshot({ path: 'outputs/Little-Haven-Mixer-desktop.png', animations: 'disabled' });
  for (const viewport of [{ width: 800, height: 650 }, { width: 390, height: 844 }, { width: 360, height: 400 }]) {
    await page.setViewportSize(viewport);
    const bounds = await mixer(page).boundingBox();
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.y).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height);
    await expect(mixer(page).getByRole('slider', { name: 'Volume geral', exact: true })).toBeInViewport();
    await expect(close).toBeInViewport();
    expect(await mixer(page).evaluate((element) => element.scrollHeight <= element.clientHeight)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (viewport.width === 390) await page.screenshot({ path: 'outputs/Little-Haven-Mixer-mobile.png', animations: 'disabled' });
  }
  await page.keyboard.press('Escape');
  await expect(mixer(page)).toHaveCount(0);
  await expect(opener).toBeFocused();
  expect((await audioSnapshot(page)).contexts).toBe(0);
});

for (const world of ['The Journey', 'The Garden']) {
  test(`M temporarily opens mixer inside ${world} fullscreen and Escape preserves the scene and sound`, async ({ page }) => {
    await page.goto('/');
    await startRainy(page);
    await setSlider(layerRow(page, 'wind').getByRole('slider'), 17);
    await closeMixer(page);
    await page.getByRole('button', { name: world, exact: true }).click();
    const before = await audioSnapshot(page);
    await page.getByRole('button', { name: 'Modo Imersivo', exact: true }).click();
    await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBe(true);
    await expect(mixer(page)).toHaveCount(0);
    await page.keyboard.press('m');
    await expect(mixer(page)).toBeVisible();
    expect(await mixer(page).evaluate((element) => document.fullscreenElement.contains(element))).toBe(true);
    await expect(presetSelect(page)).toHaveValue('custom');
    await setSlider(mixer(page).getByRole('slider', { name: 'Volume geral', exact: true }), 32);
    await expectMaster(page, 0.32 * 0.25);
    if (world === 'The Journey') await page.screenshot({ path: 'outputs/Little-Haven-Mixer-immersive.png', animations: 'disabled' });
    await page.keyboard.press('Escape');
    await expect(mixer(page)).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBe(true);
    expect((await audioSnapshot(page)).sources).toEqual(before.sources);
    await page.keyboard.press('m');
    await expect(mixer(page)).toBeVisible();
    await closeMixer(page);
    await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBe(true);
    await page.keyboard.press('Escape');
    await expect.poll(() => page.evaluate(() => document.fullscreenElement === null)).toBe(true);
    await expect(page.getByRole('button', { name: 'Modo Imersivo', exact: true })).toBeFocused();
    expect((await audioSnapshot(page)).contexts).toBe(1);
    expect((await audioSnapshot(page)).sources).toEqual(before.sources);
  });
}

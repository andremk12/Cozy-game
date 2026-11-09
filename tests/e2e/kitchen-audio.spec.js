import { test, expect } from '@playwright/test';
import { createKitchen } from '../../shared/kitchen.js';
import { createPresetMix } from '../../shared/audio.js';
import { advanceToKitchenPresentation } from './helpers/kitchen.js';
import {
  installAudioProbe, audioSnapshot, expectMaster, openMixer, closeMixer, mixer,
} from './helpers/audio.js';

const diagnostics = new WeakMap();
const completion = (page) => page.locator('.kitchen-completion');
const kitchenNav = (page) => page.getByRole('button', { name: 'The Cozy Kitchen', exact: true });

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
});

test.afterEach(async ({ page }) => {
  expect(diagnostics.get(page).errors, 'kitchen sound must not produce renderer errors').toEqual([]);
  expect(diagnostics.get(page).external, 'kitchen sound remains offline').toEqual([]);
});

async function prepare(page, { completionSoundEnabled = true, effectsEnabled = false, muted = false, volume = 0.4 } = {}) {
  const kitchen = createKitchen();
  kitchen.settings = { ...kitchen.settings, completionSoundEnabled, effectsEnabled, messagesEnabled: false };
  kitchen.session = {
    id: '00000000-0000-4000-8000-000000000015', recipeId: 'tea', durationMs: 300_000,
    elapsedMs: 299_000, updatedAt: Date.parse('2026-10-30T12:00:00Z'),
    status: 'paused', presentation: 'closed', completedAt: null,
  };
  // A saved audio preference is deliberately true: it must never grant the
  // current opening permission to create a context. Custom has no loop sources,
  // allowing the integration probe to distinguish every finite kitchen effect.
  const mix = createPresetMix('custom');
  for (const layer of Object.values(mix.layers)) layer.enabled = false;
  mix.layers['kitchen-effects'] = { enabled: true, volume: 1 };
  mix.muted = muted;
  const preferences = { audioEnabled: true, volume, mixer: mix };
  await page.addInitScript(({ kitchenValue, preferenceValue }) => {
    if (!localStorage.getItem('haven.kitchen.v1')) localStorage.setItem('haven.kitchen.v1', JSON.stringify(kitchenValue));
    if (!localStorage.getItem('haven.preferences.v1')) localStorage.setItem('haven.preferences.v1', JSON.stringify(preferenceValue));
  }, { kitchenValue: kitchen, preferenceValue: preferences });
  await page.clock.install({ time: new Date('2026-10-30T12:00:00Z') });
  await page.goto('/');
  await kitchenNav(page).click();
  await expect(page.locator('.kitchen-scene')).toHaveAttribute('data-status', 'paused');
  expect((await audioSnapshot(page)).contexts).toBe(0);
}

async function activate(page) {
  await page.getByRole('button', { name: 'Ativar áudio', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Desativar áudio', exact: true })).toHaveAttribute('aria-pressed', 'true');
}

async function finish(page) {
  await page.getByRole('button', { name: 'Retomar receita', exact: true }).click();
  await page.clock.fastForward(2_000);
  // Presentation follows the bounded visual route; it never changes the timer.
  await advanceToKitchenPresentation(page);
  await expect(completion(page)).toBeVisible();
  await expect(page.locator('.kitchen-scene')).toHaveAttribute('data-status', 'completed');
  await page.clock.runFor(20);
}

test('the optional bell uses the authorized existing context and master once, with no replay after navigation or reopening', async ({ page }) => {
  await prepare(page);
  await activate(page);
  await expectMaster(page, 0.4 * 0.25);
  const activated = await audioSnapshot(page);
  expect(activated.contexts).toBe(1);
  expect(activated.sources).toHaveLength(0);
  await finish(page);
  let played = await audioSnapshot(page);
  expect(played.contexts).toBe(1);
  expect(played.gains).toHaveLength(2);
  expect(played.sources).toHaveLength(1);
  expect(played.sources[0]).toMatchObject({ loop: false, gainId: played.gains.find(({ master }) => !master).id });
  // A real application render and remount must not create a second bell.
  await page.getByRole('slider', { name: 'Volume', exact: true }).fill('0.35');
  await page.getByRole('button', { name: 'The Room', exact: true }).click();
  await kitchenNav(page).click();
  await expect(completion(page)).toHaveCount(0);
  played = await audioSnapshot(page);
  expect(played.sources).toHaveLength(1);
  expect(played.contexts).toBe(1);
  await expect.poll(async () => (await audioSnapshot(page)).sources[0].disconnected).toBe(true);
  expect((await audioSnapshot(page)).sources[0].hasBuffer).toBe(false);
  await page.reload();
  await kitchenNav(page).click();
  await expect(completion(page)).toHaveCount(0);
  expect((await audioSnapshot(page)).contexts).toBe(0);
  await activate(page);
  expect((await audioSnapshot(page)).sources).toHaveLength(0);
});

for (const condition of ['option disabled', 'muted', 'zero volume', 'audio stopped', 'no current consent']) {
  test(`completion is visual and creates no bell when ${condition}, without delayed playback`, async ({ page }) => {
    await prepare(page, {
      completionSoundEnabled: condition !== 'option disabled',
      muted: condition === 'muted', volume: condition === 'zero volume' ? 0 : 0.4,
    });
    if (condition !== 'no current consent') await activate(page);
    if (condition === 'audio stopped') await page.getByRole('button', { name: 'Desativar áudio', exact: true }).click();
    await finish(page);
    const silent = await audioSnapshot(page);
    expect(silent.contexts).toBe(condition === 'no current consent' ? 0 : 1);
    expect(silent.sources).toHaveLength(0);
    if (condition === 'muted') {
      await openMixer(page);
      await mixer(page).getByRole('button', { name: 'Reativar', exact: true }).click();
      await closeMixer(page);
    } else if (condition === 'zero volume') {
      await page.getByRole('slider', { name: 'Volume', exact: true }).fill('0.4');
    } else if (condition === 'audio stopped' || condition === 'no current consent') {
      await activate(page);
    } else {
      await page.getByRole('button', { name: 'Luz e sons', exact: true }).click();
      await page.getByRole('dialog', { name: 'Luz e sons da cozinha', exact: true }).getByLabel('Sino suave de conclusão', { exact: true }).check();
      await page.keyboard.press('Escape');
    }
    await page.clock.fastForward(5_000);
    expect((await audioSnapshot(page)).sources).toHaveLength(0);
  });
}

test('object sounds require their own option and share global mute without altering the paused recipe', async ({ page }) => {
  await prepare(page, { completionSoundEnabled: false });
  await activate(page);
  const before = await page.evaluate(() => JSON.parse(localStorage.getItem('haven.kitchen.v1')).session);
  await page.getByRole('button', { name: 'Chaleira', exact: true }).click();
  await page.getByRole('button', { name: 'Utensílios da cozinha', exact: true }).click();
  await page.getByRole('button', { name: 'Panela no fogão', exact: true }).click();
  expect((await audioSnapshot(page)).sources).toHaveLength(0);
  await page.getByRole('button', { name: 'Luz e sons', exact: true }).click();
  await page.getByRole('dialog', { name: 'Luz e sons da cozinha', exact: true }).getByLabel('Sons dos objetos', { exact: true }).check();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Chaleira', exact: true }).click();
  await page.getByRole('button', { name: 'Utensílios da cozinha', exact: true }).click();
  await page.getByRole('button', { name: 'Panela no fogão', exact: true }).click();
  await expect(page.locator('.kitchen-pot-steam')).toBeVisible();
  const playing = await audioSnapshot(page);
  const effectsId = playing.gains.find(({ master }) => !master).id;
  expect(playing.contexts).toBe(1);
  expect(playing.sources).toHaveLength(3);
  expect(playing.sources.every(({ gainId, loop }) => gainId === effectsId && loop === false)).toBe(true);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('haven.kitchen.v1')).session)).toEqual(before);
  await openMixer(page);
  await mixer(page).getByRole('button', { name: 'Silenciar tudo', exact: true }).click();
  await closeMixer(page);
  await page.getByRole('button', { name: 'Chaleira', exact: true }).click();
  await page.getByRole('button', { name: 'Utensílios da cozinha', exact: true }).click();
  await page.getByRole('button', { name: 'Panela no fogão', exact: true }).click();
  const muted = await audioSnapshot(page);
  expect(muted.sources).toHaveLength(3);
  expect(muted.sources.every(({ disconnected, hasBuffer }) => disconnected && !hasBuffer)).toBe(true);
  await expectMaster(page, 0);
});

test('a recipe finishing in another environment stays silent and presents its optional bell only on return', async ({ page }) => {
  await prepare(page);
  await activate(page);
  await page.getByRole('button', { name: 'Retomar receita', exact: true }).click();
  await page.getByRole('button', { name: 'The Room', exact: true }).click();
  await page.clock.fastForward(2_000);
  expect((await audioSnapshot(page)).sources).toHaveLength(0);
  await expect(completion(page)).toHaveCount(0);
  await kitchenNav(page).click();
  await expect(completion(page)).toBeVisible();
  await page.clock.runFor(20);
  expect((await audioSnapshot(page)).sources).toHaveLength(1);
  await page.getByRole('button', { name: 'The Room', exact: true }).click();
  await kitchenNav(page).click();
  await page.clock.fastForward(2_000);
  expect((await audioSnapshot(page)).sources).toHaveLength(1);
});

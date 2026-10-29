import { test, expect } from '@playwright/test';
import { createPresetMix } from '../../shared/audio.js';
import { installAudioProbe, audioSnapshot } from './helpers/audio.js';

const preferenceKey = 'haven.preferences.v1';
const diagnostics = new WeakMap();
const panel = (page) => page.getByRole('dialog', { name: 'My Companion', exact: true });
const cat = (page) => page.locator('g.companion');
const nameField = (page) => panel(page).getByRole('textbox', { name: 'Nome do companheiro', exact: true });
const namedCompanion = { enabled: true, name: 'Mochi', appearance: 'default', soundEnabled: false, introduced: true };

test.beforeEach(async ({ page }) => {
  const recorded = { errors: [], external: [], requests: [] };
  diagnostics.set(page, recorded);
  page.on('pageerror', (error) => recorded.errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') recorded.errors.push(message.text()); });
  page.on('request', (request) => {
    const url = new URL(request.url());
    recorded.requests.push({ url: request.url(), body: request.postData() });
    if (['http:', 'https:', 'ws:', 'wss:'].includes(url.protocol) && url.hostname !== '127.0.0.1') recorded.external.push(request.url());
  });
  await installAudioProbe(page);
});

test.afterEach(async ({ page }) => {
  expect(diagnostics.get(page).errors, 'the companion must not produce renderer errors').toEqual([]);
  expect(diagnostics.get(page).external, 'companion settings must remain entirely local').toEqual([]);
});

async function seedPreferences(page, value) {
  await page.addInitScript(({ key, preferences }) => {
    // Seed only the first visit so reload tests exercise real persisted updates.
    if (localStorage.getItem(key) === null) localStorage.setItem(key, JSON.stringify(preferences));
  }, { key: preferenceKey, preferences: value });
}

async function saved(page) {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key)), preferenceKey);
}

async function openPanel(page) {
  await page.getByRole('button', { name: 'Abrir My Companion', exact: true }).click();
  await expect(panel(page)).toBeVisible();
}

async function closePanel(page) {
  await panel(page).getByRole('button', { name: 'Fechar My Companion', exact: true }).click();
  await expect(panel(page)).toHaveCount(0);
}

async function editName(page) {
  await panel(page).getByRole('button', { name: 'Renomear', exact: true }).click();
  await expect(nameField(page)).toBeFocused();
}

test('the first pet introduces a small friend and a chosen name survives reload without starting sound', async ({ page }) => {
  await page.goto('/');
  await expect(cat(page)).toBeVisible();
  await expect(cat(page)).toHaveAttribute('data-world', 'room');
  await expect(cat(page)).toHaveAttribute('data-pose', 'sleeping');
  await expect(panel(page)).toHaveCount(0);
  expect((await audioSnapshot(page)).contexts).toBe(0);
  await page.getByRole('button', { name: 'Fazer carinho em Seu gatinho', exact: true }).click();
  await expect(panel(page).getByRole('heading', { name: 'A little friend has arrived!', exact: true })).toBeVisible();
  await expect(nameField(page)).toBeFocused();
  await nameField(page).fill('  Chá de Lua 7  ');
  await panel(page).getByRole('button', { name: 'Confirmar nome', exact: true }).click();
  await expect(panel(page)).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Fazer carinho em Chá de Lua 7', exact: true })).toBeVisible();
  expect((await saved(page)).companion).toMatchObject({ name: 'Chá de Lua 7', introduced: true });
  await page.reload();
  await expect(page.getByRole('button', { name: 'Fazer carinho em Chá de Lua 7', exact: true })).toBeVisible();
  await expect(panel(page)).toHaveCount(0);
  expect((await audioSnapshot(page)).contexts).toBe(0);
});

test('naming can wait, renaming works later, and cancel preserves the existing name', async ({ page }) => {
  await page.goto('/');
  await cat(page).click();
  await nameField(page).fill('Nome ainda não escolhido');
  await page.keyboard.press('Escape');
  await expect(panel(page)).toHaveCount(0);
  expect((await saved(page)).companion).toMatchObject({ name: '', introduced: true });
  await page.reload();
  await expect(cat(page)).toBeVisible();
  await cat(page).press('Enter');
  await expect(panel(page)).toHaveCount(0);
  await openPanel(page);
  await expect(panel(page).getByRole('heading', { name: 'A little friend has arrived!', exact: true })).toHaveCount(0);
  await editName(page);
  await nameField(page).fill('Mochi');
  await panel(page).getByRole('button', { name: 'Salvar nome', exact: true }).click();
  await expect(panel(page).getByRole('button', { name: 'Renomear', exact: true })).toBeVisible();
  expect((await saved(page)).companion.name).toBe('Mochi');
  await editName(page);
  await nameField(page).fill('Nome ainda não salvo');
  await panel(page).getByRole('button', { name: 'Cancelar', exact: true }).click();
  expect((await saved(page)).companion.name).toBe('Mochi');
  await closePanel(page);
  await expect(page.getByRole('button', { name: 'Fazer carinho em Mochi', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Fazer carinho em Mochi', exact: true })).toBeVisible();
});

test('friendly validation counts perceived Unicode characters and renders names only as text', async ({ page }) => {
  await seedPreferences(page, { companion: namedCompanion });
  await page.goto('/');
  await openPanel(page);
  await editName(page);
  const save = panel(page).getByRole('button', { name: 'Salvar nome', exact: true });
  for (const invalid of ['   ', 'a'.repeat(25), 'Mochi\u0007']) {
    await nameField(page).fill(invalid);
    await save.click();
    await expect(panel(page).getByRole('alert')).toBeVisible();
    expect((await saved(page)).companion.name).toBe('Mochi');
  }
  // These 24 perceived letters occupy 48 UTF-16 code units. An HTML maxLength
  // based on code units would truncate or reject a legitimate name.
  const unicodeName = 'e\u0301'.repeat(24);
  await nameField(page).fill(`  ${unicodeName}  `);
  await save.click();
  await expect(panel(page).getByRole('button', { name: 'Renomear', exact: true })).toBeVisible();
  expect((await saved(page)).companion.name).toBe(unicodeName);
  await editName(page);
  const literalName = '<b>Mochi</b>';
  await nameField(page).fill(literalName);
  await panel(page).getByRole('button', { name: 'Salvar nome', exact: true }).click();
  await expect(panel(page).getByText(literalName, { exact: true })).toBeVisible();
  expect(await panel(page).locator('b').count()).toBe(0);
  await closePanel(page);
  await expect(cat(page)).toHaveAccessibleName(`Fazer carinho em ${literalName}`);
});

test('visibility and coat persist while legacy room and mixer choices remain untouched', async ({ page }) => {
  const mix = createPresetMix('custom');
  mix.muted = true;
  mix.layers['rain-soft'].volume = 0.31;
  mix.customLayers['rain-soft'].volume = 0.31;
  const previous = { lampOn: false, rainOn: false, audioEnabled: true, volume: 0.47, mixer: mix };
  await seedPreferences(page, previous);
  await page.goto('/');
  await expect(cat(page)).toBeVisible();
  await openPanel(page);
  await panel(page).getByRole('button', { name: 'Escolher depois', exact: true }).click();
  await openPanel(page);
  await panel(page).getByRole('combobox', { name: 'Pelagem do companheiro', exact: true }).selectOption('midnight');
  await panel(page).getByRole('switch', { name: 'Mostrar companheiro', exact: true }).click();
  await closePanel(page);
  await expect(cat(page)).toHaveCount(0);
  const persisted = await saved(page);
  expect(persisted.companion).toMatchObject({ enabled: false, appearance: 'midnight', soundEnabled: false });
  for (const [key, value] of Object.entries(previous)) expect(persisted[key]).toEqual(value);
  await page.reload();
  await expect(cat(page)).toHaveCount(0);
  expect((await audioSnapshot(page)).contexts).toBe(0);
  await openPanel(page);
  await expect(panel(page).getByRole('combobox', { name: 'Pelagem do companheiro', exact: true })).toHaveValue('midnight');
  await expect(panel(page).getByRole('switch', { name: 'Mostrar companheiro', exact: true })).toHaveAttribute('aria-checked', 'false');
  await panel(page).getByRole('switch', { name: 'Mostrar companheiro', exact: true }).click();
  await closePanel(page);
  await expect(cat(page)).toBeVisible();
  expect((await saved(page)).companion.enabled).toBe(true);
});

test('the companion follows the three scenes while writing stays private and visually simple', async ({ page }) => {
  await seedPreferences(page, { companion: namedCompanion });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  for (const [world, id] of [['The Room', 'room'], ['The Garden', 'garden'], ['The Journey', 'journey']]) {
    await page.getByRole('button', { name: world, exact: true }).click();
    await expect(cat(page)).toBeVisible();
    await expect(cat(page)).toHaveAttribute('data-world', id);
    await expect(cat(page)).toHaveAccessibleName('Fazer carinho em Mochi');
    expect(await cat(page).evaluate((element) => element.ownerSVGElement?.viewBox.baseVal.width)).toBe(480);
    await page.screenshot({ path: `outputs/Little-Haven-Companion-${id}.png`, fullPage: true, animations: 'disabled' });
  }
  await page.getByRole('button', { name: 'Let It Float', exact: true }).click();
  await expect(cat(page)).toHaveCount(0);
  const syntheticDraft = 'SYNTHETIC_COMPANION_DRAFT_821947';
  await page.getByRole('textbox').fill(syntheticDraft);
  await openPanel(page);
  await editName(page);
  await nameField(page).fill('小雪 2');
  await panel(page).getByRole('button', { name: 'Salvar nome', exact: true }).click();
  await closePanel(page);
  await expect(page.getByRole('textbox')).toHaveValue(syntheticDraft);
  const storage = await page.evaluate(() => JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } }));
  expect(storage).not.toContain(syntheticDraft);
  expect(JSON.stringify(diagnostics.get(page).requests)).not.toContain(syntheticDraft);
  await page.getByRole('button', { name: 'The Room', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Continuar escrevendo', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('textbox')).toHaveValue(syntheticDraft);
});

test('rapid petting has one reaction and naturally returns to rest', async ({ page }) => {
  await seedPreferences(page, { companion: namedCompanion });
  await page.clock.install();
  await page.goto('/');
  const companion = cat(page);
  const previousPose = await companion.getAttribute('data-pose');
  await companion.press('Enter');
  await expect(companion).toHaveAttribute('data-pose', 'petting');
  const reaction = await companion.getAttribute('data-reaction');
  expect(reaction).not.toBeNull();
  for (let index = 0; index < 5; index += 1) await companion.press('Enter');
  await expect(companion).toHaveAttribute('data-reaction', reaction);
  await page.clock.runFor(6000);
  await expect(companion).toHaveAttribute('data-pose', previousPose);
  await companion.press('Space');
  await expect(companion).toHaveAttribute('data-pose', 'petting');
  expect((await audioSnapshot(page)).contexts).toBe(0);
});

test('keyboard naming, reduced motion and smaller windows keep the panel usable', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await cat(page).focus();
  await page.keyboard.press('Enter');
  await expect(nameField(page)).toBeFocused();
  await nameField(page).fill('Café');
  await page.keyboard.press('Enter');
  await expect(panel(page)).toHaveCount(0);
  await expect(cat(page)).toBeFocused();
  const opener = page.getByRole('button', { name: 'Abrir My Companion', exact: true });
  await opener.focus();
  await page.keyboard.press('Enter');
  const close = panel(page).getByRole('button', { name: 'Fechar My Companion', exact: true });
  expect(await panel(page).evaluate((element) => element.contains(document.activeElement))).toBe(true);
  await close.focus();
  await page.keyboard.press('Shift+Tab');
  expect(await panel(page).evaluate((element) => element.contains(document.activeElement))).toBe(true);
  await page.keyboard.press('Tab');
  await expect(close).toBeFocused();
  expect(await close.evaluate((element) => element.matches(':focus-visible') && getComputedStyle(element).outlineStyle !== 'none')).toBe(true);
  expect(await cat(page).evaluate((element) => [element, ...element.querySelectorAll('*')].every((node) => getComputedStyle(node).animationName.split(',').every((name) => name.trim() === 'none')))).toBe(true);
  await page.screenshot({ path: 'outputs/Little-Haven-Companion-panel.png', animations: 'disabled' });
  for (const viewport of [{ width: 800, height: 650 }, { width: 390, height: 844 }, { width: 360, height: 400 }]) {
    await page.setViewportSize(viewport);
    const bounds = await panel(page).boundingBox();
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.y).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height);
    await expect(close).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (viewport.width === 390) await page.screenshot({ path: 'outputs/Little-Haven-Companion-mobile.png', animations: 'disabled' });
  }
  await page.keyboard.press('Escape');
  await expect(panel(page)).toHaveCount(0);
  await expect(opener).toBeFocused();
  await cat(page).press('Space');
  await expect(panel(page)).toHaveCount(0);
});

for (const world of ['The Journey', 'The Garden']) {
  test(`C opens companion settings in ${world} fullscreen and preserves mixer and contextual Escape`, async ({ page }) => {
    await seedPreferences(page, { companion: namedCompanion });
    await page.goto('/');
    await page.getByRole('button', { name: world, exact: true }).click();
    await page.evaluate(() => { window.__originalCompanion = document.querySelector('g.companion'); });
    await page.getByRole('button', { name: 'Modo Imersivo', exact: true }).click();
    await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBe(true);
    await expect(cat(page)).toBeVisible();
    await cat(page).press('Enter');
    await expect(panel(page)).toHaveCount(0);
    await page.keyboard.press('c');
    await expect(panel(page)).toBeVisible();
    expect(await panel(page).evaluate((element) => document.fullscreenElement.contains(element))).toBe(true);
    await editName(page);
    await nameField(page).fill('Mochi do refúgio');
    await panel(page).getByRole('button', { name: 'Salvar nome', exact: true }).click();
    await page.keyboard.press('Escape');
    await expect(panel(page)).toHaveCount(0);
    expect(await page.evaluate(() => Boolean(document.fullscreenElement))).toBe(true);
    await expect(cat(page)).toBeFocused();
    await expect(cat(page)).toHaveAccessibleName('Fazer carinho em Mochi do refúgio');
    expect(await page.evaluate(() => window.__originalCompanion === document.querySelector('g.companion'))).toBe(true);
    await page.keyboard.press('m');
    const soundMixer = page.getByRole('dialog', { name: 'Cozy Sound Mixer', exact: true });
    await expect(soundMixer).toBeVisible();
    await page.keyboard.press('c');
    await expect(panel(page)).toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(soundMixer).toHaveCount(0);
    expect(await page.evaluate(() => Boolean(document.fullscreenElement))).toBe(true);
    await page.keyboard.press('Escape');
    await expect.poll(() => page.evaluate(() => document.fullscreenElement === null)).toBe(true);
    await expect(page.getByRole('button', { name: 'Modo Imersivo', exact: true })).toBeFocused();
    expect((await audioSnapshot(page)).contexts).toBe(0);
  });
}

import { test, expect } from '@playwright/test';

const errors = new WeakMap();
test.beforeEach(async ({ page }) => {
  const diagnostics = [];
  errors.set(page, diagnostics);
  page.on('pageerror', (error) => diagnostics.push(error.message));
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (['http:', 'https:', 'ws:', 'wss:'].includes(url.protocol) && url.hostname !== '127.0.0.1') diagnostics.push(`External: ${url.origin}`);
  });
});
test.afterEach(async ({ page }) => expect(errors.get(page)).toEqual([]));

export async function openGarden(page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'The Garden', exact: true }).click();
  await expect(page.locator('svg.garden-art')).toBeVisible();
}
const slot = (page, id) => page.locator(`[data-slot-id="${id}"]`).first();
async function plant(page, id, species) {
  await slot(page, id).click();
  await page.getByRole('dialog').getByRole('button', { name: species, exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
}
async function stored(page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem('haven.garden.v1')));
}

test('five original species grow through every stage, including time between visits', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-28T12:00:00Z') });
  await openGarden(page);
  for (const [id, species] of [['bed-1', 'Margarida'], ['bed-2', 'Lavanda'], ['bed-3', 'Hibisco rosa'], ['bed-4', 'Samambaia'], ['pot-1', 'Suculenta']]) {
    await plant(page, id, species);
    await expect(slot(page, id)).toHaveAttribute('data-stage', '0');
  }
  await page.clock.fastForward(120_100);
  await expect(slot(page, 'bed-3')).toHaveAttribute('data-stage', '1');
  await page.clock.fastForward(360_100);
  await expect(slot(page, 'bed-3')).toHaveAttribute('data-stage', '2');
  await page.getByRole('button', { name: 'The Room', exact: true }).click();
  await page.clock.fastForward(24 * 60 * 60 * 1000);
  await page.getByRole('button', { name: 'The Garden', exact: true }).click();
  await expect(slot(page, 'bed-3')).toHaveAttribute('data-stage', '3');
  await page.reload();
  await page.getByRole('button', { name: 'The Garden', exact: true }).click();
  await expect(slot(page, 'pot-1')).toHaveAttribute('data-stage', '3');
  expect((await stored(page)).plants).toHaveLength(5);
});

test('watering is bounded, pots swap with their plants and style, replacement requires confirmation', async ({ page }) => {
  await openGarden(page);
  await plant(page, 'pot-1', 'Hibisco rosa');
  await page.locator('.garden-controls').getByRole('button', { name: 'Regar', exact: true }).click();
  for (let index = 0; index < 4; index += 1) await slot(page, 'pot-1').click();
  const watered = (await stored(page)).plants[0];
  expect(watered.wateredStages).toEqual([0]);
  expect(watered.elapsedMs).toBeLessThan(40_000);
  await page.locator('.garden-controls').getByRole('button', { name: 'Contemplar', exact: true }).click();
  await slot(page, 'pot-1').click();
  await page.getByRole('button', { name: 'Madeira', exact: true }).click();
  await page.getByRole('button', { name: 'Fechar', exact: true }).click();
  await page.locator('.garden-controls').getByRole('button', { name: 'Mover', exact: true }).click();
  await slot(page, 'pot-1').click();
  await slot(page, 'pot-2').click();
  await expect(slot(page, 'pot-2')).toBeFocused();
  expect((await stored(page)).plants[0].slotId).toBe('pot-2');
  expect((await stored(page)).pots.find((item) => item.slotId === 'pot-2').style).toBe('wood');
  await page.keyboard.press('Escape');
  await slot(page, 'pot-2').press('Enter');
  await page.getByRole('button', { name: 'Escolher outra espécie', exact: true }).click();
  await page.getByRole('button', { name: 'Lavanda', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Fechar', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  expect((await stored(page)).plants[0].species).toBe('hibiscus');
  await expect(slot(page, 'pot-2')).toBeFocused();
  await slot(page, 'pot-2').press('Enter');
  await page.getByRole('button', { name: 'Escolher outra espécie', exact: true }).click();
  await page.getByRole('button', { name: 'Lavanda', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar troca', exact: true }).click();
  expect((await stored(page)).plants[0].species).toBe('lavender');
});

test('decorations, lighting and weather persist independently from Room and ephemeral wildlife', async ({ page }) => {
  await openGarden(page);
  await slot(page, 'accent-2').click();
  await page.getByRole('button', { name: 'Cogumelos', exact: true }).click();
  const daylightGlass = await slot(page, 'lantern-1').locator('.garden-lantern-glass').getAttribute('fill');
  await slot(page, 'lantern-1').click();
  await page.getByRole('button', { name: 'Apagar lanterna', exact: true }).click();
  await expect(slot(page, 'lantern-1').locator('.garden-lantern-glass')).not.toHaveAttribute('fill', daylightGlass);
  await page.getByRole('button', { name: 'Luz e clima', exact: true }).click();
  await page.getByRole('combobox', { name: 'Período do dia' }).selectOption('night');
  await page.getByRole('combobox', { name: 'Clima do jardim' }).selectOption('rain');
  await page.keyboard.press('Escape');
  await page.reload();
  await page.getByRole('button', { name: 'The Garden', exact: true }).click();
  await expect(page.locator('.garden-scene')).toHaveAttribute('data-atmosphere', 'night');
  await expect(page.locator('.garden-scene')).toHaveAttribute('data-weather', 'rain');
  const garden = await stored(page);
  expect(garden.decorations.find((item) => item.slotId === 'accent-2').kind).toBe('mushroom');
  expect(garden.decorations.find((item) => item.slotId === 'lantern-1').lit).toBe(false);
  expect(Object.keys(garden).sort()).toEqual(['atmosphere', 'decorations', 'plants', 'pots', 'version', 'weather']);
  await page.getByRole('button', { name: 'The Room', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Parar chuva', exact: true })).toBeVisible();
});

test('private draft never enters garden storage and navigation still asks before discarding', async ({ page }) => {
  await openGarden(page);
  await plant(page, 'bed-1', 'Margarida');
  await page.getByRole('button', { name: 'Let It Float', exact: true }).click();
  const secret = 'GARDEN_PRIVATE_SYNTHETIC_982351';
  await page.getByRole('textbox').fill(secret);
  await page.getByRole('button', { name: 'The Garden', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Continuar escrevendo' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('textbox')).toHaveValue(secret);
  const storage = await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }));
  expect(storage).not.toContain(secret);
  await page.getByRole('button', { name: 'The Garden', exact: true }).click();
  await page.getByRole('button', { name: 'Descartar e sair' }).click();
  await expect(slot(page, 'bed-1')).toBeVisible();
  await page.getByRole('button', { name: 'Let It Float', exact: true }).click();
  await expect(page.getByRole('textbox')).toBeEmpty();
});

test('a future garden is preserved and offers a temporary session without a misleading retry', async ({ page }) => {
  const future = JSON.stringify({ version: 2, future: 'SYNTHETIC_FUTURE_DOCUMENT' });
  await page.addInitScript((value) => localStorage.setItem('haven.garden.v1', value), future);
  await openGarden(page);
  await expect(page.getByRole('status').filter({ hasText: 'versão mais nova' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Tentar salvar novamente' })).toHaveCount(0);
  await plant(page, 'bed-1', 'Hibisco rosa');
  await expect(slot(page, 'bed-1')).toHaveAttribute('data-stage', '0');
  expect(await page.evaluate(() => localStorage.getItem('haven.garden.v1'))).toBe(future);
});

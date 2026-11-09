import { test, expect } from '@playwright/test';
import { createKitchen } from '../../shared/kitchen.js';
import { KITCHEN_RECIPES } from '../../shared/kitchenRecipes.js';

const scene = (page) => page.locator('.kitchen-scene');
const cat = (page) => scene(page).locator('.companion');
const speech = (page) => scene(page).locator('.kitchen-speech');
const book = (page) => page.getByRole('dialog', { name: 'Livro de receitas', exact: true });
const bookObject = (page) => page.locator('[data-kitchen-book="closed"]');
const nav = (page) => page.getByRole('button', { name: 'The Cozy Kitchen', exact: true });
const diagnostics = new WeakMap();
const identity = { enabled: true, name: 'Mochi Chef', appearance: 'ginger', soundEnabled: false, introduced: true };

test.beforeEach(async ({ page }) => {
  const errors = [];
  diagnostics.set(page, errors);
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await page.addInitScript((companion) => {
    if (!localStorage.getItem('haven.preferences.v1')) localStorage.setItem('haven.preferences.v1', JSON.stringify({ companion }));
  }, identity);
});

test.afterEach(async ({ page }) => { expect(diagnostics.get(page)).toEqual([]); });

async function open(page) {
  await page.goto('/');
  await nav(page).click();
  await expect(scene(page)).toBeVisible();
}

async function start(page, recipeId = 'tea') {
  await bookObject(page).click();
  await expect(book(page)).toBeVisible();
  const recipe = KITCHEN_RECIPES.find((item) => item.id === recipeId);
  await book(page).locator('.kitchen-recipe-option').filter({ hasText: recipe.name }).click();
  await book(page).getByRole('button', { name: 'Começar esta receita', exact: true }).click();
  await expect(book(page)).toHaveCount(0);
  await expect(scene(page)).toHaveAttribute('data-status', 'running');
  await page.mouse.move(0, 0); // A resting pointer must not intentionally hold the chef mid-route.
}

async function saved(page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem('haven.kitchen.v1')));
}

async function displayedSeconds(page) {
  const text = await scene(page).locator('.kitchen-clock time').textContent();
  const [minutes, seconds] = text.split(':').map(Number);
  return minutes * 60 + seconds;
}

async function geometry(page) {
  return scene(page).evaluate((element) => {
    const art = element.querySelector('svg.kitchen-art');
    const head = element.querySelector('[data-companion-head]');
    const body = element.querySelector('.companion');
    const bubble = element.querySelector('.kitchen-speech');
    const headMatrix = head?.getScreenCTM();
    const artMatrix = art.getScreenCTM();
    const origin = headMatrix ? new DOMPoint(0, 0).matrixTransform(headMatrix) : null;
    const logicalHead = origin ? origin.matrixTransform(artMatrix.inverse()) : null;
    const rect = (node) => {
      if (!node) return null;
      const r = node.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom };
    };
    return {
      phase: body?.dataset.kitchenPhase,
      action: body?.dataset.kitchenAction,
      pose: body?.dataset.pose,
      head: origin && { x: origin.x, y: origin.y },
      logicalHead: logicalHead && { x: logicalHead.x, y: logicalHead.y },
      bubble: rect(bubble), art: rect(art), clock: rect(element.querySelector('.kitchen-clock')),
      scale: artMatrix.a,
      frontPaw: element.querySelector('.companion-paws--front')
        && getComputedStyle(element.querySelector('.companion-paws--front')).transform,
    };
  });
}

function intersects(a, b) {
  return a && b && a.x < b.right && a.right > b.x && a.y < b.bottom && a.bottom > b.y;
}

function expectAnchored(g) {
  expect(g.head).not.toBeNull();
  expect(g.bubble).not.toBeNull();
  expect(g.bubble.x).toBeGreaterThanOrEqual(g.art.x - 2);
  expect(g.bubble.right).toBeLessThanOrEqual(g.art.right + 2);
  expect(g.bubble.y).toBeGreaterThanOrEqual(g.art.y - 2);
  expect(g.bubble.bottom).toBeLessThanOrEqual(g.art.bottom + 2);
  const gap = Math.max(g.bubble.y - g.head.y, g.head.y - g.bubble.bottom, 0);
  expect(gap / g.scale).toBeLessThan(25);
  // Horizontal clamping may shift the box, but the speaker remains nearby.
  const horizontalGap = Math.max(g.bubble.x - g.head.x, g.head.x - g.bubble.right, 0);
  expect(horizontalGap / g.scale).toBeLessThan(35);
  expect(intersects(g.bubble, g.clock)).toBe(false);
}

test('the chef walks with visible steps and the same speech follows the head before any cooking begins', async ({ page }) => {
  test.setTimeout(45_000);
  await open(page);
  await start(page);
  await expect(cat(page)).toHaveAttribute('data-kitchen-phase', 'walking');
  await expect(speech(page)).toBeVisible();
  const first = await geometry(page);
  expect(first.pose).toBe('walking');
  await expect(cat(page)).toHaveAttribute('data-facing', 'right');
  expect(['mixing', 'stirring', 'baking', 'icing', 'presenting']).not.toContain(first.action);
  expectAnchored(first);
  // Real elapsed time exercises the rendered CSS motion, including the paws.
  await expect.poll(async () => (await geometry(page)).logicalHead.x, { timeout: 2500 }).not.toBe(first.logicalHead.x);
  const second = await geometry(page);
  expectAnchored(second);
  expect(second.logicalHead.x).toBeGreaterThan(first.logicalHead.x);
  expect(Math.abs(second.logicalHead.y - first.logicalHead.y)).toBeLessThan(4);
  expect(second.bubble.x).not.toBe(first.bubble.x);
  await expect.poll(async () => (await geometry(page)).frontPaw, { timeout: 1500 }).not.toBe(first.frontPaw);
  for (let frame = 1; frame <= 3; frame += 1) {
    await page.screenshot({ path: `outputs/Little-Haven-Kitchen-walking-speech-${frame}.png`, fullPage: true });
    if (frame < 3) await page.waitForTimeout(300);
  }
  await expect(cat(page)).toHaveAttribute('data-kitchen-phase', 'acting', { timeout: 25_000 });
  await expect(cat(page)).not.toHaveAttribute('data-pose', 'walking');
  await expect(cat(page)).toHaveAttribute('data-kitchen-action', 'reading');
  const session = (await saved(page)).session;
  expect(session.status).toBe('running');
  expect(session.durationMs).toBe(300_000);
  expect(await displayedSeconds(page)).toBeLessThan(300);
  await page.screenshot({ path: 'outputs/Little-Haven-Kitchen-arrived.png', fullPage: true });
});

test('opening the book pauses only the visual walk, keeps the clock running and restores the object focus', async ({ page }) => {
  test.setTimeout(40_000);
  await open(page);
  await start(page);
  await expect(cat(page)).toHaveAttribute('data-kitchen-phase', 'walking');
  await bookObject(page).focus();
  await page.keyboard.press('Enter');
  await expect(book(page)).toBeVisible();
  const pausedPosition = await geometry(page);
  const before = (await saved(page)).session;
  const remaining = await displayedSeconds(page);
  await page.waitForTimeout(1400);
  const stillPosition = await geometry(page);
  expect(Math.abs(stillPosition.head.x - pausedPosition.head.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(stillPosition.head.y - pausedPosition.head.y)).toBeLessThanOrEqual(1);
  await page.keyboard.press('Escape');
  await expect(book(page)).toHaveCount(0);
  await expect(bookObject(page)).toBeFocused();
  await expect.poll(() => displayedSeconds(page)).toBeLessThan(remaining);
  const after = (await saved(page)).session;
  expect(after.id).toBe(before.id);
  expect(after.status).toBe('running');
  expect(after.durationMs).toBe(before.durationMs);
  await expect.poll(async () => (await geometry(page)).head.x, { timeout: 2500 }).not.toBe(stillPosition.head.x);
});

test('cancelling a walk and choosing another recipe retargets from the visible pixel without a stale cooking action', async ({ page }) => {
  await open(page); await start(page);
  await expect(cat(page)).toHaveAttribute('data-kitchen-phase', 'walking');
  await page.getByRole('button', { name: 'Relógio da cozinha', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Relógio da cozinha', exact: true });
  await expect(dialog).toBeVisible();
  const before = await geometry(page);
  const original = (await saved(page)).session;
  await dialog.getByRole('button', { name: 'Encerrar antecipadamente', exact: true }).click();
  await dialog.getByRole('button', { name: 'Confirmar encerramento', exact: true }).click();
  await expect(scene(page)).toHaveAttribute('data-status', 'cancelled');
  const cancelled = await geometry(page);
  expect(Math.abs(cancelled.head.x - before.head.x) / cancelled.scale).toBeLessThan(12);
  expect(Math.abs(cancelled.head.y - before.head.y) / cancelled.scale).toBeLessThan(12);
  expect(['mixing', 'stirring', 'baking', 'icing', 'presenting']).not.toContain(cancelled.action);
  await expect(page.locator('.kitchen-completion')).toHaveCount(0);
  await start(page, 'cake');
  const replacement = (await saved(page)).session;
  expect(replacement.id).not.toBe(original.id);
  expect(replacement.recipeId).toBe('cake');
  expect(replacement.durationMs).toBe(3_600_000);
  await expect(cat(page)).toHaveAttribute('data-kitchen-phase', 'walking');
  await expect(cat(page)).toHaveAttribute('data-facing', 'right');
  expect(['mixing', 'stirring', 'baking', 'icing', 'presenting']).not.toContain((await geometry(page)).action);
});

test('closed book shares its support and hit area, while every open layout keeps its close button visible', async ({ page }) => {
  await open(page);
  const closed = await bookObject(page).evaluate((element) => {
    const rect = (node) => { const r = node.getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right, bottom: r.bottom }; };
    const art = element.querySelector('[data-book-art]');
    const support = element.querySelector('[data-book-support]');
    const hit = element.querySelector('[data-book-hit]');
    return { art: rect(art), support: rect(support), hit: rect(hit), scale: element.ownerSVGElement.getScreenCTM().a };
  });
  expect(closed.hit.x).toBeLessThanOrEqual(closed.art.x);
  expect(closed.hit.right).toBeGreaterThanOrEqual(closed.art.right);
  expect(closed.hit.y).toBeLessThanOrEqual(closed.art.y);
  expect(closed.hit.bottom).toBeGreaterThanOrEqual(closed.art.bottom);
  expect((closed.support.y - closed.art.bottom) / closed.scale).toBeLessThanOrEqual(4);
  expect(closed.support.bottom).toBeGreaterThanOrEqual(closed.art.bottom);

  for (const size of [{ width: 1440, height: 960 }, { width: 800, height: 480 }, { width: 390, height: 844 }, { width: 360, height: 640 }]) {
    await page.setViewportSize(size);
    await bookObject(page).focus(); await page.keyboard.press('Enter');
    await expect(book(page)).toBeVisible();
    const bounds = await book(page).boundingBox();
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.y).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(size.width + 1);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(size.height + 1);
    expect(Math.abs(bounds.x + bounds.width / 2 - size.width / 2)).toBeLessThan(2);
    const close = book(page).getByRole('button', { name: 'Fechar livro de receitas', exact: true });
    await book(page).locator('.kitchen-dialog-body').evaluate((element) => { element.scrollTop = element.scrollHeight; });
    await expect(close).toBeInViewport();
    expect(await close.evaluate((element) => { const r = element.getBoundingClientRect(); return element.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)); })).toBe(true);
    await page.screenshot({ path: `outputs/Little-Haven-Kitchen-book-${size.width}x${size.height}.png`, fullPage: true });
    await page.keyboard.press('Escape');
    await expect(bookObject(page)).toBeFocused();
  }
});

test('fullscreen keeps speech anchored, book above the scene and contextual Escape ahead of fullscreen exit', async ({ page }) => {
  test.setTimeout(45_000);
  await open(page);
  await page.getByRole('button', { name: 'Modo Imersivo', exact: true }).click();
  await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBe(true);
  await start(page);
  await expect(cat(page)).toHaveAttribute('data-kitchen-phase', 'walking');
  await expect(speech(page)).toBeVisible();
  expectAnchored(await geometry(page));
  await page.screenshot({ path: 'outputs/Little-Haven-Kitchen-speech-immersive.png' });
  await bookObject(page).focus(); await page.keyboard.press('Enter');
  await expect(book(page)).toBeVisible();
  const close = book(page).getByRole('button', { name: 'Fechar livro de receitas', exact: true });
  await expect(close).toBeInViewport();
  expect(await book(page).evaluate((element) => document.fullscreenElement.contains(element))).toBe(true);
  await page.screenshot({ path: 'outputs/Little-Haven-Kitchen-book-immersive.png' });
  await page.keyboard.press('Escape'); await expect(book(page)).toHaveCount(0);
  expect(await page.evaluate(() => Boolean(document.fullscreenElement))).toBe(true);
  await expect(bookObject(page)).toBeFocused();
  await page.keyboard.press('Escape');
  await expect.poll(() => page.evaluate(() => document.fullscreenElement)).toBe(null);
});

test('return from hidden or another environment reconciles the current stage without replaying an old walk', async ({ page }) => {
  await page.clock.install();
  await open(page); await start(page, 'cake');
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.clock.fastForward(22 * 60_000);
  await page.evaluate(() => {
    delete document.hidden; delete document.visibilityState;
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(scene(page)).toHaveAttribute('data-stage', 'baking');
  await expect(cat(page)).toHaveAttribute('data-kitchen-phase', 'acting');
  await expect(cat(page)).toHaveAttribute('data-kitchen-action', 'baking');
  await page.getByRole('button', { name: 'The Room', exact: true }).click();
  await page.clock.fastForward(24 * 60_000);
  await nav(page).click();
  await expect(scene(page)).toHaveAttribute('data-stage', 'chocolate');
  await expect(cat(page)).toHaveAttribute('data-kitchen-phase', 'acting');
  await expect(cat(page)).toHaveAttribute('data-kitchen-action', 'stirring');
  expect((await saved(page)).session.status).toBe('running');
});

test('reduced motion and hidden companion preserve the same completion messages without detached speech', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const fixture = createKitchen();
  fixture.session = { id: '00000000-0000-4000-8000-000000000041', recipeId: 'cake', durationMs: 3_600_000,
    elapsedMs: 3_600_000, updatedAt: Date.now(), status: 'completed', presentation: 'pending', completedAt: Date.now() };
  await page.addInitScript((value) => {
    if (!localStorage.getItem('haven.kitchen.v1')) localStorage.setItem('haven.kitchen.v1', JSON.stringify(value));
  }, fixture);
  await open(page);
  await expect(page.locator('.kitchen-completion')).toBeVisible();
  await expect(cat(page)).toHaveAttribute('data-kitchen-phase', 'acting');
  await expect(cat(page)).toHaveAttribute('data-kitchen-action', 'presenting');
  expectAnchored(await geometry(page));
  await expect(page.locator('.kitchen-completion')).toContainText(KITCHEN_RECIPES.at(-1).completionMessage);
  await expect(page.locator('.kitchen-completion')).toContainText('Mochi Chef');
  const first = await geometry(page);
  await page.waitForTimeout(200);
  expect((await geometry(page)).head).toEqual(first.head);
  await page.screenshot({ path: 'outputs/Little-Haven-Kitchen-completion-anchored.png', fullPage: true });
  await page.getByRole('button', { name: 'Abrir My Companion', exact: true }).click();
  const panel = page.getByRole('dialog', { name: 'My Companion', exact: true });
  await panel.getByRole('switch', { name: 'Mostrar companheiro', exact: true }).click();
  await panel.getByRole('button', { name: 'Fechar My Companion', exact: true }).click();
  await expect(cat(page)).toHaveCount(0);
  await expect(page.locator('.kitchen-completion')).toBeVisible();
  await expect(page.locator('.kitchen-completion')).toContainText('Mochi Chef');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

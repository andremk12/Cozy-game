import { test, expect } from '@playwright/test';
import { createKitchen } from '../../shared/kitchen.js';

const preferenceKey = 'haven.preferences.v1';
const panel = (page) => page.getByRole('dialog', { name: 'My Companion', exact: true });
const companion = (page) => page.locator('g.companion');
const sheet = (page) => companion(page).locator('.companion-sheet');
const identity = { enabled: true, petId: 'dalmatian', name: 'Pingo', appearance: 'midnight',
  soundEnabled: false, introduced: true };
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
});

test.afterEach(async ({ page }) => {
  expect(diagnostics.get(page).errors, 'the sprite integration must not produce renderer errors').toEqual([]);
  expect(diagnostics.get(page).external, 'pet assets and preferences remain local').toEqual([]);
});

async function seed(page, settings = identity) {
  await page.addInitScript(({ key, companionSettings }) => {
    if (localStorage.getItem(key) === null) localStorage.setItem(key, JSON.stringify({ companion: companionSettings }));
  }, { key: preferenceKey, companionSettings: settings });
}

async function saved(page) {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key)).companion, preferenceKey);
}

async function openPanel(page) {
  await page.getByRole('button', { name: 'Abrir My Companion', exact: true }).click();
  await expect(panel(page)).toBeVisible();
}

async function closePanel(page) {
  await panel(page).getByRole('button', { name: 'Fechar My Companion', exact: true }).click();
  await expect(panel(page)).toHaveCount(0);
  await page.mouse.move(0, 0);
}

// Let React commit between clock increments, as in the existing kitchen tests.
async function advanceUntil(page, condition, limitMs = 30_000, stepMs = 500) {
  for (let elapsed = 0; elapsed <= limitMs; elapsed += stepMs) {
    if (await condition()) return;
    await page.clock.runFor(stepMs);
  }
  throw new Error(`Companion did not settle within ${limitMs} virtual ms: ${JSON.stringify(await companion(page).evaluate((element) => ({ ...element.dataset })))}`);
}

test('the existing panel selects the dalmatian by keyboard and preserves identity and the cat coat across reloads', async ({ page }) => {
  await seed(page, { ...identity, petId: 'cat' });
  await page.goto('/');
  await expect(companion(page)).toHaveAttribute('data-pet-id', 'cat');
  await openPanel(page);
  const dogChoice = panel(page).getByRole('button', { name: 'Dálmata', exact: true });
  await dogChoice.focus();
  await page.keyboard.press('Enter');
  await expect(dogChoice).toHaveAttribute('aria-pressed', 'true');
  await page.screenshot({ path: 'outputs/Little-Haven-Dalmatian-panel.png', animations: 'disabled' });
  await expect(panel(page).getByRole('combobox', { name: 'Pelagem do companheiro', exact: true })).toHaveCount(0);
  await closePanel(page);
  await expect(companion(page)).toHaveAttribute('data-pet-id', 'dalmatian');
  await expect(companion(page)).toHaveAccessibleName('Fazer carinho em Pingo');
  await expect(sheet(page)).toBeVisible();
  expect(await saved(page)).toMatchObject(identity);
  await page.reload();
  await expect(companion(page)).toHaveAttribute('data-pet-id', 'dalmatian');
  await expect(sheet(page)).toBeVisible();
  await openPanel(page);
  await panel(page).getByRole('button', { name: 'Gatinho', exact: true }).click();
  await expect(panel(page).getByRole('combobox', { name: 'Pelagem do companheiro', exact: true })).toHaveValue('midnight');
  await closePanel(page);
  await expect(companion(page)).toHaveAttribute('data-pet-id', 'cat');
  await expect(sheet(page)).toHaveCount(0);
  await expect(companion(page).locator('.companion-sprite')).toBeVisible();
  expect(await saved(page)).toMatchObject({ ...identity, petId: 'cat' });
});

test('all approved sheets decode and the same pet appears only in the four existing companion scenes', async ({ page }) => {
  await seed(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const decoded = await page.evaluate(async () => {
    const root = new URL('assets/pets/dalmatian/', document.baseURI);
    const response = await fetch(new URL('animation-manifest.json', root));
    if (!response.ok) throw new Error('Dalmatian manifest was not served');
    const manifest = await response.json();
    return Promise.all(manifest.animations.map(async (animation) => {
      const image = new Image();
      image.src = new URL(animation.path, root).href;
      await image.decode();
      return { state: animation.stateId, actual: [image.naturalWidth, image.naturalHeight], expected: [animation.sheetWidth, animation.sheetHeight] };
    }));
  });
  expect(decoded).toHaveLength(7);
  for (const item of decoded) expect(item.actual, item.state).toEqual(item.expected);
  for (const [label, world] of [['The Room', 'room'], ['The Garden', 'garden'], ['The Journey', 'journey'], ['The Cozy Kitchen', 'kitchen']]) {
    await page.getByRole('button', { name: label, exact: true }).click();
    await expect(companion(page)).toHaveAttribute('data-world', world);
    await expect(companion(page)).toHaveAttribute('data-pet-id', 'dalmatian');
    await expect(sheet(page)).toBeVisible();
    const geometry = await sheet(page).evaluate((element) => {
      const image = element.querySelector('image');
      return { sampling: getComputedStyle(image).imageRendering, determinant: image.getScreenCTM().a * image.getScreenCTM().d,
        imagePath: image.getAttribute('href'), width: element.getBoundingClientRect().width, height: element.getBoundingClientRect().height };
    });
    expect(geometry.sampling).toBe('pixelated');
    expect(geometry.determinant, 'asymmetric artwork must not be mirrored').toBeGreaterThan(0);
    expect(geometry.imagePath).toContain('assets/pets/dalmatian/animations/');
    expect(geometry.width).toBeGreaterThan(0);
    expect(geometry.height).toBeGreaterThan(0);
    await page.screenshot({ path: `outputs/Little-Haven-Dalmatian-${world}.png`, fullPage: true, animations: 'disabled' });
  }
  for (const label of ['Let It Float', 'The Memory Corner']) {
    await page.getByRole('button', { name: label, exact: true }).click();
    await expect(companion(page)).toHaveCount(0);
  }
});

test('sleep wakes once before sitting and standing, then the walking sheet follows real travel', async ({ page }) => {
  test.setTimeout(60_000);
  await seed(page);
  await page.clock.install();
  await page.goto('/');
  await page.mouse.move(0, 0);
  await expect(sheet(page)).toHaveAttribute('data-animation', 'sleep');
  await page.evaluate(() => {
    window.__dalmatianClips = [];
    const record = () => {
      const clip = document.querySelector('.companion .companion-sheet')?.dataset.animation;
      if (clip && window.__dalmatianClips.at(-1) !== clip) window.__dalmatianClips.push(clip);
    };
    record();
    new MutationObserver(record).observe(document.querySelector('.companion').parentElement, { subtree: true, attributes: true, childList: true });
  });
  await advanceUntil(page, async () => await sheet(page).getAttribute('data-animation') === 'walk', 180_000);
  const clips = await page.evaluate(() => window.__dalmatianClips);
  expect(clips).toEqual(['sleep', 'wake_up', 'seated_idle', 'stand_up', 'walk']);
  await expect(companion(page)).toHaveAttribute('data-moving', 'true');
  const frame = await sheet(page).getAttribute('data-frame');
  const before = await sheet(page).evaluate((element) => {
    const matrix = element.getScreenCTM();
    return { x: matrix.e, y: matrix.f, scaleX: matrix.a, scaleY: matrix.d };
  });
  await page.clock.runFor(250);
  await expect(sheet(page)).not.toHaveAttribute('data-frame', frame);
  const after = await sheet(page).evaluate((element) => {
    const matrix = element.getScreenCTM();
    return { x: matrix.e, y: matrix.f, scaleX: matrix.a, scaleY: matrix.d };
  });
  expect([after.scaleX, after.scaleY]).toEqual([before.scaleX, before.scaleY]);
  // CSS uses the browser animation clock; playback and travel pause together.
  await openPanel(page);
  const frozenFrame = await sheet(page).getAttribute('data-frame');
  await page.clock.runFor(4000);
  await expect(sheet(page)).toHaveAttribute('data-frame', frozenFrame);
  await closePanel(page);
  await advanceUntil(page, async () => await companion(page).getAttribute('data-moving') === 'false', 90_000);
  await expect(sheet(page)).not.toHaveAttribute('data-animation', 'walk');
  expect((await page.evaluate(() => window.__dalmatianClips)).filter((clip) => clip === 'stand_up')).toHaveLength(1);
  await advanceUntil(page, async () => await sheet(page).getAttribute('data-animation') === 'lie_down', 90_000);
  await advanceUntil(page, async () => await sheet(page).getAttribute('data-animation') === 'sleep', 3000, 100);
  const restClips = await page.evaluate(() => window.__dalmatianClips);
  expect(restClips.slice(-2)).toEqual(['lie_down', 'sleep']);
  expect(restClips.filter((clip) => clip === 'lie_down')).toHaveLength(1);
});

test('cook loops only at the batter station, pauses with the recipe and stops when it is cancelled', async ({ page }) => {
  test.setTimeout(60_000);
  await seed(page);
  await page.clock.install();
  const kitchen = createKitchen();
  kitchen.session = { id: '00000000-0000-4000-8000-000000000071', recipeId: 'cake', durationMs: 3_600_000,
    elapsedMs: 360_000, updatedAt: 0, status: 'paused', presentation: 'closed', completedAt: null };
  await page.addInitScript((value) => {
    if (!localStorage.getItem('haven.kitchen.v1')) {
      value.session.updatedAt = Date.now();
      localStorage.setItem('haven.kitchen.v1', JSON.stringify(value));
    }
  }, kitchen);
  await page.goto('/');
  await page.getByRole('button', { name: 'The Cozy Kitchen', exact: true }).click();
  await expect(companion(page)).toHaveAttribute('data-kitchen-action', 'mixing');
  await expect(companion(page)).toHaveAttribute('data-kitchen-phase', 'acting');
  await expect(sheet(page)).toHaveAttribute('data-animation', 'cook');
  await expect(companion(page).locator('.companion-chef')).toHaveCount(0);
  await page.screenshot({ path: 'outputs/Little-Haven-Dalmatian-cook.png', fullPage: true, animations: 'disabled' });
  await page.getByRole('button', { name: 'Retomar receita', exact: true }).click();
  await page.mouse.move(0, 0);
  const observed = [];
  for (let step = 0; step < 45; step += 1) {
    observed.push(Number(await sheet(page).getAttribute('data-frame')));
    await page.clock.runFor(200);
  }
  expect(new Set(observed).size).toBe(8);
  expect(observed.filter((frame) => frame === 0).length).toBeGreaterThanOrEqual(3);
  await expect(sheet(page)).toHaveAttribute('data-animation', 'cook');
  await page.getByRole('button', { name: 'Pausar receita', exact: true }).click();
  const frame = await sheet(page).getAttribute('data-frame');
  const elapsed = await page.evaluate(() => JSON.parse(localStorage.getItem('haven.kitchen.v1')).session.elapsedMs);
  await page.clock.runFor(5000);
  await expect(sheet(page)).toHaveAttribute('data-frame', frame);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('haven.kitchen.v1')).session.elapsedMs)).toBe(elapsed);
  await page.getByRole('button', { name: 'Relógio da cozinha', exact: true }).click();
  const clock = page.getByRole('dialog', { name: 'Relógio da cozinha', exact: true });
  await clock.getByRole('button', { name: 'Encerrar antecipadamente', exact: true }).click();
  await clock.getByRole('button', { name: 'Confirmar encerramento', exact: true }).click();
  await expect(page.locator('.kitchen-scene')).toHaveAttribute('data-status', 'cancelled');
  await page.mouse.move(0, 0);
  await advanceUntil(page, async () => await companion(page).getAttribute('data-kitchen-phase') === 'acting', 40_000);
  await expect(companion(page)).toHaveAttribute('data-kitchen-action', 'reading');
  await expect(sheet(page)).toHaveAttribute('data-animation', 'seated_idle');
  await expect(page.locator('.kitchen-completion')).toHaveCount(0);
});

test('reduced motion freezes bitmap frames while keyboard affection and visibility remain usable', async ({ page }) => {
  await seed(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.install();
  await page.goto('/');
  const first = { animation: await sheet(page).getAttribute('data-animation'), frame: await sheet(page).getAttribute('data-frame') };
  await page.clock.runFor(30_000);
  await expect(sheet(page)).toHaveAttribute('data-animation', first.animation);
  await expect(sheet(page)).toHaveAttribute('data-frame', first.frame);
  await companion(page).focus();
  await page.keyboard.press('Enter');
  await expect(companion(page)).toHaveAttribute('aria-description', 'Pingo gostou do carinho.');
  const reaction = await companion(page).getAttribute('data-reaction');
  await page.keyboard.press('Enter');
  await expect(companion(page)).toHaveAttribute('data-reaction', reaction);
  await page.clock.runFor(5000);
  await openPanel(page);
  await panel(page).getByRole('switch', { name: 'Mostrar companheiro', exact: true }).click();
  await closePanel(page);
  await expect(companion(page)).toHaveCount(0);
  await openPanel(page);
  await panel(page).getByRole('switch', { name: 'Mostrar companheiro', exact: true }).click();
  await closePanel(page);
  await expect(companion(page)).toHaveAttribute('data-pet-id', 'dalmatian');
  await expect(sheet(page)).toBeVisible();
});

test('a completed recipe stops the cooking sheet and presents the real result after arriving', async ({ page }) => {
  await seed(page);
  await page.clock.install();
  const kitchen = createKitchen();
  kitchen.session = { id: '00000000-0000-4000-8000-000000000072', recipeId: 'cake', durationMs: 3_600_000,
    elapsedMs: 360_000, updatedAt: 0, status: 'running', presentation: 'closed', completedAt: null };
  await page.addInitScript((value) => {
    value.session.updatedAt = Date.now();
    localStorage.setItem('haven.kitchen.v1', JSON.stringify(value));
  }, kitchen);
  await page.goto('/');
  await page.getByRole('button', { name: 'The Cozy Kitchen', exact: true }).click();
  await expect(sheet(page)).toHaveAttribute('data-animation', 'cook');
  await page.mouse.move(0, 0);
  await page.clock.fastForward(3_250_000);
  await expect(page.locator('.kitchen-scene')).toHaveAttribute('data-status', 'completed');
  await expect(sheet(page)).not.toHaveAttribute('data-animation', 'cook');
  await advanceUntil(page, async () => await companion(page).getAttribute('data-kitchen-action') === 'presenting', 40_000);
  await expect(sheet(page)).toHaveAttribute('data-animation', 'seated_idle');
  await expect(page.locator('.kitchen-completion')).toBeVisible();
  const persisted = await page.evaluate(() => JSON.parse(localStorage.getItem('haven.kitchen.v1')).session);
  expect(persisted.recipeId).toBe('cake');
  expect(persisted.elapsedMs).toBe(persisted.durationMs);
  await page.screenshot({ path: 'outputs/Little-Haven-Dalmatian-completion.png', fullPage: true, animations: 'disabled' });
});

test('temporarily hiding a resting pet preserves its exact breathing frame and resumes the same loop', async ({ page }) => {
  await seed(page);
  await page.clock.install();
  await page.goto('/');
  await expect(sheet(page)).toHaveAttribute('data-animation', 'sleep');
  await page.clock.runFor(2500);
  await expect(sheet(page)).toHaveAttribute('data-frame', '1');
  await openPanel(page);
  const visibility = panel(page).getByRole('switch', { name: 'Mostrar companheiro', exact: true });
  await visibility.click();
  await expect(companion(page)).toHaveCount(0);
  await page.clock.runFor(10_000);
  await visibility.click();
  await expect(sheet(page)).toHaveAttribute('data-frame', '1');
  await closePanel(page);
  await page.clock.runFor(800);
  await expect(sheet(page)).toHaveAttribute('data-frame', '2');
});

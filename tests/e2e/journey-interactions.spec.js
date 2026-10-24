import { test, expect } from '@playwright/test';

const diagnostics = new WeakMap();
const newSceneries = [
  ['snowy-mountains', 'Snowy Mountains'],
  ['morning-lake', 'Morning Lake'],
];

test.beforeEach(async ({ page }) => {
  const recorded = { errors: [], externalRequests: [] };
  diagnostics.set(page, recorded);
  page.on('pageerror', (error) => recorded.errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') recorded.errors.push(message.text());
  });
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (['http:', 'https:', 'ws:', 'wss:'].includes(url.protocol) && url.hostname !== '127.0.0.1') {
      recorded.externalRequests.push(request.url());
    }
  });
});

test.afterEach(async ({ page }) => {
  const recorded = diagnostics.get(page);
  expect(recorded.errors, 'the carriage interactions must not produce renderer errors').toEqual([]);
  expect(recorded.externalRequests, 'the expanded journey must remain entirely local').toEqual([]);
});

async function openJourney(page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'The Journey', exact: true }).click();
  await expect(page.locator('.journey-scene')).toBeVisible();
}

function object(page, name) {
  return page.getByRole('button', { name, exact: true });
}

async function tabTo(page, control) {
  for (let index = 0; index < 40; index += 1) {
    await page.keyboard.press('Tab');
    if (await control.evaluate((element) => element === document.activeElement)) return;
  }
  await expect(control).toBeFocused();
}

async function expectVisibleFocus(control) {
  await expect(control).toBeFocused();
  expect(await control.evaluate((element) => {
    const style = getComputedStyle(element);
    return element.matches(':focus-visible') && style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) >= 2;
  })).toBe(true);
}

async function expectDialogFocusTrap(page, dialog) {
  const controls = dialog.locator('button:enabled');
  const first = controls.first();
  const last = controls.last();
  await last.focus();
  await page.keyboard.press('Tab');
  await expect(first).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(last).toBeFocused();
}

async function transforms(page) {
  return page.locator('.journey-parallax').evaluateAll((elements) =>
    elements.map((element) => getComputedStyle(element).transform),
  );
}

async function curtainOffset(page, side) {
  return page.locator(`.journey-curtain--${side}`).evaluate((element) => {
    const transform = getComputedStyle(element).transform;
    return transform === 'none' ? 0 : new DOMMatrixReadOnly(transform).m41;
  });
}

async function expectAllAnimationsPaused(page) {
  expect(await page.locator('.journey-scene').evaluate((scene) =>
    [scene, ...scene.querySelectorAll('*')].every((element) =>
      [null, '::before', '::after'].every((pseudo) => {
        const style = getComputedStyle(element, pseudo);
        return style.animationName.split(',').every((name) => name.trim() === 'none') ||
          style.animationPlayState.split(',').every((state) => state.trim() === 'paused');
      }),
    ),
  )).toBe(true);
}

async function expectReducedMotion(page) {
  await expect(page.locator('.journey-scene')).toHaveClass(/is-reduced-motion/);
  expect(await page.locator('.journey-scene').evaluate((scene) =>
    [scene, ...scene.querySelectorAll('*')].every((element) =>
      [null, '::before', '::after'].every((pseudo) => {
        const style = getComputedStyle(element, pseudo);
        return style.animationName.split(',').every((name) => name.trim() === 'none') &&
          style.transitionDuration.split(',').every((duration) => {
            const seconds = parseFloat(duration) / (duration.trim().endsWith('ms') ? 1000 : 1);
            return seconds <= 0.000001;
          });
      }),
    ),
  )).toBe(true);
}

test('the reading lamp and curtains respond to mouse and keyboard independently', async ({ page }) => {
  await openJourney(page);
  const lamp = object(page, 'Luminária de leitura');
  const curtains = object(page, 'Cortinas da janela');
  const illumination = page.locator('.journey-lamp-illumination');
  await expect(lamp).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => illumination.evaluateAll((lights) => lights.map((light) => getComputedStyle(light).opacity))).toEqual(['1', '1']);
  await expect(curtains).toHaveAttribute('aria-expanded', 'true');
  await expect.poll(() => curtainOffset(page, 'left')).toBe(-139);
  await expect.poll(() => curtainOffset(page, 'right')).toBe(139);

  await lamp.click();
  await expect(lamp).toHaveAttribute('aria-pressed', 'false');
  await expect.poll(() => illumination.evaluateAll((lights) => lights.map((light) => getComputedStyle(light).opacity))).toEqual(['0', '0']);
  await curtains.click();
  await expect(curtains).toHaveAttribute('aria-expanded', 'false');
  await expect.poll(() => curtainOffset(page, 'left')).toBe(0);
  await expect.poll(() => curtainOffset(page, 'right')).toBe(0);
  await expect(lamp).toHaveAttribute('aria-pressed', 'false');

  await tabTo(page, lamp);
  await expectVisibleFocus(lamp);
  await page.keyboard.press('Enter');
  await expect(lamp).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => illumination.evaluateAll((lights) => lights.map((light) => getComputedStyle(light).opacity))).toEqual(['1', '1']);
  await expect(curtains).toHaveAttribute('aria-expanded', 'false');
  await tabTo(page, curtains);
  await expectVisibleFocus(curtains);
  await page.keyboard.press('Space');
  await expect(curtains).toHaveAttribute('aria-expanded', 'true');
  await expect.poll(() => curtainOffset(page, 'left')).toBe(-139);
  await expect.poll(() => curtainOffset(page, 'right')).toBe(139);

  await page.getByRole('combobox', { name: 'Paisagem da viagem' }).selectOption('snowy-mountains');
  await expect(lamp).toHaveAttribute('aria-pressed', 'true');
  await expect(curtains).toHaveAttribute('aria-expanded', 'true');
});

test('tea can be prepared again and its steam cools without a real-time wait', async ({ page }) => {
  await page.clock.install();
  await openJourney(page);
  const scene = page.locator('.journey-scene');
  const tea = object(page, 'Preparar chá');
  const steam = page.locator('.journey-steam').first();
  await expect(scene).toHaveAttribute('data-tea-state', 'cold');
  await expect(tea).toHaveAttribute('aria-pressed', 'false');
  await expect(steam).toHaveCSS('opacity', '0');

  await tea.click();
  await expect(scene).toHaveAttribute('data-tea-state', 'warm');
  await expect(tea).toHaveAttribute('aria-pressed', 'true');
  await expect(steam).toHaveCSS('animation-name', 'journey-warm-tea');
  expect(await steam.evaluate((element) => parseFloat(getComputedStyle(element).opacity))).toBeGreaterThan(0);
  await page.clock.fastForward(12_001);
  await expect(scene).toHaveAttribute('data-tea-state', 'cooling');
  await expect(steam).toHaveCSS('animation-name', 'journey-cooling-tea');

  await tabTo(page, tea);
  await expectVisibleFocus(tea);
  await page.keyboard.press('Space');
  await expect(scene).toHaveAttribute('data-tea-state', 'warm');
  await page.clock.fastForward(11_000);
  await expect(scene).toHaveAttribute('data-tea-state', 'warm');
  await page.getByRole('button', { name: 'Pausar movimento', exact: true }).click();
  await page.clock.fastForward(1_001);
  await expect(scene).toHaveAttribute('data-tea-state', 'cooling');
  await page.clock.fastForward(18_001);
  await expect(scene).toHaveAttribute('data-tea-state', 'cold');
  await expect(tea).toHaveAttribute('aria-pressed', 'false');
  await expect(steam).toHaveCSS('opacity', '0');
  await expect(scene).toHaveClass(/is-paused/);

  await tea.click();
  await expect(scene).toHaveAttribute('data-tea-state', 'warm');
});

test('the book has original pages, traps keyboard focus and returns it to its object', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await openJourney(page);
  const book = object(page, 'Abrir livro');
  await tabTo(page, book);
  await expectVisibleFocus(book);
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'Pequenas paisagens', exact: true });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Fechar livro' })).toBeFocused();
  const message = dialog.locator('.journey-book-message');
  const firstMessage = await message.innerText();
  expect(firstMessage.trim().length).toBeGreaterThan(10);
  await dialog.getByRole('button', { name: 'Próxima página' }).click();
  await expect(message).not.toHaveText(firstMessage);
  await dialog.getByRole('button', { name: 'Página anterior' }).click();
  await expect(message).toHaveText(firstMessage);
  const behindTheBook = await transforms(page);
  await expect.poll(() => transforms(page)).not.toEqual(behindTheBook);
  await expectDialogFocusTrap(page, dialog);
  await page.screenshot({ path: testInfo.outputPath('journey-book.png'), animations: 'disabled' });

  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(book).toBeFocused();
  await page.keyboard.press('Space');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Fechar livro' }).click();
  await expect(dialog).not.toBeVisible();
  await expect(book).toBeFocused();
});

test('both new landscapes move, pause and identify themselves on the travel ticket', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await openJourney(page);
  const selection = page.getByRole('combobox', { name: 'Paisagem da viagem' });
  const ticket = object(page, 'Consultar bilhete');
  const dialog = page.getByRole('dialog', { name: 'Bilhete de viagem', exact: true });

  for (const [value, label] of newSceneries) {
    await selection.selectOption(value);
    await expect(page.locator('.journey-scene')).toHaveAttribute('data-scenery', value);
    await expect(page.locator('.scene-weather')).toHaveText(label);
    if (value === 'snowy-mountains') {
      await expect(page.locator('.journey-snow-scene')).toBeAttached();
      await expect(page.locator('.journey-snowfall')).toHaveCount(2);
    } else {
      await expect(page.locator('.journey-morning-scene')).toBeAttached();
      await expect(page.locator('.journey-lake-mist').first()).toBeAttached();
      await expect(page.locator('.journey-lake-reflections')).toBeAttached();
      await expect(page.locator('.journey-lake-birds').first()).toBeAttached();
    }
    expect(await page.locator('.journey-parallax').count()).toBeGreaterThan(1);
    const moving = await transforms(page);
    await expect.poll(() => transforms(page)).not.toEqual(moving);

    await page.getByRole('button', { name: 'Pausar movimento', exact: true }).click();
    await expectAllAnimationsPaused(page);
    const paused = await transforms(page);
    await page.waitForTimeout(200);
    expect(await transforms(page)).toEqual(paused);
    await page.locator('.immersive-viewport').screenshot({
      path: testInfo.outputPath(`${value}.png`),
      animations: 'disabled',
    });

    await ticket.click();
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(label);
    await expect(dialog.getByRole('button', { name: 'Fechar bilhete' })).toBeFocused();
    await expectDialogFocusTrap(page, dialog);
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(ticket).toBeFocused();
    await expect(page.locator('.journey-scene')).toHaveClass(/is-paused/);
    await page.getByRole('button', { name: 'Retomar movimento', exact: true }).click();
    await expect.poll(() => transforms(page)).not.toEqual(paused);
  }
});

test('fullscreen preserves objects and contextual Escape closes the keepsake before leaving', async ({ page }, testInfo) => {
  await openJourney(page);
  const lamp = object(page, 'Luminária de leitura');
  const curtains = object(page, 'Cortinas da janela');
  const tea = object(page, 'Preparar chá');
  const book = object(page, 'Abrir livro');
  const ticket = object(page, 'Consultar bilhete');
  await lamp.click();
  await curtains.click();
  await tea.click();
  await page.getByRole('combobox', { name: 'Paisagem da viagem' }).selectOption('morning-lake');
  await page.getByRole('button', { name: 'Pausar movimento', exact: true }).click();
  await page.evaluate(() => { window.__journeyInteractionArt = document.querySelector('svg.journey-art'); });
  await object(page, 'Modo Imersivo').click();
  await expect.poll(() => page.evaluate(() =>
    document.fullscreenElement === document.querySelector('.immersive-viewport'),
  )).toBe(true);
  await expect(lamp).toHaveAttribute('aria-pressed', 'false');
  await expect(curtains).toHaveAttribute('aria-expanded', 'false');
  await expect(tea).toHaveAttribute('aria-pressed', 'true');

  await lamp.click();
  await curtains.click();
  await tabTo(page, page.locator('.immersive-exit'));
  await expect(object(page, 'Sair do Modo Imersivo')).toBeFocused();
  await tabTo(page, book);
  await expectVisibleFocus(book);
  await page.keyboard.press('Enter');
  const bookDialog = page.getByRole('dialog', { name: 'Pequenas paisagens', exact: true });
  await expect(bookDialog).toBeVisible();
  expect(await bookDialog.evaluate((element) => document.fullscreenElement.contains(element))).toBe(true);
  await expectDialogFocusTrap(page, bookDialog);
  await page.screenshot({ path: testInfo.outputPath('immersive-book.png'), animations: 'disabled' });
  await page.keyboard.press('Escape');
  await expect(bookDialog).not.toBeVisible();
  expect(await page.evaluate(() => document.fullscreenElement !== null)).toBe(true);
  await expect(book).toBeFocused();

  await ticket.click();
  const ticketDialog = page.getByRole('dialog', { name: 'Bilhete de viagem', exact: true });
  await expect(ticketDialog).toContainText('Morning Lake');
  await ticketDialog.getByRole('button', { name: 'Fechar bilhete' }).click();
  await expect(ticket).toBeFocused();
  await page.keyboard.press('Escape');
  await expect.poll(() => page.evaluate(() => document.fullscreenElement === null)).toBe(true);
  await expect(object(page, 'Modo Imersivo')).toBeFocused();
  await expect(lamp).toHaveAttribute('aria-pressed', 'true');
  await expect(curtains).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('.journey-scene')).toHaveAttribute('data-scenery', 'morning-lake');
  await expect(page.locator('.journey-scene')).toHaveClass(/is-paused/);
  expect(await page.evaluate(() =>
    window.__journeyInteractionArt === document.querySelector('svg.journey-art'),
  )).toBe(true);
});

test('reduced motion keeps every new interaction usable and dialogs fit a small window', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 390, height: 844 });
  await openJourney(page);
  await object(page, 'Luminária de leitura').click();
  await object(page, 'Cortinas da janela').click();
  await object(page, 'Preparar chá').click();
  await expect(object(page, 'Luminária de leitura')).toHaveAttribute('aria-pressed', 'false');
  await expect(object(page, 'Cortinas da janela')).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('.journey-scene')).toHaveAttribute('data-tea-state', 'warm');
  await expect(object(page, 'Movimento reduzido')).toBeDisabled();
  for (const [value] of newSceneries) {
    await page.getByRole('combobox', { name: 'Paisagem da viagem' }).selectOption(value);
    await expectReducedMotion(page);
  }

  for (const [trigger, name, close] of [
    ['Abrir livro', 'Pequenas paisagens', 'Fechar livro'],
    ['Consultar bilhete', 'Bilhete de viagem', 'Fechar bilhete'],
  ]) {
    await object(page, trigger).click();
    const dialog = page.getByRole('dialog', { name, exact: true });
    await expect(dialog).toBeVisible();
    await expectReducedMotion(page);
    const bounds = await dialog.boundingBox();
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.y).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(391);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(845);
    await page.screenshot({ path: testInfo.outputPath(`${close}-small-reduced-motion.png`), animations: 'disabled' });
    await dialog.getByRole('button', { name: close }).click();
    await expect(object(page, trigger)).toBeFocused();
  }
});

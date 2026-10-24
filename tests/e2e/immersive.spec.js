import { test, expect } from '@playwright/test';

const diagnostics = new WeakMap();

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
  expect(recorded.errors, 'immersive mode must not produce renderer or console errors').toEqual([]);
  expect(recorded.externalRequests, 'immersive mode must work entirely locally').toEqual([]);
});

async function openJourney(page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'The Journey', exact: true }).click();
  await expect(page.locator('.journey-scene')).toBeVisible();
}

function entryButton(page) {
  return page.getByRole('button', { name: 'Modo Imersivo', exact: true });
}

async function enterImmersive(page) {
  await entryButton(page).click();
  await expect.poll(() => page.evaluate(() =>
    document.fullscreenElement === document.querySelector('.immersive-viewport'),
  )).toBe(true);
  await expect(page.locator('.immersive-viewport')).toHaveClass(/is-immersive/);
}

async function leaveWithEscape(page) {
  await page.keyboard.press('Escape');
  await expect.poll(() => page.evaluate(() => document.fullscreenElement === null)).toBe(true);
  await expect(page.locator('.immersive-viewport')).not.toHaveClass(/is-immersive/);
  await expect(entryButton(page)).toBeFocused();
}

async function expectIntegratedViewport(page) {
  const bounds = await page.locator('.immersive-viewport').boundingBox();
  const dimensions = await page.evaluate(() => ({ width: innerWidth, height: innerHeight }));
  expect(bounds.x).toBeCloseTo(0, 1);
  expect(bounds.y).toBeCloseTo(0, 1);
  expect(bounds.width).toBeCloseTo(dimensions.width, 1);
  expect(bounds.height).toBeCloseTo(dimensions.height, 1);
  const style = await page.locator('.immersive-viewport').evaluate((element) => {
    const computed = getComputedStyle(element);
    return {
      background: computed.backgroundColor,
      borders: ['Top', 'Right', 'Bottom', 'Left'].map((side) => computed[`border${side}Width`]),
      overflowX: element.scrollWidth > element.clientWidth,
      overflowY: element.scrollHeight > element.clientHeight,
    };
  });
  expect(style.background).toBe('rgb(30, 53, 49)');
  expect(style.borders).toEqual(['0px', '0px', '0px', '0px']);
  expect(style.overflowX).toBe(false);
  expect(style.overflowY).toBe(false);
}

async function expectPixelScale(page) {
  const geometry = await page.locator('.immersive-art').evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const art = element.querySelector('svg.journey-art');
    const artRect = art.getBoundingClientRect();
    const available = Math.min(innerWidth * devicePixelRatio / 480, innerHeight * devicePixelRatio / 270);
    const physicalScale = available >= 1 ? Math.floor(available) : available;
    return {
      width: rect.width,
      height: rect.height,
      x: rect.x,
      y: rect.y,
      artWidth: artRect.width,
      artHeight: artRect.height,
      expectedWidth: 480 * physicalScale / devicePixelRatio,
      expectedHeight: 270 * physicalScale / devicePixelRatio,
      viewportWidth: innerWidth,
      viewportHeight: innerHeight,
      devicePixelRatio,
      imageRendering: getComputedStyle(art).imageRendering,
      shapeRendering: art.getAttribute('shape-rendering'),
    };
  });
  expect(geometry.width).toBeCloseTo(geometry.expectedWidth, 1);
  expect(geometry.height).toBeCloseTo(geometry.expectedHeight, 1);
  expect(geometry.artWidth).toBeCloseTo(geometry.width, 1);
  expect(geometry.artHeight).toBeCloseTo(geometry.height, 1);
  expect(geometry.width / geometry.height).toBeCloseTo(16 / 9, 3);
  const pixelTolerance = 1 / geometry.devicePixelRatio + 0.02;
  expect(Math.abs(geometry.x - (geometry.viewportWidth - geometry.width) / 2)).toBeLessThanOrEqual(pixelTolerance);
  expect(Math.abs(geometry.y - (geometry.viewportHeight - geometry.height) / 2)).toBeLessThanOrEqual(pixelTolerance);
  for (const position of [geometry.x, geometry.y]) {
    const physicalPosition = position * geometry.devicePixelRatio;
    expect(Math.abs(physicalPosition - Math.round(physicalPosition))).toBeLessThanOrEqual(0.03);
  }
  expect(geometry.x).toBeGreaterThanOrEqual(-0.05);
  expect(geometry.y).toBeGreaterThanOrEqual(-0.05);
  expect(geometry.x + geometry.width).toBeLessThanOrEqual(geometry.viewportWidth + 0.05);
  expect(geometry.y + geometry.height).toBeLessThanOrEqual(geometry.viewportHeight + 0.05);
  expect(geometry.imageRendering).toBe('pixelated');
  expect(geometry.shapeRendering).toBe('crispEdges');
}

async function transforms(page) {
  return page.locator('.journey-parallax, .journey-rainfall').evaluateAll((elements) =>
    elements.map((element) => getComputedStyle(element).transform),
  );
}

test('real fullscreen shows only the composition and Escape restores focus and every Journey choice', async ({ page }) => {
  await openJourney(page);
  const enter = entryButton(page);
  await expect(enter).toHaveAttribute('title', 'Modo Imersivo');
  await expect(enter.locator('svg')).toHaveCount(1);
  await page.getByRole('button', { name: 'Parar chuva', exact: true }).click();
  await page.getByRole('combobox', { name: 'Paisagem da viagem' }).selectOption('forest');
  await page.getByRole('button', { name: 'Pausar movimento', exact: true }).click();
  await page.evaluate(() => { window.__immersiveOriginalArt = document.querySelector('svg.journey-art'); });

  await enterImmersive(page);
  await expectIntegratedViewport(page);
  expect(await page.evaluate(() => window.__immersiveOriginalArt === document.querySelector('svg.journey-art'))).toBe(true);
  // DOM fullscreen is a browser top layer: ordinary visibility assertions cannot prove that
  // outside UI is absent. Verify that it is outside the target and unavailable to keyboard/AT.
  expect(await page.evaluate(() => {
    const viewport = document.fullscreenElement;
    return ['.app-header', '.scene-heading', '.frame-top', '.journey-controls', '.scene-bottom', '.world-navigation', '.quiet-footer']
      .every((selector) => {
        const element = document.querySelector(selector);
        return element && !viewport.contains(element) && element.closest('[inert]');
      });
  })).toBe(true);
  await expect(page.locator('.immersive-viewport button')).toHaveCount(1);
  await expect(page.locator('.immersive-viewport select, .immersive-viewport input, .immersive-viewport h1')).toHaveCount(0);
  await expect(page.locator('.immersive-exit')).toHaveCSS('opacity', '0');
  await expect(page.locator('.journey-scene')).toHaveAttribute('data-scenery', 'forest');
  await expect(page.locator('.journey-scene')).toHaveClass(/is-paused/);
  const paused = await transforms(page);
  await page.waitForTimeout(250);
  expect(await transforms(page)).toEqual(paused);

  await leaveWithEscape(page);
  await expect(page.locator('.app-header')).toBeVisible();
  await expect(page.locator('.world-navigation')).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Paisagem da viagem' })).toHaveValue('forest');
  await expect(page.getByRole('button', { name: 'Retomar movimento', exact: true })).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => window.__immersiveOriginalArt === document.querySelector('svg.journey-art'))).toBe(true);
  expect(await page.locator('.haven-app [inert]').count()).toBe(0);
  await page.getByRole('combobox', { name: 'Paisagem da viagem' }).selectOption('rainy-night');
  await expect(page.getByRole('button', { name: 'Ativar chuva', exact: true })).toHaveAttribute('aria-pressed', 'false');
  await page.getByRole('button', { name: 'Voltar ao quarto', exact: true }).click();
  await expect(page.locator('.room-scene')).toBeVisible();
});

test('the exit control appears at the upper corner or with Tab, hides when idle and returns keyboard focus', async ({ page }) => {
  await openJourney(page);
  await enterImmersive(page);
  const exit = page.locator('.immersive-exit');
  await expect(exit).toHaveAttribute('aria-label', 'Sair do Modo Imersivo');
  await expect(exit).toHaveCSS('opacity', '0');

  const { width, height } = await page.evaluate(() => ({ width: innerWidth, height: innerHeight }));
  await page.mouse.move(width - 15, 15);
  await expect(exit).toHaveCSS('opacity', '1');
  await page.mouse.move(width / 2, height / 2);
  await expect(exit).toHaveCSS('opacity', '0', { timeout: 4000 });

  await page.keyboard.press('Tab');
  await expect(exit).toBeFocused();
  await expect(exit).toHaveCSS('opacity', '1');
  expect(await exit.evaluate((element) => {
    const style = getComputedStyle(element);
    return element.matches(':focus-visible') && style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) >= 2;
  })).toBe(true);
  await page.waitForTimeout(2000);
  await expect(exit).toHaveCSS('opacity', '1');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Cortinas da janela', exact: true })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(exit).toBeFocused();
  await page.keyboard.press('Enter');
  await expect.poll(() => page.evaluate(() => document.fullscreenElement === null)).toBe(true);
  await expect(entryButton(page)).toBeFocused();

  await enterImmersive(page);
  await page.mouse.move(width - 15, 15);
  await expect(exit).toHaveCSS('opacity', '1');
  await exit.click();
  await expect.poll(() => page.evaluate(() => document.fullscreenElement === null)).toBe(true);
  await expect(entryButton(page)).toBeFocused();
});

test('the same landscape and rain keep animating while fullscreen preserves local audio without starting it', async ({ page }) => {
  await page.addInitScript(() => {
    const NativeAudioContext = window.AudioContext ?? window.webkitAudioContext;
    window.__immersiveAudioContexts = [];
    window.AudioContext = class extends NativeAudioContext {
      constructor(...args) {
        super(...args);
        window.__immersiveAudioContexts.push(this);
      }
    };
  });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await openJourney(page);
  await page.evaluate(() => {
    window.__immersiveOriginalArt = document.querySelector('svg.journey-art');
    window.__immersiveOriginalAnimation = document.querySelector('.journey-parallax').getAnimations()[0];
  });
  await enterImmersive(page);
  expect(await page.evaluate(() => window.__immersiveAudioContexts.length)).toBe(0);
  const active = await transforms(page);
  await expect.poll(() => transforms(page)).not.toEqual(active);
  expect(await page.evaluate(() =>
    document.querySelector('.journey-parallax').getAnimations()[0] === window.__immersiveOriginalAnimation,
  )).toBe(true);
  await leaveWithEscape(page);
  expect(await page.evaluate(() => window.__immersiveAudioContexts.length)).toBe(0);
  await page.getByRole('button', { name: 'Ativar áudio', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Desativar áudio', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => page.evaluate(() => window.__immersiveAudioContexts[0]?.state)).toBe('running');
  await enterImmersive(page);
  expect(await page.evaluate(() => window.__immersiveAudioContexts.length)).toBe(1);
  expect(await page.evaluate(() => window.__immersiveAudioContexts[0].state)).toBe('running');
  expect(await page.evaluate(() => window.__immersiveOriginalArt === document.querySelector('svg.journey-art'))).toBe(true);
  const withAudio = await transforms(page);
  await expect.poll(() => transforms(page)).not.toEqual(withAudio);
  await leaveWithEscape(page);
  await expect(page.getByRole('button', { name: 'Desativar áudio', exact: true })).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => window.__immersiveAudioContexts.length)).toBe(1);
  expect(await page.evaluate(() => window.__immersiveAudioContexts[0].state)).toBe('running');
});

test('reduced motion remains static throughout fullscreen and after returning', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openJourney(page);
  await page.getByRole('combobox', { name: 'Paisagem da viagem' }).selectOption('sunset');
  await expect(page.getByRole('button', { name: 'Movimento reduzido', exact: true })).toBeDisabled();
  await enterImmersive(page);
  await expect(page.locator('.journey-scene')).toHaveClass(/is-reduced-motion/);
  expect(await page.locator('svg.journey-art').evaluate((art) =>
    [art, ...art.querySelectorAll('*')].every((element) =>
      getComputedStyle(element).animationName.split(',').every((name) => name.trim() === 'none'),
    ),
  )).toBe(true);
  const staticArt = await transforms(page);
  await page.waitForTimeout(250);
  expect(await transforms(page)).toEqual(staticArt);
  await leaveWithEscape(page);
  await expect(page.getByRole('combobox', { name: 'Paisagem da viagem' })).toHaveValue('sunset');
  await expect(page.getByRole('button', { name: 'Movimento reduzido', exact: true })).toBeDisabled();
});

test('unavailable or denied fullscreen keeps the normal interface usable and permits a real retry', async ({ page }) => {
  await openJourney(page);
  const error = page.locator('.journey-immersive-error');
  // Only the failure paths are simulated; the final retry uses the browser API.
  await page.evaluate(() => {
    Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, value: false });
  });
  await entryButton(page).click();
  await expect(error).toContainText('A tela cheia não está disponível');
  await expect(error).toBeVisible();
  await expect(entryButton(page)).toBeEnabled();
  expect(await page.evaluate(() => document.fullscreenElement === null)).toBe(true);
  expect(await page.locator('.haven-app [inert]').count()).toBe(0);
  await expect(page.getByRole('combobox', { name: 'Paisagem da viagem' })).toBeEnabled();

  await page.evaluate(() => {
    delete document.fullscreenEnabled;
    document.querySelector('.immersive-viewport').requestFullscreen = () =>
      Promise.reject(new DOMException('Synthetic fullscreen denial', 'NotAllowedError'));
  });
  await entryButton(page).click();
  await expect(error).toContainText('Não foi possível abrir o Modo Imersivo');
  await expect(error).toBeVisible();
  await expect(entryButton(page)).toBeEnabled();
  expect(await page.evaluate(() => document.fullscreenElement === null)).toBe(true);
  expect(await page.locator('.haven-app [inert]').count()).toBe(0);
  await expect(page.locator('.world-navigation')).toBeVisible();

  await page.evaluate(() => { delete document.querySelector('.immersive-viewport').requestFullscreen; });
  await enterImmersive(page);
  await expect(page.locator('.journey-immersive-error')).toHaveCount(0);
  await leaveWithEscape(page);
  await expect(page.getByRole('combobox', { name: 'Paisagem da viagem' })).toBeEnabled();
});

test('fullscreen keeps the whole pixel composition sharp at common resolutions, different proportions and small screens', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openJourney(page);
  for (const viewport of [
    { width: 1920, height: 1080 },
    { width: 2560, height: 1440 },
    { width: 1440, height: 960 },
    { width: 320, height: 240 },
  ]) {
    await page.setViewportSize(viewport);
    await enterImmersive(page);
    await page.mouse.move(viewport.width / 2, viewport.height / 2);
    await expectIntegratedViewport(page);
    await expectPixelScale(page);
    await expect(page.locator('.immersive-exit')).toHaveCSS('opacity', '0');
    await page.screenshot({
      path: `outputs/Little-Haven-Journey-immersive-${viewport.width}x${viewport.height}.png`,
      animations: 'disabled',
    });
    await leaveWithEscape(page);
  }
});

test.describe('physical pixel scaling on a display with fractional density', () => {
  test.use({ deviceScaleFactor: 1.25, viewport: { width: 1280, height: 900 } });

  test('uses an integer physical-pixel scale rather than rounding CSS pixels', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openJourney(page);
    await enterImmersive(page);
    await expectPixelScale(page);
    await expectIntegratedViewport(page);
    await leaveWithEscape(page);
  });
});

import { test, expect } from '@playwright/test';

const RAIN_ANIMATIONS =
  '.room-rainfall, .room-rainfall-near, .room-window-drop, .room-rain-shimmer, .room-sill-splash';
const LAMP_ANIMATIONS = '.room-lamp-breathe, .room-dust';
const AMBIENT_ANIMATIONS =
  '.room-tea-steam, .room-plant-leaves, .room-sleeping-cat, .room-notebook-spark';
const ALL_ANIMATIONS = `${RAIN_ANIMATIONS}, ${LAMP_ANIMATIONS}, ${AMBIENT_ANIMATIONS}, .room-star`;

async function expectAnimationState(page, selector, state) {
  await expect(page.locator(selector).first()).toBeAttached();
  await expect
    .poll(() =>
      page.locator(selector).evaluateAll(
        (elements, expectedState) =>
          elements.length > 0 &&
          elements.every((element) => {
            const style = getComputedStyle(element);
            return (
              style.animationName !== 'none' &&
              style.animationPlayState.split(',').every((value) => value.trim() === expectedState)
            );
          }),
        state,
      ),
    )
    .toBe(true);
}

async function expectOpacity(page, selector, opacity) {
  await expect(page.locator(selector).first()).toBeAttached();
  await expect
    .poll(() =>
      page.locator(selector).evaluateAll(
        (elements, expectedOpacity) =>
          elements.length > 0 &&
          elements.every((element) => Number(getComputedStyle(element).opacity) === expectedOpacity),
        opacity,
      ),
    )
    .toBe(true);
}

async function expectStaticRoom(page) {
  await expect(page.locator('.room-scene')).toHaveClass(/is-reduced-motion/);
  await expect
    .poll(() =>
      page.locator('.room-scene').evaluate((room) => {
        const elements = [room, ...room.querySelectorAll('*')];
        return elements.every((element) =>
          [null, '::before', '::after'].every((pseudo) => {
            const style = getComputedStyle(element, pseudo);
            return (
              style.animationName.split(',').every((name) => name.trim() === 'none') &&
              style.transitionDuration.split(',').every((duration) => {
                const seconds = parseFloat(duration) / (duration.trim().endsWith('ms') ? 1000 : 1);
                // The existing global reduced-motion policy uses 0.001ms, including on the root.
                return seconds <= 0.000001;
              })
            );
          }),
        );
      }),
    )
    .toBe(true);
}

test('rain layers fade, pause and resume without stopping the rest of the room', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.room-rainfall')).toHaveCount(1);
  await expect(page.locator('.room-rainfall-near')).toHaveCount(1);
  await expect(page.locator('.room-window-drop').first()).toBeAttached();
  await expect(page.locator('.room-rain-reflection')).toHaveCount(1);
  await expect(page.locator('.room-rain-shimmer')).toHaveCount(1);
  await expect(page.locator('.room-sill-splash').first()).toBeAttached();
  await expectAnimationState(page, RAIN_ANIMATIONS, 'running');

  await page.getByRole('button', { name: 'Parar chuva', exact: true }).click();
  await expect(page.locator('.room-scene')).not.toHaveClass(/is-rain-on/);
  await expectOpacity(page, '.room-rain, .room-rain-reflection', 0);
  await expectAnimationState(page, RAIN_ANIMATIONS, 'paused');
  await expectAnimationState(page, `${LAMP_ANIMATIONS}, ${AMBIENT_ANIMATIONS}`, 'running');
  await expectOpacity(page, '.room-stars', 1);
  await expectAnimationState(page, '.room-star', 'running');

  await page.getByRole('button', { name: 'Ativar chuva', exact: true }).click();
  await expect(page.locator('.room-scene')).toHaveClass(/is-rain-on/);
  await expectOpacity(page, '.room-rain', 1);
  await expectAnimationState(page, RAIN_ANIMATIONS, 'running');
  await expectOpacity(page, '.room-stars', 0);
  await expectAnimationState(page, '.room-star', 'paused');
});

test('lamp fades and pauses its light particles while other details stay alive', async ({ page }) => {
  await page.goto('/');
  await expectAnimationState(page, LAMP_ANIMATIONS, 'running');
  await page.getByRole('button', { name: 'Apagar luminária', exact: true }).click();
  await expect(page.locator('.room-scene')).not.toHaveClass(/is-lamp-on/);
  await expectOpacity(page, '.room-lamplight', 0);
  await expectAnimationState(page, LAMP_ANIMATIONS, 'paused');
  await expectAnimationState(page, `${RAIN_ANIMATIONS}, ${AMBIENT_ANIMATIONS}`, 'running');

  await page.getByRole('button', { name: 'Acender luminária', exact: true }).click();
  await expect(page.locator('.room-scene')).toHaveClass(/is-lamp-on/);
  await expectOpacity(page, '.room-lamplight', 1);
  await expectAnimationState(page, LAMP_ANIMATIONS, 'running');
});

test('reduced motion starts static while rain and lamp controls remain usable', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expectStaticRoom(page);

  await page.getByRole('button', { name: 'Parar chuva', exact: true }).click();
  await page.getByRole('button', { name: 'Apagar luminária', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Ativar chuva', exact: true })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  await expect(page.getByRole('button', { name: 'Acender luminária', exact: true })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  await expectOpacity(page, '.room-rain, .room-rain-reflection, .room-lamplight', 0);
  await expectStaticRoom(page);

  await page.getByRole('button', { name: 'Ativar chuva', exact: true }).click();
  await page.getByRole('button', { name: 'Acender luminária', exact: true }).click();
  await expectOpacity(page, '.room-rain, .room-lamplight', 1);
  await expectStaticRoom(page);
});

test('changing reduced motion at runtime preserves the selected room atmosphere', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await expectAnimationState(page, `${RAIN_ANIMATIONS}, ${LAMP_ANIMATIONS}`, 'running');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expectStaticRoom(page);

  await page.getByRole('button', { name: 'Parar chuva', exact: true }).click();
  await page.getByRole('button', { name: 'Apagar luminária', exact: true }).click();
  await expectStaticRoom(page);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(page.locator('.room-scene')).not.toHaveClass(/is-reduced-motion/);
  await expect(page.locator('.room-scene')).not.toHaveClass(/is-rain-on|is-lamp-on/);
  await expectAnimationState(page, `${RAIN_ANIMATIONS}, ${LAMP_ANIMATIONS}`, 'paused');
  await expectAnimationState(page, `${AMBIENT_ANIMATIONS}, .room-star`, 'running');

  await page.getByRole('button', { name: 'Ativar chuva', exact: true }).click();
  await page.getByRole('button', { name: 'Acender luminária', exact: true }).click();
  await expectAnimationState(page, `${RAIN_ANIMATIONS}, ${LAMP_ANIMATIONS}`, 'running');
});

test('notebook invitation yields to its tooltip on hover and keyboard focus', async ({ page }) => {
  await page.goto('/');
  const notebook = page.getByRole('button', { name: 'Abrir caderno', exact: true });
  const spark = page.locator('.room-notebook-spark');
  const tooltip = notebook.locator('.room-object-label');

  await notebook.hover();
  await expect(spark).toHaveCSS('opacity', '0');
  await expect(tooltip).toHaveCSS('opacity', '1');
  await page.mouse.move(0, 0);
  await page.keyboard.press('Tab');
  await notebook.focus();
  await expect(notebook).toBeFocused();
  await expect(spark).toHaveCSS('opacity', '0');
  await expect(tooltip).toHaveCSS('opacity', '1');
});

test('a hidden document pauses the room and resumes according to rain and lamp choices', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Parar chuva', exact: true }).click();
  await page.getByRole('button', { name: 'Apagar luminária', exact: true }).click();
  await expectAnimationState(page, `${RAIN_ANIMATIONS}, ${LAMP_ANIMATIONS}`, 'paused');

  try {
    await page.evaluate(() => {
      window.__roomVisibilityDescriptors = {
        hidden: Object.getOwnPropertyDescriptor(document, 'hidden'),
        visibilityState: Object.getOwnPropertyDescriptor(document, 'visibilityState'),
      };
      Object.defineProperty(document, 'hidden', { configurable: true, value: true });
      Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await expect(page.locator('.room-scene')).toHaveClass(/is-paused/);
    await expectAnimationState(page, ALL_ANIMATIONS, 'paused');

    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, value: false });
      Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await expect(page.locator('.room-scene')).not.toHaveClass(/is-paused/);
    await expectAnimationState(page, `${RAIN_ANIMATIONS}, ${LAMP_ANIMATIONS}`, 'paused');
    await expectAnimationState(page, `${AMBIENT_ANIMATIONS}, .room-star`, 'running');
  } finally {
    await page.evaluate(() => {
      for (const [property, descriptor] of Object.entries(window.__roomVisibilityDescriptors || {})) {
        if (descriptor) Object.defineProperty(document, property, descriptor);
        else delete document[property];
      }
      delete window.__roomVisibilityDescriptors;
      document.dispatchEvent(new Event('visibilitychange'));
    });
  }
});

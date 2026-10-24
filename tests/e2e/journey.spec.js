import { test, expect } from '@playwright/test';

const diagnostics = new WeakMap();
const sceneryOptions = [
  ['rainy-night', 'Noite chuvosa'],
  ['forest', 'Floresta'],
  ['sunset', 'Pôr do sol'],
  ['snowy-mountains', 'Snowy Mountains'],
  ['morning-lake', 'Morning Lake'],
];

test.beforeEach(async ({ page }) => {
  const recorded = { errors: [], externalRequests: [], requests: [] };
  diagnostics.set(page, recorded);
  page.on('pageerror', (error) => recorded.errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') recorded.errors.push(message.text());
  });
  page.on('request', (request) => {
    const url = new URL(request.url());
    recorded.requests.push({ url: request.url(), body: request.postData() });
    if (['http:', 'https:', 'ws:', 'wss:'].includes(url.protocol) && url.hostname !== '127.0.0.1') {
      recorded.externalRequests.push(request.url());
    }
  });
});

test.afterEach(async ({ page }) => {
  const recorded = diagnostics.get(page);
  expect(recorded.errors, 'the journey must not produce renderer or console errors').toEqual([]);
  expect(recorded.externalRequests, 'all scenery and audio must stay local').toEqual([]);
});

async function openJourney(page) {
  await page.getByRole('button', { name: 'The Journey', exact: true }).click();
  await expect(page.locator('.journey-scene')).toBeVisible();
}

async function expectScenery(page, value, label) {
  await expect(page.locator('.journey-scene')).toHaveAttribute('data-scenery', value);
  await expect(page.getByRole('combobox', { name: 'Paisagem da viagem' })).toHaveValue(value);
  await expect(page.locator('.scene-weather')).toHaveText(label);
}

async function transforms(page) {
  return page.locator('.journey-parallax').evaluateAll((elements) =>
    elements.map((element) => getComputedStyle(element).transform),
  );
}

async function expectMotionState(page, state) {
  await expect
    .poll(() =>
      page.locator('.journey-scene').evaluate((scene, expected) => {
        let animatedStyles = 0;
        // Hidden weather layers can stay paused while the selected landscape moves.
        const elements = expected === 'running'
          ? [...scene.querySelectorAll('.journey-parallax, .journey-lamp-glow, .journey-steam')]
          : [scene, ...scene.querySelectorAll('*')];
        const valid = elements.every((element) =>
          [null, '::before', '::after'].every((pseudo) => {
            const style = getComputedStyle(element, pseudo);
            if (style.animationName.split(',').every((name) => name.trim() === 'none')) return true;
            animatedStyles += 1;
            return style.animationPlayState.split(',').every((value) => value.trim() === expected);
          }),
        );
        return valid && animatedStyles > 0;
      }, state),
    )
    .toBe(true);
}

async function expectStaticJourney(page) {
  await expect(page.locator('.journey-scene')).toHaveClass(/is-reduced-motion/);
  await expect
    .poll(() =>
      page.locator('.journey-scene').evaluate((scene) =>
        [scene, ...scene.querySelectorAll('*')].every((element) =>
          [null, '::before', '::after'].every((pseudo) => {
            const style = getComputedStyle(element, pseudo);
            return (
              style.animationName.split(',').every((name) => name.trim() === 'none') &&
              style.transitionDuration.split(',').every((duration) => {
                const seconds = parseFloat(duration) / (duration.trim().endsWith('ms') ? 1000 : 1);
                return seconds <= 0.000001;
              })
            );
          }),
        ),
      ),
    )
    .toBe(true);
  await expect(page.getByRole('button', { name: 'Movimento reduzido', exact: true })).toBeDisabled();
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
  expect(
    await control.evaluate((element) => {
      const style = getComputedStyle(element);
      return (
        element.matches(':focus-visible') &&
        style.outlineStyle !== 'none' &&
        parseFloat(style.outlineWidth) >= 2
      );
    }),
  ).toBe(true);
}

test('journey navigation preserves the writing guard and discards only after confirmation', async ({
  page,
}) => {
  await page.goto('/');
  await openJourney(page);
  await expect(page.getByRole('heading', { name: 'The Journey' })).toBeFocused();
  await expect(page.getByRole('button', { name: 'The Journey — em planejamento', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Let It Float', exact: true }).click();
  const field = page.getByRole('textbox');
  const syntheticDraft = 'SYNTHETIC_JOURNEY_DRAFT_841027';
  await expect(field).toBeFocused();
  await field.fill(syntheticDraft);

  await page.getByRole('button', { name: 'The Journey', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continuar escrevendo' })).toBeFocused();
  await expect(page.locator('.journey-scene')).toHaveCount(0);
  await page.getByRole('button', { name: 'Continuar escrevendo' }).click();
  await expect(field).toHaveValue(syntheticDraft);

  await page.getByRole('button', { name: 'The Room', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(field).toHaveValue(syntheticDraft);
  await page.getByRole('button', { name: 'The Journey', exact: true }).click();
  await page.getByRole('button', { name: 'Descartar e sair' }).click();
  await expect(page.locator('.journey-scene')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'The Journey' })).toBeFocused();
  await page.getByRole('button', { name: 'Voltar ao quarto', exact: true }).click();
  await expect(page.locator('.room-scene')).toBeVisible();
  await page.getByRole('button', { name: 'Abrir caderno', exact: true }).click();
  await expect(page.getByRole('textbox')).toBeEmpty();

  const storage = await page.evaluate(() =>
    JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } }),
  );
  expect(storage).not.toContain(syntheticDraft);
  expect(JSON.stringify(diagnostics.get(page).requests)).not.toContain(syntheticDraft);
  expect(await page.locator('body').innerText()).not.toContain(syntheticDraft);
});

test('five sceneries have independent rain and keep their choices only for this session', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Parar chuva', exact: true }).click();
  await openJourney(page);
  const scene = page.locator('.journey-scene');
  const selection = page.getByRole('combobox', { name: 'Paisagem da viagem' });
  await expect(selection.locator('option')).toHaveText(sceneryOptions.map(([, label]) => label));
  await expectScenery(page, 'rainy-night', 'Noite chuvosa');
  await expect(scene).toHaveClass(/is-rain-on/);
  await expect(page.locator('.journey-lamp-glow').first()).toBeAttached();
  await expect(page.locator('.journey-steam').first()).toBeAttached();

  await page.getByRole('button', { name: 'Parar chuva', exact: true }).click();
  await expect(scene).not.toHaveClass(/is-rain-on/);
  await expect(page.getByRole('button', { name: 'Ativar chuva', exact: true })).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('.scene-weather')).toHaveText('Noite tranquila');
  for (const [value, label] of sceneryOptions.slice(1)) {
    await selection.selectOption(value);
    await expectScenery(page, value, label);
    await expect(page.getByRole('button', { name: /^(Parar|Ativar) chuva$/ })).toHaveCount(0);
  }
  await selection.selectOption('rainy-night');
  await expectScenery(page, 'rainy-night', 'Noite tranquila');
  await expect(scene).not.toHaveClass(/is-rain-on/);

  await page.getByRole('button', { name: 'Voltar ao quarto', exact: true }).click();
  await expect(page.locator('.room-scene')).not.toHaveClass(/is-rain-on/);
  await page.getByRole('button', { name: 'Ativar chuva', exact: true }).click();
  await openJourney(page);
  await expect(scene).not.toHaveClass(/is-rain-on/);
  await selection.selectOption('forest');
  await page.getByRole('button', { name: 'Pausar movimento', exact: true }).click();
  await page.getByRole('button', { name: 'Let It Float', exact: true }).click();
  await expect(page.getByRole('textbox')).toBeEmpty();
  await openJourney(page);
  await expectScenery(page, 'forest', 'Floresta');
  await expect(page.getByRole('button', { name: 'Retomar movimento', exact: true })).toHaveAttribute('aria-pressed', 'true');

  await page.reload();
  await expect(page.locator('.room-scene')).toHaveClass(/is-rain-on/);
  await openJourney(page);
  await expectScenery(page, 'rainy-night', 'Noite chuvosa');
  await expect(scene).toHaveClass(/is-rain-on/);
  await expect(page.getByRole('button', { name: 'Pausar movimento', exact: true })).toHaveAttribute('aria-pressed', 'false');
});

test('the landscape actually moves, every layer freezes on pause and motion resumes', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await openJourney(page);
  await expect(page.locator('.journey-parallax').first()).toBeAttached();
  await expect(page.locator('.journey-rainfall').first()).toBeAttached();
  await expectMotionState(page, 'running');
  const moving = await transforms(page);
  expect(moving.length).toBeGreaterThan(1);
  await expect.poll(() => transforms(page)).not.toEqual(moving);

  await page.getByRole('button', { name: 'Pausar movimento', exact: true }).click();
  await expect(page.locator('.journey-scene')).toHaveClass(/is-paused/);
  await expect(page.getByRole('button', { name: 'Retomar movimento', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expectMotionState(page, 'paused');
  const paused = await transforms(page);
  await page.waitForTimeout(350);
  expect(await transforms(page)).toEqual(paused);

  await page.getByRole('combobox', { name: 'Paisagem da viagem' }).selectOption('forest');
  await expectMotionState(page, 'paused');
  const pausedForest = await transforms(page);
  await page.waitForTimeout(350);
  expect(await transforms(page)).toEqual(pausedForest);
  await page.getByRole('button', { name: 'Retomar movimento', exact: true }).click();
  await expect(page.locator('.journey-scene')).not.toHaveClass(/is-paused/);
  await expectMotionState(page, 'running');
  await expect.poll(() => transforms(page)).not.toEqual(pausedForest);
});

test('reduced motion starts all five landscapes static while the scenery and rain remain usable', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await openJourney(page);
  await expectStaticJourney(page);
  await page.getByRole('button', { name: 'Parar chuva', exact: true }).click();
  await expect(page.locator('.journey-scene')).not.toHaveClass(/is-rain-on/);
  await expectStaticJourney(page);
  for (const [value, label] of sceneryOptions.slice(1)) {
    await page.getByRole('combobox', { name: 'Paisagem da viagem' }).selectOption(value);
    await expectScenery(page, value, label);
    await expectStaticJourney(page);
  }
  await page.getByRole('combobox', { name: 'Paisagem da viagem' }).selectOption('rainy-night');
  await page.getByRole('button', { name: 'Ativar chuva', exact: true }).click();
  await expect(page.locator('.journey-scene')).toHaveClass(/is-rain-on/);
  await expectStaticJourney(page);
});

test('changing reduced motion at runtime keeps scenery, rain and the explicit pause choice', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await openJourney(page);
  await expectMotionState(page, 'running');
  await page.getByRole('button', { name: 'Parar chuva', exact: true }).click();
  await page.getByRole('combobox', { name: 'Paisagem da viagem' }).selectOption('sunset');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expectStaticJourney(page);
  await expectScenery(page, 'sunset', 'Pôr do sol');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(page.locator('.journey-scene')).not.toHaveClass(/is-reduced-motion/);
  await expectMotionState(page, 'running');

  await page.getByRole('button', { name: 'Pausar movimento', exact: true }).click();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expectStaticJourney(page);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(page.getByRole('button', { name: 'Retomar movimento', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expectMotionState(page, 'paused');
  await page.getByRole('combobox', { name: 'Paisagem da viagem' }).selectOption('rainy-night');
  await expectScenery(page, 'rainy-night', 'Noite tranquila');
  await expect(page.locator('.journey-scene')).not.toHaveClass(/is-rain-on/);
  await expectMotionState(page, 'paused');
});

test('active local rain audio follows the selected world without starting itself', async ({ page }) => {
  await page.addInitScript(() => {
    const NativeAudioContext = window.AudioContext ?? window.webkitAudioContext;
    const probe = { contexts: 0, gains: [] };
    window.__journeyAudioProbe = probe;
    window.AudioContext = class extends NativeAudioContext {
      constructor(...args) {
        super(...args);
        probe.contexts += 1;
      }

      createGain() {
        const node = super.createGain();
        const targets = [];
        const setTarget = node.gain.setTargetAtTime.bind(node.gain);
        node.gain.setTargetAtTime = (value, ...args) => {
          targets.push(value);
          return setTarget(value, ...args);
        };
        probe.gains.push(targets);
        return node;
      }
    };
  });
  const expectRainGain = async (value) => {
    // AmbientAudio creates its rain-layer gain before the master gain.
    await expect.poll(() => page.evaluate(() => window.__journeyAudioProbe.gains[0]?.at(-1))).toBe(value);
    await expect(page.getByRole('button', { name: 'Desativar áudio', exact: true })).toHaveAttribute('aria-pressed', 'true');
  };

  await page.goto('/');
  await openJourney(page);
  await page.getByRole('combobox', { name: 'Paisagem da viagem' }).selectOption('forest');
  expect(await page.evaluate(() => window.__journeyAudioProbe.contexts)).toBe(0);
  await page.getByRole('button', { name: 'Ativar áudio', exact: true }).click();
  await expectRainGain(0);
  await page.getByRole('combobox', { name: 'Paisagem da viagem' }).selectOption('sunset');
  await expectRainGain(0);
  await page.getByRole('combobox', { name: 'Paisagem da viagem' }).selectOption('rainy-night');
  await expectRainGain(1);
  await page.getByRole('button', { name: 'Parar chuva', exact: true }).click();
  await expectRainGain(0);
  await page.getByRole('button', { name: 'The Room', exact: true }).click();
  await expectRainGain(1);
  await page.getByRole('button', { name: 'Let It Float', exact: true }).click();
  await expectRainGain(1);
  await page.getByRole('button', { name: 'The Garden — em planejamento', exact: true }).click();
  await expectRainGain(0);
  await openJourney(page);
  await expectRainGain(0);
  await page.getByRole('button', { name: 'Ativar chuva', exact: true }).click();
  await expectRainGain(1);

  await page.reload();
  expect(await page.evaluate(() => window.__journeyAudioProbe.contexts)).toBe(0);
  await expect(page.getByRole('button', { name: 'Ativar áudio', exact: true })).toHaveAttribute('aria-pressed', 'false');
});

test('keyboard controls have visible focus, small layouts fit and each scenery has a capture', async ({
  page,
}) => {
  await page.goto('/');
  const journeyTab = page.getByRole('button', { name: 'The Journey', exact: true });
  await tabTo(page, journeyTab);
  await expectVisibleFocus(journeyTab);
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'The Journey' })).toBeFocused();
  const selection = page.getByRole('combobox', { name: 'Paisagem da viagem' });
  await tabTo(page, selection);
  await expectVisibleFocus(selection);
  await page.keyboard.press('End');
  await expectScenery(page, 'morning-lake', 'Morning Lake');
  await page.keyboard.press('Enter');
  const pause = page.getByRole('button', { name: 'Pausar movimento', exact: true });
  await tabTo(page, pause);
  await expectVisibleFocus(pause);
  await page.keyboard.press('Space');
  await expect(page.getByRole('button', { name: 'Retomar movimento', exact: true })).toHaveAttribute('aria-pressed', 'true');
  const back = page.getByRole('button', { name: 'Voltar ao quarto', exact: true });
  await tabTo(page, back);
  await expectVisibleFocus(back);
  await page.keyboard.press('Enter');
  await expect(page.locator('.room-scene')).toBeVisible();
  await openJourney(page);

  for (const [value, label] of sceneryOptions) {
    await selection.selectOption(value);
    await expectScenery(page, value, label);
    await page.getByRole('heading', { name: 'The Journey' }).focus();
    await page.mouse.move(0, 0);
    await page.screenshot({
      path: `outputs/Little-Haven-Journey-${value}.png`,
      fullPage: true,
      animations: 'disabled',
    });
  }
  for (const viewport of [
    { width: 800, height: 650 },
    { width: 390, height: 844 },
    { width: 360, height: 780 },
  ]) {
    await page.setViewportSize(viewport);
    await expect(selection).toBeVisible();
    await expect(page.getByRole('button', { name: 'Retomar movimento', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Voltar ao quarto', exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const sceneBounds = await page.locator('.journey-scene').boundingBox();
    expect(sceneBounds.x).toBeGreaterThanOrEqual(0);
    expect(sceneBounds.x + sceneBounds.width).toBeLessThanOrEqual(viewport.width);
    if (viewport.width === 360) {
      await page.mouse.move(0, 0);
      await page.screenshot({
        path: 'outputs/Little-Haven-Journey-mobile.png',
        fullPage: true,
        animations: 'disabled',
      });
    }
  }
});

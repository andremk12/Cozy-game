import { test, expect } from '@playwright/test';

const slot = (page, id) => page.locator(`[data-slot-id="${id}"]`).first();
async function open(page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'The Garden', exact: true }).click();
  await expect(page.locator('svg.garden-art')).toBeVisible();
}

test('Garden immersive preserves scene and uses contextual Escape before leaving', async ({ page }) => {
  await open(page);
  await slot(page, 'bed-1').click();
  await page.getByRole('button', { name: 'Hibisco rosa', exact: true }).click();
  await page.evaluate(() => { window.__gardenArt = document.querySelector('svg.garden-art'); });
  await page.getByRole('button', { name: 'Modo Imersivo', exact: true }).click();
  await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBe(true);
  await slot(page, 'bed-1').press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(await page.evaluate(() => Boolean(document.fullscreenElement))).toBe(true);
  await expect(slot(page, 'bed-1')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect.poll(() => page.evaluate(() => document.fullscreenElement)).toBe(null);
  await expect(page.getByRole('button', { name: 'Modo Imersivo', exact: true })).toBeFocused();
  expect(await page.evaluate(() => window.__gardenArt === document.querySelector('svg.garden-art'))).toBe(true);
  await page.locator('.garden-controls').getByRole('button', { name: 'Mover', exact: true }).click();
  await page.getByRole('button', { name: 'Modo Imersivo', exact: true }).click();
  await slot(page, 'pot-1').press('Enter');
  await page.keyboard.press('Escape');
  await expect(page.locator('.garden-scene')).toHaveAttribute('data-tool', 'observe');
  expect(await page.evaluate(() => Boolean(document.fullscreenElement))).toBe(true);
  await page.keyboard.press('Escape');
});

test('reduced motion keeps the garden usable and composition fits different screens', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page);
  for (const atmosphere of ['day', 'sunset', 'night']) {
    await page.getByRole('button', { name: 'Luz e clima', exact: true }).click();
    await page.getByRole('combobox', { name: 'Período do dia' }).selectOption(atmosphere);
    await page.getByRole('combobox', { name: 'Clima do jardim' }).selectOption('rain');
    await page.keyboard.press('Escape');
    await page.screenshot({ path: `outputs/Little-Haven-Garden-${atmosphere}.png`, fullPage: true, animations: 'disabled' });
  }
  for (const viewport of [{ width: 800, height: 650 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await slot(page, 'bed-2').press('Enter');
    await expect(page.getByRole('dialog')).toBeInViewport();
    await page.getByRole('button', { name: 'Fechar', exact: true }).click();
    await page.screenshot({ path: `outputs/Little-Haven-Garden-${viewport.width}.png`, fullPage: true, animations: 'disabled' });
  }
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.getByRole('button', { name: 'Modo Imersivo', exact: true }).click();
  const art = page.locator('svg.garden-art');
  await expect.poll(() => art.evaluate((element) => Math.round(element.getBoundingClientRect().width))).toBe(1920);
  expect(await art.evaluate((element) => [element, ...element.querySelectorAll('*')].every((node) => getComputedStyle(node).animationName.split(',').every((name) => name.trim() === 'none')))).toBe(true);
  await page.screenshot({ path: 'outputs/Little-Haven-Garden-immersive.png', animations: 'disabled' });
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Sair do Modo Imersivo', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await page.setViewportSize({ width: 320, height: 240 });
  await page.locator('.garden-controls').getByRole('button', { name: 'Mover', exact: true }).click();
  await page.getByRole('button', { name: 'Modo Imersivo', exact: true }).click();
  await slot(page, 'pot-1').press('Enter');
  const cancel = page.locator('.garden-active-tool').getByRole('button', { name: 'Cancelar ação', exact: true });
  await expect(cancel).toBeInViewport();
  await cancel.click();
  await expect(page.getByRole('button', { name: 'Ferramentas do jardim', exact: true })).toBeFocused();
  await expect(page.locator('.garden-scene')).toHaveAttribute('data-tool', 'observe');
  await page.keyboard.press('Escape');
});

for (const density of [1.25, 2]) {
test.describe(`physical pixel density ${density}`, () => {
  test.use({ deviceScaleFactor: density });
  test('whole composition aligns to physical pixels', async ({ page }) => {
    await open(page);
    await page.getByRole('button', { name: 'Modo Imersivo', exact: true }).click();
    await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBe(true);
    const geometry = await page.locator('.immersive-art').evaluate((element) => {
      const { x, y, width, height } = element.getBoundingClientRect();
      const scale = Math.floor(Math.min(innerWidth * devicePixelRatio / 480, innerHeight * devicePixelRatio / 270));
      return { x: x * devicePixelRatio, y: y * devicePixelRatio, width, height, expected: 480 * scale / devicePixelRatio };
    });
    expect(geometry.width).toBeCloseTo(geometry.expected, 1);
    expect(geometry.width / geometry.height).toBeCloseTo(16 / 9, 3);
    expect(Math.abs(geometry.x - Math.round(geometry.x))).toBeLessThan(0.05);
    expect(Math.abs(geometry.y - Math.round(geometry.y))).toBeLessThan(0.05);
  });
});
}

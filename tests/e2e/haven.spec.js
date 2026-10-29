import { test, expect } from '@playwright/test';

test('room objects react and preferences survive reload without autoplay', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'Apagar luminária', exact: true }).click();
  await expect(page.locator('.room-night-shade')).toHaveAttribute('opacity', '0.19');
  await page.getByRole('button', { name: 'Parar chuva', exact: true }).click();
  await expect(page.locator('.room-rain')).not.toHaveClass(/is-visible/);
  await page.getByRole('slider', { name: 'Volume' }).fill('0.14');
  await page.reload();
  await expect(page.getByRole('button', { name: 'Acender luminária', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ativar chuva', exact: true })).toBeVisible();
  await expect(page.getByRole('slider', { name: 'Volume' })).toHaveValue('0.14');
  await expect(page.getByRole('button', { name: 'Ativar áudio', exact: true })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  expect(errors).toEqual([]);
});

test('draft is protected from accidental navigation and cancel then discard works', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Abrir caderno', exact: true }).click();
  const field = page.getByRole('textbox');
  await field.fill('Um texto privado para verificar o fluxo.');
  await page.getByRole('button', { name: 'The Room', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continuar escrevendo' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(field).toHaveValue('Um texto privado para verificar o fluxo.');
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await page.getByRole('button', { name: 'Descartar e sair' }).click();
  await page.getByRole('button', { name: 'Abrir caderno', exact: true }).click();
  await expect(page.getByRole('textbox')).toBeEmpty();
});

test('paper folds into a boat, sails and completes without persisting or sending the text', async ({
  page,
}) => {
  const requests = [];
  const errors = [];
  page.on('request', (r) => requests.push({ url: r.url(), body: r.postData() }));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Abrir caderno', exact: true }).click();
  const secret = 'PRIVATE_HAVEN_FLOW_328971';
  await page.getByRole('textbox').fill(secret);
  await page.getByRole('button', { name: 'Let it float', exact: true }).click();
  await expect(page.locator('.folding-paper')).toBeVisible();
  await expect(page.getByRole('textbox')).toHaveCount(0);
  await expect(page.locator('.sailing-boat')).toBeVisible({ timeout: 5000 });
  await expect(page.getByText('O rio segue. Você pode ficar.')).toBeVisible({ timeout: 20000 });
  expect(await page.locator('body').innerText()).not.toContain(secret);
  const storage = await page.evaluate(() =>
    JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } }),
  );
  expect(storage).not.toContain(secret);
  expect(
    requests.some((request) => request.url.includes(secret) || request.body?.includes(secret)),
  ).toBe(false);
  expect(requests.every((request) => new URL(request.url).hostname === '127.0.0.1')).toBe(true);
  expect(errors).toEqual([]);
  await page.getByRole('button', { name: 'Voltar ao quarto', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Abrir caderno', exact: true })).toBeVisible();
});

test('reduced motion offers an immediate static completion and Garden stays usable', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('.room-rainfall')).toHaveCSS('animation-name', 'none');
  await page.getByRole('button', { name: 'Let It Float', exact: true }).click();
  await page.getByRole('textbox').fill('Deixar ir sem movimento');
  await page.getByRole('button', { name: 'Let it float', exact: true }).click();
  await expect(page.getByText('O rio segue. Você pode ficar.')).toBeVisible();
  await expect(page.locator('.sailing-boat')).toHaveCount(0);
  await page.getByRole('button', { name: 'The Garden', exact: true }).click();
  await expect(page.locator('svg.garden-art')).toBeVisible();
  await page.getByRole('button', { name: 'The Journey', exact: true }).click();
  await expect(page.locator('.journey-scene')).toBeVisible();
  await expect(page.locator('.journey-scene')).toHaveClass(/is-reduced-motion/);
  await expect(page.getByRole('combobox', { name: 'Paisagem da viagem' })).toBeVisible();
});

test('audio starts only on interaction and requires a fresh gesture after reload', async ({
  page,
}) => {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'Ativar áudio', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Desativar áudio', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.reload();
  await expect(page.getByRole('button', { name: 'Ativar áudio', exact: true })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  await expect(page.getByText('Retomar som', { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('keyboard navigation, responsive layout and visual deliverable', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Abrir caderno', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('textbox')).toBeFocused();
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await page.getByRole('heading', { name: 'The Room' }).focus();
  await page.mouse.move(0, 0);
  await page.screenshot({
    path: 'outputs/Little-Haven-Room.png',
    fullPage: true,
    animations: 'disabled',
  });
  await page.getByRole('button', { name: 'Abrir caderno', exact: true }).click();
  await page.mouse.move(0, 0);
  await page.screenshot({
    path: 'outputs/Little-Haven-Let-It-Float.png',
    fullPage: true,
    animations: 'disabled',
  });
  for (const viewport of [
    { width: 800, height: 650 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await expect(page.getByRole('slider', { name: 'Volume' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
});

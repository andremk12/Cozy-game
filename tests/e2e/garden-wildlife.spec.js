import { test, expect } from '@playwright/test';

async function open(page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'The Garden', exact: true }).click();
  await expect(page.locator('svg.garden-art')).toBeVisible();
}

test('orange cat peeks from foliage and responds without losing its keyboard target', async ({ page }) => {
  await page.clock.install();
  await open(page);
  const cat = page.getByRole('button', { name: 'Gato laranja entre as plantas', exact: true });
  await expect(cat).toHaveAttribute('data-cat-visible', 'false');
  await cat.focus();
  await page.keyboard.press('Enter');
  await expect(cat).toHaveAttribute('data-cat-visible', 'true');
  await expect(page.getByRole('status')).toHaveText('O gato laranja espia entre as folhas.');
  await expect(cat).toBeFocused();
  await page.clock.fastForward(5300);
  await expect(cat).toHaveAttribute('data-cat-visible', 'false');
  await expect(cat).toBeFocused();
  await page.keyboard.press('Space');
  await expect(cat).toHaveAttribute('data-cat-visible', 'true');
  expect(await page.locator('.garden-cat-object')).toHaveCount(1);
});

test('pond, butterflies and night fireflies react; reduced-motion cat uses immediate poses', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page);
  await expect(page.getByRole('button', { name: /^Borboleta [12]$/ })).toHaveCount(2);
  await page.getByRole('button', { name: 'Borboleta 1', exact: true }).press('Enter');
  await expect(page.locator('.garden-butterfly.is-reacting')).toHaveCount(1);
  await page.getByRole('button', { name: 'Lago dos peixinhos', exact: true }).press('Space');
  await expect(page.locator('.garden-fish-group')).toHaveClass(/is-feeding/);
  const cat = page.getByRole('button', { name: 'Gato laranja entre as plantas', exact: true });
  await cat.press('Enter');
  await expect(cat).toHaveAttribute('data-cat-visible', 'true');
  await cat.press('Enter');
  await expect(cat).toHaveAttribute('data-cat-visible', 'false');
  await page.getByRole('button', { name: 'Luz e clima', exact: true }).click();
  await page.getByRole('combobox', { name: 'Período do dia' }).selectOption('night');
  await page.getByRole('button', { name: 'Fechar', exact: true }).click();
  await expect(page.getByRole('button', { name: /^Borboleta [12]$/ })).toHaveCount(0);
  await page.getByRole('button', { name: 'Vagalumes do jardim', exact: true }).press('Enter');
  await expect(page.locator('.garden-fireflies')).toHaveClass(/is-reacting/);
  await expect(page.locator('[class^="garden-firefly garden-firefly--"]')).toHaveCount(6);
  expect(await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('haven.garden.v1'))))).not.toContain('cat');
});

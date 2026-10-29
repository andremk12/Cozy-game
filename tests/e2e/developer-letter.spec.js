import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { DEVELOPER_CONTACTS, getDeveloperContactUrl } from '../../shared/developer.js';
import { installAudioProbe, audioSnapshot } from './helpers/audio.js';

const star = (page) => page.getByRole('button', { name: 'Uma pequena surpresa', exact: true });
const letter = (page) => page.getByRole('dialog', { name: 'Um pequeno recado de quem criou este cantinho 💌', exact: true });

test('one click or keyboard opens the letter, traps focus and returns to the same draft and scene', async ({ page }) => {
  const errors = [];
  const external = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => { if (new URL(request.url()).hostname !== '127.0.0.1') external.push(request.url()); });
  await installAudioProbe(page);
  await page.goto('/');
  await star(page).focus();
  await page.keyboard.press('Enter');
  await expect(letter(page)).toBeVisible();
  await expect(letter(page).getByRole('button', { name: 'Fechar carta' })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(letter(page).getByRole('link', { name: /LinkedIn/ })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(letter(page).getByRole('button', { name: 'Fechar carta' })).toBeFocused();
  expect((await audioSnapshot(page)).contexts).toBe(0);
  await expect(letter(page).getByText('Oi! Eu sou o André.', { exact: true })).toBeVisible();
  await expect(letter(page).getByRole('link', { name: 'E-mail', exact: true })).toHaveAttribute('href', getDeveloperContactUrl('email'));
  await expect(letter(page).getByRole('link', { name: /LinkedIn/ })).toHaveAttribute('href', getDeveloperContactUrl('linkedin'));
  await page.keyboard.press('Escape');
  await expect(letter(page)).toHaveCount(0);
  await expect(star(page)).toBeFocused();

  await page.getByRole('button', { name: 'Apagar luminária', exact: true }).click();
  await page.getByRole('button', { name: 'Abrir caderno', exact: true }).click();
  const synthetic = 'SYNTHETIC_LETTER_DRAFT_27391';
  await page.getByRole('textbox').fill(synthetic);
  await star(page).click();
  await expect(letter(page)).toBeVisible();
  await letter(page).getByRole('button', { name: 'Fechar carta' }).click();
  await expect(page.getByRole('textbox')).toHaveValue(synthetic);
  await page.getByRole('button', { name: 'The Room', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Sair da escrita?' })).toBeVisible();
  await page.getByRole('button', { name: 'Continuar escrevendo', exact: true }).click();
  await expect(page.getByRole('textbox')).toHaveValue(synthetic);
  expect(await page.evaluate(() => JSON.stringify({ ...localStorage }))).not.toContain(synthetic);
  expect(await page.evaluate(() => JSON.stringify({ ...sessionStorage }))).not.toContain(synthetic);
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
});

test('letter keeps the audio context, journey choices and immersive mode working', async ({ page }) => {
  await installAudioProbe(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Ativar áudio', exact: true }).click();
  await expect.poll(async () => (await audioSnapshot(page)).states).toEqual(['running']);
  await page.getByRole('button', { name: 'The Journey', exact: true }).click();
  await page.getByRole('combobox', { name: 'Paisagem da viagem', exact: true }).selectOption('morning-lake');
  const scene = await page.locator('.journey-art').elementHandle();
  await star(page).click();
  await expect(letter(page)).toBeVisible();
  expect((await audioSnapshot(page)).states).toEqual(['running']);
  await page.keyboard.press('Escape');
  expect(await scene.evaluate((element) => element.isConnected)).toBe(true);
  await expect(page.getByRole('combobox', { name: 'Paisagem da viagem', exact: true })).toHaveValue('morning-lake');
  await page.getByRole('button', { name: 'Modo Imersivo', exact: true }).click();
  await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBe(true);
  // Fullscreen paints only its subtree; outside elements retain layout boxes.
  await expect.poll(() => page.locator('.brand-surprise').evaluate((element) =>
    !document.fullscreenElement.contains(element) && Boolean(element.closest('[inert]')))).toBe(true);
  await page.keyboard.press('Escape');
  await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBe(false);
  await expect(star(page)).toBeVisible();
  expect((await audioSnapshot(page)).states).toEqual(['running']);
});

test('desktop contact identifiers are explicit, with recoverable email and clipboard failures', async ({ page }) => {
  await page.addInitScript(() => {
    window.__contactCalls = [];
    window.haven = { openDeveloperContact: async (id) => { window.__contactCalls.push(id); return false; } };
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: async () => { throw new Error('Synthetic denied clipboard'); } } });
  });
  await page.goto('/');
  await star(page).click();
  expect(await page.evaluate(() => window.__contactCalls)).toEqual([]);
  await letter(page).getByRole('link', { name: 'E-mail', exact: true }).click();
  await expect(letter(page).getByRole('status')).toContainText('Não foi possível abrir o aplicativo de e-mail');
  await expect(letter(page).getByText(DEVELOPER_CONTACTS.email, { exact: true })).toBeVisible();
  await letter(page).getByRole('button', { name: 'Copiar e-mail', exact: true }).click();
  await expect(letter(page).getByRole('status')).toContainText('copiá-lo manualmente');
  await letter(page).getByRole('link', { name: /LinkedIn/ }).click();
  await expect(letter(page).getByRole('status')).toContainText('Não foi possível abrir o navegador');
  expect(await page.evaluate(() => window.__contactCalls)).toEqual(['email', 'linkedin']);
  expect(page.url()).toMatch(/127\.0\.0\.1:4173/);
});

test('paper stays readable in small windows and reduced motion removes its opening animation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await mkdir('outputs', { recursive: true });
  for (const viewport of [{ width: 1440, height: 960 }, { width: 760, height: 600 }, { width: 360, height: 640 }]) {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await star(page).click();
    await expect(letter(page)).toBeVisible();
    expect(await letter(page).evaluate((element) => getComputedStyle(element).animationName)).toBe('none');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const rect = await letter(page).boundingBox();
    expect(rect.x).toBeGreaterThanOrEqual(0);
    expect(rect.y).toBeGreaterThanOrEqual(0);
    expect(rect.width).toBeLessThanOrEqual(viewport.width);
    expect(rect.height).toBeLessThanOrEqual(viewport.height);
    await page.screenshot({ path: `outputs/Little-Haven-letter-${viewport.width}.png` });
    await letter(page).getByRole('link', { name: /LinkedIn/ }).focus();
    await expect(letter(page).getByRole('link', { name: /LinkedIn/ })).toBeInViewport();
    await page.screenshot({ path: `outputs/Little-Haven-letter-footer-${viewport.width}.png` });
    await page.keyboard.press('Escape');
  }
});

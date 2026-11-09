import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { createGarden, GROWTH_THRESHOLDS, PLANT_SLOTS } from '../../shared/garden.js';
import { DEFAULT_COMPANION } from '../../shared/companion.js';
import { DEFAULT_SUBJECT, MAX_STEMS } from '../../shared/bouquets.js';

const draftKey = 'little-haven-bouquet-v1';
const recipient = 'bouquet-synthetic@example.test';
const diagnostics = new WeakMap();
const workshop = (page) => page.locator('.bouquet-workshop');
const preview = (page) => page.locator('.bouquet-preview > svg.bouquet-canvas');
const stems = (page) => preview(page).locator('[data-bouquet-stem]');
const button = (page, name) => page.getByRole('button', { name, exact: true });
const textbox = (page, name) => page.getByRole('textbox', { name, exact: true });

test.beforeEach(async ({ page }) => {
  const errors = [];
  diagnostics.set(page, errors);
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (['http:', 'https:', 'ws:', 'wss:'].includes(url.protocol) && url.hostname !== '127.0.0.1') errors.push(`External request: ${url.origin}`);
  });
});
test.afterEach(async ({ page }) => expect(diagnostics.get(page)).toEqual([]));

async function seed(page, species = ['daisy', 'rose-red', 'sunflower', 'lavender'], companionEnabled = true) {
  const garden = createGarden();
  garden.plants = species.map((id, index) => ({ slotId: PLANT_SLOTS[index].id, species: id,
    elapsedMs: GROWTH_THRESHOLDS.at(-1), updatedAt: Date.now(), wateredStages: [] }));
  await page.addInitScript(({ document, companion }) => {
    if (!localStorage.getItem('haven.garden.v1')) localStorage.setItem('haven.garden.v1', JSON.stringify(document));
    if (!localStorage.getItem('haven.preferences.v1')) localStorage.setItem('haven.preferences.v1', JSON.stringify({ companion }));
  }, { document: garden, companion: { ...DEFAULT_COMPANION, enabled: companionEnabled, introduced: true, name: 'Flor Synthetic' } });
  return garden;
}

async function openGarden(page) {
  await page.goto('/');
  await button(page, 'The Garden').click();
  await expect(page.locator('svg.garden-art')).toBeVisible();
}
async function openWorkshop(page) {
  await openGarden(page);
  await button(page, 'Abrir Little Bouquets').press('Enter');
  await expect(workshop(page)).toBeVisible();
}
async function add(page, label = 'Margarida') {
  await button(page, `Adicionar ${label}`).click();
}
async function letter(page) {
  await add(page);
  await button(page, 'Escrever a carta').click();
  await expect(textbox(page, 'Assunto do e-mail')).toBeVisible();
}
async function savedDraft(page) {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key)), draftKey);
}
async function storedGarden(page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem('haven.garden.v1')));
}
async function assertNoHorizontalOverflow(page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
}
async function download(page, name, fileName) {
  const pending = page.waitForEvent('download');
  await button(page, name).click();
  const item = await pending;
  expect(await item.failure()).toBeNull();
  await item.saveAs(`outputs/${fileName}`);
  return { bytes: await readFile(await item.path()), name: item.suggestedFilename() };
}

test('an empty garden opens a keyboard accessible workshop and lets the visitor return without planting obligations', async ({ page }) => {
  await seed(page, []);
  await openWorkshop(page);
  await expect(page.getByRole('heading', { name: 'Little Bouquets', exact: true })).toBeVisible();
  await expect(button(page, 'Escrever a carta')).toBeDisabled();
  await expect(workshop(page).getByRole('button', { name: /^Adicionar / })).toHaveCount(0);
  await button(page, 'Voltar ao jardim').press('Enter');
  await expect(page.locator('svg.garden-art')).toBeVisible();
  await expect(button(page, 'Abrir Little Bouquets')).toBeFocused();
  expect((await storedGarden(page)).plants).toEqual([]);
  expect(await savedDraft(page)).toBeNull();
});

test('grown flowers form a visual arrangement, can move or be removed, and never consume the garden', async ({ page }) => {
  const garden = await seed(page);
  await openWorkshop(page);
  await add(page, 'Margarida');
  await add(page, 'Rosa vermelha');
  await add(page, 'Girassol');
  await expect(stems(page)).toHaveCount(3);
  const flowerOrder = () => stems(page).evaluateAll((nodes) => nodes.map((node) => node.dataset.bouquetStem));
  expect(await flowerOrder()).toEqual(['daisy', 'rose-red', 'sunflower']);
  await button(page, 'Mover flor 2 para a esquerda').press('Enter');
  expect(await flowerOrder()).toEqual(['rose-red', 'daisy', 'sunflower']);
  expect(await workshop(page).locator('.bouquet-stem-list').evaluate((list) => list.contains(document.activeElement))).toBe(true);
  await button(page, 'Remover flor 2: Margarida').click();
  expect(await flowerOrder()).toEqual(['rose-red', 'sunflower']);
  expect(await workshop(page).locator('.bouquet-stem-list').evaluate((list) => list.contains(document.activeElement))).toBe(true);
  await page.getByRole('combobox', { name: 'Papel do embrulho', exact: true }).selectOption('lilac');
  await page.getByRole('combobox', { name: 'Cor do laço', exact: true }).selectOption('blue');
  await page.getByLabel('Etiqueta com coração', { exact: true }).check();
  await page.getByLabel('Folhas decorativas', { exact: true }).uncheck();
  await button(page, 'Reorganizar flores').click();
  expect(await flowerOrder()).not.toEqual(['rose-red', 'sunflower']);
  for (let index = 2; index < MAX_STEMS; index++) await add(page, 'Lavanda');
  await expect(stems(page)).toHaveCount(MAX_STEMS);
  await expect(button(page, 'Adicionar Margarida')).toBeDisabled();
  await expect(preview(page).locator('.bouquet-paper-front path').first()).toHaveAttribute('fill', '#c7b4d8');
  await expect(preview(page).locator('.bouquet-ribbon')).toHaveAttribute('fill', '#94bbcb');
  expect((await storedGarden(page)).plants).toEqual(garden.plants);
  await page.screenshot({ path: 'outputs/Little-Haven-Bouquets-workshop.png', fullPage: true, animations: 'disabled' });
});

test('a newly cultivated species becomes available at adulthood and remains reusable', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-07T12:00:00Z') });
  await seed(page, []);
  await openGarden(page);
  await page.locator('[data-slot-id="bed-1"]').first().click();
  await page.getByRole('dialog').getByRole('button', { name: 'Tulipa', exact: true }).click();
  await expect(page.locator('[data-slot-id="bed-1"]').first()).toHaveAttribute('data-stage', '0');
  await button(page, 'Abrir Little Bouquets').click();
  await expect(button(page, 'Adicionar Tulipa')).toHaveCount(0);
  await button(page, 'Voltar ao jardim').click();
  await page.clock.fastForward(GROWTH_THRESHOLDS.at(-1) + 1);
  await expect(page.locator('[data-slot-id="bed-1"]').first()).toHaveAttribute('data-stage', '3');
  const before = await storedGarden(page);
  await button(page, 'Abrir Little Bouquets').click();
  await add(page, 'Tulipa');
  await add(page, 'Tulipa');
  await expect(stems(page)).toHaveCount(2);
  expect(await storedGarden(page)).toEqual(before);
  await button(page, 'Voltar ao jardim').click();
  await expect(page.locator('[data-slot-id="bed-1"]').first()).toHaveAttribute('data-stage', '3');
});

test('new flower silhouettes stay distinct in the garden and the workshop', async ({ page }) => {
  const species = ['rose-red', 'rose-pink', 'tulip', 'hydrangea', 'peony', 'dahlia', 'wildflower', 'cosmos'];
  await seed(page, species, false);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openGarden(page);
  for (const id of species) await expect(page.locator(`svg.garden-art .garden-plant[data-species="${id}"]`)).toHaveAttribute('data-stage', '3');
  await page.screenshot({ path: 'outputs/Little-Haven-Bouquets-garden-species.png', fullPage: true, animations: 'disabled' });
  await button(page, 'Abrir Little Bouquets').click();
  for (const label of ['Rosa vermelha', 'Rosa cor-de-rosa', 'Tulipa', 'Hortênsia', 'Peônia', 'Dália', 'Flores-do-campo', 'Cosmos']) await add(page, label);
  await expect(stems(page)).toHaveCount(8);
  expect(await stems(page).evaluateAll((nodes) => nodes.map((node) => node.dataset.bouquetStem))).toEqual(species);
  await page.screenshot({ path: 'outputs/Little-Haven-Bouquets-new-flowers.png', fullPage: true, animations: 'disabled' });
});

test('a personal Unicode subject survives preview and editing without changing message or bouquet and sharing requires a click', async ({ page }) => {
  await seed(page);
  await openWorkshop(page);
  await letter(page);
  const subject = 'Flores, café e carinho: ação ♡ 💐';
  const message = 'CARTA_SINTÉTICA_é_🌸\nUma segunda linha com acentos.';
  await expect(textbox(page, 'Assunto do e-mail')).toHaveValue(DEFAULT_SUBJECT);
  await textbox(page, 'Assunto do e-mail').fill(`  ${subject}  `);
  await textbox(page, 'Mensagem').fill(message);
  await textbox(page, 'E-mail do destinatário (opcional)').fill(recipient);
  await page.evaluate(() => {
    window.__bouquetEmailCalls = [];
    window.haven = { openBouquetEmail: async (value) => { window.__bouquetEmailCalls.push(value); return true; } };
  });
  await button(page, 'Revisar presente').click();
  await expect(page.getByTestId('review-subject')).toHaveText(subject);
  await expect(page.getByTestId('review-recipient')).toHaveText(recipient);
  await expect(workshop(page)).toContainText(message.split('\n')[0]);
  expect(await page.evaluate(() => window.__bouquetEmailCalls)).toEqual([]);
  await button(page, 'Editar carta').click();
  await expect(textbox(page, 'Mensagem')).toHaveValue(message);
  await textbox(page, 'Assunto do e-mail').fill('Uma surpresa para você 🌻');
  await button(page, 'Revisar presente').click();
  await expect(stems(page)).toHaveCount(1);
  await expect(stems(page).first()).toHaveAttribute('data-bouquet-stem', 'daisy');
  await expect(page.getByTestId('review-subject')).toHaveText('Uma surpresa para você 🌻');
  await expect(workshop(page)).toContainText(/anexe.*manualmente/i);
  await button(page, 'Abrir meu e-mail').click();
  expect(await page.evaluate(() => window.__bouquetEmailCalls)).toEqual([{ recipient, subject: 'Uma surpresa para você 🌻', message }]);
  expect(await savedDraft(page)).toBeNull();
});

test('subject rejects line breaks and control characters on paste, limits Unicode length and falls back when empty', async ({ page }) => {
  await seed(page);
  await openWorkshop(page);
  await letter(page);
  const subject = textbox(page, 'Assunto do e-mail');
  await subject.fill('Assunto válido 🌸');
  for (const malicious of ['Outra linha\r\nBcc:synthetic@example.test', 'Outra\nlinha', 'Nul\u0000caractere', 'Controle\u0085', 'Separador\u2028']) {
    await subject.evaluate((element, value) => {
      const clipboardData = new DataTransfer();
      clipboardData.setData('text/plain', value);
      element.dispatchEvent(new ClipboardEvent('paste', { clipboardData, bubbles: true, cancelable: true }));
    }, malicious);
    await expect(subject).toHaveValue('Assunto válido 🌸');
    await expect(workshop(page).getByRole('alert')).toBeVisible();
  }
  await subject.fill('💐'.repeat(120));
  await expect(subject).toHaveValue('💐'.repeat(120));
  await subject.fill('💐'.repeat(121));
  await expect(workshop(page).getByRole('alert')).toBeVisible();
  await subject.fill('   ');
  await textbox(page, 'Mensagem').fill('CARTA_SINTÉTICA_PRESERVADA');
  await button(page, 'Revisar presente').click();
  await expect(page.getByTestId('review-subject')).toHaveText(DEFAULT_SUBJECT);
  await button(page, 'Editar carta').click();
  await expect(textbox(page, 'Mensagem')).toHaveValue('CARTA_SINTÉTICA_PRESERVADA');
  await expect(stems(page)).toHaveCount(1);
});

test('a long Unicode letter stays intact and opening email without its body requires a separate explicit action', async ({ page }) => {
  await seed(page);
  await openWorkshop(page);
  await letter(page);
  const subject = 'Um carinho sintético para você 💐';
  const message = '💐'.repeat(1000);
  await textbox(page, 'Assunto do e-mail').fill(subject);
  await textbox(page, 'Mensagem').fill(message);
  await textbox(page, 'E-mail do destinatário (opcional)').fill(recipient);
  await page.evaluate(() => {
    window.__bouquetEmailCalls = [];
    window.haven = { openBouquetEmail: async (value) => { window.__bouquetEmailCalls.push(value); return true; } };
  });
  await button(page, 'Revisar presente').click();
  await expect(page.getByTestId('review-subject')).toHaveText(subject);
  await expect(page.getByTestId('review-recipient')).toHaveText(recipient);
  await expect(workshop(page).locator('.bouquet-review-message')).toHaveText(message);
  await expect(button(page, 'Abrir meu e-mail')).toBeDisabled();
  await expect(button(page, 'Abrir e-mail sem a carta no corpo')).toBeVisible();
  expect(await page.evaluate(() => window.__bouquetEmailCalls)).toEqual([]);
  await button(page, 'Abrir e-mail sem a carta no corpo').click();
  expect(await page.evaluate(() => window.__bouquetEmailCalls)).toEqual([{ recipient, subject, message: '' }]);
  await expect(workshop(page).locator('.bouquet-review-message')).toHaveText(message);
  await button(page, 'Editar carta').click();
  await expect(textbox(page, 'Mensagem')).toHaveValue(message);
  await expect(textbox(page, 'Assunto do e-mail')).toHaveValue(subject);
  await expect(textbox(page, 'E-mail do destinatário (opcional)')).toHaveValue(recipient);
  expect(await savedDraft(page)).toBeNull();
});

test('session editing survives navigation and drafts retain letter only with consent, never a recipient', async ({ page }) => {
  await seed(page);
  await openWorkshop(page);
  await letter(page);
  await textbox(page, 'Assunto do e-mail').fill('ASSUNTO_SINTÉTICO_PRIVADO');
  await textbox(page, 'Mensagem').fill('CARTA_SINTÉTICA_PRIVADA');
  await textbox(page, 'E-mail do destinatário (opcional)').fill(recipient);
  expect(await savedDraft(page)).toBeNull();
  await button(page, 'Voltar ao jardim').click();
  await button(page, 'The Room').click();
  await button(page, 'The Garden').click();
  await button(page, 'Abrir Little Bouquets').click();
  await expect(textbox(page, 'Assunto do e-mail')).toHaveValue('ASSUNTO_SINTÉTICO_PRIVADO');
  await expect(textbox(page, 'Mensagem')).toHaveValue('CARTA_SINTÉTICA_PRIVADA');
  await expect(textbox(page, 'E-mail do destinatário (opcional)')).toHaveValue(recipient);
  await expect(page.getByLabel('Guardar também a carta e o assunto', { exact: true })).not.toBeChecked();
  await button(page, 'Salvar rascunho').click();
  await expect.poll(() => savedDraft(page)).toMatchObject({ stems: ['daisy'], message: '', subject: DEFAULT_SUBJECT });
  expect(JSON.stringify(await savedDraft(page))).not.toContain(recipient);
  await page.getByLabel('Guardar também a carta e o assunto', { exact: true }).check();
  await button(page, 'Salvar rascunho').click();
  await expect.poll(() => savedDraft(page)).toMatchObject({ message: 'CARTA_SINTÉTICA_PRIVADA', subject: 'ASSUNTO_SINTÉTICO_PRIVADO' });
  expect(JSON.stringify(await savedDraft(page))).not.toContain(recipient);
  await page.reload();
  await button(page, 'The Garden').click();
  await button(page, 'Abrir Little Bouquets').click();
  await button(page, 'Retomar rascunho').click();
  await button(page, 'Confirmar retomada').click();
  await button(page, 'Escrever a carta').click();
  await expect(textbox(page, 'Assunto do e-mail')).toHaveValue('ASSUNTO_SINTÉTICO_PRIVADO');
  await expect(textbox(page, 'Mensagem')).toHaveValue('CARTA_SINTÉTICA_PRIVADA');
  await expect(textbox(page, 'E-mail do destinatário (opcional)')).toHaveValue('');
  await button(page, 'Excluir rascunho salvo').click();
  await expect(button(page, 'Continuar editando')).toBeFocused();
  await button(page, 'Continuar editando').press('Enter');
  await expect(button(page, 'Excluir rascunho salvo')).toBeFocused();
  expect(await savedDraft(page)).not.toBeNull();
  await button(page, 'Excluir rascunho salvo').click();
  await button(page, 'Confirmar exclusão').click();
  await expect.poll(() => savedDraft(page)).toBeNull();
  await expect(button(page, 'Excluir rascunho salvo')).toBeFocused();
});

test('PNG exports contain the arrangement and a readable long card without exporting recipient or subject', async ({ page }) => {
  await seed(page);
  await openWorkshop(page);
  await letter(page);
  const text = Array.from('Flores e café 🌸. Uma carta sintética para testar a leitura, com acentos.\n'.repeat(20)).slice(0, 1000).join('');
  await textbox(page, 'Mensagem').fill(text);
  await textbox(page, 'Assunto do e-mail').fill('ASSUNTO_NAO_EXPORTADO');
  await textbox(page, 'E-mail do destinatário (opcional)').fill(recipient);
  await button(page, 'Revisar presente').click();
  let exportedCard;
  for (const [label, fileName, minHeight] of [
    ['Salvar buquê PNG', 'Little-Haven-Bouquets-export-bouquet.png', 1000],
    ['Salvar cartão PNG', 'Little-Haven-Bouquets-export-card.png', 1310],
  ]) {
    const { bytes, name } = await download(page, label, fileName);
    if (label === 'Salvar cartão PNG') exportedCard = bytes;
    expect(name).toMatch(/\.png$/);
    expect([...bytes.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    expect(bytes.readUInt32BE(16)).toBe(1200);
    expect(bytes.readUInt32BE(20)).toBeGreaterThanOrEqual(minHeight);
    expect(bytes.readUInt32BE(20)).toBeLessThanOrEqual(8192);
    expect(bytes.includes(Buffer.from(recipient))).toBe(false);
    expect(bytes.includes(Buffer.from('ASSUNTO_NAO_EXPORTADO'))).toBe(false);
    const decoded = await page.evaluate(async (dataUrl) => {
      const image = new Image();
      image.src = dataUrl;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = image.width; canvas.height = image.height;
      const context = canvas.getContext('2d'); context.drawImage(image, 0, 0);
      const pixels = context.getImageData(300, 250, 600, 600).data;
      return { width: image.width, height: image.height, opaque: pixels.some((value, index) => index % 4 === 3 && value > 0) };
    }, `data:image/png;base64,${bytes.toString('base64')}`);
    expect(decoded.opaque).toBe(true);
  }
  await page.screenshot({ path: 'outputs/Little-Haven-Bouquets-review.png', fullPage: true, animations: 'disabled' });
  await button(page, 'Editar carta').click();
  await expect(textbox(page, 'Mensagem')).toHaveValue(text);
  await textbox(page, 'Assunto do e-mail').fill('OUTRO_ASSUNTO_NAO_EXPORTADO');
  await textbox(page, 'E-mail do destinatário (opcional)').fill('another-synthetic@example.test');
  await button(page, 'Revisar presente').click();
  const repeated = await download(page, 'Salvar cartão PNG', 'Little-Haven-Bouquets-export-card-privacy.png');
  expect(repeated.bytes.equals(exportedCard), 'changing email-only information must not change any exported byte').toBe(true);
});

test('HTML preserves a thousand-character multiline letter as escaped readable text when PNG is too tall', async ({ page, context }) => {
  await seed(page);
  await openWorkshop(page);
  await letter(page);
  const attack = '<img src="https://example.test/synthetic.png" onerror="window.syntheticExecuted=true"><script>window.syntheticExecuted=true</script>';
  const text = ('É\n'.repeat(300) + attack).padEnd(1000, 'x');
  expect(Array.from(text)).toHaveLength(1000);
  await textbox(page, 'Mensagem').fill(text);
  await textbox(page, 'Assunto do e-mail').fill('ASSUNTO_HTML_NAO_EXPORTADO');
  await textbox(page, 'E-mail do destinatário (opcional)').fill(recipient);
  await button(page, 'Revisar presente').click();
  const downloads = [];
  page.on('download', (item) => downloads.push(item));
  await button(page, 'Salvar cartão PNG').click();
  await expect(workshop(page).getByRole('alert')).toContainText('Use Salvar cartão HTML');
  expect(downloads).toHaveLength(0);
  const { bytes, name } = await download(page, 'Salvar cartão HTML', 'Little-Haven-Bouquets-export-card.html');
  expect(name).toMatch(/\.html$/);
  const html = bytes.toString('utf8');
  expect(html).toContain('&lt;script&gt;');
  expect(html).not.toContain(recipient);
  expect(html).not.toContain('ASSUNTO_HTML_NAO_EXPORTADO');
  const exported = await context.newPage();
  const external = [];
  exported.on('request', (request) => { if (/^https?:/.test(request.url())) external.push(request.url()); });
  await exported.setContent(html);
  await expect(exported.locator('main p')).toHaveJSProperty('textContent', text);
  await expect(exported.locator('img')).toHaveCount(1);
  await expect(exported.locator('script, iframe, form, a')).toHaveCount(0);
  expect(await exported.locator('main p').evaluate((element) => getComputedStyle(element).whiteSpace)).toBe('pre-wrap');
  expect(await exported.locator('main img').evaluate(async (image) => { await image.decode(); return image.naturalWidth; })).toBe(1200);
  expect(await exported.evaluate(() => window.syntheticExecuted)).toBeUndefined();
  expect(external).toEqual([]);
  await exported.screenshot({ path: 'outputs/Little-Haven-Bouquets-html.png' });
  await exported.close();
});

test('the workshop preserves immersion, reduced motion, companion visibility and small-window access', async ({ page }) => {
  await seed(page, ['daisy', 'rose-red'], false);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openGarden(page);
  await button(page, 'Modo Imersivo').click();
  await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBe(true);
  await button(page, 'Abrir Little Bouquets').press('Enter');
  await expect(workshop(page)).toBeVisible();
  expect(await workshop(page).evaluate((element) => document.fullscreenElement.contains(element))).toBe(true);
  await expect(workshop(page).locator('g.companion')).toHaveCount(0);
  await add(page);
  await button(page, 'Escrever a carta').press('Enter');
  await textbox(page, 'Assunto do e-mail').fill('Teclado e flores 🌸');
  await button(page, 'Revisar presente').press('Enter');
  await expect(page.getByTestId('review-subject')).toHaveText('Teclado e flores 🌸');
  expect(await preview(page).evaluate((element) => [element, ...element.querySelectorAll('*')].every((node) => getComputedStyle(node).animationName.split(',').every((name) => name.trim() === 'none')))).toBe(true);
  await page.screenshot({ path: 'outputs/Little-Haven-Bouquets-immersive.png', animations: 'disabled' });
  await page.keyboard.press('Escape');
  await expect.poll(() => page.evaluate(() => document.fullscreenElement)).toBeNull();
  for (const viewport of [{ width: 800, height: 650 }, { width: 360, height: 780 }]) {
    await page.setViewportSize(viewport);
    await assertNoHorizontalOverflow(page);
    await button(page, 'Editar carta').click();
    await textbox(page, 'Mensagem').fill('Uma carta sintética na janela pequena.');
    await button(page, 'Revisar presente').click();
    await expect(button(page, 'Abrir meu e-mail')).toBeVisible();
    await page.screenshot({ path: `outputs/Little-Haven-Bouquets-${viewport.width}.png`, fullPage: true, animations: 'disabled' });
  }
  await button(page, 'Voltar ao jardim').click();
  await expect(page.locator('svg.garden-art')).toBeVisible();
});

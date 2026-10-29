import { test, expect } from '@playwright/test';
import {
  installAudioProbe, audioSnapshot, openMixer, closeMixer, mixer, presetSelect, layerRow, savedPreferences, expectMaster,
} from './helpers/audio.js';

const diagnostics = new WeakMap();
const cards = (page, kind) => page.locator(`.memory-card${kind ? `[data-kind="${kind}"]` : ''}`);
const dialog = (page, name) => page.getByRole('dialog', { name, exact: true });

test.beforeEach(async ({ page }) => {
  const recorded = { errors: [], external: [] };
  diagnostics.set(page, recorded);
  page.on('pageerror', (error) => recorded.errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') recorded.errors.push(message.text()); });
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (['http:', 'https:', 'ws:', 'wss:'].includes(url.protocol) && url.hostname !== '127.0.0.1') recorded.external.push(url.origin);
  });
  await installAudioProbe(page);
});

test.afterEach(async ({ page }) => {
  expect(diagnostics.get(page).errors, 'Memory Corner should not produce renderer errors').toEqual([]);
  expect(diagnostics.get(page).external, 'memories should stay on the device').toEqual([]);
});

async function openMemory(page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'The Memory Corner', exact: true }).click();
  await expect(page.getByRole('group', { name: 'Mural de lembranças', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Write a Note', exact: true })).toBeEnabled();
}

async function writeNote(page, text, paper = 'beige', style = 'plain') {
  await page.getByRole('button', { name: 'Write a Note', exact: true }).click();
  const editor = dialog(page, 'Write a Note');
  await expect(editor.getByRole('textbox', { name: 'Mensagem do bilhete', exact: true })).toBeFocused();
  await editor.getByRole('textbox', { name: 'Mensagem do bilhete', exact: true }).fill(text);
  await editor.getByRole('combobox', { name: 'Cor do papel', exact: true }).selectOption(paper);
  await editor.getByRole('combobox', { name: 'Estilo do papel', exact: true }).selectOption(style);
  await editor.getByRole('button', { name: 'Fixar bilhete', exact: true }).click();
  await expect(editor).toHaveCount(0);
}

// A black-box persistence check across all Memory Corner IndexedDB stores. This
// only reads synthetic test data and deliberately leaves blobs out of JSON.
async function persistedDocuments(page) {
  return page.evaluate(async () => {
    const result = [];
    for (const { name } of await indexedDB.databases()) {
      if (!name || !/memory/i.test(name)) continue;
      const database = await new Promise((resolve, reject) => {
        const request = indexedDB.open(name);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      try {
        for (const storeName of database.objectStoreNames) {
          const records = await new Promise((resolve, reject) => {
            const request = database.transaction(storeName).objectStore(storeName).getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
          });
          result.push(...records);
        }
      } finally { database.close(); }
    }
    return JSON.stringify(result);
  });
}

async function syntheticPhotos(page) {
  const encoded = await page.evaluate(async () => {
    const result = [];
    for (const [width, height, type] of [[1920, 1080, 'image/png'], [480, 960, 'image/jpeg'], [1280, 960, 'image/webp']]) {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      context.fillStyle = '#425c74';
      context.fillRect(0, 0, width, height);
      context.fillStyle = '#e7bd79';
      context.fillRect(width / 4, height / 4, width / 2, height / 2);
      result.push({ width, height, type, data: canvas.toDataURL(type, 0.95).split(',')[1] });
    }
    return result;
  });
  return encoded.map(({ width, height, type, data }, index) => ({
    name: `synthetic-${width}x${height}.${['png', 'jpg', 'webp'][index]}`,
    mimeType: type,
    buffer: Buffer.from(data, 'base64'),
  }));
}

async function importPhotos(page, photos) {
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Add a Memory', exact: true }).click();
  await (await chooser).setFiles(photos);
}

test('multiline Unicode notes retain native text, paper, edits and theme after a real reload', async ({ page }) => {
  await openMemory(page);
  const firstText = 'Árvore, abraço e chá.\n少しずつ — e\u0301 🌿';
  await writeNote(page, firstText, 'rose', 'lined');
  const card = cards(page, 'note');
  await expect(card).toHaveCount(1);
  await expect(card).toContainText('Árvore, abraço e chá.');
  expect(await card.evaluate((element) => getComputedStyle(element).imageRendering)).not.toBe('pixelated');
  await card.click();
  await page.getByRole('button', { name: 'Editar lembrança', exact: true }).click();
  const editor = dialog(page, 'Editar bilhete');
  await expect(editor.getByRole('textbox', { name: 'Mensagem do bilhete', exact: true })).toHaveValue(firstText);
  const updated = `${firstText}\nLembrança sintética preservada.`;
  await editor.getByRole('textbox', { name: 'Mensagem do bilhete', exact: true }).fill(updated);
  await editor.getByRole('combobox', { name: 'Cor do papel', exact: true }).selectOption('sage');
  await editor.getByRole('combobox', { name: 'Estilo do papel', exact: true }).selectOption('torn');
  await editor.getByRole('button', { name: 'Salvar bilhete', exact: true }).click();
  await page.getByRole('button', { name: 'Personalizar mural', exact: true }).click();
  await dialog(page, 'Seu cantinho').getByRole('combobox', { name: 'Tema do mural', exact: true }).selectOption('moonlight');
  await page.keyboard.press('Escape');
  await expect.poll(() => persistedDocuments(page)).toContain('Lembrança sintética preservada.');
  await page.reload();
  await page.getByRole('button', { name: 'The Memory Corner', exact: true }).click();
  await expect(cards(page, 'note')).toContainText('Lembrança sintética preservada.');
  await expect(page.locator('[data-theme="moonlight"]')).toBeVisible();
  await cards(page, 'note').press('Enter');
  await expect(dialog(page, 'Seu bilhete')).toContainText('少しずつ');
  await page.getByRole('button', { name: 'Voltar ao mural', exact: true }).click();
  await expect(cards(page, 'note')).toBeFocused();
  expect(await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))).not.toContain('Lembrança sintética preservada.');
  expect((await audioSnapshot(page)).contexts).toBe(0);
});

test('PNG, portrait JPEG and WebP use thumbnails on the board and full-resolution photographs in the viewer', async ({ page }) => {
  await openMemory(page);
  const photos = await syntheticPhotos(page);
  await importPhotos(page, photos);
  await expect(cards(page, 'photo')).toHaveCount(3);
  await expect.poll(() => cards(page, 'photo').locator('img').evaluateAll((images) => images.length === 3
    && images.every((image) => image.complete && image.naturalWidth > 0))).toBe(true);
  const quality = await cards(page, 'photo').locator('img').evaluateAll((images) => images.map((image) => ({
    width: image.naturalWidth, height: image.naturalHeight,
    rendering: getComputedStyle(image).imageRendering,
  })));
  expect(quality).toHaveLength(3);
  for (const image of quality) {
    expect(Math.max(image.width, image.height)).toBeLessThanOrEqual(640);
    expect(image.width).toBeGreaterThan(0);
    expect(image.rendering).not.toBe('pixelated');
  }
  const originalSizes = [[1920, 1080], [480, 960], [1280, 960]];
  for (let index = 0; index < photos.length; index += 1) {
    await cards(page, 'photo').nth(index).press('Enter');
    const viewer = dialog(page, 'Fotografia ampliada');
    const original = viewer.locator('img');
    await expect.poll(() => original.evaluate((image) => [image.naturalWidth, image.naturalHeight])).toEqual(originalSizes[index]);
    expect(await original.evaluate((image) => getComputedStyle(image).objectFit)).toBe('contain');
    expect(await original.evaluate((image) => getComputedStyle(image).imageRendering)).not.toBe('pixelated');
    await viewer.getByRole('button', { name: 'Ampliar fotografia', exact: true }).click();
    await viewer.getByRole('button', { name: 'Reduzir fotografia', exact: true }).click();
    await viewer.getByRole('button', { name: 'Ajustar à janela', exact: true }).click();
    await viewer.getByRole('button', { name: 'Voltar ao mural', exact: true }).click();
    await expect(viewer).toHaveCount(0);
  }
  await cards(page, 'photo').first().click();
  await page.getByRole('button', { name: 'Editar lembrança', exact: true }).click();
  const editor = dialog(page, 'Editar fotografia');
  await editor.getByRole('combobox', { name: 'Moldura da fotografia', exact: true }).selectOption('floral');
  await editor.getByLabel('Legenda da fotografia', { exact: true }).fill('Um lugar sintético, só para o teste.');
  await editor.getByRole('button', { name: 'Salvar fotografia', exact: true }).click();
  await expect(cards(page, 'photo').first()).toContainText('Um lugar sintético, só para o teste.');
  await expect.poll(() => persistedDocuments(page)).toContain('Um lugar sintético, só para o teste.');
  await page.reload();
  await page.getByRole('button', { name: 'The Memory Corner', exact: true }).click();
  await expect(cards(page, 'photo')).toHaveCount(3);
  await expect.poll(() => cards(page, 'photo').first().locator('img').evaluate((image) => image.complete && image.naturalWidth > 0)).toBe(true);
  expect(await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))).not.toMatch(/data:image|Um lugar sintético/);
});

test('invalid image bytes are rejected without adding cards or losing a valid memory', async ({ page }) => {
  await openMemory(page);
  await writeNote(page, 'Um bilhete que deve continuar aqui.');
  await importPhotos(page, [{ name: 'not-an-image.png', mimeType: 'image/png', buffer: Buffer.from('<svg><script>throw 1</script></svg>') }]);
  await expect(page.getByRole('status').filter({ hasText: /imagem|arquivo/i })).toBeVisible();
  await expect(cards(page, 'photo')).toHaveCount(0);
  await expect(cards(page, 'note')).toContainText('Um bilhete que deve continuar aqui.');
});

test('pointer and keyboard positioning are bounded, rotations and ordering persist, and deletion has confirmation plus undo', async ({ page }) => {
  await openMemory(page);
  await writeNote(page, 'Primeiro bilhete sintético.');
  await writeNote(page, 'Segundo bilhete sintético.');
  const first = cards(page, 'note').filter({ hasText: 'Primeiro bilhete sintético.' });
  await first.click();
  const before = await first.getAttribute('data-x');
  await first.press('ArrowRight');
  await expect.poll(() => first.getAttribute('data-x')).not.toBe(before);
  await page.getByRole('button', { name: 'Mover para baixo', exact: true }).click();
  await page.getByRole('combobox', { name: 'Inclinação da lembrança', exact: true }).selectOption('8');
  await expect(first).toHaveAttribute('data-rotation', '8');
  await page.getByRole('button', { name: 'Trazer para frente', exact: true }).click();
  await expect(cards(page, 'note').last()).toContainText('Primeiro bilhete sintético.');
  const bounds = await first.boundingBox();
  const board = await page.locator('.memory-board').boundingBox();
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await page.mouse.down();
  await page.mouse.move(board.x + board.width + 300, board.y - 300, { steps: 6 });
  await page.mouse.up();
  expect(Number(await first.getAttribute('data-x'))).toBeGreaterThanOrEqual(0);
  expect(Number(await first.getAttribute('data-x'))).toBeLessThanOrEqual(1);
  expect(Number(await first.getAttribute('data-y'))).toBeGreaterThanOrEqual(0);
  expect(Number(await first.getAttribute('data-y'))).toBeLessThanOrEqual(1);
  await page.getByRole('button', { name: 'Remover lembrança', exact: true }).click();
  const confirmation = dialog(page, 'Remover esta lembrança?');
  await expect(confirmation).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(cards(page, 'note')).toHaveCount(2);
  await page.getByRole('button', { name: 'Remover lembrança', exact: true }).click();
  await confirmation.getByRole('button', { name: 'Confirmar remoção', exact: true }).click();
  await expect(cards(page, 'note')).toHaveCount(1);
  await page.getByRole('button', { name: 'Desfazer remoção', exact: true }).click();
  await expect(cards(page, 'note')).toHaveCount(2);
  await expect(first).toHaveAttribute('data-rotation', '8');
  await expect.poll(() => persistedDocuments(page)).toContain('Primeiro bilhete sintético.');
  await page.reload();
  await page.getByRole('button', { name: 'The Memory Corner', exact: true }).click();
  await expect(first).toHaveAttribute('data-rotation', '8');
});

test('reminders are optional and the mural remains usable with reduced motion in a smaller window', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 390, height: 844 });
  await openMemory(page);
  await expect(cards(page)).toHaveCount(0);
  await page.getByRole('button', { name: 'A Little Reminder', exact: true }).click();
  await page.getByRole('button', { name: 'Um dia de cada vez.', exact: true }).click();
  await page.getByRole('button', { name: 'Fixar esta mensagem', exact: true }).click();
  await expect(cards(page, 'note')).toContainText('Um dia de cada vez.');
  await cards(page, 'note').press('Enter');
  const viewer = dialog(page, 'Seu bilhete');
  await expect(viewer).toBeVisible();
  const overflow = await viewer.evaluate((element) => ({
    width: element.getBoundingClientRect().width,
    viewport: innerWidth,
    nativeText: !element.querySelector('canvas'),
  }));
  expect(overflow.width).toBeLessThanOrEqual(overflow.viewport);
  expect(overflow.nativeText).toBe(true);
  await viewer.getByRole('button', { name: 'Voltar ao mural', exact: true }).click();
  await page.screenshot({ path: 'outputs/Little-Haven-Memory-Corner-mobile.png', fullPage: true });
});

test('the same mural survives fullscreen, contextual Escape, mixer and companion without starting audio', async ({ page }) => {
  await openMemory(page);
  await writeNote(page, 'Uma lembrança em tela cheia.');
  await page.evaluate(() => { window.__memoryBoardBeforeFullscreen = document.querySelector('.memory-board'); });
  await page.getByRole('button', { name: 'Modo Imersivo', exact: true }).click();
  await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBe(true);
  expect(await page.evaluate(() => document.fullscreenElement.contains(window.__memoryBoardBeforeFullscreen))).toBe(true);
  await cards(page, 'note').press('Enter');
  await expect(dialog(page, 'Seu bilhete')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog(page, 'Seu bilhete')).toHaveCount(0);
  expect(await page.evaluate(() => Boolean(document.fullscreenElement))).toBe(true);
  await page.keyboard.press('m');
  await expect(page.getByRole('dialog', { name: 'Cozy Sound Mixer', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.keyboard.press('c');
  await expect(page.getByRole('dialog', { name: 'My Companion', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  expect((await audioSnapshot(page)).contexts).toBe(0);
  await page.screenshot({ path: 'outputs/Little-Haven-Memory-Corner-immersive.png' });
  await page.keyboard.press('Escape');
  await expect.poll(() => page.evaluate(() => document.fullscreenElement === null)).toBe(true);
  await expect(page.getByRole('button', { name: 'Modo Imersivo', exact: true })).toBeFocused();
  await expect(cards(page, 'note')).toContainText('Uma lembrança em tela cheia.');
  await page.screenshot({ path: 'outputs/Little-Haven-Memory-Corner-desktop.png', fullPage: true });
});

test('Let It Float drafts never enter the memory database and navigation keeps the discard guard', async ({ page }) => {
  await openMemory(page);
  await writeNote(page, 'Mensagem sintética que escolhi guardar.');
  await page.getByRole('button', { name: 'Let It Float', exact: true }).click();
  const draft = 'MEMORY_RITUAL_PRIVATE_SYNTHETIC_845213';
  await page.getByRole('textbox').fill(draft);
  await page.getByRole('button', { name: 'The Memory Corner', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Continuar escrevendo', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('textbox')).toHaveValue(draft);
  expect(await persistedDocuments(page)).not.toContain(draft);
  expect(await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))).not.toContain(draft);
  await page.getByRole('button', { name: 'The Memory Corner', exact: true }).click();
  await page.getByRole('button', { name: 'Descartar e sair', exact: true }).click();
  await expect(cards(page, 'note')).toContainText('Mensagem sintética que escolhi guardar.');
  expect(await persistedDocuments(page)).not.toContain(draft);
  await page.getByRole('button', { name: 'Let It Float', exact: true }).click();
  await expect(page.getByRole('textbox')).toBeEmpty();
});

test('entering the mural preserves the active Journey preset, layers, global volume, mute and one audio context', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'The Journey', exact: true }).click();
  await openMixer(page);
  await presetSelect(page).selectOption('peaceful-journey');
  await mixer(page).getByRole('slider', { name: 'Volume geral', exact: true }).fill('37');
  await mixer(page).getByRole('button', { name: 'Ativar áudio', exact: true }).click();
  await expect(layerRow(page, 'train-track')).toHaveAttribute('data-status', 'playing');
  await expectMaster(page, .37 * .25);
  await mixer(page).getByRole('button', { name: 'Silenciar tudo', exact: true }).click();
  await expectMaster(page, 0);
  const before = await savedPreferences(page);
  const topology = await audioSnapshot(page);
  await closeMixer(page);
  await page.getByRole('button', { name: 'The Memory Corner', exact: true }).click();
  await expect(page.locator('.memory-board')).toBeVisible();
  await openMixer(page);
  await expect(presetSelect(page)).toHaveValue('peaceful-journey');
  await expect(mixer(page).getByRole('slider', { name: 'Volume geral', exact: true })).toHaveValue('37');
  await expect(mixer(page).getByRole('button', { name: 'Reativar', exact: true })).toHaveAttribute('aria-pressed', 'true');
  expect((await savedPreferences(page)).mixer).toEqual(before.mixer);
  expect((await audioSnapshot(page)).sources).toEqual(topology.sources);
  expect((await audioSnapshot(page)).contexts).toBe(1);
  await expectMaster(page, 0);
  await mixer(page).getByRole('button', { name: 'Reativar', exact: true }).click();
  await expectMaster(page, .37 * .25);
  expect((await audioSnapshot(page)).contexts).toBe(1);
  expect((await audioSnapshot(page)).sources).toEqual(topology.sources);
});

test('a transient IndexedDB failure can be retried without reloading the application', async ({ page }) => {
  await page.addInitScript(() => {
    const open = indexedDB.open.bind(indexedDB);
    let failed = false;
    indexedDB.open = (...args) => {
      if (!failed && args[0] === 'little-haven-memory-v1') {
        failed = true;
        throw new DOMException('Synthetic first-open failure.', 'UnknownError');
      }
      return open(...args);
    };
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'The Memory Corner', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Write a Note', exact: true })).toBeDisabled();
  await expect(page.getByRole('status').filter({ hasText: 'Não foi possível abrir o mural' })).toBeVisible();
  await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Write a Note', exact: true })).toBeEnabled();
  await writeNote(page, 'Um bilhete depois da recuperação sintética.');
  await expect.poll(() => persistedDocuments(page)).toContain('Um bilhete depois da recuperação sintética.');
});

test('a future IndexedDB board is protected from automatic overwrite', async ({ page }) => {
  await page.goto('/');
  const future = { version: 2, marker: 'SYNTHETIC_FUTURE_MEMORY_BOARD', items: [] };
  await page.evaluate(async (value) => {
    const database = await new Promise((resolve, reject) => {
      const request = indexedDB.open('little-haven-memory-v1', 1);
      request.onupgradeneeded = () => {
        for (const name of ['board', 'assets', 'images']) request.result.createObjectStore(name);
      };
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
    await new Promise((resolve, reject) => {
      const transaction = database.transaction('board', 'readwrite');
      transaction.oncomplete = resolve;
      transaction.onabort = transaction.onerror = () => reject(transaction.error);
      transaction.objectStore('board').put(value, 'current');
    });
    database.close();
  }, future);
  await page.getByRole('button', { name: 'The Memory Corner', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Write a Note', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Add a Memory', exact: true })).toBeDisabled();
  await expect(page.getByRole('status').filter({ hasText: 'versão mais nova' })).toBeVisible();
  await page.getByRole('button', { name: 'Personalizar mural', exact: true }).click();
  await expect(dialog(page, 'Seu cantinho').getByRole('combobox', { name: 'Tema do mural', exact: true })).toBeDisabled();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click();
  expect(JSON.parse(await persistedDocuments(page))).toContainEqual(future);
});

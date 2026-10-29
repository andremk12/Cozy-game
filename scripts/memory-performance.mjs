// Optional, reproducible audit of synthetic memories. Requires a current build.
// It owns an ephemeral browser context and a preview server on a free loopback
// port; it never opens the installed app or reads a personal profile or image.
import assert from 'node:assert/strict';
import { access, mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import { chromium, expect } from '@playwright/test';
import { preview } from 'vite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'outputs');
const requestedDuration = Number(process.env.HAVEN_MEMORY_AUDIT_MS || 15_000);
const observationMs = Number.isFinite(requestedDuration) ? Math.max(1000, Math.min(60_000, requestedDuration)) : 15_000;
const report = {
  date: new Date().toISOString(),
  environment: { platform: os.platform(), release: os.release(), cpu: os.cpus()[0]?.model,
    memoryGiB: Math.round(os.totalmem() / 1024 ** 3), node: process.version, headless: true },
  scenario: '12 synthetic 4000 × 3000 photographs (PNG/JPEG/WebP), lazy originals one at a time, keyboard movement/layers and reload; audio not activated',
  limits: [
    'JS heap does not include all decoded image buffers, browser/native allocations, IndexedDB backing storage or GPU memory.',
    'Headless frame callbacks and long tasks do not prove frames presented by a physical monitor or perceived image quality.',
    'Heap samples request garbage collection through CDP for comparability; this is audit instrumentation, not production behavior.',
    'Synthetic images and one computer do not establish a safe memory budget for all photographs, devices or long sessions.',
  ],
  rendererErrors: [], externalRequests: [],
};
let server;
let browser;
let context;

const cards = (page, kind = '') => page.locator(`.memory-card${kind ? `[data-kind="${kind}"]` : ''}`);
const dialog = (page, name) => page.getByRole('dialog', { name, exact: true });
const imageDetails = (page) => cards(page, 'photo').locator('img').evaluateAll((images) => images.map((image) => ({
  width: image.naturalWidth, height: image.naturalHeight, rendering: getComputedStyle(image).imageRendering,
  fit: getComputedStyle(image).objectFit,
})));

function observePage(page) {
  page.setDefaultTimeout(20_000);
  page.on('pageerror', (error) => report.rendererErrors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') report.rendererErrors.push(message.text()); });
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (['http:', 'https:', 'ws:', 'wss:'].includes(url.protocol) && url.hostname !== '127.0.0.1') report.externalRequests.push(url.origin);
  });
}

async function openMemory(page, address) {
  await page.goto(address);
  await page.getByRole('button', { name: 'The Memory Corner', exact: true }).click();
  await expect(page.getByRole('group', { name: 'Mural de lembranças', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Write a Note', exact: true })).toBeEnabled();
}

async function settled(page, photographCount) {
  await expect(cards(page, 'photo')).toHaveCount(photographCount);
  await expect(page.locator('.memory-save-status')).toHaveText('Salvo neste dispositivo');
  await page.waitForFunction((count) => {
    const images = [...document.querySelectorAll('.memory-card[data-kind="photo"] img')];
    return images.length === count && images.every((image) => image.complete && image.naturalWidth > 0);
  }, photographCount, { timeout: 60_000 });
}

async function heapSample(session, page) {
  let gcRequested = false;
  try { await session.send('HeapProfiler.collectGarbage'); gcRequested = true; } catch { /* Report unsupported metrics, not fabricated values. */ }
  const result = { gcRequested, domNodes: await page.locator('*').count(), jsHeapUsedBytes: null, jsHeapTotalBytes: null, cdpDom: null };
  try {
    const { metrics } = await session.send('Performance.getMetrics');
    for (const [key, name] of [['jsHeapUsedBytes', 'JSHeapUsedSize'], ['jsHeapTotalBytes', 'JSHeapTotalSize']]) result[key] = metrics.find((metric) => metric.name === name)?.value ?? null;
    result.cdpDom = await session.send('Memory.getDOMCounters');
  } catch { result.metricsAvailable = false; }
  return result;
}

async function makeSyntheticImages(page) {
  // Three original illustrations are painted at full resolution. No image from
  // the computer, network or protected game is used. Base64 is only a transient
  // Playwright fixture transport; the app imports real binary File objects.
  const paintings = await page.evaluate(() => {
    const result = [];
    const width = 4000;
    const height = 3000;
    for (let scene = 0; scene < 3; scene += 1) {
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      const c = canvas.getContext('2d');
      if (scene === 0) {
        const sky = c.createLinearGradient(0, 0, 0, 2000); sky.addColorStop(0, '#a2bec5'); sky.addColorStop(1, '#f5dbc1');
        c.fillStyle = sky; c.fillRect(0, 0, width, height);
        c.fillStyle = '#f5d99c'; c.beginPath(); c.arc(2950, 650, 270, 0, Math.PI * 2); c.fill();
        for (const [color, top, bottom] of [['#8ca99b', 1400, 3000], ['#6c8b78', 1850, 3400], ['#4f705c', 2350, 4000]]) {
          c.fillStyle = color; c.beginPath(); c.moveTo(0, top); c.bezierCurveTo(1000, top - 700, 2800, top + 650, width, top - 200); c.lineTo(width, bottom); c.lineTo(0, bottom); c.fill();
        }
        c.strokeStyle = '#b7d1cc'; c.lineWidth = 160; c.beginPath(); c.moveTo(3600, 1670); c.bezierCurveTo(1600, 2100, 3200, 2250, 1550, 3100); c.stroke();
        for (let i = 0; i < 65; i += 1) {
          const x = 90 + (i * 379) % 3700; const y = 1900 + (i * 173) % 1000;
          c.strokeStyle = '#4d6749'; c.lineWidth = 6; c.beginPath(); c.moveTo(x, y + 40); c.lineTo(x + 10, y - 20); c.stroke();
          c.fillStyle = ['#ecd9bb', '#d4b6bb', '#cfbdce'][i % 3]; c.beginPath(); c.arc(x + 10, y - 30, 14 + i % 8, 0, Math.PI * 2); c.fill();
        }
      } else if (scene === 1) {
        const sky = c.createLinearGradient(0, 0, 0, height); sky.addColorStop(0, '#394960'); sky.addColorStop(1, '#97a5b3');
        c.fillStyle = sky; c.fillRect(0, 0, width, height);
        c.fillStyle = '#efe2bb'; c.beginPath(); c.arc(860, 650, 230, 0, Math.PI * 2); c.fill();
        for (let i = 0; i < 45; i += 1) { c.fillStyle = '#e4dfcb'; c.beginPath(); c.arc(100 + (i * 431) % 3800, 110 + (i * 137) % 1150, 3 + i % 4, 0, Math.PI * 2); c.fill(); }
        c.fillStyle = '#677e8d'; c.beginPath(); c.moveTo(0, 2100); c.lineTo(1000, 970); c.lineTo(1950, 2040); c.lineTo(2950, 1230); c.lineTo(4000, 2100); c.fill();
        c.fillStyle = '#c9d2d4'; c.beginPath(); c.moveTo(700, 1300); c.lineTo(1000, 970); c.lineTo(1360, 1370); c.lineTo(1100, 1260); c.lineTo(980, 1350); c.lineTo(890, 1220); c.fill();
        c.fillStyle = '#526d7a'; c.fillRect(0, 2100, width, 900);
        for (let i = 0; i < 30; i += 1) { c.fillStyle = i % 2 ? '#758d95' : '#aab8ba'; c.fillRect(500 + (i * 211) % 2800, 2180 + i * 23, 90 + (i * 61) % 700, 4 + i % 5); }
        c.fillStyle = '#3e5a55'; c.beginPath(); c.moveTo(0, 2550); c.bezierCurveTo(800, 2200, 1300, 2600, 1800, 3000); c.lineTo(0, 3000); c.fill();
        c.fillStyle = '#897052'; c.fillRect(300, 2250, 630, 460); c.fillStyle = '#4c5154'; c.beginPath(); c.moveTo(220, 2260); c.lineTo(610, 1960); c.lineTo(1010, 2260); c.fill();
        c.fillStyle = '#e9c489'; c.fillRect(410, 2350, 160, 160); c.fillRect(680, 2350, 150, 160); c.strokeStyle = '#7c7057'; c.lineWidth = 12; c.beginPath(); c.moveTo(490, 2350); c.lineTo(490, 2510); c.moveTo(755, 2350); c.lineTo(755, 2510); c.stroke();
      } else {
        const wall = c.createLinearGradient(0, 0, width, height); wall.addColorStop(0, '#d4c9b7'); wall.addColorStop(1, '#9baa9b');
        c.fillStyle = wall; c.fillRect(0, 0, width, height); c.fillStyle = '#a18468'; c.fillRect(0, 2170, width, 830);
        c.fillStyle = '#cebd9c'; c.fillRect(300, 1990, 1700, 200); c.fillStyle = '#7e8b83'; c.fillRect(390, 1800, 1510, 190); c.fillStyle = '#a38d99'; c.fillRect(480, 1630, 1330, 170);
        for (let i = 0; i < 9; i += 1) { c.strokeStyle = '#e2d7b9'; c.lineWidth = 9; c.beginPath(); c.moveTo(570, 1665 + i * 14); c.lineTo(1720, 1665 + i * 14); c.stroke(); }
        c.fillStyle = '#c8b798'; c.beginPath(); c.ellipse(2790, 2160, 450, 90, 0, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#859c97'; c.beginPath(); c.moveTo(2470, 2130); c.bezierCurveTo(2460, 1850, 2510, 1450, 2590, 1390); c.lineTo(2990, 1390); c.bezierCurveTo(3090, 1530, 3130, 1910, 3120, 2130); c.closePath(); c.fill();
        for (let i = 0; i < 7; i += 1) {
          const x = 2240 + i * 165; const y = 500 + (i % 3) * 190;
          c.strokeStyle = '#607a62'; c.lineWidth = 16; c.beginPath(); c.moveTo(2790, 1450); c.quadraticCurveTo(2680, 1050, x, y + 100); c.stroke();
          c.fillStyle = i % 2 ? '#d7b5b7' : '#e3cba7';
          for (let petal = 0; petal < 5; petal += 1) { const angle = petal * Math.PI * 2 / 5; c.beginPath(); c.ellipse(x + Math.cos(angle) * 70, y + Math.sin(angle) * 70, 66, 43, angle, 0, Math.PI * 2); c.fill(); }
          c.fillStyle = '#b8a174'; c.beginPath(); c.arc(x, y, 34, 0, Math.PI * 2); c.fill();
        }
      }
      const mimeType = ['image/png', 'image/jpeg', 'image/webp'][scene];
      result.push({ mimeType, data: canvas.toDataURL(mimeType, .94).split(',')[1] });
      canvas.width = 0; canvas.height = 0;
    }
    return result;
  });
  return Array.from({ length: 12 }, (_, index) => ({
    name: `synthetic-memory-${String(index + 1).padStart(2, '0')}.${['png', 'jpg', 'webp'][index % 3]}`,
    mimeType: paintings[index % 3].mimeType, buffer: Buffer.from(paintings[index % 3].data, 'base64'),
  }));
}

async function note(page, text, paper, style) {
  await page.getByRole('button', { name: 'Write a Note', exact: true }).click();
  const editor = dialog(page, 'Write a Note');
  await editor.getByLabel('Mensagem do bilhete', { exact: true }).fill(text);
  await editor.getByRole('combobox', { name: 'Cor do papel', exact: true }).selectOption(paper);
  await editor.getByRole('combobox', { name: 'Estilo do papel', exact: true }).selectOption(style);
  await editor.getByRole('button', { name: 'Fixar bilhete', exact: true }).click();
  await expect(editor).toHaveCount(0);
}

async function positionWithKeyboard(page, id, targetX, targetY) {
  const card = page.locator(`.memory-card[data-memory-id="${id}"]`);
  await card.focus();
  for (const [axis, target, positive, negative] of [['x', targetX, 'ArrowRight', 'ArrowLeft'], ['y', targetY, 'ArrowDown', 'ArrowUp']]) {
    const current = Number(await card.getAttribute(`data-${axis}`));
    const steps = Math.round((target - current) / .05);
    for (let step = 0; step < Math.abs(steps); step += 1) await card.press(`Shift+${steps > 0 ? positive : negative}`);
  }
}

try {
  await access(path.join(root, 'dist', 'index.html'));
  await mkdir(output, { recursive: true });
  // The Vite API owns its HTTP server directly. Port zero asks Windows for an
  // available port, avoiding fixed-port conflicts and orphaned npm/cmd trees.
  server = await preview({ root, logLevel: 'error', preview: { host: '127.0.0.1', port: 0, strictPort: false, open: false } });
  const address = `http://127.0.0.1:${server.httpServer.address().port}`;
  browser = await chromium.launch({ channel: process.env.HAVEN_TEST_BROWSER || 'msedge', headless: true });
  report.environment.browser = browser.version();
  context = await browser.newContext({ viewport: { width: 1440, height: 960 }, deviceScaleFactor: 1, reducedMotion: 'no-preference' });
  await context.addInitScript(() => {
    const audit = { imageReads: [], activeUrls: new Set(), longTasks: [], startedAt: 0 };
    window.__memoryAudit = audit;
    const originalGet = IDBObjectStore.prototype.get;
    IDBObjectStore.prototype.get = function (key) {
      if (this.name === 'images' && Array.isArray(key)) audit.imageReads.push({ variant: key[1], at: performance.now() });
      return originalGet.call(this, key);
    };
    const create = URL.createObjectURL.bind(URL);
    const revoke = URL.revokeObjectURL.bind(URL);
    URL.createObjectURL = (blob) => { const url = create(blob); audit.activeUrls.add(url); return url; };
    URL.revokeObjectURL = (url) => { audit.activeUrls.delete(url); revoke(url); };
    try { new PerformanceObserver((list) => { for (const entry of list.getEntries()) audit.longTasks.push({ start: entry.startTime, duration: entry.duration }); }).observe({ type: 'longtask' }); } catch { /* Browser may not expose long tasks. */ }
  });
  const page = await context.newPage();
  observePage(page);
  await openMemory(page, address);
  const fixtures = await makeSyntheticImages(page);
  report.fixtures = { count: fixtures.length, width: 4000, height: 3000, formats: ['PNG', 'JPEG', 'WebP'],
    totalOriginalBytes: fixtures.reduce((sum, fixture) => sum + fixture.buffer.length, 0), generatedLocally: true };
  const session = await context.newCDPSession(page);
  await session.send('Performance.enable');
  report.beforeImport = await heapSample(session, page);
  await page.evaluate(() => { window.__memoryAudit.startedAt = performance.now(); });
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Add a Memory', exact: true }).click();
  const selected = await chooser;
  const started = performance.now();
  await selected.setFiles(fixtures);
  await settled(page, 12);
  report.import = { durationMs: performance.now() - started, includesFileChooserTransfer: true };
  report.thumbnails = await imageDetails(page);
  assert.equal(report.thumbnails.length, 12);
  for (const image of report.thumbnails) {
    assert.ok(image.width > 0 && image.height > 0 && Math.max(image.width, image.height) <= 640, 'Board must use bounded thumbnails.');
    assert.equal(image.rendering, 'auto', 'Photographs must not inherit pixelated rendering.');
  }
  report.imageReadsBeforeViewer = await page.evaluate(() => window.__memoryAudit.imageReads.map(({ variant }) => variant));
  assert.equal(report.imageReadsBeforeViewer.length, 12, 'Every thumbnail should be read through the managed image store.');
  assert.ok(report.imageReadsBeforeViewer.every((variant) => variant === 'thumbnail'), 'No original should be read by the board.');
  report.afterImport = await heapSample(session, page);
  const viewerDurations = [];
  for (let index = 0; index < 12; index += 1) {
    const openedAt = performance.now();
    await cards(page, 'photo').nth(index).press('Enter');
    const viewer = dialog(page, 'Fotografia ampliada');
    await expect.poll(() => viewer.locator('img').evaluate((image) => [image.naturalWidth, image.naturalHeight])).toEqual([4000, 3000]);
    assert.equal(await viewer.locator('img').evaluate((image) => getComputedStyle(image).objectFit), 'contain');
    viewerDurations.push(performance.now() - openedAt);
    if (index === 0) {
      await viewer.getByRole('button', { name: 'Ampliar fotografia', exact: true }).click();
      await viewer.getByRole('button', { name: 'Ajustar à janela', exact: true }).click();
      await page.screenshot({ path: path.join(output, 'Little-Haven-Memory-original.png'), fullPage: true });
    }
    await viewer.getByRole('button', { name: 'Voltar ao mural', exact: true }).click();
    await expect(viewer).toHaveCount(0);
  }
  report.viewers = { repetitions: 12, originalDimensions: [4000, 3000], durationsMs: viewerDurations,
    originalReads: await page.evaluate(() => window.__memoryAudit.imageReads.filter(({ variant }) => variant === 'original').length),
    activeObjectUrlsAfterClosing: await page.evaluate(() => window.__memoryAudit.activeUrls.size) };
  assert.equal(report.viewers.originalReads, 12, 'Each requested original must be read once on demand.');
  assert.equal(report.viewers.activeObjectUrlsAfterClosing, 12, 'Only mounted thumbnail URL leases should remain after closing originals.');
  report.afterViewers = await heapSample(session, page);
  report.importAndViewerLongTasksMs = await page.evaluate(() => window.__memoryAudit.longTasks
    .filter((entry) => entry.start >= window.__memoryAudit.startedAt).map(({ duration }) => duration));
  report.observation = await page.evaluate((duration) => new Promise((resolve) => {
    const intervals = []; const startedAt = performance.now(); let previous = startedAt;
    function frame(now) {
      intervals.push(now - previous); previous = now;
      if (now - startedAt < duration) { requestAnimationFrame(frame); return; }
      const sorted = [...intervals].sort((a, b) => a - b);
      resolve({ durationMs: now - startedAt, callbacks: intervals.length,
        callbackRatePerSecond: intervals.length * 1000 / (now - startedAt), p95IntervalMs: sorted[Math.floor(sorted.length * .95)],
        intervalsOver33ms: intervals.filter((interval) => interval > 33.5).length,
        longTasksMs: window.__memoryAudit.longTasks.filter((entry) => entry.start >= startedAt).map(({ duration: taskDuration }) => taskDuration),
        viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio }, hardwareConcurrency: navigator.hardwareConcurrency });
    }
    requestAnimationFrame(frame);
  }), observationMs);
  const movedId = await cards(page, 'photo').first().getAttribute('data-memory-id');
  const moved = page.locator(`.memory-card[data-memory-id="${movedId}"]`);
  const beforePosition = { x: Number(await moved.getAttribute('data-x')), y: Number(await moved.getAttribute('data-y')) };
  await moved.press('ArrowRight'); await moved.press('Shift+ArrowDown');
  await page.getByRole('button', { name: 'Trazer para frente', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(cards(page, 'photo').last()).toHaveAttribute('data-memory-id', movedId);
  await settled(page, 12);
  const afterPosition = { x: Number(await moved.getAttribute('data-x')), y: Number(await moved.getAttribute('data-y')) };
  assert.ok(afterPosition.x > beforePosition.x && afterPosition.y > beforePosition.y);
  await page.reload();
  await page.getByRole('button', { name: 'The Memory Corner', exact: true }).click();
  await settled(page, 12);
  const restored = page.locator(`.memory-card[data-memory-id="${movedId}"]`);
  assert.equal(Number(await restored.getAttribute('data-x')), afterPosition.x);
  assert.equal(Number(await restored.getAttribute('data-y')), afterPosition.y);
  report.persistence = { photographCount: 12, keyboardPositionBefore: beforePosition, keyboardPositionAfter: afterPosition,
    restoredPosition: afterPosition, frontItemPreserved: await cards(page, 'photo').last().getAttribute('data-memory-id') === movedId };
  assert.equal(report.persistence.frontItemPreserved, true, 'Keyboard layer order should survive reload.');
  await page.screenshot({ path: path.join(output, 'Little-Haven-Memory-stress-desktop.png'), fullPage: true });
  report.afterReload = await heapSample(session, page);

  // A smaller composition is created through the same confirmation/keyboard
  // interactions for visual review. Stress metrics above retain the 12-photo run.
  while (await cards(page, 'photo').count() > 3) {
    await cards(page, 'photo').last().click();
    await page.getByRole('button', { name: 'Remover lembrança', exact: true }).click();
    await dialog(page, 'Remover esta lembrança?').getByRole('button', { name: 'Confirmar remoção', exact: true }).click();
  }
  const captions = ['Uma lembrança em cores suaves.', 'Um pequeno instante de calma.', 'Um lugar inventado só para este ensaio.'];
  const frames = ['light-wood', 'polaroid', 'floral'];
  for (let index = 0; index < 3; index += 1) {
    await cards(page, 'photo').nth(index).click();
    await page.getByRole('button', { name: 'Editar lembrança', exact: true }).click();
    const editor = dialog(page, 'Editar fotografia');
    await editor.getByRole('combobox', { name: 'Moldura da fotografia', exact: true }).selectOption(frames[index]);
    await editor.getByLabel('Legenda da fotografia', { exact: true }).fill(captions[index]);
    await editor.getByRole('button', { name: 'Salvar fotografia', exact: true }).click();
  }
  await note(page, 'Café, manhã e carinho.\nAs pequenas coisas também importam.\n少しずつ — e\u0301 🌿', 'sage', 'lined');
  await note(page, 'Um lugar para o que importa.\nVocê pode ficar no seu tempo.', 'rose', 'torn');
  const itemIds = await cards(page).evaluateAll((elements) => elements.map((element) => element.dataset.memoryId));
  for (const [index, [x, y]] of [[.07, .1], [.5, .05], [.93, .13], [.12, .88], [.85, .88]].entries()) await positionWithKeyboard(page, itemIds[index], x, y);
  await page.keyboard.press('Escape');
  await settled(page, 3);
  await page.screenshot({ path: path.join(output, 'Little-Haven-Memory-desktop.png'), fullPage: true });
  await session.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 960, deviceScaleFactor: 2, mobile: false });
  await expect.poll(() => page.evaluate(() => devicePixelRatio)).toBe(2);
  await settled(page, 3);
  report.dpr2 = { viewport: await page.evaluate(() => ({ width: innerWidth, height: innerHeight, dpr: devicePixelRatio })), thumbnails: await imageDetails(page) };
  await page.screenshot({ path: path.join(output, 'Little-Haven-Memory-dpr2.png'), fullPage: true });
  const mobile = await context.newPage();
  observePage(mobile);
  await mobile.setViewportSize({ width: 390, height: 844 });
  await openMemory(mobile, address);
  await settled(mobile, 3);
  await expect(cards(mobile, 'note')).toHaveCount(2);
  report.mobile = await mobile.evaluate(() => ({ width: innerWidth, height: innerHeight, dpr: devicePixelRatio,
    horizontalOverflow: document.documentElement.scrollWidth > innerWidth }));
  assert.equal(report.mobile.horizontalOverflow, false, 'Mobile layout should remain within the viewport.');
  await mobile.screenshot({ path: path.join(output, 'Little-Haven-Memory-mobile.png'), fullPage: true });
  report.showcase = { photographs: 3, unicodeNotes: 2, containsOnlySyntheticContent: true };
  assert.equal(report.rendererErrors.length, 0, 'Renderer errors recorded during the audit.');
  assert.equal(report.externalRequests.length, 0, 'Unexpected external requests recorded during the audit.');
  report.completed = true;
} catch (error) {
  report.completed = false;
  report.failure = error.message;
  process.exitCode = 1;
} finally {
  await context?.close();
  await browser?.close();
  await server?.close();
  await mkdir(output, { recursive: true });
  await writeFile(path.join(output, 'memory-performance.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
}

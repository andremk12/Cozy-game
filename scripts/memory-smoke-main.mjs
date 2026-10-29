// Production main/preload/protocol, isolated profile and synthetic fixtures only.
import { app, BrowserWindow, dialog, nativeImage } from 'electron';
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { mkdir, readFile, readdir, stat, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const profileId = process.env.HAVEN_MEMORY_SMOKE_PROFILE_ID || randomUUID();
if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(profileId)) throw new Error('Invalid synthetic profile ID.');
const phase = process.env.HAVEN_MEMORY_SMOKE_PHASE || '1';
if (!['1', '2'].includes(phase)) throw new Error('Invalid memory smoke phase.');
const profile = path.join(root, 'work', `memory-smoke-${profileId}`);
const fixtures = path.join(profile, 'synthetic-fixtures');
// No awaits before importing main: its privileged local scheme must register
// before Electron's ready event. Neither this profile nor its images are personal.
mkdirSync(fixtures, { recursive: true });
app.setPath('userData', profile);
app.disableHardwareAcceleration();

let finished = false;
function finish(code) {
  if (finished) return;
  finished = true;
  if (code === 0) app.quit();
  else app.exit(code);
}

async function waitFor(check, message, timeout = 10_000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (await check()) return;
    await new Promise((resolve) => setTimeout(resolve, 40));
  }
  throw new Error(message);
}

async function click(window, selector, text) {
  if (!window.isVisible()) window.show();
  window.focus();
  await waitFor(() => window.webContents.executeJavaScript(`(() => {
    const text = ${JSON.stringify(text ?? null)};
    return [...document.querySelectorAll(${JSON.stringify(selector)})].some((node) =>
      (text === null || node.textContent.trim() === text) && !node.disabled
      && node.getClientRects().length > 0 && !node.closest('[inert]'));
  })()`), `Memory smoke control is unavailable: ${selector} / ${text ?? ''}`);
  const point = await window.webContents.executeJavaScript(`(() => {
    const candidates = [...document.querySelectorAll(${JSON.stringify(selector)})];
    const text = ${JSON.stringify(text ?? null)};
    const element = candidates.find((node) => (text === null || node.textContent.trim() === text)
      && !node.disabled && node.getClientRects().length > 0 && !node.closest('[inert]'));
    if (!element) throw new Error('Memory smoke control is missing or disabled: ' + ${JSON.stringify(selector)} + ' / ' + text);
    element.scrollIntoView({ block: 'center' });
    const rect = element.getBoundingClientRect();
    return { x: Math.round(rect.x + rect.width / 2), y: Math.round(rect.y + rect.height / 2) };
  })()`);
  if (!window.isVisible()) window.show();
  window.focus();
  await waitFor(() => window.isFocused(), 'Memory smoke window could not receive input.');
  window.webContents.sendInputEvent({ type: 'mouseMove', ...point });
  window.webContents.sendInputEvent({ type: 'mouseDown', button: 'left', clickCount: 1, ...point });
  window.webContents.sendInputEvent({ type: 'mouseUp', button: 'left', clickCount: 1, ...point });
}

function key(window, keyCode) {
  window.webContents.sendInputEvent({ type: 'keyDown', keyCode });
  window.webContents.sendInputEvent({ type: 'keyUp', keyCode });
}

function syntheticBitmap(width, height) {
  const pixels = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      const middle = x >= width / 4 && x < width * 3 / 4 && y >= height / 4 && y < height * 3 / 4;
      pixels[offset] = middle ? 121 : 116;
      pixels[offset + 1] = middle ? 189 : 92;
      pixels[offset + 2] = middle ? 231 : 66;
      pixels[offset + 3] = 255;
    }
  }
  return nativeImage.createFromBitmap(pixels, { width, height });
}

function withExifOrientation(jpeg, orientation) {
  assert.equal(jpeg.readUInt16BE(0), 0xffd8);
  const tiff = Buffer.alloc(26);
  tiff.write('II', 0, 'ascii');
  tiff.writeUInt16LE(42, 2);
  tiff.writeUInt32LE(8, 4);
  tiff.writeUInt16LE(1, 8);
  tiff.writeUInt16LE(0x0112, 10);
  tiff.writeUInt16LE(3, 12);
  tiff.writeUInt32LE(1, 14);
  tiff.writeUInt16LE(orientation, 18);
  const payload = Buffer.concat([Buffer.from('Exif\0\0', 'binary'), tiff]);
  const segment = Buffer.alloc(payload.length + 4);
  segment.writeUInt16BE(0xffe1, 0);
  segment.writeUInt16BE(payload.length + 2, 2);
  payload.copy(segment, 4);
  return Buffer.concat([jpeg.subarray(0, 2), segment, jpeg.subarray(2)]);
}

const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
const normalizeBoard = (board) => ({ ...board, items: board.items.map((item) => {
  if (item.kind !== 'photo') return item;
  const { imageId: _imageId, ...card } = item;
  return card;
}) });
async function referencedOriginalHashes(directory, board) {
  const names = await readdir(directory);
  const ids = [...new Set(board.items.filter(({ kind }) => kind === 'photo').map(({ imageId }) => imageId))];
  return Promise.all(ids.map(async (id) => {
    const name = names.find((entry) => entry.startsWith(`${id}.`) && /\.(png|jpg|webp)$/.test(entry));
    assert.ok(name, 'Referenced managed original is missing.');
    return digest(await readFile(path.join(directory, name)));
  }));
}
let importPaths = [];
let restorePath;
const backupPath = path.join(fixtures, 'synthetic-board.haven-memory');
let importDialogs = 0;
let restoreDialogs = 0;
let exportDialogs = 0;

dialog.showOpenDialog = async (_parent, options) => {
  assert.ok(options.filters?.length, 'Native file selection should restrict expected formats.');
  if (options.properties?.includes('multiSelections')) {
    importDialogs += 1;
    return { canceled: false, filePaths: importPaths };
  }
  restoreDialogs += 1;
  return { canceled: !restorePath, filePaths: restorePath ? [restorePath] : [] };
};
dialog.showSaveDialog = async (_parent, options) => {
  assert.ok(options.filters?.length);
  exportDialogs += 1;
  return { canceled: false, filePath: backupPath };
};
dialog.showMessageBox = async (_parent, options) => {
  assert.equal(options.defaultId, 0, 'Destructive restore should default to cancel.');
  assert.equal(options.cancelId, 0, 'Destructive restore should cancel on Escape.');
  return { response: 1, checkboxChecked: false };
};

async function enterMemory(window) {
  await click(window, '.world-navigation [aria-label="The Memory Corner"]');
  await waitFor(() => window.webContents.executeJavaScript(`Boolean(document.querySelector('.memory-board')
    && [...document.querySelectorAll('button')].find((button) => button.textContent.trim() === 'Write a Note' && !button.disabled))`), 'Memory Corner did not become writable.');
}

async function verifyViewer(window, index, expectedSize) {
  const evaluate = (source) => window.webContents.executeJavaScript(source);
  await evaluate(`document.querySelectorAll('.memory-card[data-kind="photo"]')[${index}].focus(); true;`);
  key(window, 'Return');
  await waitFor(() => evaluate(`Boolean(document.querySelector('dialog[open] img[src*="/original"]')?.naturalWidth)`), 'Original photo did not load in the enlarged viewer.');
  const quality = await evaluate(`(() => {
    const image = document.querySelector('dialog[open] img[src*="/original"]');
    const style = getComputedStyle(image);
    return { width: image.naturalWidth, height: image.naturalHeight, rendering: style.imageRendering, fit: style.objectFit };
  })()`);
  assert.deepEqual([quality.width, quality.height], expectedSize, 'Original resolution or EXIF orientation was lost.');
  assert.equal(quality.fit, 'contain');
  assert.notEqual(quality.rendering, 'pixelated');
  await click(window, 'dialog[open] button', 'Voltar ao mural');
  await waitFor(() => evaluate(`!document.querySelector('dialog[open] img[src*="/original"]')`), 'Closing the viewer retained its original image DOM.');
}

async function reloadMemory(window) {
  const loaded = new Promise((resolve) => window.webContents.once('did-finish-load', resolve));
  window.webContents.reload();
  await loaded;
  await waitFor(() => window.webContents.executeJavaScript(`Boolean(document.querySelector('.world-navigation'))`), 'React did not mount after reloading.');
  await enterMemory(window);
}

async function run(window) {
  const evaluate = (source) => window.webContents.executeJavaScript(source);
  const getBoard = async () => (await evaluate('window.haven.memoryGet()')).board;
  const preferences = window.webContents.getLastWebPreferences();
  assert.equal(preferences.contextIsolation, true);
  assert.equal(preferences.nodeIntegration, false);
  assert.equal(preferences.sandbox, true);
  assert.equal(await evaluate(`typeof window.require === 'undefined' && typeof window.process === 'undefined'`), true);
  for (const method of ['memoryGet', 'memorySave', 'memoryImport', 'memoryExport', 'memoryRestore']) {
    assert.equal(await evaluate(`typeof window.haven[${JSON.stringify(method)}]`), 'function');
  }
  await enterMemory(window);

  const png = syntheticBitmap(1920, 1080).toPNG();
  const jpeg = withExifOrientation(syntheticBitmap(400, 240).toJPEG(95), 6);
  const webp = Buffer.from(await evaluate(`(() => {
    const canvas = document.createElement('canvas'); canvas.width = 1280; canvas.height = 960;
    const context = canvas.getContext('2d'); context.fillStyle = '#6b8d78'; context.fillRect(0, 0, 1280, 960);
    return canvas.toDataURL('image/webp', .95).split(',')[1];
  })()`), 'base64');
  const originalBytes = [png, jpeg, webp];
  importPaths = [path.join(fixtures, 'synthetic-landscape.png'), path.join(fixtures, 'synthetic-orientation-6.jpg'), path.join(fixtures, 'synthetic-webp.webp'), path.join(fixtures, 'invalid.png')];
  await Promise.all(importPaths.map((filename, index) => writeFile(filename, originalBytes[index] ?? Buffer.from('<svg>invalid synthetic image</svg>'))));
  await click(window, 'button', 'Add a Memory');
  await waitFor(async () => (await getBoard()).items.filter(({ kind }) => kind === 'photo').length === 3, 'The three real formats were not imported or invalid bytes were accepted.');
  assert.equal(importDialogs, 1);
  await waitFor(() => evaluate(`document.querySelectorAll('.memory-card[data-kind="photo"]').length === 3
    && [...document.querySelectorAll('.memory-card[data-kind="photo"] img')].every((image) => image.complete && image.naturalWidth > 0)`), 'Managed thumbnails did not load.');
  const thumbnailQuality = await evaluate(`[...document.querySelectorAll('.memory-card[data-kind="photo"] img')].map((image) => ({
    size: [image.naturalWidth, image.naturalHeight], source: image.src, rendering: getComputedStyle(image).imageRendering,
  }))`);
  for (const thumbnail of thumbnailQuality) {
    assert.ok(thumbnail.source.startsWith('haven-memory://local/'));
    assert.ok(thumbnail.source.endsWith('/thumbnail'));
    assert.ok(Math.max(...thumbnail.size) <= 640);
    assert.notEqual(thumbnail.rendering, 'pixelated');
  }
  assert.ok(Math.abs(thumbnailQuality[1].size[0] / thumbnailQuality[1].size[1] - .6) < .005,
    'EXIF orientation must also apply to the thumbnail.');
  const imageDirectory = path.join(profile, 'memory-corner', 'images');
  const managedHashes = await Promise.all((await readdir(imageDirectory)).map(async (name) => digest(await readFile(path.join(imageDirectory, name)))));
  for (const bytes of originalBytes) assert.ok(managedHashes.includes(digest(bytes)), 'Managed import changed original bytes.');
  for (const sourcePath of importPaths) await unlink(sourcePath);

  await click(window, 'button', 'Write a Note');
  await waitFor(() => evaluate(`Boolean(document.querySelector('dialog[open] textarea'))`), 'Note editor did not open.');
  await evaluate(`document.querySelector('dialog[open] textarea').focus(); true;`);
  const noteText = 'Lembrança sintética: árvore e chá.\n少しずつ — e\u0301';
  await window.webContents.insertText(noteText);
  await click(window, 'dialog[open] button', 'Fixar bilhete');
  await waitFor(async () => (await getBoard()).items.some((item) => item.text === noteText), 'Native note did not save.');
  const board = await getBoard();
  assert.equal(board.items.length, 4);
  assert.equal(JSON.stringify(board).includes(fixtures), false, 'Renderer board must not expose source paths.');
  await reloadMemory(window);
  await waitFor(() => evaluate(`document.querySelectorAll('.memory-card[data-kind="photo"]').length === 3
    && [...document.querySelectorAll('.memory-card[data-kind="photo"] img')].every((image) => image.complete && image.naturalWidth > 0)`), 'Imported photos depended on their deleted source paths.');
  assert.deepEqual(await getBoard(), board, 'Reloading must restore the same board.');
  await verifyViewer(window, 0, [1920, 1080]);
  await verifyViewer(window, 1, [240, 400]);
  await verifyViewer(window, 2, [1280, 960]);
  await waitFor(() => BrowserWindow.getAllWindows().length === 1, 'Image decoder retained an auxiliary BrowserWindow.');

  await click(window, '[aria-label="Personalizar mural"]');
  await click(window, 'dialog[open] button', 'Exportar backup');
  await waitFor(async () => { try { return (await stat(backupPath)).size > 0; } catch { return false; } }, 'Native backup was not written.');
  assert.equal(exportDialogs, 1);
  key(window, 'Escape');
  const corruptPath = path.join(fixtures, 'corrupted.haven-memory');
  const backup = await readFile(backupPath);
  await writeFile(corruptPath, backup.subarray(0, Math.max(1, Math.floor(backup.length / 2))));
  restorePath = corruptPath;
  const rejectedRestore = await evaluate(`window.haven.memoryRestore().then(() => false, () => true)`);
  assert.equal(rejectedRestore, true, 'A truncated backup was accepted.');
  assert.deepEqual(await getBoard(), board, 'Failed restore changed the existing board.');
  const changed = { ...board, theme: 'garden', items: board.items.filter(({ kind }) => kind === 'note') };
  await evaluate(`window.haven.memorySave(${JSON.stringify(changed)})`);
  assert.deepEqual(await getBoard(), changed);
  restorePath = backupPath;
  await evaluate('window.haven.memoryRestore()');
  assert.ok(restoreDialogs >= 2);
  assert.deepEqual(normalizeBoard(await getBoard()), normalizeBoard(board), 'Complete backup did not restore photographs, notes and layout.');
  const restoredHashes = await referencedOriginalHashes(imageDirectory, await getBoard());
  assert.deepEqual(restoredHashes.sort(), originalBytes.map(digest).sort(), 'Restored images did not retain their exact original bytes.');
  await reloadMemory(window);
  await waitFor(() => evaluate(`document.querySelectorAll('.memory-card[data-kind="photo"]').length === 3
    && [...document.querySelectorAll('.memory-card[data-kind="photo"] img')].every((image) => image.complete && image.naturalWidth > 0)`), 'Restored managed images did not load.');

  const rejectedField = await evaluate(`window.haven.memorySave({ ...${JSON.stringify(board)}, arbitrary: 'SYNTHETIC_FIELD' }).then(() => false, () => true)`);
  assert.equal(rejectedField, true, 'Unknown memory fields crossed the bridge.');
  const invalidReference = { ...board, items: [{ ...board.items.find(({ kind }) => kind === 'photo'), imageId: '../../preferences' }] };
  assert.equal(await evaluate(`window.haven.memorySave(${JSON.stringify(invalidReference)}).then(() => false, () => true)`), true);
  const securityURLs = [
    'haven-memory://local/00000000-0000-4000-8000-000000000000/original',
    'haven-memory://local/%2e%2e%2fpreferences.json/original',
    `haven-memory://local/${board.items.find(({ kind }) => kind === 'photo').imageId}/original?path=../../preferences.json`,
    pathToFileURL(backupPath).href,
  ];
  for (const url of securityURLs) {
    const loaded = await evaluate(`new Promise((resolve) => { const image = new Image(); image.onload = () => resolve(true); image.onerror = () => resolve(false); image.src = ${JSON.stringify(url)}; })`);
    assert.equal(loaded, false, 'Unauthorized image URL loaded.');
  }

  await click(window, '.world-navigation [aria-label="Let It Float"]');
  await waitFor(() => evaluate(`Boolean(document.querySelector('textarea'))`), 'Writing ritual did not open.');
  await evaluate(`document.querySelector('textarea').focus(); true;`);
  const privateDraft = 'MEMORY_NATIVE_PRIVATE_SYNTHETIC_745902';
  await window.webContents.insertText(privateDraft);
  await click(window, '.world-navigation [aria-label="The Memory Corner"]');
  await waitFor(() => evaluate(`Boolean([...document.querySelectorAll('button')].find((button) => button.textContent.trim() === 'Continuar escrevendo'))`), 'Memory navigation bypassed the private draft guard.');
  await click(window, 'button', 'Continuar escrevendo');
  assert.equal(await evaluate('document.querySelector("textarea").value'), privateDraft);
  assert.equal(JSON.stringify(await getBoard()).includes(privateDraft), false);
  assert.equal((await readFile(path.join(profile, 'memory-corner', 'board.json'), 'utf8')).includes(privateDraft), false);
  await click(window, '.world-navigation [aria-label="The Memory Corner"]');
  await click(window, 'button', 'Descartar e sair');
  await waitFor(() => evaluate(`Boolean(document.querySelector('.memory-board'))`), 'Discard did not return to the mural.');

  await evaluate(`window.__memorySmokeBoard = document.querySelector('.memory-board'); true;`);
  await click(window, '[aria-label="Modo Imersivo"]');
  await waitFor(async () => window.isFullScreen() && await evaluate(`Boolean(document.fullscreenElement?.contains(window.__memorySmokeBoard))`), 'Memory Corner did not enter native fullscreen with the same mural.');
  await waitFor(() => evaluate(`document.fullscreenElement?.matches('.memory-viewport.is-immersive') && document.hasFocus()`), 'The fullscreen mural did not settle its React state and focus.');
  await evaluate(`new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve(true))))`);
  await evaluate(`document.querySelector('.memory-card[data-kind="note"]').focus(); true;`);
  key(window, 'Return');
  try {
    await waitFor(() => evaluate(`document.fullscreenElement?.querySelector('dialog[open]')?.dataset.keyboardLock === 'true'`), 'Note viewer did not capture native contextual Escape.');
  } catch (error) {
    const state = await evaluate(`({ fullscreen: Boolean(document.fullscreenElement), focused: document.activeElement?.className,
      dialogs: [...document.querySelectorAll('dialog[open]')].map((element) => ({ className: element.className, lock: element.dataset.keyboardLock })) })`);
    throw new Error(error.message + ' ' + JSON.stringify(state));
  }
  key(window, 'Escape');
  await waitFor(() => evaluate(`!document.querySelector('dialog[open]')`), 'Contextual Escape did not close the memory viewer.');
  assert.equal(window.isFullScreen(), true);
  key(window, 'M');
  await waitFor(() => evaluate(`document.fullscreenElement?.querySelector('dialog.sound-mixer[open]')?.dataset.keyboardLock === 'true'`), 'Mixer did not open inside Memory Corner fullscreen.');
  key(window, 'Escape');
  await waitFor(() => evaluate(`!document.querySelector('dialog.sound-mixer[open]')`), 'Escape did not close the immersive mixer.');
  key(window, 'C');
  await waitFor(() => evaluate(`document.fullscreenElement?.querySelector('dialog.companion-panel[open]')?.dataset.keyboardLock === 'true'`), 'Companion settings did not open inside Memory Corner fullscreen.');
  key(window, 'Escape');
  await waitFor(() => evaluate(`!document.querySelector('dialog.companion-panel[open]')`), 'Escape did not close the immersive companion panel.');
  assert.equal(window.isFullScreen(), true);
  key(window, 'Escape');
  await waitFor(async () => !window.isFullScreen() && await evaluate('document.fullscreenElement === null'), 'Escape did not leave Memory Corner fullscreen.');
  assert.equal(await evaluate('document.querySelector(".memory-board") === window.__memorySmokeBoard'), true);
  await mkdir(path.join(root, 'outputs'), { recursive: true });
  await writeFile(path.join(root, 'outputs', 'Little-Haven-Memory-Corner-native.png'), (await window.webContents.capturePage()).toPNG());
  const result = {
    formats: 'PNG, JPEG EXIF 6 and WebP',
    originals: 'SHA-256 identical; source files deleted; originals and thumbnails restored',
    notes: 'native Unicode multiline text saved and restored',
    backup: 'complete restore and truncated archive rejection preserve existing data',
    security: 'sandbox, isolated bridge, unknown fields, invalid references and unauthorized URLs rejected',
    privacy: 'Let It Float draft absent from the memory board and managed JSON',
    fullscreen: 'same mural, native contextual Escape, mixer and companion',
    memory: app.getAppMetrics().map(({ type, memory }) => ({ type, memory })),
  };
  await writeFile(path.join(root, 'outputs', 'memory-smoke.json'), JSON.stringify(result, null, 2));
  await writeFile(path.join(fixtures, 'synthetic-expectations.json'), JSON.stringify({
    board: normalizeBoard(await getBoard()), originalHashes: originalBytes.map(digest).sort(),
  }));
  console.log(`Memory Corner smoke passed: ${JSON.stringify({ ...result, memory: 'process snapshot in outputs/memory-smoke.json; no heap/fatigue profiling' })}`);
}

async function verifyReopenedProcess(window) {
  const evaluate = (source) => window.webContents.executeJavaScript(source);
  await enterMemory(window);
  const expected = JSON.parse(await readFile(path.join(fixtures, 'synthetic-expectations.json'), 'utf8'));
  assert.ok(Array.isArray(expected.originalHashes) && expected.originalHashes.length === 3
    && expected.originalHashes.every((hash) => /^[a-f0-9]{64}$/.test(hash)), 'Synthetic restart fixture is invalid.');
  const board = (await evaluate('window.haven.memoryGet()')).board;
  assert.deepEqual(normalizeBoard(board), expected.board, 'A new Electron process did not restore the saved board.');
  assert.equal(board.items.filter(({ kind }) => kind === 'photo').length, 3);
  assert.equal(board.items.filter(({ kind }) => kind === 'note').length, 1);
  for (const name of ['synthetic-landscape.png', 'synthetic-orientation-6.jpg', 'synthetic-webp.webp', 'invalid.png']) {
    await assert.rejects(stat(path.join(fixtures, name)), (error) => error.code === 'ENOENT', 'Original source fixture unexpectedly survived.');
  }
  await waitFor(() => evaluate(`document.querySelectorAll('.memory-card[data-kind="photo"]').length === 3
    && [...document.querySelectorAll('.memory-card[data-kind="photo"] img')].every((image) => image.complete && image.naturalWidth > 0)`), 'A new Electron process could not load the managed thumbnails.');
  const imageDirectory = path.join(profile, 'memory-corner', 'images');
  const hashes = await referencedOriginalHashes(imageDirectory, board);
  assert.deepEqual(hashes.sort(), expected.originalHashes, 'A new Electron process did not preserve original bytes.');
  await verifyViewer(window, 1, [240, 400]);
  console.log('Memory Corner reopen passed: new Electron process, same saved layout/notes, deleted source paths, managed originals and EXIF-aware viewer.');
}

let started = false;
const rendererErrors = [];
app.on('browser-window-created', (_event, window) => {
  window.webContents.on('console-message', (event) => {
    if (event.level === 'error') rendererErrors.push(event.message);
  });
  window.webContents.on('preload-error', (_event, _file, error) => rendererErrors.push(error.message));
  // Production creates the main window first. Decoder windows are only created
  // later, after this test explicitly imports an image. Electron may not expose
  // the preload path in getLastWebPreferences at constructor-event time.
  if (started) return;
  started = true;
  window.webContents.once('did-finish-load', async () => {
    try {
      await waitFor(() => window.webContents.executeJavaScript(`Boolean(document.querySelector('.world-navigation'))`), 'Little Haven did not mount.');
      if (phase === '2') await verifyReopenedProcess(window);
      else await run(window);
      finish(0);
    } catch (error) {
      console.error(`Memory Corner smoke failed: ${error.message}`);
      if (rendererErrors.length) console.error(`Synthetic profile diagnostics: ${rendererErrors.join('; ')}`);
      finish(1);
    }
  });
});

await import('../electron/main/index.js');

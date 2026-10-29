import { BrowserWindow, ipcMain, protocol, session } from 'electron';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import { inspectMemoryImage, MEMORY_LIMITS } from '../../shared/memory.js';
import { parseMemoryImageUrl } from './security.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const decoderFile = path.join(root, 'electron/services/memory-decoder.html');
const decoderPage = pathToFileURL(decoderFile).href;
const decoderResources = new Set([
  decoderPage,
  pathToFileURL(path.join(root, 'electron/services/memory-decoder.js')).href,
  pathToFileURL(path.join(root, 'shared/memoryImage.js')).href,
]);

export function registerMemoryScheme() {
  protocol.registerSchemesAsPrivileged([{ scheme: 'haven-memory', privileges: { standard: true, secure: true } }]);
}

export async function decodeMemoryImage(bytes, mime) {
  const header = inspectMemoryImage(bytes);
  if (header.mime !== mime) throw new Error('Invalid memory image.');
  // A short-lived, sandboxed Chromium renderer supports WebP and EXIF without
  // adding a native codec dependency or exposing originals to the app renderer.
  const isolated = session.fromPartition(`memory-decoder-${randomUUID()}`);
  isolated.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  isolated.setPermissionCheckHandler(() => false);
  isolated.webRequest.onBeforeRequest((details, callback) => callback({ cancel: !decoderResources.has(details.url) }));
  isolated.on('will-download', (event) => event.preventDefault());
  const decoder = new BrowserWindow({ show: false, width: 64, height: 64,
    webPreferences: { session: isolated, preload: path.join(root, 'electron/preload/memory-decoder.cjs'),
      contextIsolation: true, sandbox: true, nodeIntegration: false, webSecurity: true,
      allowRunningInsecureContent: false, webviewTag: false, spellcheck: false, backgroundThrottling: false } });
  decoder.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  decoder.webContents.on('will-navigate', (event) => event.preventDefault());
  decoder.webContents.on('will-frame-navigate', (event) => event.preventDefault());
  decoder.webContents.on('will-attach-webview', (event) => event.preventDefault());
  let timeout;
  let ready;
  let decoded;
  try {
    return await new Promise((resolve, reject) => {
      const fail = () => reject(new Error('This image could not be decoded.'));
      const trusted = (event) => event.sender === decoder.webContents
        && event.senderFrame === decoder.webContents.mainFrame && event.senderFrame.url === decoderPage;
      ready = (event) => {
        if (trusted(event)) decoder.webContents.send('haven:memory:decode', { bytes: new Uint8Array(bytes), mime });
      };
      decoded = (event, result) => {
        if (!trusted(event)) return;
        try {
          if (!result || !Number.isInteger(result.width) || !Number.isInteger(result.height)
            || !((result.width === header.width && result.height === header.height)
              || (result.width === header.height && result.height === header.width))
            || !(result.thumbnail instanceof Uint8Array) || result.thumbnail.byteLength > 2 * 1024 * 1024) throw new Error();
          const thumbnail = Buffer.from(result.thumbnail);
          const thumbHeader = inspectMemoryImage(thumbnail);
          if (thumbHeader.mime !== 'image/png' || thumbHeader.width > 640 || thumbHeader.height > 640) throw new Error();
          resolve({ width: result.width, height: result.height, thumbnail });
        } catch { fail(); }
      };
      ipcMain.on('haven:memory:decoder-ready', ready);
      ipcMain.on('haven:memory:decoded', decoded);
      timeout = setTimeout(fail, 15_000);
      decoder.webContents.once('render-process-gone', fail);
      void decoder.loadFile(decoderFile).catch(fail);
    });
  } finally {
    clearTimeout(timeout);
    if (ready) ipcMain.removeListener('haven:memory:decoder-ready', ready);
    if (decoded) ipcMain.removeListener('haven:memory:decoded', decoded);
    if (!decoder.isDestroyed()) decoder.destroy();
  }
}

export function registerMemoryCorner({ ipcMain: ipc, session: localSession, dialog, store, verifySender, getWindow }) {
  let dialogBusy = false;
  const guarded = (handler) => async (event, ...args) => {
    verifySender(event);
    try { return await handler(...args); }
    catch { throw new Error('Não foi possível concluir a operação do mural. Seus arquivos existentes foram preservados.'); }
  };
  const noArguments = (args) => { if (args.length) throw new TypeError('Unexpected memory arguments.'); };
  const choose = async (action) => {
    if (dialogBusy) return { canceled: true };
    dialogBusy = true;
    try { return await action(); } finally { dialogBusy = false; }
  };
  ipc.handle('haven:memory:get', guarded((...args) => { noArguments(args); return store.get(); }));
  ipc.handle('haven:memory:save', guarded((...args) => {
    if (args.length !== 1) throw new TypeError('Invalid memory save.');
    return store.save(args[0]);
  }));
  ipc.handle('haven:memory:import', guarded((...args) => {
    noArguments(args);
    return choose(async () => {
      const selection = await dialog.showOpenDialog(getWindow(), { title: 'Add a Memory',
        properties: ['openFile', 'multiSelections'], filters: [{ name: 'Fotografias', extensions: ['jpg', 'jpeg', 'png', 'webp'] }] });
      if (selection.canceled || !selection.filePaths.length) return { canceled: true };
      if (selection.filePaths.length > MEMORY_LIMITS.maxItems) throw new Error('Too many memories.');
      return { ...await store.importImages(selection.filePaths), canceled: false };
    });
  }));
  ipc.handle('haven:memory:export', guarded((...args) => {
    noArguments(args);
    return choose(async () => {
      const selection = await dialog.showSaveDialog(getWindow(), { title: 'Guardar backup do mural',
        defaultPath: 'Little-Haven.haven-memory', filters: [{ name: 'Little Haven Memory Backup', extensions: ['haven-memory'] }] });
      if (selection.canceled || !selection.filePath) return { canceled: true };
      await store.exportBackup(selection.filePath);
      return { canceled: false };
    });
  }));
  ipc.handle('haven:memory:restore', guarded((...args) => {
    noArguments(args);
    return choose(async () => {
      const selection = await dialog.showOpenDialog(getWindow(), { title: 'Restaurar mural de um backup', properties: ['openFile'],
        filters: [{ name: 'Little Haven Memory Backup', extensions: ['haven-memory'] }] });
      if (selection.canceled || selection.filePaths.length !== 1) return { canceled: true };
      const confirmation = await dialog.showMessageBox(getWindow(), { type: 'question', title: 'Restaurar lembranças?',
        message: 'Substituir o mural atual pelo backup escolhido?',
        detail: 'O arquivo será validado antes da troca. Se algo falhar, o mural atual será preservado. Guarde um backup do mural atual se quiser mantê-lo.',
        buttons: ['Cancelar', 'Restaurar mural'], defaultId: 0, cancelId: 0, noLink: true });
      if (confirmation.response !== 1) return { canceled: true };
      return { board: await store.restoreBackup(selection.filePaths[0]), canceled: false };
    });
  }));
  localSession.protocol.handle('haven-memory', async (request) => {
    const resource = parseMemoryImageUrl(request.url);
    if (!resource || request.method !== 'GET') return new Response(null, { status: 404 });
    try {
      const image = await store.readImage(resource.imageId, resource.variant);
      return new Response(new Uint8Array(image.bytes), { headers: {
        'Content-Type': image.mime, 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store',
        'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
      } });
    } catch { return new Response(null, { status: 404 }); }
  });
}

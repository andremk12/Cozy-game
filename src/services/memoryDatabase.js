import { createMemoryBoard, inspectMemoryImage, MEMORY_LIMITS, validateMemoryBoard } from '../../shared/memory.js';
import { makeMemoryThumbnail } from '../../shared/memoryImage.js';

export const MEMORY_DATABASE = 'little-haven-memory-v1';

const requestValue = (request) => new Promise((resolve, reject) => {
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(new Error('Memory storage unavailable.'));
});
const transactionDone = (transaction) => new Promise((resolve, reject) => {
  transaction.oncomplete = resolve;
  transaction.onabort = transaction.onerror = () => reject(new Error('Memory storage unavailable.'));
});

// Browser development uses Blob records, never localStorage or base64 JSON.
// The Windows desktop uses the independently managed Electron directory.
export function createMemoryDatabase(factory = globalThis.indexedDB) {
  let database;
  let opening;
  let current = createMemoryBoard();
  let writable = false;
  const authorized = new Set();

  async function open() {
    if (!opening) {
      const attempt = new Promise((resolve, reject) => {
        if (!factory) { reject(new Error('Memory storage unavailable.')); return; }
        const request = factory.open(MEMORY_DATABASE, 1);
        let failed = false;
        request.onupgradeneeded = () => {
          for (const name of ['board', 'assets', 'images']) request.result.createObjectStore(name);
        };
        request.onsuccess = () => {
          if (failed) { request.result.close(); return; }
          database = request.result;
          const opened = database;
          database.onversionchange = () => {
            opened.close();
            if (database === opened) { database = undefined; opening = undefined; }
          };
          resolve(database);
        };
        request.onerror = request.onblocked = () => { failed = true; reject(new Error('Memory storage unavailable.')); };
      });
      opening = attempt;
      void attempt.catch(() => { if (opening === attempt) opening = undefined; });
    }
    return opening;
  }

  async function get() {
    const db = await open();
    const transaction = db.transaction('board', 'readonly');
    const finished = transactionDone(transaction);
    const stored = await requestValue(transaction.objectStore('board').get('current'));
    await finished;
    let status = 'ready';
    try {
      if (stored === undefined) { current = createMemoryBoard(); status = 'missing'; }
      else if (typeof stored.version === 'number' && stored.version > 1) {
        writable = false;
        return { board: createMemoryBoard(), status: 'future', writable: false };
      } else current = validateMemoryBoard(stored);
    } catch { return { board: createMemoryBoard(), status: 'invalid', writable: false }; }
    writable = true;
    authorized.clear();
    for (const item of current.items) if (item.kind === 'photo') authorized.add(item.imageId);
    // Purge only orphan records from earlier sessions. Current-session removals
    // stay available to undo until the next launch.
    const cleanup = db.transaction(['assets', 'images'], 'readwrite');
    const cleanupDone = transactionDone(cleanup);
    const cursor = cleanup.objectStore('assets').openKeyCursor();
    cursor.onsuccess = () => {
      const row = cursor.result;
      if (!row) return;
      if (!authorized.has(row.key)) {
        cleanup.objectStore('assets').delete(row.key);
        cleanup.objectStore('images').delete([row.key, 'thumbnail']);
        cleanup.objectStore('images').delete([row.key, 'original']);
      }
      row.continue();
    };
    await cleanupDone;
    return { board: validateMemoryBoard(current), status, writable };
  }

  async function save(value) {
    if (!writable) throw new Error('Memory document is read-only.');
    const board = validateMemoryBoard(value);
    if (board.items.some((item) => item.kind === 'photo' && !authorized.has(item.imageId))) throw new Error('Unknown memory image.');
    const db = await open();
    const transaction = db.transaction('board', 'readwrite');
    const finished = transactionDone(transaction);
    transaction.objectStore('board').put(board, 'current');
    await finished;
    current = board;
    return validateMemoryBoard(board);
  }

  async function importFiles(files) {
    if (!writable) throw new Error('Memory document is read-only.');
    if (files.length > MEMORY_LIMITS.maxItems) throw new Error('Too many images.');
    const db = await open();
    const assetsTransaction = db.transaction('assets', 'readonly');
    const assetsDone = transactionDone(assetsTransaction);
    const existing = await requestValue(assetsTransaction.objectStore('assets').getAll());
    await assetsDone;
    let totalBytes = existing.reduce((sum, asset) => sum + asset.bytes, 0);
    const additions = [];
    let rejected = 0;
    for (const file of files) {
      if (current.items.length + additions.length >= MEMORY_LIMITS.maxItems || !file.size
        || file.size > MEMORY_LIMITS.maxImageBytes || totalBytes + file.size > MEMORY_LIMITS.maxOriginalBytes) {
        rejected += 1;
        continue;
      }
      try {
        const bytes = new Uint8Array(await file.arrayBuffer());
        const header = inspectMemoryImage(bytes);
        const original = new Blob([bytes], { type: header.mime });
        const decoded = await makeMemoryThumbnail(original);
        const imageId = crypto.randomUUID();
        additions.push({ imageId, original, thumbnail: decoded.thumbnail,
          asset: { bytes: file.size, mime: header.mime, width: decoded.width, height: decoded.height } });
        totalBytes += file.size;
      } catch { rejected += 1; }
    }
    if (!additions.length) return { board: validateMemoryBoard(current), imported: 0, rejected };
    const items = additions.map(({ imageId }, index) => ({ id: crypto.randomUUID(), kind: 'photo', imageId,
      x: 0.12 + ((current.items.length + index) % 4) * 0.22,
      y: 0.12 + (Math.floor((current.items.length + index) / 4) % 3) * 0.28,
      rotation: 0, frame: 'polaroid', caption: '' }));
    const board = validateMemoryBoard({ ...current, items: [...current.items, ...items] });
    const transaction = db.transaction(['board', 'images', 'assets'], 'readwrite');
    const finished = transactionDone(transaction);
    for (const addition of additions) {
      transaction.objectStore('assets').put(addition.asset, addition.imageId);
      transaction.objectStore('images').put(addition.original, [addition.imageId, 'original']);
      transaction.objectStore('images').put(addition.thumbnail, [addition.imageId, 'thumbnail']);
    }
    transaction.objectStore('board').put(board, 'current');
    await finished;
    additions.forEach(({ imageId }) => authorized.add(imageId));
    current = board;
    return { board: validateMemoryBoard(board), imported: additions.length, rejected };
  }

  async function image(imageId, variant) {
    if (!authorized.has(imageId) || !['thumbnail', 'original'].includes(variant)) throw new Error('Unknown memory image.');
    const db = await open();
    const transaction = db.transaction('images', 'readonly');
    const finished = transactionDone(transaction);
    const blob = await requestValue(transaction.objectStore('images').get([imageId, variant]));
    await finished;
    if (!(blob instanceof Blob)) throw new Error('Memory image unavailable.');
    return blob;
  }

  return { get, save, importFiles, image, close() { database?.close(); database = undefined; opening = undefined; } };
}

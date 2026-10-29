import test from 'node:test';
import assert from 'node:assert/strict';
import { createMemoryStore } from '../src/services/memory.js';
import { createMemoryBoard } from '../shared/memory.js';

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const boardResult = (board = createMemoryBoard()) => ({ board, writable: true, status: 'ready' });
const note = { id: '11111111-1111-4111-8111-111111111111', kind: 'note', x: 0.3, y: 0.4,
  rotation: 0, text: 'SYNTHETIC lembrança\nAcentos: coração. 日本語.', paper: 'sage', style: 'plain' };

test('memory initializes only on demand and blocks edits before restoration or for future documents', async () => {
  let reads = 0;
  const restore = deferred();
  const writes = [];
  const store = createMemoryStore({ bridge: { memoryGet() { reads++; return restore.promise; }, memorySave(value) { writes.push(value); } } });
  assert.equal(reads, 0);
  const initialization = store.initialize();
  assert.equal(store.updateBoard({ ...createMemoryBoard(), items: [note] }), false);
  restore.resolve({ board: createMemoryBoard(), writable: false, status: 'future' });
  await initialization;
  assert.equal(reads, 1);
  assert.equal(store.getSnapshot().writable, false);
  assert.equal(store.updateBoard({ ...createMemoryBoard(), items: [note] }), false);
  assert.equal(writes.length, 0);
  assert.match(store.getSnapshot().error, /preservado/);
});

test('accepted edits reach desktop IPC immediately and old acknowledgments never replace a later board', async () => {
  const calls = [];
  const first = deferred();
  const second = deferred();
  const store = createMemoryStore({ bridge: { memoryGet: async () => boardResult(), memorySave(board) {
    calls.push(board); return calls.length === 1 ? first.promise : second.promise;
  } } });
  await store.initialize();
  store.updateBoard((board) => ({ ...board, items: [note] }));
  store.updateBoard((board) => ({ ...board, theme: 'moonlight' }));
  assert.equal(calls.length, 2);
  assert.equal(store.getSnapshot().saving, true);
  second.resolve(calls[1]);
  await Promise.resolve();
  first.resolve(calls[0]);
  await store.flush();
  assert.equal(store.getSnapshot().board.theme, 'moonlight');
  assert.equal(store.getSnapshot().board.items[0].text, note.text);
  assert.equal(store.getSnapshot().saving, false);
  assert.equal(store.getSnapshot().error, '');
});

test('a failed save preserves the session, reports the error and allows explicit retry', async () => {
  let fail = true;
  let stored;
  const store = createMemoryStore({ bridge: { memoryGet: async () => boardResult(), memorySave(board) {
    if (fail) return Promise.reject(new Error('Synthetic disk failure'));
    stored = board; return Promise.resolve(board);
  } } });
  await store.initialize();
  store.updateBoard((board) => ({ ...board, items: [note] }));
  assert.equal(await store.flush(), false);
  assert.equal(store.getSnapshot().board.items[0].text, note.text);
  assert.match(store.getSnapshot().error, /antes de fechar/);
  fail = false;
  assert.equal(await store.retry(), true);
  await store.flush();
  assert.equal(stored.items[0].text, note.text);
  assert.equal(store.getSnapshot().error, '');
});

test('restoring waits for pending saves, blocks edits and preserves current data on rejected backup', async () => {
  const write = deferred();
  let restores = 0;
  const store = createMemoryStore({ bridge: { memoryGet: async () => boardResult(), memorySave: () => write.promise,
    memoryRestore: async () => { restores++; throw new Error('Synthetic invalid backup'); } } });
  await store.initialize();
  store.updateBoard((board) => ({ ...board, items: [note] }));
  const restore = store.restoreBackup();
  assert.equal(store.getSnapshot().busy, true);
  assert.equal(store.updateBoard(createMemoryBoard()), false);
  assert.equal(await store.retry(), false, 'retry must not enqueue an old board behind an active restore');
  assert.equal(restores, 0);
  write.resolve();
  assert.equal(await restore, false);
  assert.equal(restores, 1);
  assert.equal(store.getSnapshot().busy, false);
  assert.equal(store.getSnapshot().board.items[0].text, note.text);
  assert.match(store.getSnapshot().error, /preservado/);
});

test('image loading is lazy by variant and image URLs are released independently', async () => {
  const loads = [];
  const store = createMemoryStore({ bridge: null, database: {
    get: async () => boardResult(), close() {},
    image: async (id, variant) => { loads.push({ id, variant }); return new Blob(['SYNTHETIC_IMAGE']); },
  } });
  await store.initialize();
  assert.equal(loads.length, 0);
  const id = '22222222-2222-4222-8222-222222222222';
  const thumbnail = await store.imageUrl(id, 'thumbnail');
  assert.match(thumbnail, /^blob:/);
  assert.deepEqual(loads.map((value) => value.variant), ['thumbnail']);
  const original = await store.imageUrl(id, 'original');
  assert.notEqual(original, thumbnail);
  store.releaseImage(id, 'original');
  assert.match(await store.imageUrl(id, 'thumbnail'), /^blob:/);
  assert.equal(loads.length, 2);
  await assert.rejects(store.imageUrl('../../secret', 'original'));
  store.releaseImage(id, 'thumbnail');
  store.releaseImage(id, 'thumbnail');
  store.dispose();
});

test('an import rejection does not prevent another explicit import or mutate preferences', async () => {
  let imports = 0;
  const store = createMemoryStore({ bridge: { memoryGet: async () => boardResult(), memorySave: async (board) => board,
    memoryImport: async () => { imports++; return { board: createMemoryBoard(), imported: 0, rejected: 1 }; },
    savePreferences() { assert.fail('Memory content must not enter preferences.'); },
  } });
  await store.initialize();
  await store.importPhotos();
  assert.match(store.getSnapshot().error, /arquivo/);
  await store.importPhotos();
  assert.equal(imports, 2);
});

test('a failed browser image acquisition can be retried without retaining a rejected lease', async () => {
  let fail = true;
  const store = createMemoryStore({ bridge: null, database: {
    get: async () => boardResult(), close() {},
    image: async () => { if (fail) throw new Error('Synthetic image read failure'); return new Blob(['SYNTHETIC_IMAGE']); },
  } });
  await store.initialize();
  const id = '22222222-2222-4222-8222-222222222222';
  await assert.rejects(store.imageUrl(id, 'thumbnail'));
  fail = false;
  assert.match(await store.imageUrl(id, 'thumbnail'), /^blob:/);
  store.releaseImage(id, 'thumbnail');
  store.dispose();
});

test('concurrent read retries cannot apply a stale board after the user resumes editing', async () => {
  const retryRead = deferred();
  let reads = 0;
  let saved;
  const store = createMemoryStore({ bridge: {
    memoryGet() { reads++; return reads === 1 ? Promise.reject(new Error('Synthetic read failure')) : retryRead.promise; },
    memorySave(board) { saved = board; return Promise.resolve(board); },
  } });
  await store.initialize();
  const first = store.retry();
  assert.equal(store.getSnapshot().busy, true);
  assert.equal(await store.retry(), false);
  assert.equal(reads, 2, 'only one retry may read the persisted snapshot');
  assert.equal(store.updateBoard({ ...createMemoryBoard(), items: [note] }), false);
  retryRead.resolve(boardResult());
  assert.equal(await first, true);
  assert.equal(store.getSnapshot().busy, false);
  store.updateBoard((board) => ({ ...board, items: [note] }));
  store.updateBoard((board) => ({ ...board, theme: 'garden' }));
  await store.flush();
  assert.equal(saved.items[0].text, note.text);
  assert.equal(store.getSnapshot().board.items.length, 1);
});

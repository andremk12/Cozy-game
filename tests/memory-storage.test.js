import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, open, readFile, readdir, rename, rm, rmdir, symlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { MemoryCornerStore } from '../electron/services/memoryCorner.js';
import { MEMORY_BACKUP_MAGIC, memoryDigest } from '../electron/services/memoryBackup.js';
import { createMemoryBoard, MEMORY_LIMITS } from '../shared/memory.js';
import { fakeMemoryDecoder, memoryJpegHeader, memoryNote, memoryPng, memoryWebpHeader } from './memory-fixture.js';

const testRoot = path.resolve('work');
await mkdir(testRoot, { recursive: true });
async function temporaryMemory(run) {
  const directory = await mkdtemp(path.join(testRoot, 'little-haven-memory-'));
  try { await run(directory, path.join(directory, 'memory-corner')); }
  finally {
    const resolved = path.resolve(directory);
    assert.equal(path.dirname(resolved), testRoot);
    assert.match(path.basename(resolved), /^little-haven-memory-/);
    await rm(resolved, { recursive: true, force: true });
  }
}
const makeStore = (directory, options = {}) => new MemoryCornerStore(directory, { decodeImage: fakeMemoryDecoder, ...options });
async function original(directory, bytes = memoryPng(), name = 'synthetic.png') {
  const file = path.join(directory, name);
  await writeFile(file, bytes);
  return file;
}
function packageBytes(metadata, images = []) {
  const json = Buffer.from(JSON.stringify(metadata));
  const header = Buffer.alloc(12); MEMORY_BACKUP_MAGIC.copy(header); header.writeUInt32LE(json.length, 8);
  return Buffer.concat([header, json, ...images]);
}

test('desktop notes save atomically, serialize edits, retain Unicode and stay apart from preferences', async () => {
  await temporaryMemory(async (directory, managed) => {
    const preferences = path.join(directory, 'preferences.json');
    await writeFile(preferences, '{"lampOn":false}');
    const store = makeStore(managed);
    assert.deepEqual(await store.get(), { board: createMemoryBoard(), status: 'missing', writable: true });
    const first = { ...createMemoryBoard(), items: [memoryNote()] };
    const last = { ...first, theme: 'moonlight', items: [memoryNote({ text: 'SYNTHETIC: edição\n日本語', x: 1, rotation: 8 })] };
    const one = store.save(first); first.items[0].text = 'caller mutation';
    const two = store.save(last);
    await store.flush(); await Promise.all([one, two]);
    assert.deepEqual((await makeStore(managed).get()).board, last);
    assert.equal(await readFile(preferences, 'utf8'), '{"lampOn":false}');
    const persisted = JSON.parse(await readFile(path.join(managed, 'board.json'), 'utf8'));
    assert.deepEqual(persisted.board, last);
    assert.deepEqual(persisted.assets, []);
    assert.equal((await readdir(managed)).some((name) => name.endsWith('.tmp')), false);
    const copy = await store.get(); copy.board.items[0].text = 'reply mutation';
    assert.deepEqual((await store.get()).board, last);
  });
});

test('image import preserves exact originals after source removal, uses previews and rejects corrupt or oversized input', async () => {
  await temporaryMemory(async (directory, managed) => {
    const png = memoryPng(120, 60);
    let decodes = 0;
    const store = makeStore(managed, { decodeImage: async (...args) => { decodes++; return fakeMemoryDecoder(...args); } });
    const pngSource = await original(directory, png, 'mislabeled.jpg');
    const jpegSource = await original(directory, memoryJpegHeader(), 'synthetic.jpeg');
    const webpSource = await original(directory, memoryWebpHeader(), 'synthetic.webp');
    const invalid = await original(directory, Buffer.from('<svg><script/></svg>'), 'invalid.png');
    const large = path.join(directory, 'oversized.jpg'); const handle = await open(large, 'w');
    await handle.truncate(MEMORY_LIMITS.maxImageBytes + 1); await handle.close();
    const result = await store.importImages([pngSource, jpegSource, webpSource, invalid, large]);
    assert.equal(result.imported, 3); assert.equal(result.rejected, 2); assert.equal(decodes, 3);
    await rm(pngSource);
    const photo = result.board.items[0];
    assert.deepEqual((await store.readImage(photo.imageId, 'original')).bytes, png);
    assert.equal((await store.readImage(photo.imageId, 'original')).mime, 'image/png');
    assert.equal((await store.readImage(photo.imageId, 'thumbnail')).mime, 'image/png');
    assert.equal(decodes, 3, 'reading an existing preview does not decode an original');
    await rm(path.join(managed, 'thumbnails', `${photo.imageId}.png`));
    await store.readImage(photo.imageId, 'thumbnail');
    assert.equal(decodes, 4, 'a missing derived preview is recreated');
    const disk = await readFile(path.join(managed, 'board.json'), 'utf8');
    assert.equal(disk.includes(directory), false); assert.equal(disk.includes('mislabeled'), false);
    const reopened = makeStore(managed);
    assert.equal((await reopened.get()).board.items.length, 3);
    assert.deepEqual((await reopened.readImage(photo.imageId, 'original')).bytes, png);
  });
});

test('orientation-aware decoder dimensions can swap header axes without changing original bytes', async () => {
  await temporaryMemory(async (directory, managed) => {
    const bytes = memoryJpegHeader(48, 24);
    const store = makeStore(managed, { decodeImage: async () => ({ width: 24, height: 48, thumbnail: memoryPng(24, 48) }) });
    const result = await store.importImages([await original(directory, bytes)]);
    assert.equal(result.imported, 1);
    const data = JSON.parse(await readFile(path.join(managed, 'board.json'), 'utf8'));
    assert.equal(data.assets[0].width, 24); assert.equal(data.assets[0].height, 48);
    assert.deepEqual((await store.readImage(result.board.items[0].imageId, 'original')).bytes, bytes);
    const broken = makeStore(path.join(directory, 'broken-codec'), { decodeImage: async () => { throw new Error('SYNTHETIC_CODEC_ERROR'); } });
    assert.equal((await broken.importImages([await original(directory)])).rejected, 1);
  });
});

test('decoder mutation and invalid derived previews cannot replace an untouched imported original', async () => {
  await temporaryMemory(async (directory, managed) => {
    const bytes = memoryPng();
    const source = await original(directory, bytes);
    const store = makeStore(managed, { decodeImage: async (input) => {
      input[input.length - 1] ^= 1;
      return { width: 32, height: 16, thumbnail: memoryPng() };
    } });
    assert.equal((await store.importImages([source])).imported, 0);
    assert.deepEqual(await readFile(source), bytes);
    assert.deepEqual(await readdir(path.join(managed, 'images')), []);
    const malformed = memoryPng(); malformed[malformed.length - 1] ^= 1;
    const other = makeStore(path.join(directory, 'bad-thumbnail'), { decodeImage: async () => ({ width: 32, height: 16, thumbnail: malformed }) });
    assert.equal((await other.importImages([source])).imported, 0);
  });
});

test('missing preview regeneration is serialized and simultaneous readers reuse the derived result', async () => {
  await temporaryMemory(async (directory, managed) => {
    let active = 0;
    let maximum = 0;
    let decodes = 0;
    const store = makeStore(managed, { decodeImage: async (bytes) => {
      active++; decodes++; maximum = Math.max(maximum, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      const decoded = await fakeMemoryDecoder(bytes);
      active--;
      return decoded;
    } });
    const source = await original(directory);
    const result = await store.importImages([source, source]);
    const [first, second] = result.board.items;
    await rm(path.join(managed, 'thumbnails', `${first.imageId}.png`));
    await rm(path.join(managed, 'thumbnails', `${second.imageId}.png`));
    const readers = [store.readImage(first.imageId, 'thumbnail'), store.readImage(first.imageId, 'thumbnail'), store.readImage(second.imageId, 'thumbnail')];
    await store.flush(); await Promise.all(readers);
    assert.equal(maximum, 1);
    assert.equal(decodes, 4, 'two imports and one rebuild per missing preview');
  });
});

test('removing a card retains session undo and never deletes images still used by another card or source files', async () => {
  await temporaryMemory(async (directory, managed) => {
    const source = await original(directory);
    const store = makeStore(managed);
    const { board } = await store.importImages([source]);
    const photo = board.items[0];
    const duplicate = { ...photo, id: randomUUID(), caption: 'SYNTHETIC second reference' };
    await store.save({ ...board, items: [photo, duplicate] });
    await store.save({ ...board, items: [duplicate] });
    await store.cleanup();
    assert.deepEqual((await store.readImage(photo.imageId, 'original')).bytes, memoryPng());
    await store.save({ ...board, items: [] });
    assert.equal((await store.readImage(photo.imageId, 'original')).mime, 'image/png');
    await store.save(board); // undo removal during this session
    await store.save({ ...board, items: [] });
    await store.cleanup();
    await assert.rejects(store.readImage(photo.imageId, 'original'), { code: 'MEMORY_ACCESS' });
    await assert.rejects(store.save(board), { code: 'MEMORY_ACCESS' });
    assert.deepEqual(await readFile(source), memoryPng());
    assert.deepEqual(await readdir(path.join(managed, 'images')), []);
  });
});

test('invalid, oversized and future documents remain untouched and never autosave over private data', async () => {
  await temporaryMemory(async (_directory, managed) => {
    await mkdir(managed);
    const file = path.join(managed, 'board.json');
    for (const [content, status] of [
      ['{SYNTHETIC_BROKEN_PRIVATE', 'invalid'],
      [JSON.stringify({ format: 'little-haven-memory', version: 99, private: 'SYNTHETIC_FUTURE' }), 'future'],
      ['x'.repeat(MEMORY_LIMITS.maxDocumentBytes + 1), 'invalid'],
      [JSON.stringify({ format: 'little-haven-memory', version: 1, board: { ...createMemoryBoard(), thought: 'SYNTHETIC_FLOAT' }, assets: [] }), 'invalid'],
    ]) {
      await writeFile(file, content);
      const store = makeStore(managed);
      const state = await store.get();
      assert.equal(state.status, status); assert.equal(state.writable, false);
      assert.equal(JSON.stringify(state).includes('SYNTHETIC'), false);
      await assert.rejects(store.save(createMemoryBoard()), { code: 'MEMORY_READ_ONLY' });
      await assert.rejects(store.exportBackup(path.join(path.dirname(managed), 'must-not-export.haven-memory')), { code: 'MEMORY_READ_ONLY' });
      await store.cleanup();
      assert.equal(await readFile(file, 'utf8'), content);
    }
  });
});

test('explicit validated restoration can recover a read-only future board without trusting its old document', async () => {
  await temporaryMemory(async (directory, managed) => {
    const donor = makeStore(path.join(directory, 'donor'));
    const board = { ...createMemoryBoard(), theme: 'garden', items: [memoryNote()] };
    await donor.save(board);
    const backup = path.join(directory, 'recovery.haven-memory');
    await donor.exportBackup(backup);
    await mkdir(managed);
    const future = '{"version":99,"private":"SYNTHETIC_FUTURE"}';
    const file = path.join(managed, 'board.json'); await writeFile(file, future);
    const recipient = makeStore(managed);
    assert.equal((await recipient.get()).writable, false);
    assert.deepEqual(await recipient.restoreBackup(backup), board);
    assert.deepEqual(await recipient.get(), { board, status: 'ready', writable: true });
    assert.deepEqual((await makeStore(managed).get()).board, board);
  });
});

test('get retry reads a repaired document without overwriting a still-protected future or invalid file', async () => {
  await temporaryMemory(async (directory, managed) => {
    const donor = makeStore(path.join(directory, 'donor-retry'));
    const board = { ...createMemoryBoard(), items: [memoryNote()] };
    await donor.save(board);
    const repaired = await readFile(path.join(directory, 'donor-retry', 'board.json'));
    await mkdir(managed);
    const file = path.join(managed, 'board.json');
    const original = '{"version":99,"private":"SYNTHETIC_PROTECTED"}';
    await writeFile(file, original);
    const store = makeStore(managed);
    assert.equal((await store.get()).status, 'future');
    assert.equal((await store.get()).writable, false);
    assert.equal(await readFile(file, 'utf8'), original);
    await writeFile(file, '{SYNTHETIC_INVALID_RETRY');
    assert.equal((await store.get()).status, 'invalid');
    assert.equal(await readFile(file, 'utf8'), '{SYNTHETIC_INVALID_RETRY');
    await writeFile(file, repaired);
    assert.deepEqual(await store.get(), { board, status: 'ready', writable: true });
    assert.deepEqual(await readFile(file), repaired);
  });
});

test('a failed write keeps its previous state and does not poison a later explicit retry', async () => {
  await temporaryMemory(async (_directory, managed) => {
    const store = makeStore(managed); await store.get();
    await mkdir(managed); await mkdir(path.join(managed, 'board.json'));
    const board = { ...createMemoryBoard(), items: [memoryNote()] };
    await assert.rejects(store.save(board), { code: 'MEMORY_ACCESS' });
    assert.deepEqual((await store.get()).board, createMemoryBoard());
    await rmdir(path.join(managed, 'board.json'));
    await store.save(board);
    assert.deepEqual((await makeStore(managed).get()).board, board);
  });
});

test('restorable backup carries exact originals, captions, notes, positions and theme across installations', async () => {
  await temporaryMemory(async (directory, managed) => {
    const store = makeStore(managed);
    const { board } = await store.importImages([await original(directory, memoryPng(100, 180))]);
    const final = { ...board, theme: 'garden', items: [{ ...board.items[0], caption: 'SYNTHETIC: verão', frame: 'floral', x: 0.91 }, memoryNote()] };
    await store.save(final);
    const backup = path.join(directory, 'synthetic.haven-memory');
    assert.deepEqual(await store.exportBackup(backup), { exported: true });
    const backupBytes = await readFile(backup);
    assert.deepEqual(backupBytes.subarray(0, 8), MEMORY_BACKUP_MAGIC);
    assert.equal(backupBytes.includes(memoryPng(100, 180)), true);
    const otherDirectory = path.join(directory, 'another-installation');
    const other = makeStore(otherDirectory);
    const old = await other.importImages([await original(directory)]);
    await other.save({ ...old.board, items: [...old.board.items, memoryNote({ text: 'SYNTHETIC old note' })] });
    const restored = await other.restoreBackup(backup);
    assert.notEqual(restored.items[0].imageId, final.items[0].imageId, 'restoration never overwrites an existing asset identifier');
    assert.deepEqual({ ...restored, items: [{ ...restored.items[0], imageId: final.items[0].imageId }, restored.items[1]] }, final);
    assert.deepEqual((await other.readImage(restored.items[0].imageId, 'original')).bytes, memoryPng(100, 180));
    assert.deepEqual((await makeStore(otherDirectory).get()).board, restored);
    assert.deepEqual((await store.get()).board, final);
    const restoredEnvelope = JSON.parse(await readFile(path.join(otherDirectory, 'board.json'), 'utf8'));
    assert.equal(restoredEnvelope.assets.length, 1, 'replacing a board does not double its logical original-image quota');
    const oldFile = path.join(otherDirectory, 'images', `${old.board.items[0].imageId}.png`);
    assert.deepEqual(await readFile(oldFile), memoryPng(), 'old files are retained until the replacement is committed');
    await other.cleanup();
    await assert.rejects(readFile(oldFile), { code: 'ENOENT' });
    assert.deepEqual((await other.readImage(restored.items[0].imageId, 'original')).bytes, memoryPng(100, 180));
  });
});

test('failed and malicious restores never replace the current board or traverse filesystem paths', async () => {
  await temporaryMemory(async (directory, managed) => {
    const store = makeStore(managed);
    const { board } = await store.importImages([await original(directory)]);
    await store.save({ ...board, items: [...board.items, memoryNote()] });
    const file = path.join(managed, 'board.json');
    const before = await readFile(file);
    const envelope = JSON.parse(before.toString('utf8'));
    const metadata = { version: 1, board: envelope.board, assets: envelope.assets };
    const valid = packageBytes(metadata, [memoryPng()]);
    const altered = Buffer.from(valid); altered[altered.length - 1] ^= 1;
    const oversizedHeader = Buffer.alloc(12); MEMORY_BACKUP_MAGIC.copy(oversizedHeader); oversizedHeader.writeUInt32LE(0xffffffff, 8);
    const traversal = { ...metadata, assets: [{ ...metadata.assets[0], id: '../outside' }] };
    for (const bytes of [valid.subarray(0, -3), altered, Buffer.concat([valid, Buffer.from('trailing')]), oversizedHeader,
      packageBytes({ ...metadata, version: 2 }), packageBytes(traversal, [memoryPng()])]) {
      const source = await original(directory, bytes, 'invalid.haven-memory');
      await assert.rejects(store.restoreBackup(source));
      assert.deepEqual(await readFile(file), before);
      assert.deepEqual((await store.readImage(board.items[0].imageId, 'original')).bytes, memoryPng());
      assert.equal((await readdir(managed)).some((name) => name.startsWith('.restore-')), false);
    }
    assert.equal((await readdir(directory)).includes('outside'), false);
  });
});

test('image authorization rejects arbitrary IDs, variants, unknown assets and tampered originals', async () => {
  await temporaryMemory(async (directory, managed) => {
    const store = makeStore(managed);
    const { board } = await store.importImages([await original(directory)]);
    const photo = board.items[0];
    for (const [id, variant] of [['../preferences.json', 'original'], [randomUUID(), 'original'], [photo.imageId, '../../board.json']]) {
      await assert.rejects(store.readImage(id, variant), { code: 'MEMORY_ACCESS' });
    }
    await assert.rejects(store.save({ ...board, items: [{ ...photo, imageId: randomUUID() }] }), { code: 'MEMORY_ACCESS' });
    await writeFile(path.join(managed, 'images', `${photo.imageId}.png`), memoryPng(12, 12));
    await assert.rejects(store.readImage(photo.imageId, 'original'), { code: 'MEMORY_IMAGE' });
    const backup = await original(directory, Buffer.from('SYNTHETIC_OLD_BACKUP'), 'old.haven-memory');
    await assert.rejects(store.exportBackup(backup));
    assert.equal(await readFile(backup, 'utf8'), 'SYNTHETIC_OLD_BACKUP');
    await assert.rejects(store.exportBackup(path.join(managed, 'board.json')), { code: 'MEMORY_ACCESS' });
  });
});

test('managed directory junctions cannot expose outside files or accept writes', async () => {
  await temporaryMemory(async (directory, managed) => {
    const store = makeStore(managed);
    const { board } = await store.importImages([await original(directory)]);
    const outside = path.join(directory, 'outside'); await mkdir(outside);
    const sentinel = path.join(outside, `${board.items[0].imageId}.png`);
    await writeFile(sentinel, 'SYNTHETIC_OUTSIDE_SENTINEL');
    const images = path.join(managed, 'images');
    await rename(images, path.join(managed, 'images-previous'));
    await symlink(outside, images, process.platform === 'win32' ? 'junction' : 'dir');
    await assert.rejects(store.readImage(board.items[0].imageId, 'original'), { code: 'MEMORY_IMAGE' });
    await assert.rejects(store.save(board), { code: 'MEMORY_ACCESS' });
    assert.equal(await readFile(sentinel, 'utf8'), 'SYNTHETIC_OUTSIDE_SENTINEL');
    const reopened = makeStore(managed);
    assert.equal((await reopened.get()).writable, false);
    await assert.rejects(reopened.save(createMemoryBoard()), { code: 'MEMORY_READ_ONLY' });
  });
});

test('cleanup removes only unreferenced managed names and leaves unrelated local files alone', async () => {
  await temporaryMemory(async (directory, managed) => {
    const store = makeStore(managed);
    const { board } = await store.importImages([await original(directory)]);
    const orphan = path.join(managed, 'images', `${randomUUID()}.png`);
    const unrelated = path.join(managed, 'images', 'keep-this-local-file.png');
    await writeFile(orphan, memoryPng()); await writeFile(unrelated, 'SYNTHETIC_KEEP');
    await store.cleanup();
    await assert.rejects(readFile(orphan), { code: 'ENOENT' });
    assert.equal(await readFile(unrelated, 'utf8'), 'SYNTHETIC_KEEP');
    assert.equal(memoryDigest((await store.readImage(board.items[0].imageId, 'original')).bytes), memoryDigest(memoryPng()));
  });
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clampMemoryPosition, createMemoryBoard, inspectMemoryImage, MEMORY_LIMITS, validateMemoryBoard,
} from '../shared/memory.js';
import { memoryJpegHeader, memoryNote, memoryPng, memoryWebpHeader } from './memory-fixture.js';

test('memory board preserves multiline Unicode text, bounded coordinates and fresh snapshots', () => {
  const board = { ...createMemoryBoard(), items: [memoryNote()] };
  const clone = validateMemoryBoard(board);
  assert.deepEqual(clone, board);
  clone.items[0].text = 'changed'; clone.decorations.lights = false;
  assert.notEqual(clone.items[0].text, board.items[0].text);
  assert.equal(board.decorations.lights, true);
  assert.deepEqual(clampMemoryPosition(-1, 2), { x: 0, y: 1 });
  assert.deepEqual(clampMemoryPosition(Infinity, NaN), { x: 0.5, y: 0.5 });
});

test('memory schema rejects unknown fields, invalid IDs, duplicate cards and excessive content', () => {
  const board = { ...createMemoryBoard(), items: [memoryNote()] };
  for (const invalid of [
    { ...board, thought: 'SYNTHETIC_FLOAT_CONTENT' }, { ...board, version: 2 },
    { ...board, decorations: { ...board.decorations, arbitrary: true } },
    { ...board, items: [memoryNote({ id: '../../preferences.json' })] },
    { ...board, items: [memoryNote({ x: NaN })] }, { ...board, items: [memoryNote({ y: 1.01 })] },
    { ...board, items: [memoryNote({ rotation: 360 })] }, { ...board, items: [memoryNote(), memoryNote()] },
    { ...board, items: [memoryNote({ text: 'x'.repeat(MEMORY_LIMITS.noteLength + 1) })] },
    { ...board, items: [memoryNote({ text: ' \n ' })] }, { ...board, items: [memoryNote({ text: 'a\0b' })] },
    { ...board, items: [memoryNote({ text: '\ud800' })] }, { ...board, items: [memoryNote({ paper: '__proto__' })] },
  ]) assert.throws(() => validateMemoryBoard(invalid), /Invalid memory board/);
  assert.doesNotThrow(() => validateMemoryBoard({ ...board, items: [memoryNote({ text: '𠮷 👨‍👩‍👧‍👦 ação\nOutra linha\tcom espaço.' })] }));
});

test('image inspection recognizes content instead of filename and rejects unsupported or unsafe containers', () => {
  assert.deepEqual(inspectMemoryImage(memoryPng(90, 180)), { mime: 'image/png', extension: 'png', width: 90, height: 180 });
  assert.deepEqual(inspectMemoryImage(memoryJpegHeader()), { mime: 'image/jpeg', extension: 'jpg', width: 48, height: 24 });
  assert.deepEqual(inspectMemoryImage(memoryWebpHeader()), { mime: 'image/webp', extension: 'webp', width: 48, height: 24 });
  const tooWide = memoryPng(); tooWide.writeUInt32BE(MEMORY_LIMITS.maxEdge + 1, 16);
  const tooManyPixels = memoryPng(); tooManyPixels.writeUInt32BE(10_000, 16); tooManyPixels.writeUInt32BE(10_000, 20);
  const corruptedPng = memoryPng(); corruptedPng[corruptedPng.length - 1] ^= 1;
  const badWebp = memoryWebpHeader(); badWebp.writeUInt32LE(0xffffffff, 16);
  for (const invalid of [
    Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script/></svg>'), Buffer.from('GIF89a SYNTHETIC'),
    memoryPng().subarray(0, 25), memoryPng().subarray(0, -1), memoryJpegHeader().subarray(0, -2),
    memoryWebpHeader().subarray(0, -1), badWebp, corruptedPng, tooWide, tooManyPixels, new Uint8Array(MEMORY_LIMITS.maxImageBytes + 1),
  ]) assert.throws(() => inspectMemoryImage(invalid), /Invalid or unsupported memory image/);
  assert.equal(MEMORY_LIMITS.maxOriginalBytes + MEMORY_LIMITS.maxDocumentBytes + 12, MEMORY_LIMITS.maxBackupBytes);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { createMemoryBoard } from '../shared/memory.js';
import { contentSecurityPolicy, isAllowedResource, parseMemoryImageUrl } from '../electron/services/security.js';

test('memory image routes accept only exact managed UUIDs and image variants', () => {
  const id = '11111111-1111-4111-8111-111111111111';
  for (const variant of ['thumbnail', 'original']) {
    const url = `haven-memory://local/${id}/${variant}`;
    assert.deepEqual(parseMemoryImageUrl(url), { imageId: id, variant });
    assert.equal(isAllowedResource(url, process.cwd(), null), true);
  }
  for (const url of [
    `haven-memory://evil/${id}/original`, `haven-memory://local/${id}/original?path=secret`,
    `haven-memory://local/${id}/original#fragment`, `haven-memory://local:80/${id}/original`,
    `haven-memory://user@local/${id}/original`, `haven-memory://local/../${id}/original`,
    `haven-memory://local/${id}/%2e%2e/secret`, `haven-memory://local/${id}/original/extra`,
    'haven-memory://local/../../preferences.json', 'haven-memory://local/%2e%2e%2fsecret/original',
    `haven-memory://local/${id}/script`, 'haven-memory://local/C:/secret/original',
  ]) assert.equal(parseMemoryImageUrl(url), null, url);
  const csp = contentSecurityPolicy(null);
  assert.match(csp, /img-src 'self' data: haven-memory:\/\/local/);
  assert.match(csp, /connect-src 'none'/);
  assert.match(csp, /script-src 'self';/);
  assert.doesNotMatch(csp, /unsafe-eval|bypass/);
});

test('memory preload rejects unknown content and paths before IPC and exposes only explicit operations', async () => {
  let bridge;
  const messages = [];
  vm.runInNewContext(await readFile(new URL('../electron/preload/index.cjs', import.meta.url), 'utf8'), {
    require(name) {
      assert.equal(name, 'electron');
      return { contextBridge: { exposeInMainWorld(_name, value) { bridge = value; } },
        ipcRenderer: { invoke(channel, value) { messages.push({ channel, value }); return Promise.resolve(value); } } };
    },
  });
  const note = { id: '11111111-1111-4111-8111-111111111111', kind: 'note', x: 0.3, y: 0.4,
    rotation: 4, text: 'SYNTHETIC bilhete\nCoração 日本語', paper: 'rose', style: 'lined' };
  const board = { ...createMemoryBoard(), items: [note] };
  await bridge.memorySave(board);
  assert.equal(messages.length, 1);
  for (const invalid of [
    { ...board, thought: 'SYNTHETIC_PRIVATE_RITUAL' }, { ...board, path: 'C:/secret' },
    { ...board, items: [{ ...note, filePath: 'C:/secret' }] },
    { ...board, items: [{ ...note, x: NaN }] }, { ...board, items: [{ ...note, x: -0.1 }] },
    { ...board, items: [note, note] }, { ...board, items: [{ ...note, text: 'x'.repeat(2001) }] },
    { ...board, items: [{ ...note, text: '\ud800' }] },
    { ...board, decorations: { ...board.decorations, thought: 'SYNTHETIC_PRIVATE_RITUAL' } },
  ]) await assert.rejects(bridge.memorySave(invalid), /Invalid memory/);
  assert.equal(messages.length, 1);
  for (const method of ['memoryGet', 'memoryImport', 'memoryExport', 'memoryRestore']) {
    await assert.rejects(bridge[method]('C:/secret'), /Unexpected memory/);
    await bridge[method]();
  }
  assert.equal(messages.length, 5);
  assert.equal(messages.some(({ channel }) => /preferences|garden/.test(channel)), false);
  assert.equal(Object.hasOwn(bridge, 'readFile'), false);
  assert.equal(Object.hasOwn(bridge, 'ipcRenderer'), false);
});

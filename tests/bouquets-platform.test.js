import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createBouquet, DEFAULT_SUBJECT, MAX_MAILTO_LENGTH, buildBouquetMailto, buildBouquetCardHtml } from '../shared/bouquets.js';
import { BouquetStore, decodeBouquetPng, registerBouquets } from '../electron/services/bouquets.js';
import { loadBouquetDraft, saveBouquetDraft, deleteBouquetDraft, openBouquetEmail, BOUQUET_STORAGE_KEY } from '../src/services/bouquets.js';

const synthetic = () => ({ ...createBouquet(), stems: ['daisy', 'rose-red'], subject: 'SYNTHETIC_SUBJECT 💐', message: 'SYNTHETIC_LETTER\nOlá, você!' });
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aXx8AAAAASUVORK5CYII=', 'base64');
const imageValue = (bytes = png) => ({ kind: 'card', dataUrl: `data:image/png;base64,${bytes.toString('base64')}` });
const decode = () => ({ isEmpty: () => false, getSize: () => ({ width: 1, height: 1 }), toPNG: () => png });
async function temporary(t) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'haven-bouquets-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  return path.join(dir, 'bouquet-draft.json');
}

test('desktop draft saves only on request, keeps default privacy and restores opt-in letters', async (t) => {
  const file = await temporary(t);
  const store = new BouquetStore(file);
  assert.equal(await store.get(), null);
  await assert.rejects(readFile(file), { code: 'ENOENT' });
  const bouquet = synthetic();
  await store.save(bouquet, { includeLetter: false });
  let stored = JSON.parse(await readFile(file, 'utf8'));
  assert.equal(stored.message, '');
  assert.equal(stored.subject, DEFAULT_SUBJECT);
  assert.equal(Object.hasOwn(stored, 'recipient'), false);
  assert.equal((await new BouquetStore(file).get()).message, '');
  await store.save(bouquet, { includeLetter: true });
  stored = await new BouquetStore(file).get();
  assert.deepEqual(stored, bouquet);
  stored.stems[0] = 'cosmos';
  assert.equal((await store.get()).stems[0], 'daisy');
  await store.delete();
  assert.equal(await store.get(), null);
  await assert.rejects(readFile(file), { code: 'ENOENT' });
});

test('queued save/delete operations preserve order and flush waits for the accepted draft', async (t) => {
  const file = await temporary(t);
  const store = new BouquetStore(file);
  const first = store.save(synthetic(), { includeLetter: true });
  const removal = store.delete();
  const last = store.save({ ...createBouquet(), stems: ['cosmos'] }, { includeLetter: false });
  await Promise.all([first, removal, last, store.flush()]);
  assert.deepEqual((await store.get()).stems, ['cosmos']);
  assert.equal(JSON.parse(await readFile(file, 'utf8')).message, '');
});

test('future, corrupt and oversized draft files survive until an explicit deletion', async (t) => {
  const file = await temporary(t);
  for (const raw of ['{broken', JSON.stringify({ version: 2, future: 'SYNTHETIC' }), 'x'.repeat(16385)]) {
    await writeFile(file, raw);
    const store = new BouquetStore(file);
    await assert.rejects(store.get(), /ler o rascunho/);
    await assert.rejects(store.save(createBouquet(), { includeLetter: false }), /ler o rascunho/);
    assert.equal(await readFile(file, 'utf8'), raw);
    await store.delete();
    await store.save(createBouquet(), { includeLetter: false });
    assert.deepEqual(await store.get(), createBouquet());
  }
});

test('browser storage is explicit and independent; no recipient or unchecked letter enters it', async (t) => {
  const previousWindow = globalThis.window;
  const previousStorage = globalThis.localStorage;
  const entries = new Map();
  let writes = 0;
  globalThis.window = {};
  globalThis.localStorage = {
    getItem: (key) => entries.get(key) ?? null,
    setItem(key, value) { writes += 1; entries.set(key, value); },
    removeItem: (key) => entries.delete(key),
  };
  t.after(() => { globalThis.window = previousWindow; globalThis.localStorage = previousStorage; });
  assert.equal(await loadBouquetDraft(), null);
  assert.equal(writes, 0);
  await saveBouquetDraft(synthetic());
  assert.equal(entries.size, 1);
  assert.equal((await loadBouquetDraft()).message, '');
  assert.equal(entries.get(BOUQUET_STORAGE_KEY).includes('SYNTHETIC_'), false);
  await saveBouquetDraft(synthetic(), { includeLetter: true });
  assert.equal((await loadBouquetDraft()).subject, synthetic().subject);
  entries.set(BOUQUET_STORAGE_KEY, '{broken');
  await assert.rejects(saveBouquetDraft(createBouquet()));
  assert.equal(entries.get(BOUQUET_STORAGE_KEY), '{broken');
  await deleteBouquetDraft();
  assert.equal(await loadBouquetDraft(), null);
});

test('PNG decoding rejects bombs and malformed bytes before decoding, and strips payloads through re-encoding', () => {
  let calls = 0;
  const decoder = (...args) => { calls += 1; return decode(...args); };
  assert.deepEqual(decodeBouquetPng(imageValue(Buffer.concat([png, Buffer.from('SYNTHETIC_HIDDEN')])), decoder), png);
  assert.equal(calls, 1);
  for (const bytes of [Buffer.from('not png'), Buffer.alloc(60), (() => { const oversized = Buffer.from(png); oversized.writeUInt32BE(9000, 16); return oversized; })()]) {
    assert.throws(() => decodeBouquetPng(imageValue(bytes), decoder));
  }
  assert.equal(calls, 1);
  assert.throws(() => decodeBouquetPng(imageValue(), () => ({ isEmpty: () => true })), /PNG inválido/);
});

test('HTML fallback embeds only static escaped letter, allowed paper and inline PNG', () => {
  const message = '<script>alert("SYNTHETIC")</script>\n<img src="https://example.test" onerror="alert(1)"> & ♡';
  const html = buildBouquetCardHtml({ dataUrl: imageValue().dataUrl, message, letterPaper: 'rose' });
  assert.match(html, /default-src 'none'; img-src data:/);
  assert.match(html, /&lt;script&gt;alert\(&quot;SYNTHETIC&quot;\)&lt;\/script&gt;/);
  assert.match(html, /&amp; ♡/);
  assert.equal(html.includes('<script>'), false);
  assert.equal(html.match(/<img /g).length, 1);
  assert.throws(() => buildBouquetCardHtml({ dataUrl: 'https://example.test/image.png', message, letterPaper: 'rose' }));
  assert.throws(() => buildBouquetCardHtml({ dataUrl: imageValue().dataUrl, message, letterPaper: 'red; color:blue' }));
});

test('main bouquet handlers validate origin, argument counts and exact data before opening or writing', async () => {
  const handlers = new Map();
  const trusted = {};
  const opened = [];
  const writes = [];
  const saves = [];
  let destination = 'C:/synthetic/cartao.png';
  let canceled = false;
  let dialogs = 0;
  registerBouquets({ ipcMain: { handle: (channel, fn) => handlers.set(channel, fn) },
    verifySender(event) { if (event !== trusted) throw new Error('Untrusted sender'); },
    store: { get: () => null, delete: () => {}, save: (...args) => saves.push(args) },
    getWindow: () => trusted, openExternal: async (url) => opened.push(url), decodeImage: decode,
    dialog: { async showSaveDialog(parent, options) { assert.equal(parent, trusted); dialogs += 1;
      assert.ok(options.properties.includes('showOverwriteConfirmation')); return { canceled, filePath: destination }; } },
    writeImage: async (...args) => writes.push(args),
  });
  assert.deepEqual(opened, []);
  const call = (name, ...args) => handlers.get(`haven:bouquets:${name}`)(trusted, ...args);
  for (const handler of handlers.values()) await assert.rejects(handler({}), /Untrusted/);
  for (const name of ['get', 'delete']) await assert.rejects(call(name, 'C:/private'), /Argumentos/);
  await assert.rejects(call('email', { recipient: '', subject: 'a\r\nBcc:b@example.test', message: '' }));
  await assert.rejects(call('email', 'https://example.test'));
  await assert.rejects(call('export', { ...imageValue(), path: 'C:/private.png' }));
  assert.equal(dialogs, 0);
  assert.deepEqual(opened, []);
  await call('email', { recipient: 'synthetic@example.test', subject: 'Flores 💐', message: 'Carta sintética' });
  assert.equal(new URL(opened[0]).searchParams.get('subject'), 'Flores 💐');
  await call('save', { bouquet: createBouquet(), includeLetter: false });
  assert.equal(saves.length, 1);
  assert.deepEqual(await call('export', imageValue()), { canceled: false });
  assert.deepEqual(writes[0][1], png);
  canceled = true;
  assert.deepEqual(await call('export', imageValue()), { canceled: true });
  assert.equal(writes.length, 1);
  canceled = false;
  destination = 'C:/synthetic/cartao.exe';
  await assert.rejects(call('export', imageValue()), /\.png/);
  assert.equal(writes.length, 1);
  destination = 'C:/synthetic/cartao.html';
  await call('export', { ...imageValue(), kind: 'card-html', message: '<b>SYNTHETIC</b>', letterPaper: 'cream' });
  assert.equal(typeof writes[1][1], 'string');
  assert.match(writes[1][1], /&lt;b&gt;SYNTHETIC&lt;\/b&gt;/);
});

test('OS handler failure is reported without claiming delivery or retries', async () => {
  let email;
  let calls = 0;
  registerBouquets({ ipcMain: { handle(channel, fn) { if (channel.endsWith(':email')) email = fn; } },
    verifySender() {}, store: {}, openExternal: async () => { calls += 1; throw new Error('no email app'); } });
  assert.equal(await email({}, { recipient: '', subject: '', message: '' }), false);
  assert.equal(calls, 1);
});

test('renderer refuses oversized mailto before IPC or navigation and keeps an explicit blank-body fallback', async (t) => {
  const previousWindow = globalThis.window;
  t.after(() => { globalThis.window = previousWindow; });
  const calls = [];
  globalThis.window = { haven: { openBouquetEmail: async (value) => { calls.push(value); return true; } } };
  const gift = { recipient: 'synthetic@example.test', subject: 'Assunto escolhido 💐', message: '' };
  const remaining = MAX_MAILTO_LENGTH - buildBouquetMailto(gift).length;
  const atLimit = 'é'.repeat(Math.floor(remaining / 6)) + 'x'.repeat(remaining % 6);
  assert.equal(buildBouquetMailto({ ...gift, message: atLimit }).length, MAX_MAILTO_LENGTH);
  assert.equal(await openBouquetEmail({ ...gift, message: atLimit }), true);
  await assert.rejects(openBouquetEmail({ ...gift, message: `${atLimit}x` }), /Salve o cartão completo/);
  await assert.rejects(openBouquetEmail({ ...gift, message: '💐'.repeat(1000) }), /sem a carta no corpo/);
  assert.equal(calls.length, 1);
  assert.equal(await openBouquetEmail(gift), true);
  assert.deepEqual(calls[1], gift);

  globalThis.window = { location: { href: 'unchanged' } };
  await assert.rejects(openBouquetEmail({ ...gift, message: '💐'.repeat(1000) }), /Salve o cartão completo/);
  assert.equal(window.location.href, 'unchanged');
  assert.equal(await openBouquetEmail(gift), true);
  assert.equal(window.location.href, buildBouquetMailto(gift));
});

test('main refuses oversized encoded letters before the OS and preserves the chosen subject in the explicit fallback', async () => {
  let email;
  const opened = [];
  registerBouquets({ ipcMain: { handle(channel, fn) { if (channel.endsWith(':email')) email = fn; } },
    verifySender() {}, store: {}, openExternal: async (url) => opened.push(url) });
  const gift = { recipient: 'synthetic@example.test', subject: '💐'.repeat(120), message: 'é'.repeat(1000) };
  await assert.rejects(email({}, gift), /Salve o cartão completo/);
  assert.deepEqual(opened, []);
  assert.equal(await email({}, { ...gift, message: '' }), true);
  assert.equal(opened.length, 1);
  const url = new URL(opened[0]);
  assert.ok(opened[0].length <= MAX_MAILTO_LENGTH);
  assert.equal(url.searchParams.get('subject'), gift.subject);
  assert.equal(url.searchParams.get('body'), '');
  assert.equal(decodeURIComponent(url.pathname), gift.recipient);
  assert.equal(gift.message, 'é'.repeat(1000));
});

test('preload exposes only narrow operations and rejects invalid content before IPC', async () => {
  let bridge;
  const messages = [];
  vm.runInNewContext(await readFile(new URL('../electron/preload/index.cjs', import.meta.url), 'utf8'), {
    require(name) { assert.equal(name, 'electron'); return {
      contextBridge: { exposeInMainWorld(_name, value) { bridge = value; } },
      ipcRenderer: { invoke(channel, value) { messages.push({ channel, value }); return Promise.resolve(value); } },
    }; },
  });
  assert.equal(Object.isFrozen(bridge), true);
  assert.equal(bridge.openExternal, undefined);
  assert.equal(bridge.ipcRenderer, undefined);
  for (const bad of ['a\nBcc:b@example.test', '\u0085', '\u2028', 'x'.repeat(121)]) {
    await assert.rejects(bridge.openBouquetEmail({ recipient: '', subject: bad, message: '' }), /Invalid bouquet/);
    await assert.rejects(bridge.saveBouquetDraft({ bouquet: { ...createBouquet(), subject: bad }, includeLetter: true }), /Invalid bouquet/);
  }
  await assert.rejects(bridge.getBouquetDraft('C:/private'));
  await assert.rejects(bridge.deleteBouquetDraft('C:/private'));
  await assert.rejects(bridge.saveBouquetDraft({ bouquet: { ...createBouquet(), recipient: 'synthetic@example.test' }, includeLetter: true }));
  await assert.rejects(bridge.saveBouquetDraft({ bouquet: { ...createBouquet(), stems: Array(3) }, includeLetter: true }));
  await assert.rejects(bridge.saveBouquetImage({ ...imageValue(), path: 'C:/private' }));
  assert.deepEqual(messages, []);
  await bridge.saveBouquetDraft({ bouquet: synthetic(), includeLetter: false });
  assert.equal(messages[0].value.bouquet.message, '');
  assert.equal(messages[0].value.bouquet.subject, DEFAULT_SUBJECT);
  await bridge.openBouquetEmail({ recipient: 'synthetic@example.test', subject: '  Coração 💐  ', message: 'Linha um\r\nDois' });
  assert.equal(messages[1].value.subject, 'Coração 💐');
  assert.equal(messages[1].value.message, 'Linha um\nDois');
  await bridge.saveBouquetImage({ ...imageValue(), kind: 'card-html', message: '<b>synthetic</b>', letterPaper: 'sage' });
  assert.equal(messages[2].value.message, '<b>synthetic</b>');
  assert.equal(messages[2].channel, 'haven:bouquets:export');
});

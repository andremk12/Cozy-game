import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { DEVELOPER_CONTACTS, getDeveloperContactUrl } from '../shared/developer.js';
import { registerDeveloperContacts } from '../electron/services/developerContacts.js';

// All addresses in this suite are synthetic and never opened by an OS handler.
const contacts = { email: 'synthetic+test@example.test', linkedin: 'https://www.linkedin.com/in/synthetic-profile/' };

test('contact destinations allow a single address and a configured HTTPS LinkedIn profile', () => {
  assert.equal(getDeveloperContactUrl('email', contacts), 'mailto:synthetic+test@example.test');
  assert.equal(getDeveloperContactUrl('linkedin', contacts), contacts.linkedin);
  assert.equal(getDeveloperContactUrl('linkedin', { linkedin: 'https://www.linkedin.com/in/synthetic-andré/' }),
    'https://www.linkedin.com/in/synthetic-andr%C3%A9/');
  assert.equal(getDeveloperContactUrl('https://example.test', contacts), null);
  for (const email of ['', 'name@example.test?subject=private', 'name@example.test\r\nBcc:a@example.test',
    'a@example.test,b@example.test', 'mailto:a@example.test', 'a%40example.test', ' a@example.test', null]) {
    assert.equal(getDeveloperContactUrl('email', { email }), null, JSON.stringify(email));
  }
  for (const linkedin of ['', 'http://www.linkedin.com/in/synthetic-profile/',
    'https://www.linkedin.com.evil.test/in/synthetic-profile/', 'https://www.linkedin.com@evil.test/in/synthetic-profile/',
    'https://user@www.linkedin.com/in/synthetic-profile/', 'https://www.linkedin.com:444/in/synthetic-profile/',
    'https://www.linkedin.com/in/synthetic-profile/?redirect=https://evil.test',
    'https://www.linkedin.com/in/synthetic-profile/#private', 'https://www.linkedin.com/feed/',
    'https://www.linkedin.com/in/synthetic-\nprofile/', ' https://www.linkedin.com/in/synthetic-profile/',
    'file:///in/synthetic-profile/', 'javascript:alert(1)', null]) {
    assert.equal(getDeveloperContactUrl('linkedin', { linkedin }), null, JSON.stringify(linkedin));
  }
  assert.ok(Object.isFrozen(DEVELOPER_CONTACTS));
});

test('main process rejects untrusted callers and arbitrary destinations before opening anything', async () => {
  let handler;
  const opened = [];
  const trustedEvent = {};
  registerDeveloperContacts({ ipcMain: { handle(channel, callback) {
    assert.equal(channel, 'haven:developer:open-contact'); handler = callback;
  } }, verifySender(event) { if (event !== trustedEvent) throw new Error('Untrusted sender.'); },
  openExternal: async (url) => opened.push(url), contacts });
  await assert.rejects(handler({ sender: 'other-frame' }, 'email'), /Untrusted sender/);
  for (const args of [[], ['https://example.test/'], ['mailto:other@example.test'], ['email', 'extra'], [{ id: 'email' }]]) {
    await assert.rejects(handler(trustedEvent, ...args), /Invalid developer contact/);
  }
  assert.deepEqual(opened, []);
  assert.equal(await handler(trustedEvent, 'email'), true);
  assert.equal(await handler(trustedEvent, 'linkedin'), true);
  assert.deepEqual(opened, ['mailto:synthetic+test@example.test', contacts.linkedin]);
});

test('missing configuration or an unavailable OS handler reports failure without adding destinations', async () => {
  for (const configured of [{ email: '', linkedin: '' }, contacts]) {
    let handler;
    let calls = 0;
    registerDeveloperContacts({ ipcMain: { handle(_channel, value) { handler = value; } },
      verifySender: () => {}, contacts: configured,
      openExternal: async () => { calls++; throw new Error('No default app.'); } });
    assert.equal(await handler({}, 'email'), false);
    assert.equal(await handler({}, 'linkedin'), false);
    assert.equal(calls, configured === contacts ? 2 : 0);
  }
});

test('preload exposes identifiers only and rejects URL strings or extra arguments before IPC', async () => {
  let bridge;
  const messages = [];
  vm.runInNewContext(await readFile(new URL('../electron/preload/index.cjs', import.meta.url), 'utf8'), {
    require(name) {
      assert.equal(name, 'electron');
      return { contextBridge: { exposeInMainWorld(_name, value) { bridge = value; } },
        ipcRenderer: { invoke(channel, value) { messages.push({ channel, value }); return Promise.resolve(true); } } };
    },
  });
  for (const args of [[], ['https://www.linkedin.com/in/other/'], ['mailto:a@example.test'], ['email', 'extra'], ['copy'], [null]]) {
    await assert.rejects(bridge.openDeveloperContact(...args), /Invalid developer contact/);
  }
  assert.deepEqual(messages, []);
  assert.equal(await bridge.openDeveloperContact('email'), true);
  assert.equal(await bridge.openDeveloperContact('linkedin'), true);
  assert.deepEqual(messages, [
    { channel: 'haven:developer:open-contact', value: 'email' },
    { channel: 'haven:developer:open-contact', value: 'linkedin' },
  ]);
  assert.equal(Object.hasOwn(bridge, 'openExternal'), false);
});

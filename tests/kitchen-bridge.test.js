import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

test('kitchen bridge accepts only bounded actions and never forwards arbitrary text or paths', async () => {
  let bridge;
  const calls = [];
  const listeners = new Map();
  vm.runInNewContext(await readFile(new URL('../electron/preload/index.cjs', import.meta.url), 'utf8'), {
    require(name) {
      assert.equal(name, 'electron');
      return {
        contextBridge: { exposeInMainWorld(_name, value) { bridge = value; } },
        ipcRenderer: {
          invoke(channel, value) { calls.push({ channel, value }); return Promise.resolve(value); },
          on(channel, listener) { listeners.set(channel, listener); },
          removeListener(channel, listener) { if (listeners.get(channel) === listener) listeners.delete(channel); },
        },
      };
    },
  });
  for (const command of [
    { type: 'start', recipeId: 'tea' }, { type: 'start', recipeId: 'cake', durationMs: 3600000 },
    { type: 'pause' }, { type: 'resume' }, { type: 'cancel' }, { type: 'restart' },
    { type: 'present', sessionId: '11111111-1111-4111-8111-111111111111' }, { type: 'close', sessionId: '11111111-1111-4111-8111-111111111111' },
    { type: 'settings', patch: { completionSoundEnabled: true, effectsEnabled: false, atmosphere: 'night' } },
  ]) await bridge.commandKitchen(command);
  const accepted = calls.length;
  for (const command of [
    null, [], {}, { type: 'complete' }, { type: 'start', recipeId: 'unknown' },
    { type: 'start', recipeId: 'tea', durationMs: 299999 },
    { type: 'start', recipeId: 'tea', durationMs: 3600001 },
    { type: 'start', recipeId: 'tea', durationMs: 300001 },
    { type: 'pause', thought: 'SYNTHETIC_PRIVATE_RITUAL' },
    { type: 'settings', patch: { thought: 'SYNTHETIC_PRIVATE_RITUAL' } },
    { type: 'settings', patch: { effectsEnabled: 'true' } },
    { type: 'settings', patch: { atmosphere: 'remote' } },
    { type: 'present', sessionId: 'C:/secret' },
    { type: 'close', sessionId: 'id', path: 'C:/secret' },
  ]) await assert.rejects(bridge.commandKitchen(command), /Invalid kitchen/);
  await assert.rejects(bridge.commandKitchen({ type: 'pause' }, 'SYNTHETIC_PRIVATE_RITUAL'), /Invalid kitchen/);
  await assert.rejects(bridge.getKitchen('C:/secret'), /Unexpected kitchen/);
  assert.equal(calls.length, accepted);
  await bridge.getKitchen();
  assert.equal(calls.at(-1).channel, 'haven:kitchen:get');
  let received;
  const unsubscribe = bridge.onKitchenChanged((snapshot) => { received = snapshot; });
  const snapshot = { kitchen: { session: null }, status: 'ok' };
  listeners.get('haven:kitchen:changed')({ sender: 'never-exposed' }, snapshot);
  assert.equal(received, snapshot);
  unsubscribe();
  assert.equal(listeners.size, 0);
  assert.throws(() => bridge.onKitchenChanged('bad'), /Invalid kitchen/);
  assert.equal(bridge.ipcRenderer, undefined);
  assert.equal(bridge.readFile, undefined);
});

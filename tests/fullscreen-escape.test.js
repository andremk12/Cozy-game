import test from 'node:test';
import assert from 'node:assert/strict';
import { acquireFullscreenEscape } from '../src/services/fullscreenEscape.js';

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function fakeKeyboard() {
  const requests = [];
  return {
    requests, unlocks: 0,
    lock(keys) {
      assert.deepEqual(keys, ['Escape']);
      const request = deferred();
      requests.push(request);
      return request.promise;
    },
    unlock() { this.unlocks += 1; },
  };
}

test('two fullscreen owners share Escape and closing a mixer preserves an active tool', async () => {
  const keyboard = fakeKeyboard();
  const ready = [];
  const releaseTool = acquireFullscreenEscape(keyboard, (value) => ready.push(['tool', value]));
  keyboard.requests[0].resolve();
  await Promise.resolve();
  const releaseMixer = acquireFullscreenEscape(keyboard, (value) => ready.push(['mixer', value]));
  assert.equal(keyboard.requests.length, 1);
  assert.deepEqual(ready, [['tool', true], ['mixer', true]]);
  releaseMixer();
  releaseMixer();
  assert.equal(keyboard.unlocks, 0);
  releaseTool();
  releaseTool();
  assert.equal(keyboard.unlocks, 1);
});

test('pending owners share one request and released owners never receive callbacks', async () => {
  const keyboard = fakeKeyboard();
  const ready = [];
  const releaseTool = acquireFullscreenEscape(keyboard, () => ready.push('tool'));
  const releaseMixer = acquireFullscreenEscape(keyboard, () => ready.push('mixer'));
  releaseMixer();
  assert.equal(keyboard.unlocks, 0);
  keyboard.requests[0].resolve();
  await Promise.resolve();
  assert.deepEqual(ready, ['tool']);
  releaseTool();
  assert.equal(keyboard.unlocks, 1);
});

test('a late native lock after final release is unlocked without a stale callback', async () => {
  const keyboard = fakeKeyboard();
  let called = false;
  const release = acquireFullscreenEscape(keyboard, () => { called = true; });
  release();
  assert.equal(keyboard.unlocks, 1);
  keyboard.requests[0].resolve();
  await Promise.resolve();
  assert.equal(called, false);
  assert.equal(keyboard.unlocks, 2);
});

test('release and rapid reacquire serialize late completion before acquiring the new owner', async () => {
  const keyboard = fakeKeyboard();
  const ready = [];
  acquireFullscreenEscape(keyboard, () => ready.push('old'))();
  const releaseNew = acquireFullscreenEscape(keyboard, () => ready.push('new'));
  assert.equal(keyboard.requests.length, 1);
  keyboard.requests[0].resolve();
  await Promise.resolve();
  assert.equal(keyboard.requests.length, 2);
  assert.deepEqual(ready, []);
  keyboard.requests[1].resolve();
  await Promise.resolve();
  assert.deepEqual(ready, ['new']);
  releaseNew();
  assert.equal(keyboard.unlocks, 3);
});

test('a canceled request that rejects allows the waiting new owner to retry', async () => {
  const keyboard = fakeKeyboard();
  const ready = [];
  acquireFullscreenEscape(keyboard, () => ready.push('old'))();
  const releaseNew = acquireFullscreenEscape(keyboard, () => ready.push('new'));
  keyboard.requests[0].reject(new Error('Synthetic cancellation'));
  await Promise.resolve();
  assert.equal(keyboard.requests.length, 2);
  keyboard.requests[1].resolve();
  await Promise.resolve();
  assert.deepEqual(ready, ['new']);
  releaseNew();
});

test('denial, synchronous errors and unavailable APIs leave no shared lock or retry loop', async () => {
  const keyboard = fakeKeyboard();
  let callbacks = 0;
  const releaseDenied = acquireFullscreenEscape(keyboard, () => { callbacks += 1; });
  keyboard.requests[0].reject(new Error('Synthetic denial'));
  await Promise.resolve();
  assert.equal(keyboard.requests.length, 1);
  assert.equal(callbacks, 0);
  releaseDenied();
  const releaseRetry = acquireFullscreenEscape(keyboard, () => { callbacks += 1; });
  keyboard.requests[1].resolve();
  await Promise.resolve();
  assert.equal(callbacks, 1);
  releaseRetry();
  let attempts = 0;
  const throwing = { lock() { attempts += 1; throw new Error('Synthetic unavailable API'); }, unlock() { throw new Error('Already closed'); } };
  acquireFullscreenEscape(throwing)();
  acquireFullscreenEscape(throwing)();
  assert.equal(attempts, 2);
  acquireFullscreenEscape(null)();
  acquireFullscreenEscape({})();
});

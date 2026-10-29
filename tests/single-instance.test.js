import test from 'node:test';
import assert from 'node:assert/strict';
import { lockDesktopInstance } from '../electron/services/singleInstance.js';

test('a competing process quits before initializing application state', () => {
  let quits = 0;
  let listeners = 0;
  const app = { requestSingleInstanceLock: () => false, quit: () => quits++, on: () => listeners++ };
  assert.equal(lockDesktopInstance(app, () => { throw new Error('No window should be used.'); }), false);
  assert.equal(quits, 1);
  assert.equal(listeners, 0);
});

test('a second launch restores the existing minimized window and focuses it without replacing state', () => {
  let secondInstance;
  const actions = [];
  const window = { isDestroyed: () => false, isMinimized: () => true, isVisible: () => false,
    restore: () => actions.push('restore'), show: () => actions.push('show'), focus: () => actions.push('focus') };
  const app = { requestSingleInstanceLock: () => true,
    quit: () => { throw new Error('Primary process must stay open.'); },
    on(event, callback) { assert.equal(event, 'second-instance'); secondInstance = callback; } };
  assert.equal(lockDesktopInstance(app, () => window), true);
  assert.deepEqual(actions, []);
  secondInstance({}, ['--unexpected-argument']);
  assert.deepEqual(actions, ['restore', 'show', 'focus']);
});

test('a second launch during startup or after window destruction safely waits for the primary process', () => {
  for (const window of [undefined, { isDestroyed: () => true }]) {
    let secondInstance;
    const app = { requestSingleInstanceLock: () => true, on(_event, callback) { secondInstance = callback; } };
    assert.equal(lockDesktopInstance(app, () => window), true);
    assert.doesNotThrow(() => secondInstance());
  }
});

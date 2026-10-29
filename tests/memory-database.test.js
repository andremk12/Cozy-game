import test from 'node:test';
import assert from 'node:assert/strict';
import { createMemoryDatabase } from '../src/services/memoryDatabase.js';

test('browser storage retries opening after a transient error or blocked database', async () => {
  for (const failure of ['onerror', 'onblocked']) {
    let attempts = 0;
    const database = createMemoryDatabase({ open() {
      attempts++;
      const request = {};
      queueMicrotask(() => request[failure]());
      return request;
    } });
    await assert.rejects(database.get(), /storage unavailable/);
    await assert.rejects(database.get(), /storage unavailable/);
    assert.equal(attempts, 2, `${failure} must not retain a permanently rejected open promise`);
    database.close();
  }
});

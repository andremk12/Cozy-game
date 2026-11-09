import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, rmdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { KitchenStore } from '../electron/services/kitchen.js';
import { createKitchen, KitchenTimer, MAX_KITCHEN_BYTES } from '../shared/kitchen.js';

const testRoot = path.resolve('work');
await mkdir(testRoot, { recursive: true });
async function fixture(run) {
  const directory = await mkdtemp(path.join(testRoot, 'little-haven-kitchen-'));
  try { await run(directory, path.join(directory, 'kitchen.json')); }
  finally {
    const resolved = path.resolve(directory);
    assert.equal(path.dirname(resolved), testRoot);
    assert.match(path.basename(resolved), /^little-haven-kitchen-/);
    await rm(resolved, { recursive: true, force: true });
  }
}
function clocks() {
  let wall = 10_000;
  let mono = 0;
  let sequence = 0;
  const jobs = [];
  const options = { now: () => wall, monotonic: () => mono,
    idFactory: () => `00000000-0000-4000-8000-${String(++sequence).padStart(12, '0')}`,
    setTimer(callback, delay) { const job = { callback, delay }; jobs.push(job); return job; },
    clearTimer(job) { if (job) job.cancelled = true; } };
  return { options, jobs, advance(ms, wallMs = ms) { mono += ms; wall += wallMs; } };
}

test('desktop deadline completes without renderer reads, and serialized presentation claims deliver once', async () => {
  await fixture(async (_directory, file) => {
    const c = clocks();
    const store = new KitchenStore(file, c.options);
    try {
      const changes = [];
      const unsubscribe = store.subscribe((value) => changes.push(value));
      assert.equal((await store.get()).status, 'missing');
      const started = await store.command({ type: 'start', recipeId: 'tea' });
      const id = started.kitchen.session.id;
      assert.equal(c.jobs.at(-1).delay, 300_000);
      c.advance(301_000);
      c.jobs.at(-1).callback();
      // Queue after the service's deadline callback to await its durable transition.
      const completed = await store.get();
      assert.equal(completed.kitchen.session.status, 'completed');
      assert.equal(changes.filter((value) => value.kitchen.session?.status === 'completed').length, 1);
      const claims = await Promise.all([store.command({ type: 'present', sessionId: id }), store.command({ type: 'present', sessionId: id })]);
      assert.deepEqual(claims.map(({ presented }) => presented), [true, false]);
      assert.equal(JSON.parse(await readFile(file, 'utf8')).session.presentation, 'presented');
      await store.flush();
      const reopened = new KitchenStore(file, c.options);
      try {
        assert.equal((await reopened.get()).kitchen.session.presentation, 'presented');
        assert.equal((await reopened.command({ type: 'present', sessionId: id })).presented, false);
      } finally { reopened.dispose(); }
      unsubscribe();
    } finally { store.dispose(); }
  });
});

test('desktop persists pause, cancellation, settings, suspend/resume and the same session across reopening', async () => {
  await fixture(async (_directory, file) => {
    const c = clocks();
    let store = new KitchenStore(file, c.options);
    try {
      const started = await store.command({ type: 'start', recipeId: 'cake', durationMs: 600_000 });
      const id = started.kitchen.session.id;
      c.advance(20_000);
      await store.suspend();
      c.advance(0, 80_000);
      assert.equal((await store.resume()).kitchen.session.elapsedMs, 100_000);
      await store.command({ type: 'pause' });
      await store.flush();
      store.dispose();
      c.advance(1_000_000);
      store = new KitchenStore(file, c.options);
      const paused = await store.get();
      assert.equal(paused.kitchen.session.id, id);
      assert.equal(paused.kitchen.session.status, 'paused');
      assert.equal(paused.kitchen.session.elapsedMs, 100_000);
      await store.command({ type: 'settings', patch: { lampOn: false, completionSoundEnabled: true } });
      assert.equal((await store.get()).kitchen.session.elapsedMs, 100_000);
      await store.command({ type: 'resume' });
      c.advance(30_000);
      await store.command({ type: 'cancel' });
      await store.flush();
      const saved = JSON.parse(await readFile(file, 'utf8'));
      assert.equal(saved.session.status, 'cancelled');
      assert.equal(saved.session.elapsedMs, 130_000);
      assert.equal(saved.settings.completionSoundEnabled, true);
      assert.equal(saved.settings.lampOn, false);
      assert.equal((await store.command({ type: 'present', sessionId: id })).presented, false);
    } finally { store.dispose(); }
  });
});

test('desktop reopening catches up offline completion and never auto-starts the next recipe', async () => {
  await fixture(async (_directory, file) => {
    const c = clocks();
    const first = new KitchenStore(file, c.options);
    const initial = await first.command({ type: 'start', recipeId: 'tea' });
    await first.flush();
    first.dispose();
    c.advance(0, 900_000);
    const second = new KitchenStore(file, c.options);
    try {
      const restored = await second.get();
      assert.equal(restored.kitchen.session.id, initial.kitchen.session.id);
      assert.equal(restored.kitchen.session.status, 'completed');
      assert.equal(restored.kitchen.session.presentation, 'pending');
      await second.command({ type: 'close', sessionId: restored.kitchen.session.id });
      assert.equal((await second.get()).kitchen.session.status, 'completed');
      assert.equal(JSON.parse(await readFile(file, 'utf8')).session.presentation, 'closed');
    } finally { second.dispose(); }
  });
});

test('desktop preserves corrupt, oversized and future documents byte-for-byte throughout temporary sessions', async () => {
  await fixture(async (_directory, file) => {
    for (const original of ['{broken', 'x'.repeat(MAX_KITCHEN_BYTES + 1), JSON.stringify({ version: 1, session: { thought: 'SYNTHETIC_PRIVATE_KITCHEN' } })]) {
      await writeFile(file, original);
      const store = new KitchenStore(file, clocks().options);
      try {
        const result = await store.get();
        assert.equal(result.status, 'recovered');
        assert.equal(result.kitchen.session, null);
        assert.equal(JSON.stringify(result).includes('SYNTHETIC_PRIVATE_KITCHEN'), false);
        assert.deepEqual(result.kitchen, createKitchen());
        await store.command({ type: 'start', recipeId: 'tea' });
        await store.command({ type: 'settings', patch: { lampOn: false, completionSoundEnabled: true } });
        await store.get();
        await store.flush();
        assert.equal((await store.get()).status, 'recovered');
        assert.equal(await readFile(file, 'utf8'), original);
      } finally { store.dispose(); }
    }
    const original = '{"version":2,"future":"SYNTHETIC_FUTURE_DOCUMENT"}';
    await writeFile(file, original);
    const store = new KitchenStore(file, clocks().options);
    try {
      assert.equal((await store.get()).status, 'unsupported');
      assert.equal((await store.command({ type: 'start', recipeId: 'tea' })).status, 'unsupported');
      await store.flush();
      assert.equal(await readFile(file, 'utf8'), original);
    } finally { store.dispose(); }
  });
});

test('disk failures stay visible, do not poison later writes and never accept arbitrary command data', async () => {
  await fixture(async (_directory, file) => {
    await mkdir(file);
    const c = clocks();
    const store = new KitchenStore(file, c.options);
    try {
      assert.equal((await store.get()).status, 'unavailable');
      assert.equal((await store.command({ type: 'start', recipeId: 'tea' })).status, 'unavailable');
      await rmdir(file); // The exact empty fixture directory, beneath verified testRoot.
      await store.flush();
      assert.equal((await store.get()).status, 'ok');
      assert.equal(JSON.parse(await readFile(file, 'utf8')).session.recipeId, 'tea');
      assert.throws(() => store.command({ type: 'start', recipeId: 'tea', thought: 'SYNTHETIC_PRIVATE_KITCHEN' }), TypeError);
    } finally { store.dispose(); }
  });
});

test('recovery from backwards system clock explicitly pauses rather than losing accumulated time', async () => {
  await fixture(async (_directory, file) => {
    const kitchen = new KitchenTimer(createKitchen(), { now: () => 90_000, monotonic: () => 0 });
    kitchen.command({ type: 'start', recipeId: 'tea' });
    kitchen.kitchen.session.elapsedMs = 10_000;
    await writeFile(file, JSON.stringify(kitchen.kitchen));
    const store = new KitchenStore(file, clocks().options);
    try {
      const result = await store.get();
      assert.equal(result.status, 'clock-changed');
      assert.equal(result.kitchen.session.status, 'paused');
      assert.equal(result.kitchen.session.elapsedMs, 10_000);
      assert.equal((await store.command({ type: 'resume' })).status, 'ok');
    } finally { store.dispose(); }
  });
});

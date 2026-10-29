import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, rmdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { GardenStore } from '../electron/services/garden.js';
import { createGarden, gardenReducer, MAX_GARDEN_BYTES } from '../shared/garden.js';

const testRoot = path.resolve('work');
await mkdir(testRoot, { recursive: true });
async function temporaryGarden(run) {
  const directory = await mkdtemp(path.join(testRoot, 'little-haven-garden-'));
  try { await run(directory, path.join(directory, 'garden.json')); }
  finally {
    const resolved = path.resolve(directory);
    assert.equal(path.dirname(resolved), testRoot);
    assert.match(path.basename(resolved), /^little-haven-garden-/);
    await rm(resolved, { recursive: true, force: true });
  }
}

test('desktop garden is independent, atomic, serialized and readable after flush/recreation', async () => {
  await temporaryGarden(async (directory, file) => {
    const preferenceFile = path.join(directory, 'preferences.json');
    await writeFile(preferenceFile, '{"lampOn":false}');
    const store = new GardenStore(file);
    assert.equal((await store.get()).status, 'missing');
    const first = gardenReducer(createGarden(), { type: 'plant', slotId: 'pot-1', species: 'lavender' }, 1000);
    const last = { ...first, weather: 'rain', atmosphere: 'night' };
    const saves = [store.save(first), store.save(last)];
    await store.flush();
    await Promise.all(saves);
    assert.deepEqual((await new GardenStore(file).get()).garden, last);
    assert.deepEqual(JSON.parse(await readFile(file, 'utf8')), last);
    assert.equal(await readFile(preferenceFile, 'utf8'), '{"lampOn":false}');
    const copy = (await store.get()).garden;
    copy.plants[0].wateredStages.push(1);
    assert.deepEqual((await store.get()).garden.plants[0].wateredStages, []);
  });
});

test('missing, malformed and oversized documents return safe explicit statuses', async () => {
  await temporaryGarden(async (_directory, file) => {
    await writeFile(file, '{broken');
    assert.equal((await new GardenStore(file).get()).status, 'recovered');
    await writeFile(file, 'x'.repeat(MAX_GARDEN_BYTES + 1));
    assert.equal((await new GardenStore(file).get()).status, 'recovered');
    await writeFile(file, JSON.stringify({ ...createGarden(), thought: 'SYNTHETIC_PRIVATE_GARDEN' }));
    const result = await new GardenStore(file).get();
    assert.equal(result.status, 'recovered');
    assert.equal(JSON.stringify(result).includes('SYNTHETIC_PRIVATE_GARDEN'), false);
  });
});

test('future disk version is never overwritten by a temporary session save', async () => {
  await temporaryGarden(async (_directory, file) => {
    const original = '{"version":2,"future":"SYNTHETIC_FUTURE_DOCUMENT"}';
    await writeFile(file, original);
    const store = new GardenStore(file);
    assert.equal((await store.get()).status, 'unsupported');
    await assert.rejects(store.save(createGarden()), /unsupported/);
    await store.flush();
    assert.equal(await readFile(file, 'utf8'), original);
  });
});

test('disk errors do not break application startup or poison later saves', async () => {
  await temporaryGarden(async (_directory, file) => {
    await mkdir(file);
    const store = new GardenStore(file);
    assert.equal((await store.get()).status, 'unavailable');
    await assert.rejects(store.save(createGarden()));
    // This exact file path is an empty test directory inside the checked fixture.
    await rmdir(file);
    await store.save({ ...createGarden(), atmosphere: 'sunset' });
    assert.equal((await store.get()).status, 'ok');
    assert.equal((await new GardenStore(file).get()).garden.atmosphere, 'sunset');
  });
});

test('preload rejects unknown nested text and malformed records before crossing IPC', async () => {
  let bridge;
  const messages = [];
  const source = await readFile(new URL('../electron/preload/index.cjs', import.meta.url), 'utf8');
  vm.runInNewContext(source, { require(name) {
    assert.equal(name, 'electron');
    return { contextBridge: { exposeInMainWorld(_name, value) { bridge = value; } },
      ipcRenderer: { invoke(channel, value) { messages.push({ channel, value }); return Promise.resolve(value); } } };
  } });
  const garden = gardenReducer(createGarden(), { type: 'plant', slotId: 'bed-1', species: 'hibiscus' }, 1000);
  await bridge.saveGarden(garden);
  assert.equal(messages.length, 1);
  for (const invalid of [
    { ...garden, thought: 'SYNTHETIC_PRIVATE_GARDEN' },
    { ...garden, plants: [{ ...garden.plants[0], thought: 'SYNTHETIC_PRIVATE_GARDEN' }] },
    { ...garden, plants: [{ ...garden.plants[0], elapsedMs: NaN }] },
    { ...garden, decorations: [{ slotId: '__proto__', kind: 'stone', lit: false }] },
    { ...garden, pots: [...garden.pots, garden.pots[0]] },
  ]) await assert.rejects(bridge.saveGarden(invalid), /Invalid garden/);
  assert.equal(messages.length, 1);
});

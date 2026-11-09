import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import {
  BOUQUET_SPECIES, createGarden, gardenReducer, getAvailableBouquetSpecies, getPlantStage,
  GROWTH_THRESHOLDS, reconcileGarden, recoverGarden, SPECIES, validateGarden,
} from '../shared/garden.js';

const newSpecies = ['sunflower', 'rose-red', 'rose-pink', 'tulip', 'hydrangea', 'peony', 'dahlia', 'wildflower', 'cosmos'];
const now = 10_000;
const grownAt = now + GROWTH_THRESHOLDS.at(-1);
const planted = (species) => gardenReducer(createGarden(), { type: 'plant', slotId: 'bed-1', species }, now);

test('bouquet flowers expand the garden without duplicating species or dropping original plants', () => {
  assert.deepEqual(SPECIES.slice(0, 5).map(({ id }) => id), ['daisy', 'lavender', 'hibiscus', 'fern', 'succulent']);
  assert.deepEqual(SPECIES.slice(5).map(({ id }) => id), newSpecies);
  assert.equal(new Set(SPECIES.map(({ id }) => id)).size, SPECIES.length);
  assert.deepEqual(BOUQUET_SPECIES.map(({ id }) => id), ['daisy', 'lavender', 'hibiscus', ...newSpecies]);
});

test('every new flower uses the same four growth stages and unchanged watering bonus', () => {
  for (const species of newSpecies) {
    const garden = planted(species);
    const plant = garden.plants[0];
    assert.equal(getPlantStage(plant, now), 0, species);
    assert.equal(getPlantStage(plant, now + GROWTH_THRESHOLDS[0]), 1, species);
    assert.equal(getPlantStage(plant, now + GROWTH_THRESHOLDS[1]), 2, species);
    assert.equal(getPlantStage(plant, grownAt), 3, species);
    const watered = gardenReducer(garden, { type: 'water', slotId: 'bed-1' }, now);
    assert.equal(watered.plants[0].elapsedMs, 24_000, species);
    assert.deepEqual(gardenReducer(watered, { type: 'water', slotId: 'bed-1' }, now), watered, species);
    assert.deepEqual(getAvailableBouquetSpecies(watered, now).map(({ id }) => id), [], species);
  }
});

test('new species persist and recover alongside old documents without a schema migration', () => {
  for (const species of newSpecies) {
    const garden = reconcileGarden(planted(species), grownAt);
    assert.deepEqual(validateGarden(JSON.parse(JSON.stringify(garden))), garden, species);
    const recovered = recoverGarden({ ...garden, unknown: 'SYNTHETIC' });
    assert.equal(recovered.status, 'recovered');
    assert.equal(recovered.garden.plants[0].species, species);
    assert.equal(getPlantStage(recovered.garden.plants[0], grownAt), 3);
    assert.equal(JSON.stringify(recovered).includes('SYNTHETIC'), false);
  }
  assert.equal(recoverGarden(planted('daisy')).status, 'ok');
});

test('availability begins at adulthood, includes offline growth and excludes foliage-only plants', () => {
  assert.deepEqual(getAvailableBouquetSpecies(createGarden(), now), []);
  for (const species of ['daisy', 'lavender', 'hibiscus', ...newSpecies]) {
    const garden = planted(species);
    assert.deepEqual(getAvailableBouquetSpecies(garden, grownAt - 1), [], species);
    assert.deepEqual(getAvailableBouquetSpecies(garden, grownAt).map(({ id }) => id), [species]);
  }
  assert.deepEqual(getAvailableBouquetSpecies(planted('fern'), grownAt), []);
  assert.deepEqual(getAvailableBouquetSpecies(planted('succulent'), grownAt), []);
});

test('repeated bouquet availability never consumes flowers, changes their stage, or mutates the garden', () => {
  let garden = planted('rose-red');
  garden = gardenReducer(garden, { type: 'plant', slotId: 'pot-1', species: 'rose-red' }, now);
  garden = gardenReducer(garden, { type: 'plant', slotId: 'pot-2', species: 'lavender' }, now);
  const before = JSON.stringify(garden);
  for (let index = 0; index < 30; index += 1) {
    const available = getAvailableBouquetSpecies(garden, grownAt);
    assert.deepEqual(available.map(({ id }) => id), ['lavender', 'rose-red']);
  }
  assert.equal(JSON.stringify(garden), before);
  assert.equal(garden.plants.length, 3);
  assert.ok(garden.plants.every((plant) => getPlantStage(plant, grownAt) === 3));
});

test('moving mature flowers keeps availability and explicit replacement follows garden behavior', () => {
  let garden = gardenReducer(createGarden(), { type: 'plant', slotId: 'pot-1', species: 'cosmos' }, now);
  garden = reconcileGarden(garden, grownAt);
  garden = gardenReducer(garden, { type: 'movePot', from: 'pot-1', to: 'pot-2' }, grownAt);
  assert.deepEqual(getAvailableBouquetSpecies(garden, grownAt).map(({ id }) => id), ['cosmos']);
  garden = gardenReducer(garden, { type: 'replacePlant', slotId: 'pot-2', species: 'peony' }, grownAt);
  assert.deepEqual(getAvailableBouquetSpecies(garden, grownAt), []);
  assert.deepEqual(getAvailableBouquetSpecies(garden, grownAt + GROWTH_THRESHOLDS.at(-1)).map(({ id }) => id), ['peony']);
});

test('the isolated desktop bridge accepts every cultivated flower and rejects unknown species', async () => {
  let bridge;
  const messages = [];
  const source = await readFile(new URL('../electron/preload/index.cjs', import.meta.url), 'utf8');
  vm.runInNewContext(source, { require(name) {
    assert.equal(name, 'electron');
    return { contextBridge: { exposeInMainWorld(_name, value) { bridge = value; } },
      ipcRenderer: { invoke(channel, value) { messages.push({ channel, value }); return Promise.resolve(value); } } };
  } });
  for (const { id } of SPECIES) await bridge.saveGarden(planted(id));
  assert.equal(messages.length, SPECIES.length);
  assert.ok(messages.every(({ channel }) => channel === 'haven:garden:save'));
  const garden = planted('daisy');
  await assert.rejects(bridge.saveGarden({ ...garden, plants: [{ ...garden.plants[0], species: 'arbitrary' }] }), /Invalid garden/);
  assert.equal(messages.length, SPECIES.length);
});

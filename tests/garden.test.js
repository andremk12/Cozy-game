import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createGarden, DECOR_SLOTS, gardenReducer, getPlantStage, GROWTH_THRESHOLDS,
  nextGrowthDelay, PLANT_SLOTS, reconcileGarden, recoverGarden, SPECIES, validateGarden,
} from '../shared/garden.js';

const plantAt = (slotId = 'pot-1', species = 'daisy', now = 1000) => gardenReducer(createGarden(), { type: 'plant', slotId, species }, now);

test('garden catalog has five species, eight plant slots and compatible decoration points', () => {
  assert.deepEqual(SPECIES.map(({ id }) => id), ['daisy', 'lavender', 'hibiscus', 'fern', 'succulent']);
  assert.equal(PLANT_SLOTS.length, 8);
  assert.equal(DECOR_SLOTS.length, 6);
  assert.equal(createGarden().pots.length, 4);
  assert.doesNotThrow(() => validateGarden(createGarden()));
});

test('growth crosses four stages at cumulative 2, 8 and 20 minutes without care or attendance', () => {
  const garden = plantAt();
  const plant = garden.plants[0];
  assert.equal(getPlantStage(plant, 1000), 0);
  assert.equal(getPlantStage(plant, 1000 + GROWTH_THRESHOLDS[0]), 1);
  assert.equal(getPlantStage(plant, 1000 + GROWTH_THRESHOLDS[1]), 2);
  assert.equal(getPlantStage(plant, 1000 + GROWTH_THRESHOLDS[2]), 3);
  const returned = reconcileGarden(garden, 1000 + 365 * 86_400_000);
  assert.equal(returned.plants[0].elapsedMs, 1_200_000);
  assert.equal(getPlantStage(returned.plants[0], 0), 3);
  assert.equal(nextGrowthDelay(returned, 1000 + 365 * 86_400_000), null);
});

test('watering adds twenty percent once per current stage and never enables unlimited click growth', () => {
  let garden = plantAt();
  garden = gardenReducer(garden, { type: 'water', slotId: 'pot-1' }, 1000);
  assert.equal(garden.plants[0].elapsedMs, 24_000);
  for (let index = 0; index < 30; index += 1) garden = gardenReducer(garden, { type: 'water', slotId: 'pot-1' }, 1000);
  assert.equal(garden.plants[0].elapsedMs, 24_000);
  garden = gardenReducer(garden, { type: 'water', slotId: 'pot-1' }, 121_000);
  assert.equal(garden.plants[0].elapsedMs, 216_000);
  assert.deepEqual(garden.plants[0].wateredStages, [0, 1]);
  garden = reconcileGarden(garden, 2_000_000);
  assert.equal(gardenReducer(garden, { type: 'water', slotId: 'pot-1' }, 2_000_000), garden);
});

test('clock rollback never removes growth or counts an already observed interval twice', () => {
  const garden = reconcileGarden(plantAt(), 61_000);
  const rollback = reconcileGarden(garden, 500);
  assert.equal(rollback, garden);
  assert.equal(getPlantStage(rollback.plants[0], 500), 0);
  assert.equal(reconcileGarden(rollback, 61_000), garden);
  assert.equal(nextGrowthDelay(rollback, 500), 120_500);
  assert.equal(reconcileGarden(rollback, 121_000).plants[0].elapsedMs, 120_000);
});

test('planting refuses occupied or invalid points and pot movement swaps plant and container together', () => {
  let garden = plantAt();
  garden = gardenReducer(garden, { type: 'plant', slotId: 'pot-2', species: 'fern' }, 1000);
  garden = gardenReducer(garden, { type: 'potStyle', slotId: 'pot-1', style: 'wood' }, 1000);
  const unchanged = gardenReducer(garden, { type: 'plant', slotId: 'pot-1', species: 'lavender' }, 1000);
  assert.equal(unchanged, garden);
  assert.equal(gardenReducer(garden, { type: 'plant', slotId: 'outside', species: 'fern' }, 1000), garden);
  assert.equal(gardenReducer(garden, { type: 'movePot', from: 'pot-1', to: 'bed-1' }, 1000), garden);
  garden = gardenReducer(garden, { type: 'movePot', from: 'pot-1', to: 'pot-2' }, 1000);
  assert.equal(garden.plants.find(({ slotId }) => slotId === 'pot-2').species, 'daisy');
  assert.equal(garden.plants.find(({ slotId }) => slotId === 'pot-1').species, 'fern');
  assert.equal(garden.pots.find(({ slotId }) => slotId === 'pot-2').style, 'wood');
  assert.doesNotThrow(() => validateGarden(garden));
});

test('decoration placement and swaps respect compatibility and lantern states', () => {
  let garden = createGarden();
  assert.equal(gardenReducer(garden, { type: 'decorate', slotId: 'bench-1', kind: 'mushroom' }, 1000), garden);
  garden = gardenReducer(garden, { type: 'decorate', slotId: 'accent-2', kind: 'mushroom' }, 1000);
  garden = gardenReducer(garden, { type: 'moveDecoration', from: 'accent-1', to: 'accent-2' }, 1000);
  assert.equal(garden.decorations.find(({ slotId }) => slotId === 'accent-2').kind, 'stone');
  assert.equal(gardenReducer(garden, { type: 'moveDecoration', from: 'accent-2', to: 'bench-1' }, 1000), garden);
  garden = gardenReducer(garden, { type: 'toggleLantern', slotId: 'lantern-1' }, 1000);
  assert.equal(garden.decorations.find(({ slotId }) => slotId === 'lantern-1').lit, false);
  garden = gardenReducer(garden, { type: 'removeDecoration', slotId: 'accent-2' }, 1000);
  assert.equal(garden.decorations.some(({ slotId }) => slotId === 'accent-2'), false);
  assert.doesNotThrow(() => validateGarden(garden));
});

test('confirmed replacement is one atomic plant change without affecting other slots', () => {
  let garden = plantAt();
  garden = gardenReducer(garden, { type: 'plant', slotId: 'bed-1', species: 'fern' }, 1000);
  garden = gardenReducer(garden, { type: 'water', slotId: 'pot-1' }, 1000);
  const replaced = gardenReducer(garden, { type: 'replacePlant', slotId: 'pot-1', species: 'hibiscus' }, 1000);
  assert.equal(replaced.plants.length, 2);
  assert.deepEqual(replaced.plants.find(({ slotId }) => slotId === 'pot-1'), {
    slotId: 'pot-1', species: 'hibiscus', elapsedMs: 0, updatedAt: 1000, wateredStages: [],
  });
  assert.equal(replaced.plants.find(({ slotId }) => slotId === 'bed-1').species, 'fern');
});

test('writes reject unknown fields, invalid growth, duplicate positions and incompatible objects', () => {
  const garden = plantAt();
  for (const invalid of [
    { ...garden, thought: 'SYNTHETIC_PRIVATE_GARDEN' },
    { ...garden, plants: [{ ...garden.plants[0], thought: 'SYNTHETIC_PRIVATE_GARDEN' }] },
    { ...garden, plants: [{ ...garden.plants[0], species: 'unknown' }] },
    { ...garden, plants: [{ ...garden.plants[0], elapsedMs: Infinity }] },
    { ...garden, plants: [{ ...garden.plants[0], updatedAt: -1 }] },
    { ...garden, plants: [{ ...garden.plants[0], wateredStages: [0, 0] }] },
    { ...garden, plants: [garden.plants[0], garden.plants[0]] },
    { ...garden, pots: garden.pots.slice(1) },
    { ...garden, decorations: [{ slotId: 'bench-1', kind: 'stone', lit: false }] },
    { ...garden, atmosphere: 'storm' },
    null, [],
  ]) assert.throws(() => validateGarden(invalid), TypeError);
});

test('recovery salvages valid entries only and preserves future documents as unsupported', () => {
  const garden = plantAt();
  const result = recoverGarden({ ...garden, thought: 'SYNTHETIC_PRIVATE_GARDEN',
    plants: [{ ...garden.plants[0], thought: 'SYNTHETIC_PRIVATE_GARDEN' }, { ...garden.plants[0], slotId: 'outside' }], pots: [] });
  assert.equal(result.status, 'recovered');
  assert.equal(result.garden.plants.length, 1);
  assert.equal(result.garden.pots.length, 4);
  assert.equal(JSON.stringify(result).includes('SYNTHETIC_PRIVATE_GARDEN'), false);
  assert.doesNotThrow(() => validateGarden(result.garden));
  assert.equal(recoverGarden({ ...garden, version: 2 }).status, 'unsupported');
});

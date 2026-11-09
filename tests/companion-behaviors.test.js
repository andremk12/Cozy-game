import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COMPANION_PLACES, COMPANION_POSES, companionPositionAt, companionRoute,
  initialCompanion, kitchenCompanionAction, nextCompanion, petCompanion,
} from '../src/services/companionBehaviors.js';

test('companion begins resting on a valid surface in each scene, with no needs or persistent state', () => {
  const expected = { room: ['bed', 'sleeping'], garden: ['grass', 'lying'], journey: ['seat', 'sitting'], kitchen: ['wait', 'sitting'] };
  for (const [world, [place, pose]] of Object.entries(expected)) {
    const state = initialCompanion(world, 0);
    assert.equal(state.place, place);
    assert.equal(state.pose, pose);
    assert.deepEqual(state.position, COMPANION_PLACES[world][place]);
    assert.ok(state.waitMs >= 10_000);
    for (const key of ['hunger', 'energy', 'happiness', 'lastVisit', 'name', 'draft']) assert.equal(Object.hasOwn(state, key), false);
  }
  assert.equal(initialCompanion('unknown').world, 'room');
});

test('all paths stay on the pixel grid; only the front of the bed has a vertical leap', () => {
  for (const [world, places] of Object.entries(COMPANION_PLACES)) {
    for (const [from, source] of Object.entries(places)) {
      for (const [to] of Object.entries(places)) {
        const route = companionRoute(world, from, to);
        if (from === to) { assert.deepEqual(route, []); continue; }
        assert.equal(route.at(-1), to);
        let previous = source;
        for (const next of route) {
          const target = places[next];
          assert.ok(previous.x === target.x || previous.y === target.y, 'a walk never cuts diagonally across furniture');
          assert.ok(Number.isInteger(target.x) && Number.isInteger(target.y));
          assert.ok(target.x >= 20 && target.x <= 450 && target.y >= 28 && target.y <= 267);
          previous = target;
        }
      }
    }
  }
  assert.deepEqual(companionRoute('room', 'bed', 'window'), ['bed-edge', 'landing', 'floor', 'window-floor', 'window']);
  assert.deepEqual(companionRoute('room', 'missing', 'window'), []);
  assert.deepEqual(companionRoute('unknown', 'bed', 'window'), []);
});

test('a calm state machine offers every pose and long rests without continuous walking', () => {
  const seen = new Set();
  for (const world of Object.keys(COMPANION_PLACES)) {
    let state = initialCompanion(world, 0.1);
    let rests = 0;
    for (let step = 0; step < 90; step += 1) {
      seen.add(state.pose);
      if (state.pose !== 'walking') {
        rests += 1;
        assert.ok(state.pose === 'stretching' ? state.waitMs === 3000 : state.waitMs >= 10_000);
      }
      const before = state;
      state = nextCompanion(state, { rainOn: true, atmosphere: 'day' }, (step % 9) / 10);
      assert.ok(state.sequence > before.sequence);
      assert.ok(COMPANION_POSES.includes(state.pose));
    }
    assert.ok(rests >= 20, 'the cat regularly stops to rest');
  }
  assert.deepEqual([...seen].sort(), COMPANION_POSES.filter((pose) => pose !== 'petting').sort());
});

function walkingRoom() {
  let state = initialCompanion('room', 0);
  for (let step = 0; step < 3; step += 1) state = nextCompanion(state, { rainOn: true }, 0);
  assert.equal(state.pose, 'walking');
  return state;
}

test('rain occasionally draws the room cat toward the window by connected surfaces', () => {
  let rainy = walkingRoom();
  const destinations = [];
  while (rainy.travel) {
    destinations.push([rainy.travel.destination, rainy.travel.mode]);
    rainy = nextCompanion(rainy, { rainOn: true }, 0.1);
  }
  assert.deepEqual(destinations, [['bed-edge', 'walk'], ['landing', 'hop'], ['floor', 'walk'], ['window-floor', 'walk'], ['window', 'walk']]);
  assert.equal(rainy.pose, 'looking');
  assert.deepEqual(rainy.position, COMPANION_PLACES.room.window);
  let dry = initialCompanion('room', 0);
  for (let step = 0; step < 3; step += 1) dry = nextCompanion(dry, { rainOn: false }, 0);
  assert.equal(dry.travel.remainingPath.at(-1), 'lamp');
});

test('travel and leaps have integral positions and meet their exact destination without teleporting', () => {
  let state = walkingRoom();
  while (state.travel) {
    const { from, to, duration, mode } = state.travel;
    let previous = companionPositionAt(state, 0);
    assert.deepEqual(previous, from);
    for (let time = 1; time <= duration; time += 1) {
      const position = companionPositionAt(state, time);
      assert.ok(Number.isInteger(position.x) && Number.isInteger(position.y));
      assert.ok(Math.abs(position.x - previous.x) <= 1 && Math.abs(position.y - previous.y) <= 1);
      previous = position;
    }
    assert.deepEqual(companionPositionAt(state, duration), to);
    if (mode === 'hop') assert.ok(companionPositionAt(state, duration * 0.2).y < from.y, 'a descending leap lifts off first');
    state = nextCompanion(state, { rainOn: true }, 0);
  }
});

test('petting pauses at the current pixel, ignores repeat reactions, then resumes the same behavior', () => {
  const resting = initialCompanion('journey', 0.5);
  const affectionate = petCompanion(resting, 2500);
  assert.equal(affectionate.pose, 'petting');
  assert.equal(affectionate.waitMs, 1800);
  assert.equal(affectionate.reaction, 1);
  assert.equal(petCompanion(affectionate), affectionate);
  const returned = nextCompanion(affectionate);
  assert.equal(returned.pose, resting.pose);
  assert.equal(returned.waitMs, resting.waitMs - 2500);
  assert.equal(returned.reaction, 1);
  assert.deepEqual(returned.position, resting.position);

  const walking = walkingRoom();
  const time = 3100;
  const position = companionPositionAt(walking, time);
  const paused = petCompanion(walking, time);
  assert.deepEqual(paused.position, position);
  assert.equal(paused.travel, null);
  const resumed = nextCompanion(paused);
  assert.equal(resumed.pose, 'walking');
  assert.equal(resumed.travel.destination, walking.travel.destination);
  assert.equal(resumed.waitMs, walking.waitMs - time);
  assert.deepEqual(companionPositionAt(resumed), position);
  assert.deepEqual(companionPositionAt(resumed, resumed.waitMs), walking.travel.to);
});

test('garden and journey reserve short corridors apart from plants and train controls', () => {
  for (const position of Object.values(COMPANION_PLACES.garden)) {
    assert.ok(position.x >= 350 && position.x <= 395 && position.y === 265);
    assert.ok(position.y - 30 > 234, 'interactive companion bounds stay below the fish hit area');
  }
  for (const position of Object.values(COMPANION_PLACES.journey)) {
    assert.ok(position.x >= 303 && position.x <= 330 && position.y === 211);
    assert.ok(position.x - 20 > 273, 'the cat does not cover tea, ticket or book');
    assert.ok(position.x + 21 < 377, 'the cat does not cover the curtain or lamp targets');
  }
});

test('kitchen actions follow the real recipe stage and use the same companion base poses', () => {
  const stages = [
    ['ingredients', 'read', 'reading', 'prep'], ['preparing', 'mix', 'mixing', 'prep'],
    ['cooking', 'stir', 'stirring', 'prep'], ['finishing', 'decorate', 'icing', 'prep'],
    ['batter', 'mix', 'mixing', 'prep'], ['oven', 'oven', 'baking', 'oven'],
    ['baking', 'wait', 'baking', 'oven'], ['chocolate', 'decorate', 'icing', 'prep'],
    ['serving', 'present', 'presenting', 'table'],
  ];
  for (const [id, pose, action, place] of stages) {
    const result = kitchenCompanionAction({ kitchenStatus: 'running', kitchenStage: { id, pose }, kitchenProgress: 0.4 });
    assert.equal(result.action, action);
    assert.equal(result.place, place);
    assert.ok(COMPANION_POSES.includes(result.pose));
    assert.deepEqual(result.position, COMPANION_PLACES.kitchen[place]);
    assert.equal(result.travel, null);
    assert.equal(result.celebrate, false);
    for (const key of ['name', 'appearance', 'draft', 'remainingMs']) assert.equal(Object.hasOwn(result, key), false);
  }
  assert.equal(kitchenCompanionAction({ kitchenStatus: 'running', kitchenStage: 'batter' }).action, 'mixing');
});

test('kitchen pause preserves its current destination and only celebrates when presentation is explicitly claimed', () => {
  const context = { kitchenStage: { id: 'batter', pose: 'mix' }, kitchenProgress: 0.5 };
  const paused = kitchenCompanionAction({ ...context, kitchenStatus: 'paused' });
  assert.equal(paused.action, 'mixing');
  assert.equal(paused.pose, 'sitting');
  assert.deepEqual(paused.position, COMPANION_PLACES.kitchen.prep);
  const completed = kitchenCompanionAction({ ...context, kitchenStatus: 'completed' });
  assert.equal(completed.action, 'presenting');
  assert.equal(completed.celebrate, false);
  assert.equal(kitchenCompanionAction({ kitchenStatus: 'completed', kitchenCelebrate: true }).celebrate, true);
  for (const status of ['idle', 'cancelled']) {
    const idle = kitchenCompanionAction({ ...context, kitchenStatus: status });
    assert.equal(idle.action, 'reading');
    assert.equal(idle.celebrate, false);
  }
  const preparing = { ...initialCompanion('kitchen'), ...kitchenCompanionAction({ ...context, kitchenStatus: 'running' }) };
  const petted = petCompanion(preparing, 500);
  assert.equal(petted.pose, 'petting');
  assert.deepEqual(petted.position, preparing.position);
  assert.equal(nextCompanion(petted).action, 'mixing');
});

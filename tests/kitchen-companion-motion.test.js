import test from 'node:test';
import assert from 'node:assert/strict';
import { companionPositionAt, initialCompanion, kitchenCompanionAction, kitchenCompanionTargetKey, nextCompanion, petCompanion } from '../src/services/companionBehaviors.js';
import { directKitchenMotion, initializeKitchenMotion, kitchenHeadAnchor, kitchenRoute,
  KITCHEN_COMPANION_PLACES, KITCHEN_WALK_SPEED } from '../src/services/kitchenCompanionMotion.js';

const context = (stage = 'ingredients', status = 'running', id = 'synthetic-session') => ({
  kitchenSessionId: id, kitchenStatus: status, kitchenStage: stage, kitchenRecipeId: 'tea',
});
function initial(value = context('idle', 'idle', '')) {
  return initializeKitchenMotion(initialCompanion('kitchen', 0), kitchenCompanionAction(value), kitchenCompanionTargetKey(value));
}
function target(state, value, options) {
  return directKitchenMotion(state, kitchenCompanionAction(value), kitchenCompanionTargetKey(value), options);
}

test('kitchen floor routes stay outside the tabletop and cabinet footprint with no diagonal or elevated segments', () => {
  for (const [from, origin] of Object.entries(KITCHEN_COMPANION_PLACES)) {
    for (const to of Object.keys(KITCHEN_COMPANION_PLACES)) {
      let previous = origin;
      const route = kitchenRoute(from, to);
      if (from === to) { assert.deepEqual(route, []); continue; }
      assert.equal(route.at(-1), to);
      for (const place of route) {
        const next = KITCHEN_COMPANION_PLACES[place];
        assert.ok(previous.x === next.x || previous.y === next.y);
        assert.ok(previous.y >= 220 && next.y >= 220);
        for (let step = 0; step <= 100; step += 1) {
          const x = previous.x + (next.x - previous.x) * step / 100;
          const y = previous.y + (next.y - previous.y) * step / 100;
          assert.ok(y >= 266 || x >= 340, 'walking uses the foreground or the clear right-hand aisle');
          assert.ok(x >= 20 && x <= 450 && y <= 267);
        }
        previous = next;
      }
    }
  }
});

test('a new recipe looks, walks at one calm speed, arrives, then starts its action', () => {
  const value = context();
  let state = target(initial(), value);
  assert.equal(state.kitchenPhase, 'preparing');
  assert.equal(state.pose, 'looking');
  assert.equal(state.action, undefined);
  let duration = state.waitMs;
  let walking = 0;
  while (state.kitchenPhase !== 'acting') {
    const before = state;
    state = nextCompanion(state, value, 0);
    assert.ok(state.sequence > before.sequence);
    if (state.kitchenPhase !== 'acting') assert.equal(state.action, undefined);
    if (state.kitchenPhase === 'walking') {
      walking += 1;
      const travel = state.travel;
      const distance = Math.abs(travel.to.x - travel.from.x) + Math.abs(travel.to.y - travel.from.y);
      assert.ok(Math.abs(travel.duration - distance / KITCHEN_WALK_SPEED * 1000) <= 0.5);
      assert.equal(travel.mode, 'walk');
      assert.equal(state.pose, 'walking');
      assert.deepEqual(companionPositionAt(state, state.waitMs), travel.to);
    }
    duration += state.kitchenPhase === 'acting' ? 0 : state.waitMs;
  }
  assert.ok(walking >= 3);
  assert.ok(duration < 15_000);
  assert.equal(state.action, 'reading');
  assert.deepEqual(state.position, KITCHEN_COMPANION_PLACES.prep);
});

test('retargeting a walk or cancelling begins at its exact current pixel and removes the old action', () => {
  let state = nextCompanion(target(initial(), context()));
  const position = companionPositionAt(state, Math.floor(state.waitMs / 2));
  const cancelled = target(state, context('idle', 'cancelled'), { position });
  assert.deepEqual(cancelled.position, position);
  assert.equal(cancelled.travel, null);
  assert.equal(cancelled.action, undefined);
  assert.equal(cancelled.kitchenPhase, 'preparing');
  assert.equal(cancelled.kitchenTarget.place, 'book');
  state = nextCompanion(cancelled);
  assert.deepEqual(state.travel.from, position);
  assert.ok(state.travel.from.x === state.travel.to.x || state.travel.from.y === state.travel.to.y);
  const petted = petCompanion(state, 150);
  const resumed = nextCompanion(petted);
  assert.deepEqual(companionPositionAt(resumed), petted.position);
  assert.equal(resumed.kitchenPhase, 'walking');
});

test('hidden, reentry and reduced-motion synchronization settle only at the latest stage without an old route', () => {
  const state = nextCompanion(target(initial(), context()));
  const latest = context('baking', 'running', 'latest-session');
  const settled = target(state, latest, { immediate: true });
  assert.equal(settled.kitchenPhase, 'acting');
  assert.equal(settled.kitchenTargetKey, kitchenCompanionTargetKey(latest));
  assert.equal(settled.action, 'baking');
  assert.equal(settled.travel, null);
  assert.deepEqual(settled.kitchenRoute, []);
  assert.deepEqual(settled.position, KITCHEN_COMPANION_PLACES.oven);
  assert.equal(kitchenCompanionTargetKey({ ...latest, kitchenStatus: 'paused' }), kitchenCompanionTargetKey(latest));
  assert.notEqual(kitchenCompanionTargetKey({ ...latest, kitchenSessionId: 'another' }), kitchenCompanionTargetKey(latest));
});

test('completion walks to the table before presenting and holds one celebration until arrival', () => {
  let state = initial(context('chocolate'));
  const value = { ...context('ready', 'completed'), kitchenCelebrate: true };
  state = target(state, value);
  let transitions = 0;
  while (state.kitchenPhase !== 'acting') {
    assert.notEqual(state.action, 'presenting');
    state = nextCompanion(state);
    assert.ok(++transitions < 20);
  }
  assert.equal(state.action, 'presenting');
  assert.equal(state.facing, -1);
  assert.equal(state.celebrate, true);
  assert.deepEqual(state.position, KITCHEN_COMPANION_PLACES.table);
  state = nextCompanion(state);
  assert.equal(state.celebrate, false);
  assert.equal(nextCompanion(state), state);
});

test('the shared head anchor accounts for the chef hat, walking direction and resting pose', () => {
  assert.deepEqual(kitchenHeadAnchor({ pose: 'looking', facing: 1 }), { x: 0, y: -39 });
  assert.deepEqual(kitchenHeadAnchor({ pose: 'walking', facing: -1 }), { x: -8, y: -37 });
  assert.deepEqual(kitchenHeadAnchor({ pose: 'sleeping', facing: -1 }), { x: -7, y: -29 });
});

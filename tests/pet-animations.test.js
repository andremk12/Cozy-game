import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SPRITE_PETS, spriteFrameAt, companionAnimation, initializeSpriteState,
  prepareSpriteState, advanceSpriteQueue, preserveSpritePetting,
} from '../src/services/petAnimations.js';
import {
  initialCompanion, nextCompanion, petCompanion, companionPositionAt,
  kitchenCompanionAction, kitchenCompanionTargetKey,
} from '../src/services/companionBehaviors.js';
import { initializeKitchenMotion, directKitchenMotion } from '../src/services/kitchenCompanionMotion.js';

const animations = SPRITE_PETS.dalmatian.animations;
const prepare = (previous, next, elapsed = previous.waitMs, options) =>
  prepareSpriteState(previous, next, animations, elapsed, options);
const kitchenContext = (stage, status = 'running') => ({
  kitchenSessionId: 'synthetic-dalmatian-session', kitchenRecipeId: 'cake', kitchenStage: stage, kitchenStatus: status,
});
const kitchenInitial = (context) => initializeSpriteState(initializeKitchenMotion(
  initialCompanion('kitchen', 0), kitchenCompanionAction(context), kitchenCompanionTargetKey(context),
));
function retarget(state, context, elapsed = 0, immediate = false) {
  return prepare(state, directKitchenMotion(state, kitchenCompanionAction(context), kitchenCompanionTargetKey(context), {
    position: companionPositionAt(state, elapsed), immediate,
  }), elapsed, { immediate });
}
function drain(state) {
  const states = [state];
  while (state.spriteQueue.length) {
    state = advanceSpriteQueue(state);
    states.push(state);
    assert.ok(states.length < 20, 'a transition queue always reaches its destination');
  }
  return states;
}
function walkingState(world = 'journey') {
  let state = initialCompanion(world, 0);
  for (let step = 0; step < 3; step += 1) state = nextCompanion(state, {}, 0.9);
  assert.ok(state.travel);
  return state;
}

test('variable frame durations play every cell in order and loops wrap at the exact boundary', () => {
  for (const animation of Object.values(animations)) {
    let elapsed = 0;
    for (const [index, frame] of animation.frameOrder.entries()) {
      const duration = animation.durationsMs[index];
      assert.deepEqual(spriteFrameAt(animation, elapsed), { frame, remainingMs: duration });
      assert.deepEqual(spriteFrameAt(animation, elapsed + duration - 1), { frame, remainingMs: 1 });
      elapsed += duration;
    }
    const boundary = spriteFrameAt(animation, elapsed);
    if (animation.loop) {
      assert.deepEqual(boundary, spriteFrameAt(animation, 0));
      assert.deepEqual(spriteFrameAt(animation, elapsed * 31 + 100), spriteFrameAt(animation, 100));
    } else {
      assert.deepEqual(boundary, { frame: animation.frameOrder.at(-1), remainingMs: Infinity });
      assert.deepEqual(spriteFrameAt(animation, elapsed * 31), boundary, 'a finished transition never loops');
    }
  }
});

test('a sleeper wakes, settles, and stands once before any walking displacement', () => {
  const sleeper = initializeSpriteState({ ...initialCompanion('journey', 0), pose: 'sleeping' });
  const destination = walkingState();
  const states = drain(prepare(sleeper, destination, 1000));
  assert.deepEqual(states.map((state) => state.sprite.clip), ['sleep', 'wake_up', 'seated_idle', 'stand_up', 'walk']);
  assert.equal(states[0].waitMs, 5500, 'wake-up waits for the authored sleep frame 3 seam');
  for (const state of states.slice(0, -1)) {
    assert.equal(state.travel, null);
    assert.deepEqual(companionPositionAt(state, state.waitMs / 2), sleeper.position);
  }
  const walking = states.at(-1);
  assert.deepEqual(walking.travel, destination.travel);
  assert.deepEqual(companionPositionAt(walking), sleeper.position);
  assert.deepEqual(companionPositionAt(walking, walking.waitMs), destination.travel.to);
});

test('seated breathing reaches its approved seam, lies down once, then sleeps continuously', () => {
  const seated = initializeSpriteState(initialCompanion('journey', 0));
  const states = drain(prepare(seated, { ...seated, pose: 'lying', sequence: seated.sequence + 1 }, 2000));
  assert.deepEqual(states.map((state) => state.sprite.clip), ['seated_idle', 'lie_down', 'sleep']);
  assert.equal(states[0].waitMs, 3400);
  assert.equal(states[0].sprite.elapsedStart, 2000);
  assert.equal(states[1].waitMs, animations.lie_down.totalMs);
  assert.equal(states.at(-1).sprite.elapsedStart, 0);
  assert.equal(spriteFrameAt(animations.sleep, animations.sleep.totalMs * 3).frame, 0);
});

test('joining consecutive path segments keeps the walking cycle without standing again', () => {
  const destination = walkingState('room');
  const seated = initializeSpriteState({ ...initialCompanion('room', 0), pose: 'sitting' });
  const first = drain(prepare(seated, destination, 0)).at(-1);
  const following = prepare(first, nextCompanion(first, {}, 0), first.waitMs);
  assert.equal(following.sprite.clip, 'walk');
  assert.deepEqual(following.spriteQueue, []);
  assert.deepEqual(following.travel.from, first.travel.to);
  assert.equal(following.sprite.elapsedStart, first.waitMs);
});

test('recipe retargets finish the in-flight transition and replace all obsolete destinations', () => {
  const initial = kitchenInitial(kitchenContext('idle', 'idle'));
  let state = retarget(initial, kitchenContext('batter'));
  state = prepare(state, nextCompanion(state), state.waitMs);
  while (state.sprite.clip !== 'stand_up') state = advanceSpriteQueue(state);
  state = retarget(state, kitchenContext('baking'), 300);
  assert.equal(state.sprite.clip, 'stand_up');
  assert.equal(state.waitMs, animations.stand_up.totalMs - 300);
  state = retarget(state, kitchenContext('serving', 'completed'), 200);
  assert.equal(state.sprite.elapsedStart, 500);
  assert.equal(state.waitMs, animations.stand_up.totalMs - 500);
  state = drain(state).at(-1);
  assert.equal(state.kitchenTarget.action, 'presenting');
  assert.equal(state.kitchenTargetKey, kitchenCompanionTargetKey(kitchenContext('serving', 'completed')));
  assert.deepEqual(state.spriteQueue, []);
  for (let step = 0; state.kitchenPhase !== 'acting'; step += 1) {
    assert.ok(step < 30, 'latest recipe target is eventually reached');
    state = drain(prepare(state, nextCompanion(state), state.waitMs)).at(-1);
  }
  assert.equal(state.action, 'presenting');
  assert.equal(state.sprite.clip, 'seated_idle');
});

test('affection during a transition resumes remaining frames and preserves the reaction at its destination', () => {
  const seated = initializeSpriteState(initialCompanion('journey', 0));
  let transition = prepare(seated, walkingState(), 0);
  while (transition.sprite.clip !== 'stand_up') transition = advanceSpriteQueue(transition);
  const elapsed = 500;
  const petted = preserveSpritePetting(transition, petCompanion(transition, elapsed), elapsed);
  assert.equal(petted.travel, null);
  assert.deepEqual(petted.spriteQueue, [], 'affection cannot advance the pending trip');
  const resumed = nextCompanion(petted);
  assert.equal(resumed.sprite.clip, 'stand_up');
  assert.equal(resumed.sprite.elapsedStart, elapsed);
  assert.equal(resumed.waitMs, animations.stand_up.totalMs - elapsed);
  assert.equal(resumed.reaction, 1);
  const arrived = drain(resumed).at(-1);
  assert.equal(arrived.sprite.clip, 'walk');
  assert.equal(arrived.reaction, 1, 'finishing a queued transition must not restore an older affection counter');
});

test('petting a walk keeps its exact pixel, remaining travel and animation phase when resumed', () => {
  const walking = initializeSpriteState(walkingState());
  const elapsed = 750;
  const position = companionPositionAt(walking, elapsed);
  const petted = preserveSpritePetting(walking, petCompanion(walking, elapsed), elapsed);
  assert.deepEqual(petted.position, position);
  assert.equal(petted.sprite.elapsedStart, elapsed);
  const resumed = nextCompanion(petted);
  assert.deepEqual(companionPositionAt(resumed), position);
  assert.deepEqual(companionPositionAt(resumed, resumed.waitMs), walking.travel.to);
  assert.equal(resumed.sprite.elapsedStart, elapsed, 'the affection hold is not counted as animation time');
  assert.equal(resumed.waitMs, walking.waitMs - elapsed);
});

test('a recipe change during affection must not skip transition frames frozen by the affection hold', () => {
  const initial = kitchenInitial(kitchenContext('idle', 'idle'));
  let transition = retarget(initial, kitchenContext('batter'));
  transition = prepare(transition, nextCompanion(transition), transition.waitMs);
  while (transition.sprite.clip !== 'stand_up') transition = advanceSpriteQueue(transition);
  const petted = preserveSpritePetting(transition, petCompanion(transition, 300), 300);
  const redirected = retarget(petted, kitchenContext('baking'), 900);
  assert.equal(redirected.sprite.clip, 'stand_up');
  assert.equal(redirected.sprite.elapsedStart, 300);
  assert.equal(redirected.waitMs, animations.stand_up.totalMs - 300);
  assert.equal(drain(redirected).at(-1).kitchenTarget.action, 'baking');
});

test('cooking uses the batter action only and keeps looping until the real recipe changes', () => {
  const mixing = kitchenInitial(kitchenContext('batter'));
  assert.equal(mixing.sprite.clip, 'cook');
  const stillMixing = prepare(mixing, { ...nextCompanion(mixing), sequence: mixing.sequence + 1 }, mixing.waitMs);
  assert.equal(stillMixing.sprite.clip, 'cook');
  assert.equal(stillMixing.sprite.elapsedStart, mixing.waitMs);
  assert.deepEqual(stillMixing.spriteQueue, []);
  for (const stage of ['ingredients', 'cooking', 'baking', 'chocolate', 'serving']) {
    assert.equal(kitchenInitial(kitchenContext(stage)).sprite.clip, 'seated_idle');
  }
  assert.equal(companionAnimation({ ...mixing, kitchenPhase: 'preparing' }), 'seated_idle');
  assert.equal(companionAnimation({ ...mixing, travel: walkingState().travel }), 'walk');
  assert.notEqual(retarget(stillMixing, kitchenContext('idle', 'cancelled'), 300).sprite.clip, 'cook');
});

test('immediate synchronization discards obsolete animation queues and settles the latest kitchen action', () => {
  let pending = retarget(kitchenInitial(kitchenContext('idle', 'idle')), kitchenContext('batter'));
  pending = prepare(pending, nextCompanion(pending), pending.waitMs);
  assert.ok(pending.spriteQueue.length);
  const synchronized = retarget(pending, kitchenContext('baking'), 100, true);
  assert.equal(synchronized.kitchenPhase, 'acting');
  assert.equal(synchronized.action, 'baking');
  assert.equal(synchronized.travel, null);
  assert.deepEqual(synchronized.spriteQueue, []);
  assert.deepEqual(synchronized.kitchenRoute, []);
  assert.equal(synchronized.sprite.clip, 'seated_idle');
});

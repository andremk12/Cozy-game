import dalmatian from '../../public/assets/pets/dalmatian/animation-manifest.json' with { type: 'json' };

// The delivery manifest remains the source of frame geometry and timing.
export const SPRITE_PETS = Object.freeze({
  dalmatian: {
    assetBase: 'assets/pets/dalmatian/', scale: 1, automaticMirroring: false,
    animations: Object.fromEntries(dalmatian.animations.map((animation) => [animation.stateId, animation])),
  },
});

export function spriteFrameAt(animation, elapsedMs = 0) {
  let time = Math.max(0, elapsedMs);
  if (animation.loop) time %= animation.totalMs;
  for (let index = 0; index < animation.frameOrder.length; index += 1) {
    const duration = animation.durationsMs[index];
    if (time < duration) return { frame: animation.frameOrder[index], remainingMs: duration - time };
    time -= duration;
  }
  return { frame: animation.frameOrder.at(-1), remainingMs: Infinity };
}

export function companionAnimation(state) {
  if (state.travel) return 'walk';
  if (state.pose === 'sleeping' || state.pose === 'lying') return 'sleep';
  // This approved sheet specifically mixes batter; other culinary actions
  // keep the seated companion until their own artwork exists.
  if (state.kitchenPhase === 'acting' && state.action === 'mixing') return 'cook';
  return 'seated_idle';
}

export function initializeSpriteState(state) {
  return { ...state, sprite: { clip: companionAnimation(state), elapsedStart: 0 }, spriteQueue: [] };
}

const poseFor = (clip) => clip === 'sleep' ? 'sleeping' : clip === 'walk' ? 'walking' : 'sitting';

function queuedState(base, stages, sequence) {
  const [stage, ...queue] = stages;
  if (stage.target) return { ...stage.target, reaction: base.reaction, sequence, spriteQueue: [] };
  return { ...base, pose: poseFor(stage.clip), travel: null, returnState: null,
    sequence, waitMs: stage.duration, sprite: { clip: stage.clip, elapsedStart: stage.offset || 0 },
    spriteQueue: queue };
}

/** Adapt the existing behavior's next state, delaying displacement until the
 * approved transition finishes. The same hook timer owns behavior and clips. */
export function prepareSpriteState(previous, next, animations, elapsedMs = previous.waitMs, { immediate = false } = {}) {
  if (immediate) return initializeSpriteState(next);
  const target = initializeSpriteState(next);
  let from = previous.sprite?.clip || companionAnimation(previous);
  const to = target.sprite.clip;
  let offset = (previous.sprite?.elapsedStart || 0) + (previous.pose === 'petting' ? 0 : elapsedMs);
  const stages = [];
  const add = (clip, duration = animations[clip].totalMs, start = 0) => stages.push({ clip, duration, offset: start });
  const align = (clip, frame) => {
    const animation = animations[clip];
    const end = animation.durationsMs.slice(0, animation.frameOrder.indexOf(frame) + 1).reduce((a, b) => a + b, 0);
    const phase = offset % animation.totalMs;
    const remaining = (end - phase + animation.totalMs) % animation.totalMs;
    if (remaining > 0) add(clip, remaining, phase);
    offset = 0;
  };

  // Retargeting a recipe during a transition finishes its remaining frames,
  // then plans from its real endpoint, replacing any stale queued destination.
  if (!animations[from].loop) {
    const remaining = Math.max(0, animations[from].totalMs - offset);
    if (remaining) add(from, remaining, offset);
    from = animations[from].toState;
    offset = 0;
  }
  if (from === to) target.sprite.elapsedStart = offset;
  else {
    if (from === 'sleep') {
      align('sleep', animations.wake_up.transition.entryStateFrame);
      add('wake_up');
      from = 'seated_idle';
    }
    if (to === 'sleep') {
      if (from !== 'seated_idle') { add('seated_idle'); offset = 0; }
      else align('seated_idle', animations.lie_down.transition.entryStateFrame);
      add('lie_down');
    } else if (to === 'walk' && from !== 'walk') {
      if (from === 'seated_idle') align('seated_idle', animations.stand_up.transition.entryStateFrame);
      // Cook has no authored exit; settle into the approved seated pose.
      else add('seated_idle', animations.seated_idle.durationsMs[0]);
      add('stand_up');
    }
  }
  if (!stages.length) return target;
  stages.push({ target });
  return queuedState(next, stages, next.sequence);
}

export function advanceSpriteQueue(state) {
  return queuedState(state, state.spriteQueue, state.sequence + 1);
}

/** Affection uses the current approved pose, held in place. No invented art,
 * and an interrupted transition or trip resumes with its remaining time. */
export function preserveSpritePetting(previous, petted, elapsedMs) {
  const sprite = { ...previous.sprite, elapsedStart: previous.sprite.elapsedStart + elapsedMs };
  return { ...petted, sprite, spriteQueue: [], returnState: { ...petted.returnState, sprite } };
}

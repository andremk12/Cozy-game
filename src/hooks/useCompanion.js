import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { companionPositionAt, initialCompanion, kitchenCompanionAction, kitchenCompanionTargetKey, nextCompanion, petCompanion } from '../services/companionBehaviors.js';
import { directKitchenMotion, initializeKitchenMotion } from '../services/kitchenCompanionMotion.js';
import { SPRITE_PETS, advanceSpriteQueue, initializeSpriteState, prepareSpriteState, preserveSpritePetting } from '../services/petAnimations.js';

const now = () => globalThis.performance?.now() ?? Date.now();

export function useCompanion({ world, petId = 'cat', enabled = true, paused = false, reducedMotion = false, hold = false, context = {} }) {
  const spritePet = SPRITE_PETS[petId];
  const [state, setState] = useState(() => {
    const base = initialCompanion(world, Math.random());
    const initial = world === 'kitchen' ? initializeKitchenMotion(base, kitchenCompanionAction(context), kitchenCompanionTargetKey(context)) : base;
    return spritePet ? initializeSpriteState(initial) : initial;
  });
  const [hidden, setHidden] = useState(() => document.hidden);
  const lastPet = useRef(-Infinity);
  const timerState = useRef({ sequence: state.sequence, remaining: state.waitMs, started: null });
  const latestContext = useRef(context);
  const resumeSample = useRef(null);
  latestContext.current = context;
  const kitchen = world === 'kitchen';
  const kitchenPaused = kitchen && context.kitchenStatus === 'paused';
  const targetKey = kitchen ? kitchenCompanionTargetKey(context) : '';
  const still = paused || reducedMotion || hold || hidden || !enabled || kitchenPaused;
  // A static affection response can finish while a keyboard user holds focus.
  const timerPaused = !enabled || hidden || paused || (state.pose !== 'petting' && (reducedMotion || hold || kitchenPaused
    || (kitchen && !spritePet && state.kitchenPhase === 'acting' && !state.celebrate)));

  function adapt(previous, next, elapsed, immediate = false) {
    return spritePet ? prepareSpriteState(previous, next, spritePet.animations, elapsed, { immediate }) : next;
  }

  function remainingAt(timestamp) {
    const current = timerState.current;
    return current.sequence === state.sequence
      ? Math.max(0, current.remaining - (current.started === null ? 0 : timestamp - current.started)) : state.waitMs;
  }

  useLayoutEffect(() => {
    if (!kitchen) return;
    const sample = context.kitchenElapsedMs ?? context.kitchenProgress;
    const sameRestoredSession = resumeSample.current !== null && resumeSample.current.sessionId === context.kitchenSessionId;
    const freshAfterVisibility = sameRestoredSession && sample !== resumeSample.current.sample;
    if (resumeSample.current && !sameRestoredSession) resumeSample.current = null;
    if (freshAfterVisibility) resumeSample.current = null;
    const immediate = hidden || reducedMotion || !enabled || freshAfterVisibility;
    if (kitchenPaused && !immediate) return;
    const target = kitchenCompanionAction(context);
    if (state.kitchenTargetKey === targetKey) {
      if (immediate && (state.kitchenPhase !== 'acting' || state.pose === 'petting')) {
        setState((current) => current !== state ? current : adapt(state, directKitchenMotion(state, target, targetKey, { immediate: true }), 0, true));
      } else if (target.celebrate && !state.kitchenCelebrationClaimed) {
        setState((current) => current !== state ? current : {
          ...state, kitchenCelebrationClaimed: true, kitchenTarget: { ...state.kitchenTarget, celebrate: true },
          ...(state.kitchenPhase === 'acting' ? { celebrate: true, sequence: state.sequence + 1, waitMs: 1700 } : {}),
        });
      }
      return;
    }
    const elapsed = state.waitMs - remainingAt(now());
    const position = companionPositionAt(state, elapsed);
    setState((current) => current !== state ? current : adapt(state, directKitchenMotion(state, target, targetKey, { position, immediate }), elapsed, immediate));
  }, [kitchen, targetKey, kitchenPaused, hidden, reducedMotion, enabled, context.kitchenElapsedMs, context.kitchenProgress, context.kitchenCelebrate]);

  useLayoutEffect(() => {
    if (kitchen || (!reducedMotion && enabled) || !state.travel) return;
    // Scene-level reduced-motion CSS removes animations. Keep their exact
    // current pixel as static geometry, and resume from a negative delay later.
    const remaining = remainingAt(now());
    setState((current) => current !== state ? current : {
      ...current, sequence: current.sequence + 1, waitMs: Math.max(1, remaining),
      travel: { ...current.travel, elapsedStart: current.travel.elapsedStart + current.waitMs - remaining },
      ...(spritePet ? { sprite: { ...current.sprite, elapsedStart: current.sprite.elapsedStart + current.waitMs - remaining } } : {}),
    });
  }, [reducedMotion, enabled]);

  useLayoutEffect(() => {
    if (!spritePet || enabled || state.travel) return;
    // Hiding removes the bitmap player from the tree. Preserve its phase in
    // the same paused behavior state so showing it cannot restart breathing.
    const remaining = remainingAt(now());
    const elapsed = state.waitMs - remaining;
    if (!elapsed) return;
    setState((current) => current !== state ? current : {
      ...current, sequence: current.sequence + 1, waitMs: Math.max(1, remaining),
      sprite: { ...current.sprite, elapsedStart: current.sprite.elapsedStart + (current.pose === 'petting' ? 0 : elapsed) },
    });
  }, [enabled]);

  useEffect(() => {
    const visibility = () => {
      if (kitchen && !document.hidden) {
        const latest = latestContext.current;
        resumeSample.current = { sample: latest.kitchenElapsedMs ?? latest.kitchenProgress ?? 0, sessionId: latest.kitchenSessionId };
      }
      setHidden(document.hidden);
    };
    document.addEventListener('visibilitychange', visibility);
    return () => document.removeEventListener('visibilitychange', visibility);
  }, [kitchen]);

  useEffect(() => {
    let timer;
    const current = timerState.current;
    if (current.sequence !== state.sequence) {
      current.sequence = state.sequence;
      current.remaining = state.waitMs;
      current.started = null;
    }
    if (timerPaused) return undefined;
    current.started = now();
    timer = setTimeout(() => {
      current.started = null;
      setState((previous) => {
        if (spritePet && previous.spriteQueue?.length) return advanceSpriteQueue(previous);
        let next = nextCompanion(previous, latestContext.current, Math.random());
        if (previous.pose === 'petting') return next;
        if (spritePet && next === previous) next = { ...next, sequence: next.sequence + 1 };
        return adapt(previous, next, previous.waitMs);
      });
    }, current.remaining);
    return () => {
      clearTimeout(timer);
      if (current.started !== null) {
        current.remaining = Math.max(1, current.remaining - (now() - current.started));
        current.started = null;
      }
    };
  }, [state.sequence, state.waitMs, timerPaused]);

  const pet = useCallback(() => {
    const timestamp = now();
    if (!enabled || timestamp - lastPet.current < 3000 || state.pose === 'petting') return false;
    lastPet.current = timestamp;
    const remaining = remainingAt(timestamp);
    const elapsed = state.waitMs - remaining;
    const petted = petCompanion(state, elapsed);
    setState(spritePet ? preserveSpritePetting(state, petted, elapsed) : petted);
    return true;
  }, [enabled, state]);

  const staticPosition = reducedMotion && state.travel
    ? companionPositionAt(state, state.waitMs - remainingAt(now())) : null;
  return { state, pet, paused: paused || reducedMotion || hidden || !enabled || kitchenPaused,
    travelPaused: still, hidden, staticPosition };
}

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { companionPositionAt, initialCompanion, nextCompanion, petCompanion } from '../services/companionBehaviors.js';

const now = () => globalThis.performance?.now() ?? Date.now();

export function useCompanion({ world, enabled = true, paused = false, reducedMotion = false, hold = false, context = {} }) {
  const [state, setState] = useState(() => initialCompanion(world, Math.random()));
  const [hidden, setHidden] = useState(() => document.hidden);
  const lastPet = useRef(-Infinity);
  const timerState = useRef({ sequence: state.sequence, remaining: state.waitMs, started: null });
  const latestContext = useRef(context);
  latestContext.current = context;
  const still = paused || reducedMotion || hold || hidden || !enabled;
  // A static affection response can finish while a keyboard user holds focus.
  const timerPaused = !enabled || hidden || paused || (state.pose !== 'petting' && (reducedMotion || hold));

  function remainingAt(timestamp) {
    const current = timerState.current;
    return current.sequence === state.sequence
      ? Math.max(0, current.remaining - (current.started === null ? 0 : timestamp - current.started)) : state.waitMs;
  }

  useLayoutEffect(() => {
    if ((!reducedMotion && enabled) || !state.travel) return;
    // Scene-level reduced-motion CSS removes animations. Keep their exact
    // current pixel as static geometry, and resume from a negative delay later.
    const remaining = remainingAt(now());
    setState((current) => current !== state ? current : {
      ...current, sequence: current.sequence + 1, waitMs: Math.max(1, remaining),
      travel: { ...current.travel, elapsedStart: current.travel.elapsedStart + current.waitMs - remaining },
    });
  }, [reducedMotion, enabled]);

  useEffect(() => {
    const visibility = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', visibility);
    return () => document.removeEventListener('visibilitychange', visibility);
  }, []);

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
      setState((previous) => nextCompanion(previous, latestContext.current, Math.random()));
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
    setState(petCompanion(state, state.waitMs - remaining));
    return true;
  }, [enabled, state]);

  const staticPosition = reducedMotion && state.travel
    ? companionPositionAt(state, state.waitMs - remainingAt(now())) : null;
  return { state, pet, paused: paused || reducedMotion || hidden || !enabled,
    travelPaused: still, hidden, staticPosition };
}

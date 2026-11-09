import { useLayoutEffect, useRef, useState } from 'react';
import { spriteFrameAt } from '../../services/petAnimations.js';
import SpriteSheet from './SpriteSheet.jsx';

export default function AnimatedPetSprite({ definition, state, paused }) {
  const animation = definition.animations[state.sprite.clip];
  const offset = state.sprite.elapsedStart;
  const [frame, setFrame] = useState(() => spriteFrameAt(animation, offset).frame);
  const clock = useRef(null);
  useLayoutEffect(() => {
    let timer;
    const key = `${state.sequence}:${animation.stateId}:${offset}`;
    if (clock.current?.key !== key) clock.current = { key, elapsed: offset };
    const sample = clock.current;
    const started = performance.now();
    function tick() {
      const elapsed = sample.elapsed + (paused ? 0 : performance.now() - started);
      const current = spriteFrameAt(animation, elapsed);
      setFrame(current.frame);
      if (!paused && Number.isFinite(current.remainingMs)) timer = setTimeout(tick, Math.max(1, current.remainingMs));
    }
    tick();
    return () => {
      clearTimeout(timer);
      if (!paused) sample.elapsed += performance.now() - started;
    };
  }, [animation, offset, state.sequence, paused]);
  return <SpriteSheet animation={animation} frame={frame} assetBase={definition.assetBase} scale={definition.scale} />;
}

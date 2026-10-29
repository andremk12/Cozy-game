import { useEffect, useId, useState } from 'react';
import { useCompanion } from '../../hooks/useCompanion.js';
import CompanionSprite from './CompanionSprite.jsx';
import './Companion.css';

function contextualHint(name, state, context) {
  if (state.pose === 'petting') return `${name} gostou do carinho.`;
  if (state.pose === 'sleeping') return `${name} está tirando uma soneca.`;
  if (state.pose === 'looking') return state.world === 'garden' && context.atmosphere !== 'night'
    ? `${name} acompanha as borboletas com o olhar.` : `${name} parece gostar dessa vista.`;
  return `Fazer carinho em ${name}.`;
}

export default function Companion({ world = 'room', settings, reducedMotion = false, paused = false, context = {}, onInteract }) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [notice, setNotice] = useState('');
  const tooltipId = useId();
  const enabled = settings?.enabled !== false;
  const name = settings?.name || 'Seu gatinho';
  const { state, pet, paused: still, travelPaused, staticPosition } = useCompanion({ world, enabled, paused, reducedMotion, hold: hovered || focused, context });
  useEffect(() => {
    if (!enabled) { setHovered(false); setFocused(false); setNotice(''); }
  }, [enabled]);
  if (!enabled) return null;
  const travel = state.travel;
  const dx = travel ? travel.to.x - travel.from.x : 0;
  const dy = travel ? travel.to.y - travel.from.y : 0;
  const movingLeft = travel && dx < 0;
  const position = staticPosition || state.position;
  const hint = contextualHint(name, state, context);
  const showHint = hovered || focused;
  const motionStyle = travel && !staticPosition ? {
    '--companion-dx': `${dx}px`, '--companion-dy': `${dy}px`,
    '--companion-steps': Math.max(1, Math.abs(dx || dy)),
    '--companion-hop-peak': `${dy > 0 ? -6 : dy - 6}px`,
    '--companion-hop-rise': dy > 0 ? 6 : -dy + 6,
    '--companion-hop-fall': dy > 0 ? dy + 6 : 6,
    animationName: travel.mode === 'hop' ? dy > 0 ? 'companion-hop-down' : 'companion-hop-up' : 'companion-travel',
    animationDuration: `${travel.duration}ms`, animationDelay: `${-travel.elapsedStart}ms`,
    animationTimingFunction: `steps(${Math.max(1, Math.abs(dx || dy))}, end)`,
    animationPlayState: travelPaused ? 'paused' : 'running',
  } : undefined;
  function interact(event) {
    if (!pet()) return;
    setNotice(`${name} gostou do carinho.`);
    onInteract?.(event);
  }
  return <g className={`companion${still ? ' is-paused' : ''}${hovered || focused ? ' is-held' : ''}${reducedMotion ? ' is-reduced-motion' : ''}`}
    role="button" tabIndex="0" aria-label={`Fazer carinho em ${name}`} aria-description={notice || hint}
    aria-describedby={showHint ? tooltipId : undefined}
    data-world={world} data-pose={state.pose} data-place={state.place} data-reaction={state.reaction}
    data-paused={still} data-held={hovered || focused} data-moving={Boolean(travel)} data-motion={travel?.mode || 'rest'}
    transform={`translate(${position.x} ${position.y})`}
    onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
    onFocus={() => setFocused(true)} onBlur={() => { setFocused(false); setNotice(''); }}
    onClick={interact} onKeyDown={(event) => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); if (!event.repeat) interact(event); }
    }}>
    <title>{hint}</title>
    <g key={state.sequence} className="companion-travel" style={motionStyle}>
      <g transform={movingLeft ? 'scale(-1 1)' : undefined}>
        <CompanionSprite pose={state.pose} appearance={settings?.appearance} airborne={travel?.mode === 'hop'}
          breathingClassName={world === 'room' ? 'room-sleeping-cat' : ''} />
      </g>
      <rect className="companion-hit" x="-20" y="-30" width="41" height="33" />
      {showHint && <g className="companion-hint" pointerEvents="none" aria-hidden="true">
        <path d="M-63-51H63v14H6l-5 4-4-4h-60z" fill="#233c39" opacity=".95" />
        <text id={tooltipId} x="0" y="-41" textAnchor="middle">{state.pose === 'petting' ? 'Um carinho tranquilo.' : name}</text>
      </g>}
    </g>
    <g className="companion-announcement" aria-live="polite" aria-atomic="true"><title>{notice}</title></g>
  </g>;
}

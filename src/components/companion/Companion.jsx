import { useEffect, useId, useState } from 'react';
import { useCompanion } from '../../hooks/useCompanion.js';
import CompanionSprite from './CompanionSprite.jsx';
import AnimatedPetSprite from './AnimatedPetSprite.jsx';
import { SPRITE_PETS } from '../../services/petAnimations.js';
import { displayCompanionName } from '../../../shared/companion.js';
import { kitchenHeadAnchor } from '../../services/kitchenCompanionMotion.js';
import './Companion.css';

function contextualHint(name, state, context) {
  if (state.pose === 'petting') return `${name} gostou do carinho.`;
  if (state.pose === 'sleeping') return `${name} está tirando uma soneca.`;
  if (state.world === 'kitchen' && state.action) {
    const descriptions = { reading: 'consulta o livro de receitas', mixing: 'prepara a massa',
      stirring: 'mexe a receita com cuidado', baking: 'acompanha o forno', icing: 'cuida dos últimos detalhes',
      presenting: 'apresenta a receita pronta', waiting: 'espera sem pressa' };
    return `${name} ${descriptions[state.action] || 'faz companhia na cozinha'}.`;
  }
  if (state.pose === 'looking') return state.world === 'garden' && context.atmosphere !== 'night'
    ? `${name} acompanha as borboletas com o olhar.` : `${name} parece gostar dessa vista.`;
  return `Fazer carinho em ${name}.`;
}

export default function Companion(props) {
  return <CompanionBody key={props.settings?.petId || 'cat'} {...props} />;
}

function CompanionBody({ world = 'room', settings, reducedMotion = false, paused = false, context = {}, onInteract, renderAnchoredContent }) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [notice, setNotice] = useState('');
  const tooltipId = useId();
  const enabled = settings?.enabled !== false;
  const name = displayCompanionName(settings);
  const petId = settings?.petId || 'cat';
  const spritePet = SPRITE_PETS[petId];
  const { state, pet, paused: still, travelPaused, staticPosition } = useCompanion({ world, petId, enabled, paused, reducedMotion, hold: hovered || focused, context });
  useEffect(() => {
    if (!enabled) { setHovered(false); setFocused(false); setNotice(''); }
  }, [enabled]);
  if (!enabled) return null;
  const travel = state.travel;
  const dx = travel ? travel.to.x - travel.from.x : 0;
  const dy = travel ? travel.to.y - travel.from.y : 0;
  const kitchen = world === 'kitchen';
  const movingLeft = !spritePet && (kitchen ? state.facing < 0 : travel && dx < 0);
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
  const kitchenMotionStyle = kitchen && travel ? {
    '--kitchen-dx': dx, '--kitchen-dy': dy,
    animationName: state.sequence % 2 ? 'kitchen-companion-travel-a' : 'kitchen-companion-travel-b',
    animationDuration: `${travel.duration}ms`, animationDelay: `${-travel.elapsedStart}ms`,
    animationTimingFunction: `steps(${Math.max(1, Math.abs(dx || dy))}, end)`,
    animationPlayState: travelPaused ? 'paused' : 'running',
  } : undefined;
  const headAnchor = spritePet ? { x: 0, y: -55 } : kitchenHeadAnchor(state);
  const from = travel?.from || position;
  const to = travel?.to || position;
  const travelBounds = { from, to, minX: Math.min(from.x, to.x), maxX: Math.max(from.x, to.x),
    minY: Math.min(from.y, to.y), maxY: Math.max(from.y, to.y) };
  const anchoredContent = kitchen ? renderAnchoredContent?.({ state, headAnchor, travelBounds }) : null;
  function interact(event) {
    if (!pet()) return;
    setNotice(`${name} gostou do carinho.`);
    onInteract?.(event);
  }
  const contents = <>
    <g transform={movingLeft ? 'scale(-1 1)' : undefined}>
      {spritePet ? <AnimatedPetSprite definition={spritePet} state={state}
        paused={travelPaused || state.pose === 'petting' || travel?.mode === 'hop'} />
        : <CompanionSprite pose={state.pose} appearance={settings?.appearance} airborne={travel?.mode === 'hop'}
        chef={kitchen} kitchenAction={state.pose === 'petting' ? undefined : state.action}
        celebrate={state.celebrate} breathingClassName={world === 'room' ? 'room-sleeping-cat' : ''} />}
    </g>
    <rect className="companion-hit" x={spritePet ? -25 : -20} y={spritePet ? -50 : kitchen ? -39 : -30}
      width={spritePet ? 53 : kitchen ? 52 : 41} height={spritePet ? 52 : kitchen ? 42 : 33} />
    {showHint && !anchoredContent && <g className="companion-hint" transform={spritePet ? 'translate(0 -20)' : undefined} pointerEvents="none" aria-hidden="true">
      <path d="M-63-51H63v14H6l-5 4-4-4h-60z" fill="#233c39" opacity=".95" />
      <text id={tooltipId} x="0" y="-41" textAnchor="middle">{state.pose === 'petting' ? 'Um carinho tranquilo.' : name}</text>
    </g>}
  </>;
  const interactive = <g className={`companion${still ? ' is-paused' : ''}${hovered || focused ? ' is-held' : ''}${reducedMotion ? ' is-reduced-motion' : ''}`}
    role="button" tabIndex="0" aria-label={`Fazer carinho em ${name}`} aria-description={notice || hint}
    aria-describedby={showHint && !anchoredContent ? tooltipId : undefined}
    data-world={world} data-pet-id={petId} data-pose={state.pose} data-place={state.place} data-reaction={state.reaction}
    data-kitchen-action={state.action} data-kitchen-phase={state.kitchenPhase} data-kitchen-target={state.kitchenTarget?.place}
    data-facing={movingLeft ? 'left' : 'right'} data-paused={still} data-held={hovered || focused}
    data-moving={Boolean(travel)} data-motion={travel?.mode || 'rest'}
    onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
    onFocus={() => setFocused(true)} onBlur={() => { setFocused(false); setNotice(''); }}
    onClick={interact} onKeyDown={(event) => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); if (!event.repeat) interact(event); }
    }}>
    <title>{hint}</title>{contents}
    <g className="companion-announcement" aria-live="polite" aria-atomic="true"><title>{notice}</title></g>
  </g>;
  if (kitchen) return <g className="companion-anchor" transform={`translate(${position.x} ${position.y})`}
    style={{ '--kitchen-base-x': position.x, '--kitchen-base-y': position.y, '--kitchen-dx': 0, '--kitchen-dy': 0, '--kitchen-travel-progress': 0 }}>
    <g className="companion-travel kitchen-companion-travel" style={kitchenMotionStyle}>
      {interactive}
      <g data-companion-head="" transform={`translate(${headAnchor.x} ${headAnchor.y})`} aria-hidden="true" pointerEvents="none" />
      {anchoredContent}
    </g>
  </g>;
  return <g className={`companion${still ? ' is-paused' : ''}${hovered || focused ? ' is-held' : ''}${reducedMotion ? ' is-reduced-motion' : ''}`}
    role="button" tabIndex="0" aria-label={`Fazer carinho em ${name}`} aria-description={notice || hint}
    aria-describedby={showHint ? tooltipId : undefined}
    data-world={world} data-pet-id={petId} data-pose={state.pose} data-place={state.place} data-reaction={state.reaction}
    data-kitchen-action={world === 'kitchen' ? state.action : undefined}
    data-paused={still} data-held={hovered || focused} data-moving={Boolean(travel)} data-motion={travel?.mode || 'rest'}
    transform={`translate(${position.x} ${position.y})`}
    onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
    onFocus={() => setFocused(true)} onBlur={() => { setFocused(false); setNotice(''); }}
    onClick={interact} onKeyDown={(event) => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); if (!event.repeat) interact(event); }
    }}>
    <title>{hint}</title>
    <g key={state.sequence} className="companion-travel" style={motionStyle}>
      {contents}
    </g>
    <g className="companion-announcement" aria-live="polite" aria-atomic="true"><title>{notice}</title></g>
  </g>;
}

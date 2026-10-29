import { useEffect, useId, useState } from 'react';
import Icon from '../../components/Icon.jsx';
import ImmersiveViewport from '../../components/ImmersiveViewport/ImmersiveViewport.jsx';
import { useImmersiveMode } from '../../hooks/useImmersiveMode.js';
import JourneyLandscape from './JourneyLandscape.jsx';
import { CarriageShell, TrainWindowFrame, CarriageInterior } from './JourneyCarriage.jsx';
import { JourneyCurtains, JourneyObjectControls } from './JourneyObjects.jsx';
import JourneyKeepsake from './JourneyKeepsake.jsx';
import { useJourneyObjects } from './useJourneyObjects.js';
import { SCENERIES } from './sceneries.js';
import Companion from '../../components/companion/Companion.jsx';
import './Journey.css';

function MovementIcon({ paused }) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      {paused ? <path d="m5 3 7 5-7 5V3Z" stroke="currentColor" strokeWidth="1.2" /> : <path d="M5 3v10M11 3v10" stroke="currentColor" strokeWidth="2" />}
    </svg>
  );
}

export default function Journey({
  scenery = 'rainy-night',
  onSceneryChange,
  rainOn = true,
  onToggleRain,
  paused = false,
  onTogglePaused,
  reducedMotion = false,
  onBack,
  companion,
}) {
  const uniqueId = useId().replaceAll(':', '');
  const windowId = `journey-window-${uniqueId}`;
  const rainId = `journey-rain-${uniqueId}`;
  const nearRainId = `journey-rain-near-${uniqueId}`;
  const sceneryId = `journey-scenery-${uniqueId}`;
  const selectedScenery = SCENERIES.find((item) => item.id === scenery) || SCENERIES[0];
  const effectiveRain = selectedScenery.id === 'rainy-night' && rainOn;
  const [hidden, setHidden] = useState(() => document.hidden);
  const objects = useJourneyObjects();
  const immersive = useImmersiveMode({ contextualOpen: Boolean(objects.keepsake) });

  useEffect(() => {
    const updateVisibility = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', updateVisibility);
    return () => document.removeEventListener('visibilitychange', updateVisibility);
  }, []);

  const sceneClassName = [
    'journey-scene',
    (paused || hidden) && 'is-paused',
    reducedMotion && 'is-reduced-motion',
    effectiveRain && 'is-rain-on',
  ].filter(Boolean).join(' ');

  return (
    <section className={sceneClassName} data-scenery={selectedScenery.id} data-tea-state={objects.teaState} data-lamp-on={objects.lampOn} aria-label="The Journey: uma viagem sem pressa">
      <ImmersiveViewport targetRef={immersive.targetRef} active={immersive.active} onExit={immersive.exit} contextualOpen={Boolean(objects.keepsake)}>
      <svg
        className="journey-art"
        viewBox="0 0 480 270"
        xmlns="http://www.w3.org/2000/svg"
        shapeRendering="crispEdges"
        role="group"
        aria-labelledby={`journey-title-${uniqueId} journey-desc-${uniqueId}`}
      >
        <title id={`journey-title-${uniqueId}`}>Seu cantinho em um trem tranquilo</title>
        <desc id={`journey-desc-${uniqueId}`}>
          Um vagão em pixel art visto de lado, com poltronas de encosto alto frente a frente,
          bagageiro metálico, porta de passagem, mala e luminária lateral. Uma mesinha fixa
          sustenta chá e um bilhete de viagem; um livro repousa no banco. Explore a luminária,
          as cortinas, a xícara, o livro e o bilhete com clique ou Tab e Enter.
          Pela janela panorâmica, {selectedScenery.description}.
        </desc>
        <defs>
          <clipPath id={windowId}><rect x="83" y="42" width="316" height="119" /></clipPath>
          <pattern id={rainId} width="37" height="48" patternUnits="userSpaceOnUse">
            <path d="M7 2h1v5H7zM6 7h1v4H6zM28 24h1v4h-1zM27 28h1v5h-1z" fill="#bfd6db" opacity=".3" />
          </pattern>
          <pattern id={nearRainId} width="63" height="48" patternUnits="userSpaceOnUse">
            <path d="M17 8h1v5h-1zM16 13h1v5h-1zM49 32h1v5h-1zM48 37h1v4h-1z" fill="#dae3da" opacity=".4" />
          </pattern>
        </defs>
        <CarriageShell />
        <JourneyLandscape scenery={selectedScenery.id} windowId={windowId} rainId={rainId} nearRainId={nearRainId} rainOn={effectiveRain} />
        <TrainWindowFrame />
        <JourneyCurtains open={objects.curtainsOpen} onToggle={objects.toggleCurtains} windowId={windowId} />
        <CarriageInterior lampOn={objects.lampOn} teaState={objects.teaState} teaServing={objects.teaServing} />
        <JourneyObjectControls objects={objects} />
        {companion && <Companion world="journey" settings={companion.settings} reducedMotion={reducedMotion}
          paused={paused || hidden || companion.paused || Boolean(objects.keepsake)}
          context={{ scenery, rainOn: effectiveRain }} onInteract={companion.onInteract} />}
      </svg>
      {objects.keepsake && <JourneyKeepsake kind={objects.keepsake} scenery={selectedScenery} onClose={objects.closeKeepsake} />}
      <p className="sr-only" role="status">{objects.teaState === 'warm' ? 'Chá servido. O vapor sobe da xícara.' : objects.teaState === 'cooling' ? 'O chá esfria devagar.' : ''}</p>
      </ImmersiveViewport>
      <div className="journey-controls" role="group" aria-label="Controles da viagem">
        <div className="journey-scenery-control">
          <label htmlFor={sceneryId}>Paisagem</label>
          <select id={sceneryId} aria-label="Paisagem da viagem" value={selectedScenery.id} onChange={(event) => onSceneryChange?.(event.target.value)}>
            {SCENERIES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
        </div>
        <div className="journey-motion-controls">
          {selectedScenery.id === 'rainy-night' && (
            <button type="button" className="journey-control" onClick={onToggleRain} aria-label={rainOn ? 'Parar chuva' : 'Ativar chuva'} aria-pressed={rainOn}>
              <Icon name="rain" size={15} />
              <span>Chuva {rainOn ? 'ligada' : 'desligada'}</span>
            </button>
          )}
          <button type="button" className="journey-control" onClick={onTogglePaused} aria-pressed={paused} disabled={reducedMotion}>
            <MovementIcon paused={paused || reducedMotion} />
            <span>{reducedMotion ? 'Movimento reduzido' : paused ? 'Retomar movimento' : 'Pausar movimento'}</span>
          </button>
          <button
            ref={immersive.triggerRef}
            type="button"
            className="journey-control"
            aria-label="Modo Imersivo"
            title="Modo Imersivo"
            disabled={immersive.pending}
            onClick={immersive.enter}
          >
            <Icon name="expand" size={17} />
          </button>
        </div>
        <button type="button" className="journey-control journey-back" onClick={onBack}>
          <Icon name="back" size={15} /><span>Voltar ao quarto</span>
        </button>
        {immersive.error && <p className="journey-immersive-error" role="status">{immersive.error}</p>}
      </div>
    </section>
  );
}

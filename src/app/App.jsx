import { useEffect, useReducer, useRef, useState } from 'react';
import Room from '../scenes/Room/Room.jsx';
import LetItFloat from '../scenes/LetItFloat/LetItFloat.jsx';
import Journey from '../scenes/Journey/Journey.jsx';
import Planned from '../scenes/Planned/Planned.jsx';
import { initialRitual, ritualReducer } from '../scenes/LetItFloat/ritual.js';
import { usePreferences } from '../hooks/usePreferences.js';
import { useReducedMotion } from '../hooks/useReducedMotion.js';
import { AmbientAudio } from '../services/ambientAudio.js';
import Icon from '../components/Icon.jsx';
import ConfirmLeave from '../components/ConfirmLeave.jsx';
import './App.css';

const worlds = [
  { id: 'room', name: 'The Room', sub: 'Seu pequeno refúgio', icon: 'room' },
  {
    id: 'garden',
    name: 'The Garden',
    sub: 'Um lugar para florescer',
    icon: 'garden',
    planned: true,
  },
  {
    id: 'journey',
    name: 'The Journey',
    sub: 'O caminho também é casa',
    icon: 'journey',
  },
  { id: 'float', name: 'Let It Float', sub: 'Um respiro, um recomeço', icon: 'boat' },
];

export default function App() {
  const { preferences, setPreference, ready, storageError } = usePreferences();
  const reducedMotion = useReducedMotion();
  const [world, setWorld] = useState('room');
  const [pendingWorld, setPendingWorld] = useState(null);
  const [ritual, dispatch] = useReducer(ritualReducer, initialRitual);
  const [audioActive, setAudioActive] = useState(false);
  const [audioNotice, setAudioNotice] = useState('');
  // These choices belong to this visit, outside the persisted preference allowlist.
  const [journeyScenery, setJourneyScenery] = useState('rainy-night');
  const [journeyRainOn, setJourneyRainOn] = useState(true);
  const [journeyPaused, setJourneyPaused] = useState(false);
  const audio = useRef(null);
  const audioStarting = useRef(false);
  const heading = useRef(null);
  const previousWorld = useRef(world);
  const selected = worlds.find((item) => item.id === world);
  const ambientRainOn =
    world === 'journey'
      ? journeyScenery === 'rainy-night' && journeyRainOn
      : world !== 'garden' && preferences.rainOn;
  const weather =
    world === 'journey'
      ? journeyScenery === 'forest'
        ? { icon: 'garden', label: 'Floresta' }
        : journeyScenery === 'sunset'
          ? { icon: 'sunset', label: 'Pôr do sol' }
          : {
              icon: journeyRainOn ? 'rain' : 'moon',
              label: journeyRainOn ? 'Noite chuvosa' : 'Noite tranquila',
            }
      : {
          icon: preferences.rainOn ? 'rain' : 'moon',
          label: preferences.rainOn ? 'Uma noite de chuva' : 'Uma noite tranquila',
        };

  useEffect(() => {
    const engine = new AmbientAudio();
    audio.current = engine;
    return () => {
      void engine.dispose();
      if (audio.current === engine) audio.current = null;
    };
  }, []);
  useEffect(() => {
    audio.current?.setVolume(preferences.volume);
    audio.current?.setRain(ambientRainOn);
  }, [preferences.volume, ambientRainOn]);
  useEffect(() => {
    if (previousWorld.current !== world) {
      // The writing view places focus in its paper; other worlds announce their title.
      if (world !== 'float') heading.current?.focus();
      previousWorld.current = world;
    }
  }, [world]);
  useEffect(() => {
    if (!ritual.draft) return;
    const warn = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [ritual.draft]);

  function moveTo(next) {
    if (world === next) return;
    if (world === 'float' && ritual.phase === 'writing' && ritual.draft.length) {
      setPendingWorld(next);
      return;
    }
    dispatch({ type: 'RESET' });
    setWorld(next);
  }
  async function toggleAudio() {
    if (audioStarting.current) return;
    if (audioActive) {
      audio.current?.stop();
      setAudioActive(false);
      setPreference('audioEnabled', false);
      return;
    }
    audioStarting.current = true;
    audio.current?.setVolume(preferences.volume);
    audio.current?.setRain(ambientRainOn);
    const started = await audio.current?.start();
    audioStarting.current = false;
    setAudioActive(Boolean(started));
    setPreference('audioEnabled', Boolean(started));
    setAudioNotice(started ? '' : 'O áudio não pôde iniciar. Você pode tentar novamente.');
  }

  return (
    <div className="haven-app">
      <header className="app-header">
        <a
          className="brand"
          href="#room"
          onClick={(event) => {
            event.preventDefault();
            moveTo('room');
          }}
          aria-label="Little Haven — voltar ao quarto"
        >
          <img src="./assets/icons/haven.svg" width="39" height="39" alt="" />
          <span>
            <span className="brand-name">
              little haven<span className="brand-dot">.</span>
            </span>
            <span className="brand-tagline">A COZY PLACE TO BREATHE</span>
          </span>
        </a>
        <div className="header-right">
          <span className="local-note">
            <span /> Seu mundo, no seu tempo
          </span>
          <div className="sound-control">
            <button
              className={`sound-toggle ${audioActive ? 'is-on' : ''}`}
              onClick={toggleAudio}
              aria-pressed={audioActive}
              aria-label={audioActive ? 'Desativar áudio' : 'Ativar áudio'}
              title={
                preferences.audioEnabled && !audioActive
                  ? 'Toque para retomar o áudio'
                  : 'Chuva sintetizada, suave e local'
              }
            >
              <Icon name={audioActive ? 'sound' : 'mute'} size={18} />
              <span>
                {audioActive
                  ? 'Som ligado'
                  : preferences.audioEnabled
                    ? 'Retomar som'
                    : 'Som desligado'}
              </span>
            </button>
            <span className="volume-separator" />
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={preferences.volume}
              onChange={(e) => setPreference('volume', Number(e.target.value))}
              aria-label="Volume"
              title={`Volume: ${Math.round(preferences.volume * 100)}%`}
            />
          </div>
        </div>
      </header>
      <main>
        <div className="scene-heading">
          <div>
            <span className="eyebrow">SEU REFÚGIO DIGITAL</span>
            <h1 ref={heading} tabIndex="-1">
              {selected.name}
              <span className="heading-spark">✧</span>
            </h1>
            <p>
              {world === 'room'
                ? 'Lá fora, o mundo espera. Aqui, você pode só existir.'
                : selected.sub}
            </p>
          </div>
          <div className="scene-weather">
            <Icon name={weather.icon} size={18} />
            <span>{weather.label}</span>
          </div>
        </div>
        <div className="scene-frame">
          <div className="frame-top">
            <span className="frame-dot" />
            <span>{selected.sub}</span>
            <span className="frame-coordinate">
              {String(worlds.findIndex((item) => item.id === world) + 1).padStart(2, '0')} / 04
            </span>
          </div>
          <div className={`scene-content world-${world}`} key={world}>
            {!ready ? (
              <div className="loading-room">Preparando seu cantinho…</div>
            ) : world === 'room' ? (
              <Room
                lampOn={preferences.lampOn}
                rainOn={preferences.rainOn}
                onToggleLamp={() => setPreference('lampOn', (value) => !value)}
                onToggleRain={() => setPreference('rainOn', (value) => !value)}
                onOpenNotebook={() => moveTo('float')}
                reducedMotion={reducedMotion}
              />
            ) : world === 'journey' ? (
              <Journey
                scenery={journeyScenery}
                onSceneryChange={setJourneyScenery}
                rainOn={journeyRainOn}
                onToggleRain={() => setJourneyRainOn((value) => !value)}
                paused={journeyPaused}
                onTogglePaused={() => setJourneyPaused((value) => !value)}
                reducedMotion={reducedMotion}
                onBack={() => moveTo('room')}
              />
            ) : world === 'float' ? (
              <LetItFloat
                ritual={ritual}
                dispatch={dispatch}
                reducedMotion={reducedMotion}
                onBack={() => moveTo('room')}
              />
            ) : (
              <Planned world={world} onBack={() => moveTo('room')} />
            )}
          </div>
          <div className="scene-bottom">
            <span className="scene-hint">
              {world === 'room' ? (
                <>
                  <span className="tiny-diamond" /> Pequenas coisas guardam bons momentos. Explore o
                  quarto.
                </>
              ) : world === 'journey' ? (
                <>
                  <Icon name="journey" size={13} /> Sem destino, sem pressa. A paisagem faz companhia.
                </>
              ) : world === 'float' ? (
                <>
                  <Icon name="lock" size={13} /> Seu texto fica apenas nesta sessão e é descartado
                  ao soltar o papel.
                </>
              ) : (
                <>Um novo lugar está sendo sonhado por aqui.</>
              )}
            </span>
            {world === 'room' && (
              <div className="quick-controls">
                <button
                  onClick={() => setPreference('lampOn', (v) => !v)}
                  aria-pressed={preferences.lampOn}
                  title="Luminária"
                >
                  <Icon name="lamp" size={14} />
                  <span>Luz {preferences.lampOn ? 'acesa' : 'apagada'}</span>
                </button>
                <span>·</span>
                <button
                  onClick={() => setPreference('rainOn', (v) => !v)}
                  aria-pressed={preferences.rainOn}
                  title="Chuva"
                >
                  <Icon name="rain" size={14} />
                  <span>Chuva {preferences.rainOn ? 'ligada' : 'desligada'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
        <nav className="world-navigation" aria-label="Ambientes">
          <span className="nav-label">UM LUGAR PARA…</span>
          <div className="world-tabs">
            {worlds.map((item) => (
              <button
                key={item.id}
                className={`world-tab ${world === item.id ? 'selected' : ''}`}
                onClick={() => moveTo(item.id)}
                aria-current={world === item.id ? 'page' : undefined}
                aria-label={`${item.name}${item.planned ? ' — em planejamento' : ''}`}
              >
                <Icon name={item.icon} size={20} />
                <span>
                  {item.name}
                  {item.planned && <small>em breve</small>}
                </span>
                {world === item.id && <span className="selected-dot" />}
              </button>
            ))}
          </div>
        </nav>
        <div className="quiet-footer">
          <span>
            Você não precisa fazer nada. <em>Apenas estar aqui.</em>
          </span>
          <span className="private-footer">
            <Icon name="lock" size={12} /> Feito para ficar só com você.
          </span>
        </div>
        {(storageError || audioNotice) && (
          <p className="service-note" role="status">
            {audioNotice ||
              'Suas preferências não puderam ser salvas. Você ainda pode aproveitar este momento.'}
          </p>
        )}
      </main>
      {pendingWorld && (
        <ConfirmLeave
          onStay={() => setPendingWorld(null)}
          onDiscard={() => {
            dispatch({ type: 'RESET' });
            setWorld(pendingWorld);
            setPendingWorld(null);
          }}
        />
      )}
    </div>
  );
}

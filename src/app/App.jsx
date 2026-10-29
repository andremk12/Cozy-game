import { useEffect, useReducer, useRef, useState } from 'react';
import Room from '../scenes/Room/Room.jsx';
import LetItFloat from '../scenes/LetItFloat/LetItFloat.jsx';
import Journey from '../scenes/Journey/Journey.jsx';
import Garden from '../scenes/Garden/Garden.jsx';
import { initialRitual, ritualReducer } from '../scenes/LetItFloat/ritual.js';
import { usePreferences } from '../hooks/usePreferences.js';
import { useReducedMotion } from '../hooks/useReducedMotion.js';
import { useGarden } from '../hooks/useGarden.js';
import { AudioEngine } from '../services/audio/AudioEngine.js';
import { AUDIO_PRESETS } from '../services/audio/audioPresets.js';
import { cloneAudioLayers, createPresetMix } from '../../shared/audio.js';
import Icon from '../components/Icon.jsx';
import ConfirmLeave from '../components/ConfirmLeave.jsx';
import SoundMixer from '../components/audio/SoundMixer.jsx';
import CompanionPanel from '../components/companion/CompanionPanel.jsx';
import './App.css';

const worlds = [
  { id: 'room', name: 'The Room', sub: 'Seu pequeno refúgio', icon: 'room' },
  {
    id: 'garden',
    name: 'The Garden',
    sub: 'Um lugar para florescer',
    icon: 'garden',
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
  const gardenState = useGarden({ active: world === 'garden' });
  const [pendingWorld, setPendingWorld] = useState(null);
  const [ritual, dispatch] = useReducer(ritualReducer, initialRitual);
  const [audioActive, setAudioActive] = useState(false);
  const [audioNotice, setAudioNotice] = useState('');
  const [audioStatus, setAudioStatus] = useState({ playing: false, layers: {}, error: '' });
  const [mixerOpen, setMixerOpen] = useState(false);
  const [companionOpen, setCompanionOpen] = useState(false);
  const [fullscreenTarget, setFullscreenTarget] = useState(null);
  const mixerOpener = useRef(null);
  const companionOpener = useRef(null);
  const previousAtmosphere = useRef(null);
  // These choices belong to this visit, outside the persisted preference allowlist.
  const [journeyScenery, setJourneyScenery] = useState('rainy-night');
  const [journeyRainOn, setJourneyRainOn] = useState(true);
  const [journeyPaused, setJourneyPaused] = useState(false);
  const audio = useRef(null);
  const audioStarting = useRef(false);
  const audioAttempt = useRef(0);
  const heading = useRef(null);
  const previousWorld = useRef(world);
  const selected = worlds.find((item) => item.id === world);
  const suggestedPreset = world === 'journey' ? 'peaceful-journey'
    : world === 'garden' ? gardenState.garden.atmosphere === 'night' ? 'quiet-night' : 'morning-garden'
      : 'rainy-evening';
  const atmosphereKey = world === 'garden' ? `garden:${gardenState.garden.atmosphere}:${gardenState.garden.weather}`
    : world === 'journey' ? `journey:${journeyScenery}:${journeyRainOn}` : `room:${preferences.rainOn}`;
  const weather =
    world === 'garden' ? {
      icon: gardenState.garden.weather === 'rain' ? 'rain' : gardenState.garden.atmosphere === 'night' ? 'moon' : 'sunset',
      label: `${gardenState.garden.atmosphere === 'night' ? 'Noite tranquila' : gardenState.garden.atmosphere === 'sunset' ? 'Pôr do sol' : 'Dia ensolarado'}${gardenState.garden.weather === 'rain' ? ' · Chuva suave' : ''}`,
    } : world === 'journey'
      ? journeyScenery === 'forest'
        ? { icon: 'garden', label: 'Floresta' }
        : journeyScenery === 'sunset'
          ? { icon: 'sunset', label: 'Pôr do sol' }
          : journeyScenery === 'snowy-mountains'
            ? { icon: 'journey', label: 'Snowy Mountains' }
            : journeyScenery === 'morning-lake'
              ? { icon: 'sunset', label: 'Morning Lake' }
              : {
                  icon: journeyRainOn ? 'rain' : 'moon',
                  label: journeyRainOn ? 'Noite chuvosa' : 'Noite tranquila',
                }
      : {
          icon: preferences.rainOn ? 'rain' : 'moon',
          label: preferences.rainOn ? 'Uma noite de chuva' : 'Uma noite tranquila',
        };

  useEffect(() => {
    let mounted = true;
    const engine = new AudioEngine({ onStateChange: (snapshot) => {
      if (!mounted) return;
      // Remember the explicit activation as soon as the context runs. Lazy
      // recordings may still be decoding if the user immediately reloads.
      if (snapshot.playing) setPreference('audioEnabled', true);
      setAudioStatus(snapshot);
      setAudioActive(snapshot.playing);
    } });
    audio.current = engine;
    return () => {
      mounted = false;
      void engine.dispose();
      if (audio.current === engine) audio.current = null;
    };
  }, []);
  useEffect(() => {
    audio.current?.setVolume(preferences.volume);
    audio.current?.setMix(preferences.mixer);
  }, [preferences.volume, preferences.mixer]);
  useEffect(() => {
    if (!ready) return;
    const previous = previousAtmosphere.current;
    previousAtmosphere.current = atmosphereKey;
    // Restore the saved mix untouched on launch. Only subsequent scenery/weather
    // changes follow the environment; a manually edited Custom always travels intact.
    if (previous === null || previous === atmosphereKey) return;
    if (!AUDIO_PRESETS.find((preset) => preset.id === suggestedPreset)?.available) return;
    setPreference('mixer', (current) => {
      if (current.preset === 'custom') return current;
      const next = createPresetMix(suggestedPreset, current);
      if (world === 'garden') next.layers['rain-soft'].enabled = gardenState.garden.weather === 'rain';
      else if (world === 'journey') next.layers['rain-window'].enabled = journeyScenery === 'rainy-night' && journeyRainOn;
      else next.layers['rain-soft'].enabled = preferences.rainOn;
      return next;
    });
  }, [ready, atmosphereKey, suggestedPreset, world, gardenState.garden.weather, journeyScenery, journeyRainOn, preferences.rainOn, setPreference]);
  useEffect(() => {
    const sync = () => {
      setFullscreenTarget(document.fullscreenElement);
      setMixerOpen(false);
      setCompanionOpen(false);
    };
    const shortcut = (event) => {
      if (!document.fullscreenElement || event.defaultPrevented || event.repeat || event.ctrlKey || event.metaKey || event.altKey
        || !['m', 'c'].includes(event.key.toLowerCase()) || document.querySelector('dialog[open]')
        || event.target.closest?.('input, textarea, select, [contenteditable="true"]')) return;
      event.preventDefault();
      if (event.key.toLowerCase() === 'm') {
        mixerOpener.current = document.activeElement;
        setMixerOpen(true);
      } else {
        companionOpener.current = document.activeElement;
        setCompanionOpen(true);
      }
    };
    document.addEventListener('fullscreenchange', sync);
    document.addEventListener('keydown', shortcut);
    return () => {
      document.removeEventListener('fullscreenchange', sync);
      document.removeEventListener('keydown', shortcut);
    };
  }, []);
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
    if (audioActive) {
      audioAttempt.current += 1;
      audioStarting.current = false;
      audio.current?.stop();
      setAudioActive(false);
      setAudioNotice('');
      setPreference('audioEnabled', false);
      return;
    }
    if (audioStarting.current) return;
    const attempt = ++audioAttempt.current;
    audioStarting.current = true;
    audio.current?.setVolume(preferences.volume);
    audio.current?.setMix(preferences.mixer);
    const started = await audio.current?.start();
    if (attempt !== audioAttempt.current) return;
    audioStarting.current = false;
    setAudioActive(Boolean(started));
    setPreference('audioEnabled', Boolean(started));
    setAudioNotice(started ? '' : 'O áudio não pôde iniciar. Você pode tentar novamente.');
  }
  function selectPreset(id) {
    if (!AUDIO_PRESETS.find((preset) => preset.id === id)?.available) return;
    setPreference('mixer', (current) => createPresetMix(id, current));
  }
  function changeLayer(id, value) {
    setPreference('mixer', (current) => {
      const layers = { ...cloneAudioLayers(current.layers), [id]: value };
      return { ...current, preset: 'custom', layers, customLayers: cloneAudioLayers(layers) };
    });
  }
  function closeMixer() {
    setMixerOpen(false);
    requestAnimationFrame(() => {
      const opener = mixerOpener.current;
      if (opener?.isConnected && !opener.closest('[inert]')) opener.focus({ preventScroll: true });
      else document.fullscreenElement?.focus({ preventScroll: true });
    });
  }
  function openCompanion(event) {
    companionOpener.current = event?.currentTarget || document.activeElement;
    setCompanionOpen(true);
  }
  function closeCompanion() {
    setCompanionOpen(false);
    requestAnimationFrame(() => {
      const opener = companionOpener.current;
      if (opener?.isConnected && !opener.closest('[inert]')) opener.focus({ preventScroll: true });
      else document.fullscreenElement?.focus({ preventScroll: true });
    });
  }
  const companion = {
    settings: preferences.companion,
    paused: companionOpen || mixerOpen || Boolean(pendingWorld),
    onInteract: (event) => { if (!preferences.companion.introduced) openCompanion(event); },
  };

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
                  : 'Sons ambientes suaves e locais'
              }
              disabled={!ready}
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
            <span className="volume-separator" />
            <button type="button" className="mixer-open-button" aria-label="Abrir Cozy Sound Mixer"
              aria-haspopup="dialog" aria-expanded={mixerOpen} disabled={!ready}
              title="Cozy Sound Mixer · Na imersão, pressione M"
              onClick={(event) => { mixerOpener.current = event.currentTarget; setMixerOpen(true); }}>
              <Icon name="mixer" size={19} /><span>Mixer</span>
            </button>
          </div>
          <button type="button" className="companion-open-button" aria-label="Abrir My Companion"
            aria-haspopup="dialog" aria-expanded={companionOpen} disabled={!ready}
            title="My Companion · Na imersão, pressione C" onClick={openCompanion}>
            <Icon name="companion" size={19} /><span>Companion</span>
          </button>
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
                companion={companion}
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
                companion={companion}
              />
            ) : world === 'float' ? (
              <LetItFloat
                ritual={ritual}
                dispatch={dispatch}
                reducedMotion={reducedMotion}
                onBack={() => moveTo('room')}
              />
            ) : (
              <Garden gardenState={gardenState} reducedMotion={reducedMotion} onBack={() => moveTo('room')} companion={companion} />
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
                  <Icon name="journey" size={13} /> Explore a luminária, as cortinas, o chá, o livro e o bilhete.
                </>
              ) : world === 'float' ? (
                <>
                  <Icon name="lock" size={13} /> Seu texto fica apenas nesta sessão e é descartado
                  ao soltar o papel.
                </>
              ) : (
                <>Explore as plantas, o lago e o gato entre as folhas. Tudo cresce no seu tempo.</>
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
        {(storageError || audioNotice || audioStatus.error) && (
          <p className="service-note" role="status">
            {audioNotice || audioStatus.error ||
              'Suas preferências não puderam ser salvas. Você ainda pode aproveitar este momento.'}
          </p>
        )}
      </main>
      {companionOpen && <CompanionPanel settings={preferences.companion} welcome={!preferences.companion.introduced}
        reducedMotion={reducedMotion} storageError={storageError} target={fullscreenTarget || document.body}
        onChange={(value) => setPreference('companion', value)} onClose={closeCompanion} />}
      {mixerOpen && <SoundMixer mix={preferences.mixer} volume={preferences.volume} active={audioActive}
        status={audioStatus} notice={audioNotice || audioStatus.error} suggestion={suggestedPreset}
        target={fullscreenTarget || document.body} onClose={closeMixer} onStart={toggleAudio}
        onPreset={selectPreset} onLayer={changeLayer} onVolume={(value) => setPreference('volume', value)}
        onMute={() => setPreference('mixer', (current) => ({ ...current, muted: !current.muted }))} />}
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

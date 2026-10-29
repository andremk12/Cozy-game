import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from '../Icon.jsx';
import SoundLayerControl from './SoundLayerControl.jsx';
import { AUDIO_LAYERS } from '../../services/audio/audioLibrary.js';
import { AUDIO_PRESETS } from '../../services/audio/audioPresets.js';
import { acquireFullscreenEscape } from '../../services/fullscreenEscape.js';
import './SoundMixer.css';

const GROUPS = [
  { id: 'weather', name: 'Weather', hint: 'Chuva & brisa', ids: ['rain-soft', 'rain-heavy', 'rain-window', 'wind'] },
  { id: 'nature', name: 'Nature', hint: 'Um pouco de ar livre', ids: ['leaves', 'birds', 'stream', 'crickets'] },
  { id: 'cozy', name: 'Cozy', hint: 'Calor por perto', ids: ['fire'] },
  { id: 'journey', name: 'Journey', hint: 'O caminho também é casa', ids: ['train-track', 'train-wheels', 'carriage'] },
];

export default function SoundMixer({ mix, volume, active, status, notice, suggestion, target,
  onClose, onStart, onPreset, onLayer, onVolume, onMute }) {
  const dialogRef = useRef(null);
  const [keyboardLocked, setKeyboardLocked] = useState(false);
  const titleId = useId();
  const masterId = useId();
  const presetId = useId();
  const preset = AUDIO_PRESETS.find((item) => item.id === suggestion);
  const audible = active && !mix.muted && volume > 0;
  const hasPlayingLayer = audible && Object.values(status.layers || {}).includes('playing');
  const stateLabel = !active ? 'Em silêncio' : mix.muted ? 'Silenciado' : volume === 0 ? 'Volume geral em zero'
    : hasPlayingLayer ? 'Som ligado' : Object.values(status.layers || {}).includes('loading') ? 'Preparando sons…' : 'Sem reprodução';

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog.showModal();
    const keyboard = window.haven && document.fullscreenElement?.contains(dialog) ? navigator.keyboard : null;
    const releaseEscape = acquireFullscreenEscape(keyboard, setKeyboardLocked);
    return () => {
      releaseEscape();
      dialog.close();
    };
  }, [target]);

  function close() {
    dialogRef.current.close();
    onClose();
  }
  function onKeyDown(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      close();
    } else if (event.key === 'Tab') {
      const items = [...dialogRef.current.querySelectorAll('button, input, select, summary')]
        .filter((item) => !item.disabled && item.getClientRects().length > 0);
      const first = items[0];
      const last = items.at(-1);
      if (event.shiftKey ? document.activeElement === first : document.activeElement === last) {
        event.preventDefault();
        (event.shiftKey ? last : first)?.focus();
      }
    }
  }

  return createPortal(
    <dialog ref={dialogRef} className="sound-mixer" aria-labelledby={titleId} data-keyboard-lock={keyboardLocked}
      onCancel={(event) => { event.preventDefault(); close(); }} onKeyDown={onKeyDown}>
      <header className="mixer-header">
        <div className="mixer-radio-mark" aria-hidden="true">
          <svg viewBox="0 0 40 32" shapeRendering="crispEdges">
            <path fill="#c3a77a" d="M3 7h34v22H3zM8 4h24v3H8z" />
            <path fill="#364652" d="M6 10h28v16H6z" />
            <path fill="#a5ada9" d="M9 13h2v2H9zM13 13h2v2h-2zM17 13h2v2h-2zM9 17h2v2H9zM13 17h2v2h-2zM17 17h2v2h-2zM9 21h2v2H9zM13 21h2v2h-2zM17 21h2v2h-2z" />
            <path fill="#e4cb9d" d="M25 16h5v5h-5z" />
            <path fill="#788e88" d="M24 12h7v2h-7z" />
          </svg>
        </div>
        <div><span className="mixer-overline">LITTLE HAVEN · SOUNDS</span>
          <h2 id={titleId}>Cozy Sound Mixer</h2>
          <p>Create your own little atmosphere.</p>
        </div>
        <button type="button" className="mixer-close" aria-label="Fechar mixer" title="Fechar (Esc)" autoFocus onClick={close}>
          <Icon name="close" size={19} />
        </button>
      </header>
      <div className="mixer-status-line">
        <span className={hasPlayingLayer ? 'mixer-status is-audible' : 'mixer-status'}><i />{stateLabel}</span>
        <span>Seu cantinho sonoro</span>
      </div>
      <div className="mixer-scroll">
        <section className="mixer-atmosphere" aria-label="Atmosphere">
          <label className="mixer-section-title" htmlFor={presetId}>Atmosphere</label>
          <select id={presetId} value={mix.preset} onChange={(event) => onPreset(event.target.value)}>
            {AUDIO_PRESETS.map((item) => <option key={item.id} value={item.id} disabled={!item.available}>{item.name}{!item.available ? ' — indisponível' : ''}</option>)}
          </select>
          {preset && preset.id !== mix.preset && preset.available && (
            <button className="mixer-suggestion" type="button" onClick={() => onPreset(preset.id)}>
              Para este lugar: <strong>{preset.name}</strong> <span aria-hidden="true">↗</span>
            </button>
          )}
          <p className="mixer-caption">{mix.preset === 'custom' ? 'Uma combinação só sua. Ela acompanha você entre os ambientes.' : 'A atmosfera acompanha o ambiente. Ajuste um som para criar sua combinação.'}</p>
        </section>
        <section aria-label="Your Sounds" className="mixer-sounds">
          <h3 className="mixer-section-title">Your Sounds</h3>
          {GROUPS.map((group) => (
            <details key={group.id} className="mixer-group" open>
              <summary><span>{group.name}<small>{group.hint}</small></span><span aria-hidden="true">⌄</span></summary>
              {group.ids.map((id) => {
                const layer = AUDIO_LAYERS.find((item) => item.id === id);
                return layer && <SoundLayerControl key={id} layer={layer} value={mix.layers[id]}
                  status={status.layers?.[id]} audible={audible} onChange={(value) => onLayer(id, value)} />;
              })}
            </details>
          ))}
        </section>
      </div>
      <footer className="mixer-master">
        {!active && <button type="button" className="mixer-start" onClick={onStart}><Icon name="sound" size={17} />{notice ? 'Tentar ativar áudio' : 'Ativar áudio'}</button>}
        <div className="mixer-master-label"><label htmlFor={masterId}>Volume geral</label><output htmlFor={masterId}>{Math.round(volume * 100)}%</output></div>
        <div className="mixer-master-controls">
          <Icon name={mix.muted ? 'mute' : 'sound'} size={19} />
          <input id={masterId} type="range" min="0" max="100" step="1" value={Math.round(volume * 100)}
            aria-valuetext={`${Math.round(volume * 100)}%`} onChange={(event) => onVolume(Number(event.target.value) / 100)} />
          <button type="button" className="mixer-mute" aria-pressed={mix.muted} onClick={onMute}>
            {mix.muted ? 'Reativar' : 'Silenciar tudo'}
          </button>
        </div>
        {notice && <p className="mixer-notice" role="status">{notice}</p>}
        <p className="mixer-footnote">{target !== document.body ? 'Esc fecha o mixer · M abre novamente' : 'Salvo neste dispositivo · Sem pressa, sem conexão'}</p>
      </footer>
    </dialog>, target,
  );
}

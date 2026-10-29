import { useId } from 'react';
import Icon from '../Icon.jsx';

export default function SoundLayerControl({ layer, value, status, audible, onChange }) {
  const sliderId = useId();
  const percent = Math.round(value.volume * 100);
  const playing = audible && value.enabled && value.volume > 0 && status === 'playing';
  return (
    <div className={`mixer-layer${value.enabled ? ' is-enabled' : ''}`} data-layer={layer.id} data-status={status || 'idle'}>
      <div className="mixer-layer-heading">
        <span className="mixer-layer-icon"><Icon name={layer.icon} size={20} /></span>
        <label htmlFor={sliderId}>{layer.name}</label>
        <span className={`mixer-playing-dot${playing ? ' is-playing' : ''}`} title={playing ? 'Reproduzindo' : 'Sem reprodução'} />
        <button type="button" className="mixer-switch" role="switch" aria-checked={value.enabled}
          aria-label={layer.name} disabled={!layer.available}
          onClick={() => onChange({ ...value, enabled: !value.enabled })}>
          <span />
        </button>
      </div>
      <div className="mixer-layer-volume">
        <input id={sliderId} type="range" min="0" max="100" step="1" value={percent}
          disabled={!value.enabled || !layer.available} aria-label={`Volume de ${layer.name}`}
          aria-valuetext={`${percent}%`}
          onChange={(event) => onChange({ ...value, volume: Number(event.target.value) / 100 })} />
        <output htmlFor={sliderId}>{percent}%</output>
      </div>
      {status === 'loading' && <small className="mixer-layer-note">Preparando o som local…</small>}
      {status === 'error' && <small className="mixer-layer-note">Não foi possível carregar este som. Desative e ative para tentar novamente.</small>}
      {!layer.available && <small className="mixer-layer-note">Gravação local ainda indisponível.</small>}
    </div>
  );
}

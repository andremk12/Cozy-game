import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from '../Icon.jsx';
import CompanionSprite from './CompanionSprite.jsx';
import { acquireFullscreenEscape } from '../../services/fullscreenEscape.js';
import { COMPANION_APPEARANCES, displayCompanionName, validateCompanionName } from '../../../shared/companion.js';
import './CompanionPanel.css';

export default function CompanionPanel({ settings, welcome = false, reducedMotion, storageError, target, onChange, onClose }) {
  const dialogRef = useRef(null);
  const closeRef = useRef(null);
  const nameRef = useRef(null);
  const renameRef = useRef(null);
  const [editing, setEditing] = useState(welcome);
  const previouslyEditing = useRef(welcome);
  const [draft, setDraft] = useState(settings.name);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [keyboardLocked, setKeyboardLocked] = useState(false);
  const titleId = useId();
  const nameId = useId();
  const hintId = useId();
  const errorId = useId();
  const appearanceId = useId();
  const validation = validateCompanionName(draft);
  const label = displayCompanionName(settings);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog.showModal();
    const keyboard = window.haven && document.fullscreenElement?.contains(dialog) ? navigator.keyboard : null;
    const releaseEscape = acquireFullscreenEscape(keyboard, setKeyboardLocked);
    return () => { releaseEscape(); dialog.close(); };
  }, [target]);

  useEffect(() => {
    if (editing) nameRef.current?.focus({ preventScroll: true });
    else (previouslyEditing.current ? renameRef : closeRef).current?.focus({ preventScroll: true });
    previouslyEditing.current = editing;
  }, [editing]);

  function close() {
    dialogRef.current.close();
    onClose();
  }
  function dismiss() {
    if (welcome) onChange({ ...settings, introduced: true });
    close();
  }
  function save(event) {
    event.preventDefault();
    const result = validateCompanionName(draft);
    if (!result.valid) { setError(result.error); nameRef.current?.focus(); return; }
    onChange({ ...settings, name: result.name, introduced: true });
    if (welcome) close();
    else { setEditing(false); setSaved(true); setError(''); }
  }
  function cancelEdit() {
    setDraft(settings.name);
    setError('');
    setEditing(false);
  }
  function handleKeyDown(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      if (editing && !welcome) cancelEdit();
      else dismiss();
      return;
    }
    if (event.key !== 'Tab') return;
    const items = [...dialogRef.current.querySelectorAll('button, input, select')]
      .filter((item) => !item.disabled && item.getClientRects().length);
    const first = items[0];
    const last = items.at(-1);
    if (event.shiftKey ? document.activeElement === first : document.activeElement === last) {
      event.preventDefault();
      (event.shiftKey ? last : first)?.focus();
    }
  }

  return createPortal(
    <dialog ref={dialogRef} className={`companion-panel${reducedMotion ? ' is-reduced-motion' : ''}`}
      aria-labelledby={titleId} data-keyboard-lock={keyboardLocked} onKeyDown={handleKeyDown}
      onCancel={(event) => { event.preventDefault(); dismiss(); }}>
      <header className="companion-panel-header">
        <div><span className="companion-panel-eyebrow">LITTLE HAVEN · A LITTLE FRIEND</span><h2 id={titleId}>My Companion</h2></div>
        <button ref={closeRef} type="button" className="companion-panel-close" aria-label="Fechar My Companion" title="Fechar (Esc)" onClick={dismiss}><Icon name="close" size={18} /></button>
      </header>
      <div className="companion-panel-content">
        <div className="companion-portrait" aria-hidden="true">
          <svg viewBox="0 0 120 68" shapeRendering="crispEdges">
            <path d="M10 49h100v4H10zM18 53h84v3H18z" fill="#6d8069" />
            <path d="M30 45h58v4H30zM34 41h50v4H34z" fill="#afa582" />
            <path d="M33 45h52v2H33z" fill="#cfbf99" />
            <g transform="translate(59 43) scale(1.5)"><CompanionSprite pose={editing ? 'looking' : 'sitting'} appearance={settings.appearance} /></g>
            <path d="M16 39h8v10h-8zM18 32h4v8h-4zM13 34h5v5h-5zM22 29h5v6h-5z" fill="#879b73" />
            <path d="M93 21h2v6h-2zM91 23h6v2h-6zM102 35h2v4h-2z" fill="#d7be8c" opacity=".65" />
          </svg>
        </div>
        {welcome ? <><h3>A little friend has arrived!</h3><p className="companion-panel-intro">Um pequeno companheiro chegou ao seu refúgio. Como você gostaria de chamá-lo?</p></>
          : <><h3 className="companion-current-name">{label}</h3><p className="companion-panel-intro">Um pequeno amigo. No seu tempo, do seu jeito.</p></>}
        {editing ? (
          <form onSubmit={save} noValidate>
            <label className="companion-field-label" htmlFor={nameId}>Nome do companheiro</label>
            <input ref={nameRef} id={nameId} type="text" value={draft} autoComplete="off" spellCheck={false}
              aria-invalid={Boolean(error)} aria-describedby={`${hintId}${error ? ` ${errorId}` : ''}`}
              onChange={(event) => { setDraft(event.target.value); setError(''); }} />
            <div className="companion-name-hint" id={hintId}><span>Um nome escolhido por você.</span><span className={validation.count > 24 ? 'is-too-long' : ''}>{validation.count} / 24</span></div>
            {error && <p className="companion-validation" id={errorId} role="alert">{error}</p>}
            <div className="companion-form-actions">
              <button type="submit" className="soft-button">{welcome ? 'Confirmar nome' : 'Salvar nome'}</button>
              <button type="button" className="companion-text-button" onClick={() => {
                if (welcome) { onChange({ ...settings, introduced: true }); close(); }
                else cancelEdit();
              }}>{welcome ? 'Escolher depois' : 'Cancelar'}</button>
            </div>
          </form>
        ) : (
          <div className="companion-settings">
            <div className="companion-setting-row"><span>Nome</span><button ref={renameRef} type="button" className="companion-text-button" onClick={() => { setDraft(settings.name); setEditing(true); setSaved(false); }}>Renomear</button></div>
            <label className="companion-setting-row companion-visibility"><span>Mostrar companheiro<small>Ele pode descansar fora de vista.</small></span><button type="button" role="switch" aria-label="Mostrar companheiro" aria-checked={settings.enabled} onClick={() => onChange({ ...settings, enabled: !settings.enabled })}><span /></button></label>
            <label className="companion-field-label" htmlFor={appearanceId}>Pelagem do companheiro</label>
            <select id={appearanceId} value={settings.appearance} onChange={(event) => onChange({ ...settings, appearance: event.target.value })}>
              {COMPANION_APPEARANCES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
            <p className="companion-settings-note">Carinhos são bem-vindos. Sua companhia nunca vira uma obrigação.</p>
            {saved && <p className="companion-saved" role="status">Nome atualizado.</p>}
          </div>
        )}
        {storageError && <p className="companion-validation" role="status">Não foi possível salvar neste dispositivo. Você pode continuar aproveitando este momento.</p>}
      </div>
      <footer className="companion-panel-footer">{target !== document.body ? 'C abre My Companion na imersão · Esc para voltar' : 'Só neste dispositivo · Um amigo sem cobranças'}</footer>
    </dialog>, target,
  );
}

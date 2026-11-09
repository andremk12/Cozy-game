import { useEffect, useId, useRef, useState } from 'react';
import { acquireFullscreenEscape } from '../../services/fullscreenEscape.js';

export function useKitchenObjects(onSoundEffect) {
  const [fridgeOpen, setFridgeOpen] = useState(false);
  const [kettleOn, setKettleOn] = useState(false);
  const [utensils, setUtensils] = useState(false);
  const [simmering, setSimmering] = useState(false);
  const [serving, setServing] = useState(0);
  useEffect(() => {
    if (!kettleOn) return undefined;
    const timer = setTimeout(() => setKettleOn(false), 14_000);
    return () => clearTimeout(timer);
  }, [kettleOn, serving]);
  useEffect(() => {
    if (!utensils) return undefined;
    const timer = setTimeout(() => setUtensils(false), 900);
    return () => clearTimeout(timer);
  }, [utensils]);
  useEffect(() => {
    if (!simmering) return undefined;
    const timer = setTimeout(() => setSimmering(false), 6000);
    return () => clearTimeout(timer);
  }, [simmering]);
  return { fridgeOpen, kettleOn, utensils, simmering,
    toggleFridge: () => setFridgeOpen(value=>!value),
    kettle: () => { setKettleOn(true); setServing(value=>value+1); onSoundEffect?.('kettle'); },
    touchUtensils: () => { setUtensils(true); onSoundEffect?.('utensil'); },
    touchPot: () => { setSimmering(true); onSoundEffect?.('simmer'); },
  };
}

export function KitchenDialog({ title, children, onClose, className = '' }) {
  const dialog = useRef(null);
  const titleId = useId();
  const [locked, setLocked] = useState(false);
  useEffect(() => {
    const element = dialog.current;
    element.showModal();
    const keyboard = window.haven && document.fullscreenElement?.contains(element) ? navigator.keyboard : null;
    const release = acquireFullscreenEscape(keyboard, setLocked);
    return () => { release(); element.close(); };
  }, []);
  function close() { dialog.current.close(); onClose(); }
  return <dialog ref={dialog} className={`kitchen-dialog ${className}`} aria-labelledby={titleId} data-keyboard-lock={locked}
    onCancel={(event)=>{ event.preventDefault(); close(); }} onKeyDown={(event)=>{
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); return; }
      if (event.key !== 'Tab') return;
      const controls=[...dialog.current.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled)')];
      const first=controls[0], last=controls.at(-1);
      if (event.shiftKey ? document.activeElement===first : document.activeElement===last) {
        event.preventDefault(); (event.shiftKey?last:first)?.focus();
      }
    }}>
    <header className="kitchen-dialog-header">
      <div className="kitchen-dialog-heading"><span className="kitchen-eyebrow">UM TEMPO SÓ SEU</span><button type="button" onClick={close} autoFocus aria-label={`Fechar ${title.toLowerCase()}`}>Fechar</button></div>
      <h2 id={titleId}>{title}</h2>
    </header>
    <div className="kitchen-dialog-body">{children}</div>
  </dialog>;
}

export function KitchenSettings({ settings, dispatch }) {
  return <div className="kitchen-settings">
    <label>Luz da janela<select aria-label="Luz da janela" value={settings.atmosphere} onChange={(event)=>dispatch({type:'settings',patch:{atmosphere:event.target.value}})}>
      <option value="day">Manhã tranquila</option><option value="sunset">Fim de tarde</option><option value="night">Noite serena</option>
    </select></label>
    <label>Clima<select aria-label="Clima da cozinha" value={settings.weather} onChange={(event)=>dispatch({type:'settings',patch:{weather:event.target.value}})}>
      <option value="clear">Céu limpo</option><option value="rain">Chuva suave</option>
    </select></label>
    <label className="kitchen-check"><input type="checkbox" checked={settings.lampOn} onChange={(event)=>dispatch({type:'settings',patch:{lampOn:event.target.checked}})} />Luminárias acesas</label>
    <label className="kitchen-check"><input type="checkbox" checked={settings.messagesEnabled} onChange={(event)=>dispatch({type:'settings',patch:{messagesEnabled:event.target.checked}})} />Frases ocasionais do companheiro</label>
    <label className="kitchen-check"><input type="checkbox" checked={settings.effectsEnabled} onChange={(event)=>dispatch({type:'settings',patch:{effectsEnabled:event.target.checked}})} />Sons dos objetos</label>
    <label className="kitchen-check"><input type="checkbox" checked={settings.completionSoundEnabled} onChange={(event)=>dispatch({type:'settings',patch:{completionSoundEnabled:event.target.checked}})} />Sino suave de conclusão</label>
    <p className="kitchen-small-note">Os sons seguem o volume geral e o mixer. Para ouvi-los, ative o áudio por escolha.</p>
  </div>;
}

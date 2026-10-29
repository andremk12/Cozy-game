import { useEffect, useId, useRef, useState } from 'react';
import Icon from '../../components/Icon.jsx';
import { acquireFullscreenEscape } from '../../services/fullscreenEscape.js';
import { MemoryImage } from './MemoryBoard.jsx';

export const PAPERS = [['beige', 'Bege'], ['rose', 'Rosa-claro'], ['sage', 'Verde-sálvia'], ['blue', 'Azul suave'], ['lilac', 'Lilás']];
export const PAPER_STYLES = [['plain', 'Papel simples'], ['lined', 'Papel pautado'], ['torn', 'Borda artesanal']];
export const FRAMES = [['polaroid', 'Polaroid clássica'], ['light-wood', 'Madeira clara'], ['dark-wood', 'Madeira escura'], ['simple', 'Papel fotográfico'], ['floral', 'Detalhes florais']];
const REMINDERS = [
  'Você merece momentos de descanso.', 'Um dia de cada vez.', 'As pequenas coisas também importam.',
  'Nem todo momento precisa ser produtivo.', 'Você pode descansar sem precisar merecer.',
  'Existe beleza em desacelerar.', 'Seu tempo também é importante.', 'Há carinho nas pequenas coisas.',
];

export function MemoryDialog({ title, onClose, children, className = '' }) {
  const dialogRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const titleId = useId();
  const [locked, setLocked] = useState(false);
  useEffect(() => {
    const dialog = dialogRef.current;
    dialog.showModal();
    (dialog.querySelector('[data-autofocus]') || dialog.querySelector('input, textarea, select') || dialog.querySelector('button'))?.focus({ preventScroll: true });
    const keyboard = window.haven && document.fullscreenElement?.contains(dialog) ? navigator.keyboard : null;
    const release = acquireFullscreenEscape(keyboard, setLocked);
    return () => { release(); dialog.close(); };
  }, []);
  function keys(event) {
    if (event.key === 'Escape') {
      event.preventDefault(); event.stopPropagation(); onCloseRef.current(); return;
    }
    if (event.key !== 'Tab') return;
    const controls = [...dialogRef.current.querySelectorAll('button, input, textarea, select, [tabindex="0"]')]
      .filter((element) => !element.disabled && element.getClientRects().length > 0);
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey ? document.activeElement === first : document.activeElement === last) {
      event.preventDefault(); (event.shiftKey ? last : first)?.focus({ preventScroll: true });
    }
  }
  return <dialog ref={dialogRef} className={`memory-dialog ${className}`} aria-labelledby={titleId} data-keyboard-lock={locked}
    onKeyDown={keys} onCancel={(event) => { event.preventDefault(); onCloseRef.current(); }}>
    <header className="memory-dialog-header"><div><span>THE MEMORY CORNER</span><h2 id={titleId}>{title}</h2></div>
      <button type="button" className="memory-icon-button" aria-label="Fechar janela" onClick={() => onCloseRef.current()}><Icon name="close" size={19} /></button>
    </header>
    {children}
  </dialog>;
}

function DiscardDraft({ onContinue, onDiscard }) {
  return <div className="memory-discard-draft"><p>Descartar as alterações ainda não fixadas?</p>
    <p>Você pode continuar escrevendo no seu tempo.</p><div className="memory-dialog-actions">
      <button type="button" autoFocus onClick={onContinue}>Continuar editando</button>
      <button type="button" onClick={onDiscard}>Descartar alterações</button>
    </div></div>;
}

export function NoteEditor({ item, onSave, onClose }) {
  const [text, setText] = useState(item?.text || '');
  const [paper, setPaper] = useState(item?.paper || 'beige');
  const [style, setStyle] = useState(item?.style || 'plain');
  const [discard, setDiscard] = useState(false);
  const [error, setError] = useState('');
  const dirty = text !== (item?.text || '') || paper !== (item?.paper || 'beige') || style !== (item?.style || 'plain');
  const close = () => { if (dirty) setDiscard(true); else onClose(); };
  return <MemoryDialog title={item ? 'Editar bilhete' : 'Write a Note'} onClose={close} className="memory-note-editor">
    {discard ? <DiscardDraft onContinue={() => setDiscard(false)} onDiscard={onClose} />
      : <form onSubmit={(event) => { event.preventDefault(); if (!text.trim()) { setError('Escreva algumas palavras para fixar seu bilhete.'); return; } if (onSave({ text, paper, style })) onClose(); }}>
        <p className="memory-dialog-intro">Palavras que você quer manter por perto.</p>
        <div className="memory-writing-paper" data-paper={paper} data-paper-style={style}>
          <label htmlFor="memory-note-message">Mensagem do bilhete</label>
          <textarea id="memory-note-message" data-autofocus value={text} onChange={(event) => { setText(event.target.value); setError(''); }} maxLength={2000} rows={7}
            placeholder="Uma lembrança, uma frase, um carinho…" aria-describedby="memory-note-limit" />
          <span id="memory-note-limit">{text.length} / 2000 caracteres</span>
        </div>
        <div className="memory-form-pair"><label>Cor do papel<select value={paper} onChange={(event) => setPaper(event.target.value)}>{PAPERS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label>Estilo do papel<select value={style} onChange={(event) => setStyle(event.target.value)}>{PAPER_STYLES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>
        {error && <p className="memory-form-error" role="alert">{error}</p>}
        <div className="memory-dialog-actions"><button type="button" onClick={close}>Cancelar</button><button type="submit" className="memory-primary">{item ? 'Salvar bilhete' : 'Fixar bilhete'}</button></div>
      </form>}
  </MemoryDialog>;
}

export function PhotoEditor({ item, memory, onSave, onClose }) {
  const [caption, setCaption] = useState(item.caption);
  const [frame, setFrame] = useState(item.frame);
  const [discard, setDiscard] = useState(false);
  const dirty = caption !== item.caption || frame !== item.frame;
  const close = () => { if (dirty) setDiscard(true); else onClose(); };
  return <MemoryDialog title="Editar fotografia" onClose={close} className="memory-photo-editor">
    {discard ? <DiscardDraft onContinue={() => setDiscard(false)} onDiscard={onClose} />
      : <form onSubmit={(event) => { event.preventDefault(); if (onSave({ caption, frame })) onClose(); }}>
        <div className="memory-frame-preview" data-frame={frame}><MemoryImage memory={memory} imageId={item.imageId} alt="Prévia da moldura" /></div>
        <label>Moldura da fotografia<select value={frame} onChange={(event) => setFrame(event.target.value)}>{FRAMES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>Legenda da fotografia<textarea data-autofocus value={caption} onChange={(event) => setCaption(event.target.value)} maxLength={300} rows={3} placeholder="Uma legenda, se quiser." /></label>
        <p className="memory-dialog-intro">A moldura e a legenda não alteram sua fotografia original.</p>
        <div className="memory-dialog-actions"><button type="button" onClick={close}>Cancelar</button><button type="submit" className="memory-primary">Salvar fotografia</button></div>
      </form>}
  </MemoryDialog>;
}

export function ReminderLibrary({ onChoose, onClose }) {
  const [chosen, setChosen] = useState(null);
  return <MemoryDialog title="A Little Reminder" onClose={onClose}>
    <p className="memory-dialog-intro">Escolha uma pequena mensagem, se alguma fizer sentido por aqui.</p>
    <div className="memory-reminders">{REMINDERS.map((text) => <button key={text} type="button" aria-pressed={chosen === text} onClick={() => setChosen(text)}>{text}</button>)}</div>
    <div className="memory-dialog-actions"><button type="button" onClick={onClose}>Voltar ao mural</button><button type="button" className="memory-primary" disabled={!chosen} onClick={() => { if (onChoose(chosen)) onClose(); }}>Fixar esta mensagem</button></div>
  </MemoryDialog>;
}

export function ThemePanel({ memory, onChange, onRestore, onClose }) {
  const { board, writable, busy } = memory;
  return <MemoryDialog title="Seu cantinho" onClose={onClose}>
    <p className="memory-dialog-intro">Um fundo diferente para as mesmas lembranças.</p>
    <label>Tema do mural<select value={board.theme} disabled={!writable || busy} onChange={(event) => onChange({ theme: event.target.value })}>
      <option value="warm">Warm Memories</option><option value="moonlight">Moonlight Notes</option><option value="garden">Garden Keepsakes</option>
    </select></label>
    <fieldset className="memory-decoration-options"><legend>Pequenos detalhes</legend>
      {[['lights', 'Luzes delicadas'], ['flowers', 'Flores secas'], ['stars', 'Pequenas estrelas']].map(([key, label]) => <label key={key}><input type="checkbox" checked={board.decorations[key]} disabled={!writable || busy} onChange={(event) => onChange({ decorations: { ...board.decorations, [key]: event.target.checked } })} />{label}</label>)}
    </fieldset>
    <div className="memory-backup-section"><h3>Um lugar seguro, uma cópia sua</h3><p>Fotografias e bilhetes ficam neste computador, sem envio para a internet. Um backup guarda também os originais para você restaurar em outra instalação.</p>
      {memory.backupAvailable ? <div className="memory-dialog-actions"><button type="button" disabled={!writable || busy} onClick={() => void memory.exportBackup()}>Exportar backup</button><button type="button" disabled={busy} onClick={onRestore}>Restaurar backup</button></div>
        : <p>Backup e restauração disponíveis no aplicativo desktop.</p>}
      {memory.error && <p role="status" className="memory-form-error">{memory.error}</p>}
      {memory.notice && <p role="status">{memory.notice}</p>}
    </div>
    <div className="memory-dialog-actions"><button type="button" onClick={onClose}>Voltar ao mural</button></div>
  </MemoryDialog>;
}

export function MemoryViewer({ item, memory, onClose }) {
  const [zoom, setZoom] = useState(1);
  const scrollRef = useRef(null);
  const pan = useRef(null);
  const photo = item.kind === 'photo';
  function fit() { setZoom(1); scrollRef.current?.scrollTo({ left: 0, top: 0 }); }
  return <MemoryDialog title={photo ? 'Fotografia ampliada' : 'Seu bilhete'} onClose={onClose} className={photo ? 'memory-photo-viewer' : 'memory-note-viewer'}>
    {photo ? <>
      <div className="memory-viewer-scroll" ref={scrollRef} tabIndex={0} role="region" aria-label="Fotografia. Use as barras de rolagem ou arraste para explorar a imagem ampliada."
        onPointerDown={(event) => { if (zoom === 1 || event.button !== 0) return; pan.current = { x: event.clientX, y: event.clientY, left: event.currentTarget.scrollLeft, top: event.currentTarget.scrollTop }; event.currentTarget.setPointerCapture(event.pointerId); }}
        onPointerMove={(event) => { if (pan.current) { event.currentTarget.scrollLeft = pan.current.left - event.clientX + pan.current.x; event.currentTarget.scrollTop = pan.current.top - event.clientY + pan.current.y; } }}
        onPointerUp={() => { pan.current = null; }} onPointerCancel={() => { pan.current = null; }}>
        <div className="memory-photo-canvas" style={{ width: `${zoom * 100}%`, height: `${zoom * 100}%` }}><MemoryImage memory={memory} imageId={item.imageId} variant="original" alt={item.caption || 'Sua fotografia original'} /></div>
      </div>
      {item.caption && <p className="memory-viewer-caption">{item.caption}</p>}
      <div className="memory-viewer-zoom"><button type="button" aria-label="Reduzir fotografia" disabled={zoom <= 1} onClick={() => setZoom((value) => Math.max(1, value - .5))}>−</button><output aria-live="polite">{Math.round(zoom * 100)}%</output>
        <button type="button" aria-label="Ampliar fotografia" disabled={zoom >= 4} onClick={() => setZoom((value) => Math.min(4, value + .5))}>+</button><button type="button" onClick={fit}>Ajustar à janela</button></div>
    </> : <div className="memory-enlarged-note" data-paper={item.paper} data-paper-style={item.style}>{item.text}</div>}
    <div className="memory-dialog-actions"><button type="button" data-autofocus onClick={onClose}>Voltar ao mural</button></div>
  </MemoryDialog>;
}

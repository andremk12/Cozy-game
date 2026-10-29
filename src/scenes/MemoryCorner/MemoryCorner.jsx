import { useCallback, useEffect, useRef, useState } from 'react';
import Icon from '../../components/Icon.jsx';
import { useImmersiveMode } from '../../hooks/useImmersiveMode.js';
import { acquireFullscreenEscape } from '../../services/fullscreenEscape.js';
import { MEMORY_LIMITS } from '../../../shared/memory.js';
import MemoryBoard from './MemoryBoard.jsx';
import { MemoryDialog, MemoryViewer, NoteEditor, PhotoEditor, ReminderLibrary, ThemePanel } from './MemoryDialogs.jsx';
import './MemoryCorner.css';

const clamp = (value) => Math.min(1, Math.max(0, value));

export default function MemoryCorner({ memory, reducedMotion = false, onBack }) {
  const { board, ready, writable, busy, error, updateBoard } = memory;
  const [selectedId, setSelectedId] = useState(null);
  const [modal, setModal] = useState(null);
  const [undo, setUndo] = useState(null);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const [escapeLocked, setEscapeLocked] = useState(false);
  const opener = useRef(null);
  const restoreFrame = useRef(null);
  const selected = board.items.find((item) => item.id === selectedId);
  const canEdit = ready && writable && !busy;
  const cancelSelection = useCallback(() => {
    if (!selectedId && !toolsOpen) return false;
    setSelectedId(null); setToolsOpen(false);
    if (document.fullscreenElement) document.fullscreenElement.focus({ preventScroll: true });
    return true;
  }, [selectedId, toolsOpen]);
  const immersive = useImmersiveMode({ contextualOpen: Boolean(modal), onEscape: cancelSelection });

  useEffect(() => {
    setEscapeLocked(false);
    if (!immersive.active || modal || (!selectedId && !toolsOpen) || !window.haven) return undefined;
    return acquireFullscreenEscape(navigator.keyboard, setEscapeLocked);
  }, [immersive.active, modal, selectedId, toolsOpen]);
  useEffect(() => {
    const escape = (event) => {
      if (!immersive.active && !modal && event.key === 'Escape') cancelSelection();
    };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [immersive.active, modal, cancelSelection]);
  useEffect(() => () => cancelAnimationFrame(restoreFrame.current), []);

  function open(kind, event, id = selectedId) {
    opener.current = event?.currentTarget || document.activeElement;
    setModal({ kind, id });
  }
  function close() {
    immersive.targetRef.current?.querySelector('dialog[open]')?.close();
    setModal(null);
    cancelAnimationFrame(restoreFrame.current);
    restoreFrame.current = requestAnimationFrame(() => {
      if (opener.current?.isConnected) opener.current.focus({ preventScroll: true });
      else immersive.targetRef.current?.querySelector('.memory-card, .memory-add-button, .memory-immersive-exit')?.focus({ preventScroll: true });
    });
  }
  function changeItem(id, patch) {
    if (!canEdit) return false;
    return updateBoard((current) => ({ ...current, items: current.items.map((item) => item.id === id ? { ...item, ...patch } : item) }));
  }
  function moveItem(id, x, y) { changeItem(id, { x: clamp(x), y: clamp(y) }); }
  function selectItem(id) {
    setSelectedId(id);
    if (id && immersive.active) setToolsOpen(true);
  }
  function openItem(id) { open('view', null, id); }
  function addNote({ text, paper = 'beige', style = 'plain' }) {
    if (!canEdit || board.items.length >= MEMORY_LIMITS.maxItems) { setNotice(`Este mural comporta até ${MEMORY_LIMITS.maxItems} lembranças. Você pode guardar uma cópia em backup.`); return false; }
    const id = crypto.randomUUID();
    const count = board.items.length;
    const item = { id, kind: 'note', text, paper, style, x: .15 + (count % 4) * .2, y: .12 + (count % 3) * .2, rotation: 0 };
    const accepted = updateBoard((current) => ({ ...current, items: [...current.items, item] }));
    if (accepted) { setSelectedId(id); setNotice('Seu bilhete encontrou um lugar no mural.'); }
    return accepted;
  }
  function order(front) {
    updateBoard((current) => {
      const item = current.items.find(({ id }) => id === selectedId);
      const rest = current.items.filter(({ id }) => id !== selectedId);
      return { ...current, items: front ? [...rest, item] : [item, ...rest] };
    });
  }
  function remove() {
    const index = board.items.findIndex(({ id }) => id === modal.id);
    const item = board.items[index];
    if (!canEdit || !item) return;
    if (updateBoard((current) => ({ ...current, items: current.items.filter(({ id }) => id !== item.id) }))) {
      setUndo({ item, index }); setSelectedId(null); setNotice('Lembrança removida. Você pode desfazer durante esta visita.'); close();
    }
  }
  function undoRemoval() {
    if (!canEdit || !undo || board.items.length >= MEMORY_LIMITS.maxItems) return;
    if (updateBoard((current) => {
      const items = current.items.slice();
      if (!items.some(({ id }) => id === undo.item.id)) items.splice(Math.min(undo.index, items.length), 0, undo.item);
      return { ...current, items };
    })) { setSelectedId(undo.item.id); setUndo(null); setNotice('A lembrança voltou para o mural.'); }
  }
  function fullscreenKeys(event) {
    if (!immersive.active || modal || immersive.targetRef.current?.querySelector('dialog[open]') || event.key !== 'Tab') return;
    const target = immersive.targetRef.current;
    const controls = [...target.querySelectorAll('button, select, input, textarea')].filter((element) => !element.disabled && element.getClientRects().length > 0);
    const first = controls[0]; const last = controls[controls.length - 1];
    if (document.activeElement === target || (event.shiftKey ? document.activeElement === first : document.activeElement === last)) {
      event.preventDefault(); (event.shiftKey ? last : first)?.focus({ preventScroll: true });
    }
  }

  const modalItem = modal?.id ? board.items.find(({ id }) => id === modal.id) : null;
  return <section className={`memory-scene${reducedMotion ? ' is-reduced-motion' : ''}`} aria-label="The Memory Corner: um lugar para suas lembranças">
    <div ref={immersive.targetRef} className={`memory-viewport${immersive.active ? ' is-immersive' : ''}${toolsOpen ? ' has-tools-open' : ''}`}
      tabIndex={immersive.active ? -1 : undefined} onKeyDownCapture={fullscreenKeys} data-keyboard-lock={escapeLocked}
      aria-label={immersive.active ? 'Mural em tela cheia. Esc retorna, M abre os sons, C abre My Companion.' : undefined}>
      {ready ? <MemoryBoard board={board} memory={memory} selectedId={selectedId} writable={canEdit} onSelect={selectItem} onOpen={openItem} onMove={moveItem} />
        : <div className="loading-room" role="status">Abrindo suas lembranças…</div>}
      {immersive.active && <div className="memory-immersive-actions">
        <button type="button" className="memory-show-tools" aria-label="Ferramentas do mural" aria-expanded={toolsOpen} onClick={() => setToolsOpen((value) => !value)}>Ferramentas</button>
        <button type="button" className="memory-immersive-exit" aria-label="Sair do Modo Imersivo" title="Sair do Modo Imersivo (Esc)" onClick={immersive.exit}><Icon name="collapse" size={19} /></button>
      </div>}
      <div className="memory-workbench">
        <div className="memory-toolbar" role="group" aria-label="Ferramentas do mural">
          <button type="button" className="memory-add-button memory-primary" disabled={!canEdit || board.items.length >= MEMORY_LIMITS.maxItems} onClick={() => { setNotice(''); void memory.importPhotos(); }}><span className="memory-small-photo" aria-hidden="true" />Add a Memory</button>
          <button type="button" disabled={!canEdit || board.items.length >= MEMORY_LIMITS.maxItems} onClick={(event) => open('note', event, null)}><span aria-hidden="true" className="memory-small-note" />Write a Note</button>
          <button type="button" disabled={!canEdit || board.items.length >= MEMORY_LIMITS.maxItems} onClick={(event) => open('reminder', event, null)}><Icon name="leaves" size={16} />A Little Reminder</button>
          <span className="memory-toolbar-spacer" />
          <button type="button" onClick={(event) => open('theme', event, null)} aria-label="Personalizar mural" title="Personalizar mural"><Icon name="sunset" size={18} /><span className="memory-customize-label">Seu cantinho</span></button>
          {!immersive.active && <button type="button" ref={immersive.triggerRef} disabled={!ready || immersive.pending} aria-label="Modo Imersivo" title="Modo Imersivo" onClick={() => { setSelectedId(null); setToolsOpen(false); void immersive.enter(); }}><Icon name="expand" size={18} /></button>}
        </div>
        {selected && <div className="memory-item-controls" role="group" aria-label="Controles da lembrança selecionada">
          <span className="memory-selection-label">{selected.kind === 'photo' ? 'Sua fotografia' : 'Seu bilhete'}</span>
          <button type="button" aria-label="Ampliar lembrança" onClick={(event) => open('view', event)}><Icon name="expand" size={15} />Ampliar</button>
          <button type="button" aria-label="Editar lembrança" disabled={!canEdit} onClick={(event) => open(selected.kind === 'photo' ? 'photo' : 'note', event)}>Editar</button>
          <div className="memory-move-controls" role="group" aria-label="Mover lembrança">
            {[['esquerda', '←', -.03, 0], ['cima', '↑', 0, -.03], ['baixo', '↓', 0, .03], ['direita', '→', .03, 0]].map(([direction, arrow, dx, dy]) => <button key={direction} type="button" aria-label={`Mover para ${direction === 'esquerda' || direction === 'direita' ? 'a ' : ''}${direction}`} disabled={!canEdit} onClick={() => moveItem(selected.id, selected.x + dx, selected.y + dy)}>{arrow}</button>)}
          </div>
          <label className="memory-rotation-label"><span>Inclinação da lembrança</span><select aria-label="Inclinação da lembrança" disabled={!canEdit} value={selected.rotation} onChange={(event) => changeItem(selected.id, { rotation: Number(event.target.value) })}>{[-8, -4, 0, 4, 8].map((value) => <option key={value} value={value}>{value > 0 ? '+' : ''}{value}°</option>)}</select></label>
          <button type="button" disabled={!canEdit} onClick={() => order(true)}>Trazer para frente</button><button type="button" disabled={!canEdit} onClick={() => order(false)}>Enviar para trás</button>
          <button type="button" className="memory-remove-button" aria-label="Remover lembrança" disabled={!canEdit} onClick={(event) => open('remove', event)}>Remover</button>
          <button type="button" className="memory-icon-button" aria-label="Deixar de selecionar lembrança" onClick={() => setSelectedId(null)}><Icon name="close" size={15} /></button>
        </div>}
        <div className="memory-meta"><span className="memory-save-status" role="status">{error ? error : busy || memory.saving ? 'Salvando mural…' : writable ? 'Salvo neste dispositivo' : 'Mural protegido contra alterações.'}</span>
          {error && <button type="button" disabled={busy} onClick={() => void memory.retry()}>Tentar novamente</button>}
          {undo && <button type="button" disabled={!canEdit || board.items.length >= MEMORY_LIMITS.maxItems} onClick={undoRemoval}>Desfazer remoção</button>}
          <span>Arraste para reorganizar. Enter ou dois cliques para ampliar.</span></div>
        {(notice || memory.notice) && <p className="memory-notice" role="status">{notice || memory.notice}</p>}
      </div>
      {modal?.kind === 'note' && <NoteEditor key={modal.id || 'new'} item={modalItem} onClose={close} onSave={(values) => modalItem ? changeItem(modalItem.id, values) : addNote(values)} />}
      {modal?.kind === 'photo' && modalItem && <PhotoEditor item={modalItem} memory={memory} onClose={close} onSave={(values) => changeItem(modalItem.id, values)} />}
      {modal?.kind === 'view' && modalItem && <MemoryViewer item={modalItem} memory={memory} onClose={close} />}
      {modal?.kind === 'reminder' && <ReminderLibrary onClose={close} onChoose={(text) => addNote({ text, paper: 'sage', style: 'plain' })} />}
      {modal?.kind === 'theme' && <ThemePanel memory={memory} onClose={close} onChange={(patch) => canEdit && updateBoard((current) => ({ ...current, ...patch }))} onRestore={() => setModal({ kind: 'restore' })} />}
      {modal?.kind === 'remove' && <MemoryDialog title="Remover esta lembrança?" onClose={close}>
        <p>A lembrança sairá do mural. Você pode desfazer a última remoção durante esta visita.</p><p>Sua fotografia na pasta de origem não será alterada.</p>
        <div className="memory-dialog-actions"><button type="button" data-autofocus onClick={close}>Manter no mural</button><button type="button" disabled={!canEdit} onClick={remove}>Confirmar remoção</button></div>
      </MemoryDialog>}
      {modal?.kind === 'restore' && <MemoryDialog title="Restaurar um backup?" onClose={() => { if (!busy) close(); }}>
        <p>O backup escolhido substituirá as fotografias e os bilhetes deste mural. Exporte uma cópia do mural atual se quiser guardá-lo também.</p>
        <p>Se o arquivo não puder ser validado, o mural atual será preservado.</p>
        {error && <p role="alert" className="memory-form-error">{error}</p>}
        <div className="memory-dialog-actions"><button type="button" data-autofocus disabled={busy} onClick={close}>Cancelar</button><button type="button" disabled={busy} className="memory-primary" onClick={async () => { if (await memory.restoreBackup()) { setSelectedId(null); setUndo(null); setNotice('Seu backup foi restaurado.'); close(); } }}>Escolher backup</button></div>
      </MemoryDialog>}
    </div>
    <div className="memory-scene-footer"><span><Icon name="lock" size={13} /> Fotografias e bilhetes ficam neste {memory.storageKind === 'browser' ? 'navegador' : 'computador'}. Sem envio para a internet.</span>
      <button type="button" className="memory-back-button" onClick={onBack}><Icon name="back" size={15} />Voltar ao quarto</button></div>
    {immersive.error && <p className="memory-notice" role="status">{immersive.error}</p>}
  </section>;
}

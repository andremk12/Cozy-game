import { useCallback, useEffect, useRef, useState } from 'react';
import Icon from '../../components/Icon.jsx';
import ImmersiveViewport from '../../components/ImmersiveViewport/ImmersiveViewport.jsx';
import { useImmersiveMode } from '../../hooks/useImmersiveMode.js';
import { acquireFullscreenEscape } from '../../services/fullscreenEscape.js';
import { PLANT_SLOTS, DECOR_SLOTS } from '../../../shared/garden.js';
import GardenScene from './GardenScene.jsx';
import GardenTools, { ToolButtons } from './GardenTools.jsx';
import './Garden.css';

export default function Garden({ gardenState, reducedMotion = false, onBack, companion }) {
  const { garden, ready, storageError, status, dispatch, retry } = gardenState;
  const [tool, setTool] = useState('observe');
  const [source, setSource] = useState(null);
  const [context, setContext] = useState(null);
  const [notice, setNotice] = useState('');
  const [effect, setEffect] = useState(null);
  const [hidden, setHidden] = useState(() => document.hidden);
  const [toolEscapeLocked, setToolEscapeLocked] = useState(false);
  const opener = useRef(null);
  const sceneRef = useRef(null);
  const effectNumber = useRef(0);
  const focusFrame = useRef(null);
  const cancelAction = useCallback(() => {
    if (!source && tool === 'observe') return false;
    const returnToTools = document.activeElement?.closest('.garden-active-tool, .garden-selection-note');
    setSource(null);
    setTool('observe');
    setNotice('Você pode continuar apenas contemplando.');
    if (returnToTools) sceneRef.current?.querySelector('[aria-label="Ferramentas do jardim"]')?.focus({ preventScroll: true });
    return true;
  }, [source, tool]);
  const immersive = useImmersiveMode({ contextualOpen: Boolean(context), onEscape: cancelAction });

  useEffect(() => {
    const visibility = () => setHidden(document.hidden);
    const escape = (event) => {
      if (event.key === 'Escape' && !context && !immersive.active && cancelAction()) event.preventDefault();
    };
    document.addEventListener('visibilitychange', visibility);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('visibilitychange', visibility);
      document.removeEventListener('keydown', escape);
    };
  }, [cancelAction, context, immersive.active]);
  useEffect(() => () => cancelAnimationFrame(focusFrame.current), []);
  useEffect(() => {
    if (!effect || hidden) return undefined;
    const timer = setTimeout(() => setEffect(null), 1900);
    return () => clearTimeout(timer);
  }, [effect, hidden]);

  useEffect(() => {
    setToolEscapeLocked(false);
    if (!immersive.active || context || (tool === 'observe' && !source) || !window.haven) return undefined;
    return acquireFullscreenEscape(navigator.keyboard, setToolEscapeLocked);
  }, [immersive.active, context, tool, source]);

  function selectTool(value) {
    setTool(value);
    setSource(null);
    setNotice(value === 'move' ? 'Escolha um vaso ou uma decoração e depois o destino.'
      : value === 'water' ? 'Toque em uma planta para regar.'
        : value === 'plant' ? 'Escolha um canteiro ou vaso.'
          : value === 'decorate' ? 'Escolha uma lanterna, um ponto de decoração ou um vaso.' : 'Tudo pode esperar.');
  }
  function open(kind, event, slotId) {
    opener.current = event?.currentTarget ?? document.activeElement;
    setContext({ kind, slotId });
  }
  function close() {
    sceneRef.current?.querySelector('dialog[open]')?.close();
    setContext(null);
    opener.current?.focus({ preventScroll: true });
  }
  function animate(slotId, kind) {
    setEffect({ slotId, kind, key: ++effectNumber.current });
  }
  function focusSlot(id) {
    cancelAnimationFrame(focusFrame.current);
    focusFrame.current = requestAnimationFrame(() => sceneRef.current?.querySelector(`[data-slot-id="${id}"]`)?.focus());
  }
  function plantSlot(id, event) {
    if (!ready) return;
    const plant = garden.plants.find((item) => item.slotId === id);
    const slot = PLANT_SLOTS.find((item) => item.id === id);
    if (tool === 'water') {
      if (plant) { dispatch({ type: 'water', slotId: id }); animate(id, 'water'); setNotice('A água encontra as folhas.'); }
      else setNotice('Este espaço está pronto para uma semente.');
      return;
    }
    if (tool === 'move') {
      if (slot.kind !== 'pot') { setNotice('Os canteiros ficam na terra. Escolha um vaso para mover.'); return; }
      if (!source) { setSource({ kind: 'pot', id }); setNotice('Agora escolha outro vaso para trocar de lugar.'); }
      else if (source.kind === 'pot') {
        dispatch({ type: 'movePot', from: source.id, to: id }); setSource(null); animate(id, 'move'); focusSlot(id);
        setNotice('Vasos reorganizados. As plantas seguem no seu tempo.');
      } else setNotice('Escolha um ponto de decoração compatível.');
      return;
    }
    if (plant) animate(id, 'touch');
    open(tool === 'plant' || !plant ? 'plant' : 'plantMenu', event, id);
  }
  function decorationSlot(id, event) {
    if (!ready) return;
    if (tool === 'move') {
      if (!source) {
        if (!garden.decorations.some((item) => item.slotId === id)) { setNotice('Escolha primeiro uma decoração existente.'); return; }
        setSource({ kind: 'decoration', id }); setNotice('Escolha um ponto compatível para esta decoração.');
      } else if (source.kind === 'decoration') {
        const from = garden.decorations.find((item) => item.slotId === source.id);
        const target = garden.decorations.find((item) => item.slotId === id);
        const fromSlot = DECOR_SLOTS.find((item) => item.id === source.id);
        const toSlot = DECOR_SLOTS.find((item) => item.id === id);
        if (!toSlot.kinds.includes(from.kind) || (target && !fromSlot.kinds.includes(target.kind))) {
          setNotice('Esta decoração precisa de um ponto compatível.'); return;
        }
        dispatch({ type: 'moveDecoration', from: source.id, to: id }); setSource(null); focusSlot(id);
        setNotice('Um novo lugar para este detalhe.');
      } else setNotice('Escolha outro vaso para trocar de lugar.');
      return;
    }
    open('decorate', event, id);
  }
  function action(kind, value) {
    const slotId = context.slotId;
    if (kind === 'species') {
      if (garden.plants.some((item) => item.slotId === slotId)) setContext({ ...context, kind: 'confirmPlant', species: value });
      else { dispatch({ type: 'plant', slotId, species: value }); animate(slotId, 'touch'); close(); }
    } else if (kind === 'replace') setContext({ ...context, kind: 'plant' });
    else if (kind === 'remove') setContext({ ...context, kind: 'confirmRemove' });
    else if (kind === 'confirmRemove') { dispatch({ type: 'removePlant', slotId }); close(); }
    else if (kind === 'confirmPlant') { dispatch({ type: 'replacePlant', slotId, species: value }); close(); }
    else if (kind === 'water') { dispatch({ type: 'water', slotId }); animate(slotId, 'water'); close(); }
    else if (kind === 'potStyle') dispatch({ type: kind, slotId, style: value });
    else if (kind === 'decorate') { dispatch({ type: kind, slotId, kind: value }); close(); }
    else if (kind === 'toggleLantern' || kind === 'removeDecoration') { dispatch({ type: kind, slotId }); close(); }
    else if (kind === 'atmosphere' || kind === 'weather') dispatch({ type: kind, value });
  }

  if (!ready) return <div className="loading-room">Abrindo seu jardim…</div>;
  return <section ref={sceneRef} className={`garden-scene${hidden ? ' is-paused' : ''}${reducedMotion ? ' is-reduced-motion' : ''}`}
    data-atmosphere={garden.atmosphere} data-weather={garden.weather} data-tool={tool} data-keyboard-lock={toolEscapeLocked} aria-label="The Garden: um pequeno lugar para crescer">
    <ImmersiveViewport targetRef={immersive.targetRef} active={immersive.active} onExit={immersive.exit} contextualOpen={Boolean(context)}>
      <GardenScene garden={garden} reducedMotion={reducedMotion} paused={hidden} tool={tool} selectedSlot={source?.id}
        companion={companion ? { ...companion, paused: companion.paused || Boolean(context) || tool !== 'observe' } : undefined}
        activePlantEffect={effect} onPlantSlot={plantSlot} onDecorationSlot={decorationSlot}
        onOpenTools={(event) => open('tools', event)} onOpenAtmosphere={(event) => open('atmosphere', event)}
        onWildlife={(kind) => setNotice(kind === 'cat' ? 'O gato laranja espia entre as folhas.'
          : kind === 'pond' ? 'Os peixinhos se aproximam. Pequenas ondas atravessam o lago.'
            : kind === 'butterfly' ? 'A borboleta muda suavemente de pouso.' : 'Os vagalumes respondem com um brilho suave.')} />
      {context && <GardenTools key={context.slotId || context.kind} context={context} garden={garden} tool={tool}
        onTool={selectTool} onAction={action} onClose={close} />}
      <p className="sr-only" role="status">{notice}</p>
      {immersive.active && tool !== 'observe' && <div className="garden-active-tool" aria-live="polite">
        {source ? 'Escolha o destino' : tool === 'water' ? 'Regador selecionado' : tool === 'move' ? 'Mover objetos' : tool === 'plant' ? 'Escolha um espaço' : 'Escolha um detalhe'}
        <button type="button" onClick={cancelAction}>Cancelar ação</button>
      </div>}
    </ImmersiveViewport>
    <div className="garden-controls">
      <ToolButtons tool={tool} onTool={selectTool} />
      <div className="garden-extra-controls">
        <button type="button" onClick={(event) => open('atmosphere', event)}><Icon name={garden.atmosphere === 'night' ? 'moon' : 'sunset'} size={16} /> Luz e clima</button>
        <button type="button" ref={immersive.triggerRef} disabled={immersive.pending} aria-label="Modo Imersivo" title="Modo Imersivo" onClick={immersive.enter}><Icon name="expand" size={17} /></button>
        <button type="button" onClick={onBack}><Icon name="back" size={16} /> Voltar ao quarto</button>
      </div>
      {source && <p className="garden-selection-note">Escolha o destino. <button type="button" onClick={cancelAction}>Cancelar ação</button></p>}
      {storageError && <p className="garden-storage-note" role="status">{storageError} {status !== 'unsupported' && <button type="button" onClick={retry}>Tentar salvar novamente</button>}</p>}
      {immersive.error && <p role="status">{immersive.error}</p>}
    </div>
  </section>;
}

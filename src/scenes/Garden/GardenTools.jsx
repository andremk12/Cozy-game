import { useEffect, useId, useRef, useState } from 'react';
import { acquireFullscreenEscape } from '../../services/fullscreenEscape.js';
import { SPECIES, PLANT_SLOTS, DECOR_SLOTS, getPlantStage } from '../../../shared/garden.js';

export const TOOLS = [
  ['observe', 'Contemplar'], ['plant', 'Plantar'], ['water', 'Regar'],
  ['move', 'Mover'], ['decorate', 'Decorar'],
];
const decorationLabels = { bench: 'Banco', lantern: 'Lanterna', stone: 'Pedras', mushroom: 'Cogumelos' };
const stages = ['Semente', 'Broto', 'Planta jovem', 'Planta desenvolvida'];

export function ToolButtons({ tool, onTool }) {
  return <div className="garden-tool-buttons" role="group" aria-label="Ferramentas do jardim">
    {TOOLS.map(([id, label]) => <button key={id} type="button" aria-pressed={tool === id} onClick={() => onTool(id)}>{label}</button>)}
  </div>;
}

export default function GardenTools({ context, garden, tool, onTool, onAction, onClose }) {
  const dialogRef = useRef(null);
  const uniqueId = useId();
  const [locked, setLocked] = useState(false);
  const slot = PLANT_SLOTS.find((item) => item.id === context.slotId);
  const decorSlot = DECOR_SLOTS.find((item) => item.id === context.slotId);
  const plant = garden.plants.find((item) => item.slotId === context.slotId);
  const species = SPECIES.find((item) => item.id === plant?.species);
  const decoration = garden.decorations.find((item) => item.slotId === context.slotId);
  const title = context.kind === 'tools' ? 'Seu pequeno canto de cuidados'
    : context.kind === 'atmosphere' ? 'Atmosfera do jardim'
      : context.kind === 'confirmRemove' ? 'Retirar esta planta?'
        : context.kind === 'confirmPlant' ? 'Trocar a planta deste espaço?'
          : decorSlot ? decorSlot.label : slot?.label || 'Seu jardim';

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog.showModal();
    const keyboard = window.haven && document.fullscreenElement?.contains(dialog) ? navigator.keyboard : null;
    const releaseEscape = acquireFullscreenEscape(keyboard, setLocked);
    return () => { releaseEscape(); dialog.close(); };
  }, []);

  useEffect(() => {
    const target = ['confirmRemove', 'confirmPlant'].includes(context.kind)
      ? dialogRef.current.querySelector('.garden-context-close')
      : dialogRef.current.querySelector('button, select');
    target?.focus({ preventScroll: true });
  }, [context.kind]);

  function close() {
    dialogRef.current.close();
    onClose();
  }
  function keyDown(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      close();
    }
    if (event.key !== 'Tab') return;
    const buttons = [...dialogRef.current.querySelectorAll('button:not(:disabled), select, input')];
    const first = buttons[0];
    const last = buttons.at(-1);
    if (event.shiftKey ? document.activeElement === first : document.activeElement === last) {
      event.preventDefault();
      (event.shiftKey ? last : first)?.focus();
    }
  }
  return <dialog ref={dialogRef} className="garden-context" aria-labelledby={uniqueId} data-keyboard-lock={locked}
    onKeyDown={keyDown} onCancel={(event) => { event.preventDefault(); close(); }}>
    <span className="garden-context-eyebrow">THE GARDEN · NO SEU TEMPO</span>
    <h2 id={uniqueId}>{title}</h2>
    {context.kind === 'tools' && <>
      <p>Escolha um cuidado e toque nos objetos do jardim. Você também pode apenas ficar.</p>
      <ToolButtons tool={tool} onTool={(value) => { onTool(value); close(); }} />
    </>}
    {context.kind === 'plant' && <>
      <p>{plant ? 'Escolha uma nova companhia para este espaço.' : 'O que você gostaria de ver crescer aqui?'}</p>
      <div className="garden-species-list">{SPECIES.map((item) => <button type="button" key={item.id}
        onClick={() => onAction('species', item.id)}>{item.label}<span aria-hidden="true"> +</span></button>)}</div>
    </>}
    {context.kind === 'plantMenu' && <>
      <p>{species?.label} · {plant && stages[getPlantStage(plant)]}. Cresce sem pressa, mesmo entre visitas.</p>
      <div className="garden-context-actions">
        <button type="button" onClick={() => onAction('water')}>Regar esta planta</button>
        <button type="button" onClick={() => onAction('replace')}>Escolher outra espécie</button>
        <button type="button" onClick={() => onAction('remove')}>Retirar planta</button>
      </div>
    </>}
    {slot?.kind === 'pot' && ['plant', 'plantMenu'].includes(context.kind) && <div className="garden-pot-styles" role="group" aria-label="Aparência do vaso">
      <span>Vaso</span>{[['terracotta', 'Terracota'], ['wood', 'Madeira']].map(([id, label]) => <button type="button" key={id}
        aria-pressed={garden.pots.find((item) => item.slotId === slot.id)?.style === id}
        onClick={() => onAction('potStyle', id)}>{label}</button>)}
    </div>}
    {context.kind === 'confirmRemove' && <>
      <p>{species?.label} será retirada. Você pode deixar o espaço como está e voltar.</p>
      <button type="button" onClick={() => onAction('confirmRemove')}>Retirar do jardim</button>
    </>}
    {context.kind === 'confirmPlant' && <>
      <p>Substituir {species?.label} por {SPECIES.find((item) => item.id === context.species)?.label}? A nova planta começa como semente.</p>
      <button type="button" onClick={() => onAction('confirmPlant', context.species)}>Confirmar troca</button>
    </>}
    {context.kind === 'decorate' && decorSlot && <>
      <p>Um detalhe para deixar este cantinho com a sua cara.</p>
      <div className="garden-context-actions">{decorSlot.kinds.map((kind) => <button type="button" key={kind}
        onClick={() => onAction('decorate', kind)}>{decorationLabels[kind]}</button>)}
        {decoration?.kind === 'lantern' && <button type="button" onClick={() => onAction('toggleLantern')}>{decoration.lit ? 'Apagar lanterna' : 'Acender lanterna'}</button>}
        {decoration && <button type="button" onClick={() => onAction('removeDecoration')}>Retirar decoração</button>}
      </div>
    </>}
    {context.kind === 'atmosphere' && <>
      <p>Escolha a luz e o clima que combinam com este momento.</p>
      <label>Período do dia<select aria-label="Período do dia" value={garden.atmosphere} onChange={(event) => onAction('atmosphere', event.target.value)}>
        <option value="day">Dia ensolarado</option><option value="sunset">Pôr do sol</option><option value="night">Noite tranquila</option>
      </select></label>
      <label>Clima<select aria-label="Clima do jardim" value={garden.weather} onChange={(event) => onAction('weather', event.target.value)}>
        <option value="clear">Clima limpo</option><option value="rain">Chuva suave</option>
      </select></label>
    </>}
    <button type="button" className="garden-context-close" autoFocus={['confirmRemove', 'confirmPlant'].includes(context.kind)} onClick={close}>Fechar</button>
  </dialog>;
}

import { useEffect, useId, useRef, useState } from 'react';
import { KITCHEN_RECIPES } from '../../../shared/kitchenRecipes.js';
import KitchenRecipeArt from './KitchenRecipeArt.jsx';
import { KitchenDialog } from './KitchenObjects.jsx';

export default function RecipeBook({ session, onStart, onClose }) {
  const [selected, setSelected] = useState(session?.recipeId || KITCHEN_RECIPES[0].id);
  const [custom, setCustom] = useState(false);
  const [minutes, setMinutes] = useState(25);
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(false);
  const [replace, setReplace] = useState(false);
  const customTime = useRef(null);
  const startButton = useRef(null);
  const detailId = useId();
  const errorId = useId();
  const recipe = KITCHEN_RECIPES.find(item=>item.id===selected);
  const active = ['running','paused'].includes(session?.status);
  useEffect(()=>{
    if (replace) startButton.current?.scrollIntoView({block:'nearest'});
  },[replace]);
  async function start() {
    if (custom && (!Number.isInteger(Number(minutes)) || Number(minutes)<5 || Number(minutes)>60)) {
      setError('Escolha um tempo inteiro entre 5 e 60 minutos.'); customTime.current?.focus(); return;
    }
    if (active && !replace) { setReplace(true); return; }
    setStarting(true);
    try { await onStart(recipe.id,(custom?Number(minutes):recipe.minutes)*60_000,active); }
    catch { setError('Não foi possível iniciar a receita. Você pode tentar novamente.'); setStarting(false); }
  }
  return <KitchenDialog title="Livro de receitas" onClose={onClose} className="kitchen-recipe-book">
    <p className="kitchen-book-intro">Escolha um prato para acompanhar seu tempo. Todas as receitas estão disponíveis, sem pressa.</p>
    <div className="kitchen-book-spread">
      <div className="kitchen-recipe-list" role="group" aria-label="Escolha uma receita">
        {KITCHEN_RECIPES.map(item=><button type="button" key={item.id} className={`kitchen-recipe-option${selected===item.id?' is-selected':''}`} aria-pressed={selected===item.id} aria-controls={detailId}
          onClick={()=>{setSelected(item.id);setReplace(false);setError('');}}>
          <KitchenRecipeArt recipeId={item.id} /><span><strong>{item.name}</strong><small>{item.minutes} minutos</small><span className="kitchen-recipe-description">{item.description}</span></span>
        </button>)}
      </div>
      <div className="kitchen-book-page" id={detailId}>
        <span className="kitchen-eyebrow">UMA RECEITA PARA SEU MOMENTO</span>
        <KitchenRecipeArt recipeId={recipe.id} className="kitchen-book-preview" />
        <div className="kitchen-book-selected" aria-live="polite" aria-atomic="true"><h3>{recipe.name}</h3><p>{recipe.description}</p></div>
        <label className="kitchen-check"><input type="checkbox" checked={custom} onChange={(event)=>{setCustom(event.target.checked);setReplace(false);}} />Escolher meu tempo</label>
        {custom ? <label className="kitchen-custom-time">Duração personalizada<input ref={customTime} aria-label="Duração personalizada em minutos" aria-describedby={error?errorId:undefined} aria-invalid={Boolean(error)&&(!Number.isInteger(Number(minutes))||Number(minutes)<5||Number(minutes)>60)} type="number" min="5" max="60" step="1" value={minutes} onChange={(event)=>{setMinutes(event.target.value);setError('');}} /><span>minutos · de 5 a 60</span></label>
          : <p className="kitchen-book-duration">{recipe.minutes} minutos para ir no seu ritmo.</p>}
        <p className="kitchen-small-note">Tempos simbólicos para sessões de foco. Não são instruções culinárias reais.</p>
        {replace && <p className="kitchen-replace-note" role="status">Já há uma receita em preparo. Encerrá-la e começar esta? A receita anterior não terá uma conclusão.</p>}
        {error && <p id={errorId} className="kitchen-input-error" role="alert">{error}</p>}
        <button ref={startButton} type="button" className="kitchen-primary-button" disabled={starting} onClick={start}>{starting?'Abrindo este momento…':replace?'Encerrar e preparar esta receita':'Começar esta receita'}</button>
        {replace && <button type="button" className="kitchen-quiet-button" onClick={()=>setReplace(false)}>Manter a receita atual</button>}
      </div>
    </div>
  </KitchenDialog>;
}

import { useEffect, useRef, useState } from 'react';
import Icon from '../../components/Icon.jsx';
import ImmersiveViewport from '../../components/ImmersiveViewport/ImmersiveViewport.jsx';
import { useImmersiveMode } from '../../hooks/useImmersiveMode.js';
import { formatKitchenTime } from '../../../shared/kitchen.js';
import KitchenScene from './KitchenScene.jsx';
import RecipeBook from './RecipeBook.jsx';
import KitchenCompletion from './KitchenCompletion.jsx';
import KitchenSpeech from './KitchenSpeech.jsx';
import { KitchenDialog, KitchenSettings, useKitchenObjects } from './KitchenObjects.jsx';
import './Kitchen.css';
import './KitchenArt.css';

const notes = [
  'Aqui, nenhuma receita pede pressa. A cozinha também fica aberta quando você só quer estar.',
  'Deixei uma caneca limpa e a janela entreaberta. Fique à vontade para respirar um pouco.',
  'Uma coisa de cada vez. Até as melhores receitas precisam de tempo.',
];

export default function Kitchen({ kitchenState, companion, reducedMotion = false, onBack, onSoundEffect, onCompletionSound }) {
  const { kitchen, view, ready, storageError, dispatch, retry, delivery, clearDelivery } = kitchenState;
  const session = kitchen.session;
  const settings = kitchen.settings;
  const [context, setContext] = useState(null);
  const [hidden, setHidden] = useState(()=>document.hidden);
  const [completion, setCompletion] = useState(null);
  const [celebrate, setCelebrate] = useState(false);
  const [notice, setNotice] = useState('');
  const [message, setMessage] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState(0);
  const opener = useRef(null);
  const claims = useRef(new Set());
  const messageStages = useRef(new Set());
  const sounded = useRef(new Set());
  const mounted = useRef(true);
  const immersive = useImmersiveMode({contextualOpen:Boolean(context)});
  const objects = useKitchenObjects((kind)=>{ if (settings.effectsEnabled && !document.hidden) onSoundEffect?.(kind); });
  const active = ['running','paused'].includes(session?.status);

  // An earlier object interaction must not mask a later recipe announcement.
  useEffect(()=>{setNotice('');},[session?.id,session?.status,view.stage.id]);

  useEffect(()=>{
    mounted.current=true;
    const visibility=()=>setHidden(document.hidden);
    document.addEventListener('visibilitychange',visibility);
    return ()=>{mounted.current=false;document.removeEventListener('visibilitychange',visibility);};
  },[]);

  useEffect(()=>{
    if (!ready || hidden || context || session?.status!=='completed' || session.presentation!=='pending' || claims.current.has(session.id)) return;
    const id=session.id;
    claims.current.add(id);
    void dispatch({type:'present',sessionId:id}).catch(()=>{claims.current.delete(id);if(mounted.current)setNotice('Seu prato ficou pronto. Você pode consultar o resultado ao voltar.');});
  },[ready,hidden,context,session?.id,session?.status,session?.presentation,dispatch]);

  useEffect(()=>{
    if (!delivery || hidden || context) return;
    setCompletion(delivery);
  },[delivery,hidden,context]);

  function completionPresented() {
    if (!completion || completion.id!==delivery?.id || hidden || context || document.hidden) return;
    clearDelivery(completion.id);
    setCelebrate(true);
    if (!sounded.current.has(completion.id)) {
      sounded.current.add(completion.id);
      if (settings.completionSoundEnabled) onCompletionSound?.();
    }
  }

  useEffect(()=>{
    if (!celebrate) return undefined;
    const timer=setTimeout(()=>setCelebrate(false),1700);
    return ()=>clearTimeout(timer);
  },[celebrate]);

  useEffect(()=>{
    setMessage('');
    if (!settings.messagesEnabled || hidden || context || session?.status!=='running') return undefined;
    const key=`${session.id}:${view.stage.id}`;
    if (messageStages.current.has(key)) return undefined;
    const text=view.stage.id==='ingredients' ? 'Pode focar aí. Eu cuido da receita por aqui!'
      : ['cooking','baking'].includes(view.stage.id) ? ['tea','soup','pasta'].includes(session.recipeId)
        ? 'A receita vai ganhando forma, e você pode seguir no seu ritmo.'
        : 'O forno está trabalhando, e você pode seguir no seu ritmo.' : '';
    if (!text) return undefined;
    messageStages.current.add(key);
    setMessage(text);
    const timer=setTimeout(()=>setMessage(''),8000);
    return ()=>clearTimeout(timer);
  },[session?.id,session?.status,view.stage.id,settings.messagesEnabled,hidden,context]);

  function open(kind,event) { opener.current=event?.currentTarget || document.activeElement; setConfirmation('');setContext(kind); }
  function closeContext() {
    setContext(null);setConfirmation('');
    requestAnimationFrame(()=>{
      const target=opener.current?.isConnected?opener.current:immersive.targetRef.current?.querySelector('[data-kitchen-book]');
      target?.focus({preventScroll:true});
    });
  }
  async function command(value) {
    if (busy) return undefined;
    setBusy(true);
    try { return await dispatch(value); }
    catch { setNotice('Não foi possível alterar a receita. Você pode tentar novamente.'); return undefined; }
    finally { if (mounted.current) setBusy(false); }
  }
  function object(kind,event) {
    if (kind==='lamp') { void dispatch({type:'settings',patch:{lampOn:!settings.lampOn}});setNotice(settings.lampOn?'Luminárias apagadas.':'Luminárias acesas.'); }
    else if (kind==='fridge') {objects.toggleFridge();setNotice(objects.fridgeOpen?'Geladeira fechada.':'Geladeira aberta. Pequenos ingredientes nas prateleiras.');}
    else if (kind==='kettle') {objects.kettle();setNotice('A chaleira solta um vapor quentinho.');}
    else if (kind==='utensils') {objects.touchUtensils();setNotice('As pequenas panelas balançam suavemente.');}
    else if (kind==='pot') {objects.touchPot();setNotice('A panela solta um vapor suave, sem alterar o tempo da receita.');}
    else if(kind==='result'){setCompletion({id:session.id,recipe:view.recipe,static:true});setCelebrate(false);}
    else { if (kind==='note') setNote(value=>(value+1)%notes.length);open(kind,event); }
  }
  async function start(recipeId,durationMs,replace) {
    if (replace) await dispatch({type:'cancel'});
    const result=await dispatch({type:'start',recipeId,durationMs});
    if (result.kitchen.session?.status!=='running' || result.kitchen.session.recipeId!==recipeId) throw new Error('start unavailable');
    setCompletion(null);closeContext();setNotice('A receita começou. Seu tempo continua mesmo em outro ambiente.');
  }
  function dismiss() {
    const id=completion?.id;
    setCompletion(null);
    setCelebrate(false);
    if(id) void dispatch({type:'close',sessionId:id});
  }
  function anotherRecipe() {
    dismiss();
    opener.current=immersive.targetRef.current?.querySelector('[data-kitchen-book]');
    setContext('book');
  }
  function renderSpeech({ state, headAnchor }) {
    const isCompletion=Boolean(completion && session?.status==='completed' && completion.id===session.id);
    const arrived=state.kitchenPhase==='acting'&&state.action==='presenting';
    const hasCompanion=companion?.settings?.enabled!==false;
    const visible=isCompletion ? arrived : Boolean(message && hasCompanion && settings.messagesEnabled);
    return <KitchenSpeech state={state} headAnchor={headAnchor} kind={isCompletion?'completion':'message'}
      contentKey={isCompletion?`completion:${completion.id}:${completion.static?'review':'new'}`:`${session?.id}:${view.stage.id}:${message}`}
      visible={visible} suppress={hidden||Boolean(context)||(!isCompletion&&!settings.messagesEnabled)}
      hasCompanion={hasCompanion} onPresented={isCompletion?completionPresented:undefined}>
      {isCompletion?<KitchenCompletion recipe={completion.recipe} companion={companion} animate={celebrate}
        onClose={dismiss} onRest={()=>{dismiss();setNotice('Fique à vontade. Este momento não tem relógio.');}} onAnother={anotherRecipe}/>
        :<p>{message}</p>}
    </KitchenSpeech>;
  }
  async function confirmed(type) {
    if(confirmation!==type){setConfirmation(type);return;}
    await command({type});setCompletion(null);closeContext();
    setNotice(type==='cancel'?'Receita encerrada. Você pode ficar à vontade.':'Receita reiniciada por sua escolha.');
  }
  const timerControls=<div className="kitchen-timer-actions">
    {session?.status==='running'&&<button type="button" disabled={busy} onClick={()=>command({type:'pause'})}>Pausar receita</button>}
    {session?.status==='paused'&&<button type="button" disabled={busy} onClick={()=>command({type:'resume'})}>Retomar receita</button>}
    {session&&<button type="button" disabled={busy} onClick={()=>confirmed('restart')}>{confirmation==='restart'?'Confirmar reinício':'Reiniciar receita'}</button>}
    {active&&<button type="button" disabled={busy} onClick={()=>confirmed('cancel')}>{confirmation==='cancel'?'Confirmar encerramento':'Encerrar antecipadamente'}</button>}
    {confirmation&&<p role="status">{confirmation==='restart'?'O tempo voltará ao início somente se você confirmar.':'Você pode encerrar sem penalidades e sem uma conclusão.'}<button type="button" onClick={()=>setConfirmation('')}>Continuar como está</button></p>}
  </div>;

  if(!ready)return <div className="loading-room">Abrindo sua cozinha…</div>;
  return <section className={`kitchen-scene${reducedMotion?' is-reduced-motion':''}${hidden?' is-hidden':''}${session?.status==='paused'?' is-session-paused':''}`}
    data-status={session?.status||'idle'} data-stage={view.stage.id} data-recipe={session?.recipeId||'none'} aria-label="The Cozy Kitchen: uma receita para seu tempo">
    <ImmersiveViewport targetRef={immersive.targetRef} active={immersive.active} onExit={immersive.exit} contextualOpen={Boolean(context)}>
      <KitchenScene settings={settings} objects={objects} view={view} session={session} companion={companion} reducedMotion={reducedMotion}
        paused={hidden||Boolean(context)} celebrate={celebrate&&completion?.id===session?.id} onObject={object} renderSpeech={renderSpeech} />
      <div className="kitchen-in-scene-controls">
        <button type="button" className="kitchen-clock" aria-label={`Consultar tempo da receita${active?`: ${formatKitchenTime(view.remainingMs)} restantes`:''}`} onClick={(event)=>open('clock',event)}>
          <span>{active?session.status==='paused'?'Em pausa':'No seu ritmo':session?.status==='completed'?'Feito com carinho':'Seu pequeno tempo'}</span>
          <time>{active?formatKitchenTime(view.remainingMs):session?.status==='completed'?'Prontinho':'Sem pressa'}</time>
        </button>
        {immersive.active&&<button type="button" onClick={(event)=>open('book',event)} className="kitchen-immersive-book">Livro de receitas</button>}
      </div>
      {context==='book'&&<RecipeBook session={session} onStart={start} onClose={closeContext} />}
      {context==='atmosphere'&&<KitchenDialog title="Luz e sons da cozinha" onClose={closeContext}><KitchenSettings settings={settings} dispatch={dispatch} /></KitchenDialog>}
      {context==='note'&&<KitchenDialog title="Um pequeno bilhete" onClose={closeContext}><p className="kitchen-note">{notes[note]}</p><p className="kitchen-small-note">A cozinha está aqui para acompanhar você, sem obrigações.</p></KitchenDialog>}
      {context==='clock'&&<KitchenDialog title="Relógio da cozinha" onClose={closeContext}>
        <p>{active?view.recipe.name:session?.status==='completed'?'Seu prato já está na mesa.':'A cozinha está aberta, mesmo sem receita.'}</p>
        {active&&<><p className="kitchen-clock-large"><time>{formatKitchenTime(view.remainingMs)}</time><span>restantes{session.status==='paused'?' · em pausa':''}</span></p><p>{view.stage.label}</p></>}
        {timerControls}<p className="kitchen-small-note">O tempo segue enquanto você visita outros ambientes, minimiza ou fecha o aplicativo. Uma pausa permanece pausada ao reabrir. Nenhuma nova receita começa sozinha.</p>
        {session?.status==='completed'&&<button type="button" onClick={()=>{closeContext();setCompletion({id:session.id,recipe:view.recipe,static:true});setCelebrate(false);}}>Ver prato e mensagem</button>}
        {!active&&<button type="button" className="kitchen-primary-button" onClick={()=>setContext('book')}>Escolher uma receita</button>}
      </KitchenDialog>}
    </ImmersiveViewport>
    <div className="kitchen-controls">
      <button type="button" onClick={(event)=>open('book',event)}><Icon name="book" size={15}/>Livro de receitas</button>
      <button type="button" onClick={(event)=>open('atmosphere',event)}>Luz e sons</button>
      <div className="kitchen-session-summary"><span>{active?view.recipe.name:session?.status==='completed'?view.recipe.name:'Uma cozinha aberta, um tempo livre.'}</span>{active&&<span>{view.stage.label}</span>}</div>
      {active&&<button type="button" disabled={busy} onClick={()=>command({type:session.status==='running'?'pause':'resume'})}>{session.status==='running'?'Pausar receita':'Retomar receita'}</button>}
      <button type="button" ref={immersive.triggerRef} disabled={immersive.pending} onClick={immersive.enter} aria-label="Modo Imersivo" title="Modo Imersivo"><Icon name="expand" size={17}/></button>
      <button type="button" onClick={onBack}><Icon name="back" size={15}/>Voltar ao quarto</button>
      {immersive.error&&<p role="status">{immersive.error}</p>}
      {storageError&&<p role="status">{storageError}{kitchenState.status==='unavailable'&&<button type="button" onClick={retry}>Tentar novamente</button>}</p>}
    </div>
    <p className="sr-only" role="status">{notice || (session?.status==='paused'?'Receita pausada.':session?.status==='completed'?view.recipe.completionTitle:session?.status==='running'?view.stage.label:session?.status==='cancelled'?'Receita encerrada. A cozinha continua aberta.':'')}</p>
  </section>;
}

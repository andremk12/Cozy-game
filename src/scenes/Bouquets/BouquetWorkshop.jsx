import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { BOUQUET_SPECIES, getAvailableBouquetSpecies } from '../../../shared/garden.js';
import { buildBouquetMailto, createBouquet, DEFAULT_SUBJECT, LETTER_PAPERS, MAX_MAILTO_LENGTH, MAX_MESSAGE_LENGTH, MAX_STEMS, MAX_SUBJECT_LENGTH, normalizeSubject, PAPERS, RIBBONS, validateBouquet, validateMessage, validateRecipient } from '../../../shared/bouquets.js';
import { deleteBouquetDraft, loadBouquetDraft, openBouquetEmail, saveBouquetDraft, saveBouquetImage } from '../../services/bouquets.js';
import { acquireFullscreenEscape } from '../../services/fullscreenEscape.js';
import { FlowerStem } from '../Garden/GardenPlants.jsx';
import BouquetCanvas from './BouquetCanvas.jsx';
import WorkshopArt from './WorkshopArt.jsx';
import { createBouquetPng } from './bouquetExport.js';
import './BouquetWorkshop.css';

const messages = [
  ['Para alegrar o dia', 'Não precisa ser uma ocasião especial para receber flores. Espero que estas deixem seu dia um pouquinho mais bonito. ♡'],
  ['Um pequeno carinho', 'Passando para deixar um pouco de cor e carinho no seu dia. Estas flores me fizeram lembrar de você.'],
  ['Para alguém importante', 'Algumas pessoas deixam os dias mais bonitos simplesmente por estarem por perto. Estas flores são um pequeno lembrete disso.'],
  ['Para desejar tranquilidade', 'Que haja espaço no seu dia para uma pausa tranquila e para as pequenas coisas que você gosta.'],
  ['Só porque sim', 'Não tem aniversário, comemoração ou motivo especial. Só achei que você gostaria de receber flores hoje! 💐'],
];
const nameOf = (species) => BOUQUET_SPECIES.find(({ id }) => id === species)?.label || species;
const count = (text) => Array.from(text).length;

function Choice({ label, value, choices, onChange }) {
  return <label className="bouquet-field">{label}<select value={value} onChange={(event) => onChange(event.target.value)}>{choices.map(({ id, label: title }) => <option key={id} value={id}>{title}</option>)}</select></label>;
}

export default function BouquetWorkshop({ garden, reducedMotion = false, companion, onBack, active = true, sessionRef }) {
  const [bouquet, setBouquet] = useState(() => sessionRef?.current?.bouquet || createBouquet());
  const [recipient, setRecipient] = useState(() => sessionRef?.current?.recipient || '');
  const [step, setStep] = useState(() => sessionRef?.current?.step || 'arrange');
  const [wrapped, setWrapped] = useState(() => sessionRef?.current?.wrapped || false);
  const [animate, setAnimate] = useState(false);
  const [includeLetter, setIncludeLetter] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmation, setConfirmation] = useState(null);
  const titleRef = useRef(null);
  const svgRef = useRef(null);
  const workshopRef = useRef(null);
  const pendingStemFocus = useRef(null);
  const confirmationRef = useRef(null);
  const confirmationOpener = useRef(null);
  const pendingConfirmationFocus = useRef(false);
  const available = getAvailableBouquetSpecies(garden);
  const letterColor = LETTER_PAPERS.find(({ id }) => id === bouquet.letterPaper)?.color;
  const emailTooLong = step === 'review' && buildBouquetMailto({ recipient, subject: bouquet.subject, message: bouquet.message }).length > MAX_MAILTO_LENGTH;

  useEffect(() => {
    if (sessionRef) sessionRef.current = { bouquet, recipient, step, wrapped };
  }, [bouquet, recipient, step, wrapped, sessionRef]);
  useEffect(() => {
    if (active) titleRef.current?.focus({ preventScroll: true });
  }, [active, step]);
  useLayoutEffect(() => {
    if (pendingStemFocus.current === null) return;
    const index = pendingStemFocus.current;
    pendingStemFocus.current = null;
    const target = bouquet.stems.length
      ? workshopRef.current?.querySelectorAll('.bouquet-stem-list li')[Math.min(index, bouquet.stems.length - 1)]
      : workshopRef.current?.querySelector('.bouquet-flower-choices button:not(:disabled)');
    target?.focus();
  }, [bouquet.stems]);
  useLayoutEffect(() => {
    if (!busy && !confirmation && pendingConfirmationFocus.current) {
      pendingConfirmationFocus.current = false;
      confirmationOpener.current?.focus({ preventScroll: true });
    }
  }, [busy, confirmation]);
  useEffect(() => {
    if (!confirmation) return undefined;
    const dialog = confirmationRef.current;
    dialog.showModal();
    dialog.querySelector('button')?.focus();
    const keyboard = window.haven && document.fullscreenElement?.contains(dialog) ? navigator.keyboard : null;
    const release = acquireFullscreenEscape(keyboard);
    return () => {
      release();
      dialog.close();
      if (confirmationOpener.current?.isConnected) {
        pendingConfirmationFocus.current = confirmationOpener.current.disabled;
        if (!pendingConfirmationFocus.current) confirmationOpener.current.focus({ preventScroll: true });
      }
    };
  }, [confirmation]);
  useEffect(() => {
    if (!animate) return undefined;
    const timer = setTimeout(() => setAnimate(false), 1250);
    return () => clearTimeout(timer);
  }, [animate]);

  function change(patch) {
    setBouquet((value) => ({ ...value, ...patch }));
    setNotice('');
    setError('');
  }
  function go(next) {
    try {
      if (!bouquet.stems.length) throw new Error('Escolha ao menos uma flor para preparar seu presente.');
      if (next === 'review') {
        setBouquet(validateBouquet(bouquet));
        setRecipient(validateRecipient(recipient));
      }
      if (step === 'arrange' && !wrapped) { setWrapped(true); setAnimate(!reducedMotion); }
      setStep(next); setError(''); setNotice('');
    } catch (problem) { setError(problem.message); }
  }
  function editSubject(value) {
    try {
      if (count(value) > MAX_SUBJECT_LENGTH) throw new Error('O assunto pode ter até 120 caracteres.');
      normalizeSubject(value);
      change({ subject: value });
    } catch (problem) { setError(problem.message); }
  }
  function checkSubjectInsertion(event, text) {
    try { normalizeSubject(text); }
    catch (problem) { event.preventDefault(); setError(problem.message); }
  }
  function editMessage(value) {
    try { change({ message: validateMessage(value) }); }
    catch (problem) { setError(problem.message); }
  }
  function moveStem(index, direction) {
    const stems = [...bouquet.stems];
    const target = index + direction;
    if (target < 0 || target >= stems.length) return;
    [stems[index], stems[target]] = [stems[target], stems[index]];
    pendingStemFocus.current = target;
    change({ stems });
  }
  function removeStem(index) {
    pendingStemFocus.current = index;
    change({ stems: bouquet.stems.filter((_, item) => item !== index) });
  }
  function askConfirmation(action, event) {
    confirmationOpener.current = event.currentTarget;
    setConfirmation(action);
  }
  async function run(action) {
    if (busy) return;
    setBusy(true); setError(''); setNotice('');
    try { await action(); }
    catch (problem) { setError(problem.message || 'Não foi possível concluir. Sua edição continua aqui.'); }
    finally { setBusy(false); }
  }
  function saveDraft() {
    void run(async () => {
      await saveBouquetDraft(bouquet, { includeLetter });
      setNotice(includeLetter ? 'Arranjo, carta e assunto guardados neste dispositivo. O destinatário não foi salvo.' : 'Arranjo guardado neste dispositivo. Carta, assunto e destinatário não foram salvos.');
    });
  }
  function restoreDraft() {
    void run(async () => {
      const draft = await loadBouquetDraft();
      if (!draft) { setNotice('Ainda não há um rascunho salvo.'); return; }
      setBouquet(draft); setRecipient(''); setStep('arrange'); setWrapped(false); setAnimate(false); setIncludeLetter(false);
      setNotice('Rascunho retomado. Você pode continuar no seu tempo.');
    });
  }
  function exportGift(kind) {
    void run(async () => {
      const safe = validateBouquet(bouquet);
      const dataUrl = await createBouquetPng(svgRef.current, safe, kind === 'card-html' ? 'bouquet' : kind);
      const payload = kind === 'card-html' ? { dataUrl, kind, message: safe.message, letterPaper: safe.letterPaper } : { dataUrl, kind };
      const result = await saveBouquetImage(payload);
      setNotice(result.canceled ? 'Salvamento cancelado. Seu presente continua aqui.' : 'Presente preparado para salvar no seu dispositivo.');
    });
  }
  function share(withoutLetter = false) {
    void run(async () => {
      const subject = normalizeSubject(bouquet.subject);
      const opened = await openBouquetEmail({ recipient: validateRecipient(recipient), subject, message: withoutLetter ? '' : bouquet.message });
      setNotice(opened ? 'Abertura do aplicativo de e-mail solicitada. Confira os campos e anexe o cartão salvo antes de enviar.' : 'Não foi possível abrir o e-mail. Salve o cartão e abra seu aplicativo de e-mail manualmente.');
    });
  }
  function confirmAction() {
    const action = confirmation;
    setConfirmation(null);
    if (action === 'restore') restoreDraft();
    else if (action === 'delete') void run(async () => { await deleteBouquetDraft(); setNotice('Rascunho salvo excluído. A edição desta sessão permanece aqui.'); });
    else { setBouquet(createBouquet()); setRecipient(''); setStep('arrange'); setWrapped(false); setAnimate(false); setIncludeLetter(false); setError(''); setNotice('Uma mesa livre para um novo arranjo.'); }
  }

  return <section ref={workshopRef} className={`bouquet-workshop${reducedMotion ? ' is-reduced-motion' : ''}${animate ? ' is-wrapping' : ''}`} aria-label="Little Bouquets — Flores para Você">
    <header className="bouquet-heading"><div><span className="bouquet-eyebrow">UM PEQUENO ATELIÊ NO JARDIM</span><h2 ref={titleRef} tabIndex="-1">Little Bouquets</h2><p>Flores para Você</p></div><button type="button" onClick={onBack}>Voltar ao jardim</button></header>
    <ol className="bouquet-steps" aria-label="Etapas do presente"><li aria-current={step === 'arrange' ? 'step' : undefined}>1 · Escolher e compor</li><li aria-current={step === 'letter' ? 'step' : undefined}>2 · Uma carta</li><li aria-current={step === 'review' ? 'step' : undefined}>3 · Revisar e compartilhar</li></ol>
    <div className="bouquet-studio"><WorkshopArt bouquet={bouquet} companion={companion} reducedMotion={reducedMotion} active={active} /><p>Flores do seu jardim, um papel bonito e tempo para preparar um carinho.</p></div>
    {error && <p className="bouquet-error" role="alert">{error}</p>}
    {notice && <p className="bouquet-notice" role="status">{notice}</p>}
    <div className="bouquet-workspace">
      <div className="bouquet-preview" style={{ '--letter-color': letterColor }}>
        <span className="bouquet-eyebrow">{step === 'review' ? 'PRESENTE' : 'SEU ARRANJO'}</span>
        <BouquetCanvas bouquet={bouquet} svgRef={svgRef} />
        {!bouquet.stems.length && <p className="bouquet-empty">Escolha uma flor para começar.</p>}
        {step !== 'arrange' && <div className="bouquet-letter-preview"><h3>Flores para você</h3><p>{bouquet.message || 'Sua carta aparecerá aqui, se você quiser escrever uma.'}</p><small>Little Haven · Little Bouquets</small></div>}
        {step === 'arrange' && <p className="bouquet-preview-note">{bouquet.stems.length} de {MAX_STEMS} hastes · as flores continuam no jardim.</p>}
      </div>
      <div className="bouquet-editor">
        {step === 'arrange' && <>
          <h3>Flores que já floresceram</h3><p className="bouquet-help">Use cada espécie quantas vezes quiser, até {MAX_STEMS} hastes por arranjo. Nada é consumido.</p>
          {!available.length ? <div className="bouquet-empty-garden"><p>Quando uma flor do jardim estiver adulta, ela ficará disponível aqui. As plantas crescem também enquanto você está longe.</p><button type="button" onClick={onBack}>Voltar para cultivar</button></div> : <div className="bouquet-flower-choices">{available.map(({ id, label }) => <button type="button" key={id} disabled={bouquet.stems.length >= MAX_STEMS} aria-label={`Adicionar ${label}`} onClick={() => change({ stems: [...bouquet.stems, id] })}><svg viewBox="-22 -44 44 48" aria-hidden="true" shapeRendering="crispEdges"><FlowerStem species={id} /></svg><span>{label}</span><span className="bouquet-add" aria-hidden="true">+</span></button>)}</div>}
          {bouquet.stems.length > 0 && <div className="bouquet-arrangement-controls"><div className="bouquet-subheading"><h3>Na sua composição</h3><button type="button" disabled={bouquet.stems.length < 2} onClick={() => change({ stems: [...bouquet.stems.slice(1), bouquet.stems[0]] })}>Reorganizar flores</button></div><ol className="bouquet-stem-list">{bouquet.stems.map((species, index) => <li key={`${species}-${index}`} tabIndex="-1"><span>{index + 1}. {nameOf(species)}</span><div><button type="button" disabled={index === 0} aria-label={`Mover flor ${index + 1} para a esquerda`} onClick={() => moveStem(index, -1)}>←</button><button type="button" disabled={index === bouquet.stems.length - 1} aria-label={`Mover flor ${index + 1} para a direita`} onClick={() => moveStem(index, 1)}>→</button><button type="button" aria-label={`Remover flor ${index + 1}: ${nameOf(species)}`} onClick={() => removeStem(index)}>Retirar</button></div></li>)}</ol></div>}
          <div className="bouquet-choices"><Choice label="Papel do embrulho" value={bouquet.paper} choices={PAPERS} onChange={(paper) => change({ paper })} /><Choice label="Cor do laço" value={bouquet.ribbon} choices={RIBBONS} onChange={(ribbon) => change({ ribbon })} /></div>
          <div className="bouquet-details"><label><input type="checkbox" checked={bouquet.foliage} onChange={(event) => change({ foliage: event.target.checked })} /> Folhas decorativas</label><label><input type="checkbox" checked={bouquet.tag} onChange={(event) => change({ tag: event.target.checked })} /> Etiqueta com coração</label></div>
          <button type="button" className="bouquet-primary" disabled={!bouquet.stems.length} onClick={() => go('letter')}>Escrever a carta</button>
        </>}
        {step === 'letter' && <>
          <h3>Uma carta, do seu jeito</h3><p className="bouquet-help">Escrever é opcional. A pré-visualização acompanha cada palavra.</p>
          <label className="bouquet-field">E-mail do destinatário (opcional)<input type="text" inputMode="email" autoComplete="off" spellCheck="false" value={recipient} onChange={(event) => { setRecipient(event.target.value); setError(''); }} placeholder="pessoa@exemplo.com" /></label>
          <label className="bouquet-field">Assunto do e-mail<input type="text" value={bouquet.subject} autoComplete="off" aria-describedby="bouquet-subject-help" onChange={(event) => editSubject(event.target.value)} onPaste={(event) => checkSubjectInsertion(event, event.clipboardData.getData('text'))} onDrop={(event) => checkSubjectInsertion(event, event.dataTransfer.getData('text'))} onBeforeInput={(event) => { if (event.nativeEvent.data) checkSubjectInsertion(event, event.nativeEvent.data); }} placeholder={DEFAULT_SUBJECT} /></label>
          <p id="bouquet-subject-help" className="bouquet-counter">{count(bouquet.subject)} / {MAX_SUBJECT_LENGTH} · se ficar vazio, usamos “{DEFAULT_SUBJECT}”.</p>
          <label className="bouquet-field">Mensagem<textarea value={bouquet.message} rows="7" onChange={(event) => editMessage(event.target.value)} placeholder="Escreva uma pequena carta…" /></label><p className="bouquet-counter">{count(bouquet.message)} / {MAX_MESSAGE_LENGTH} caracteres</p>
          <Choice label="Papel da carta" value={bouquet.letterPaper} choices={LETTER_PAPERS} onChange={(letterPaper) => change({ letterPaper })} />
          <details className="bouquet-suggestions"><summary>Um começo para sua carta (opcional)</summary><p className="bouquet-help">Escolher uma sugestão substitui o texto acima. Você pode editar cada palavra.</p>{messages.map(([title, text]) => <button key={title} type="button" onClick={() => change({ message: text })}>{title}</button>)}</details>
          <div className="bouquet-actions"><button type="button" onClick={() => { setStep('arrange'); setError(''); }}>Editar buquê</button><button type="button" className="bouquet-primary" onClick={() => go('review')}>Revisar presente</button></div>
        </>}
        {step === 'review' && <>
          <h3>Um último olhar, sem pressa</h3><dl className="bouquet-review-meta">{recipient && <><dt>Para:</dt><dd data-testid="review-recipient">{recipient}</dd></>}<dt>Assunto:</dt><dd data-testid="review-subject">{normalizeSubject(bouquet.subject)}</dd><dt>Mensagem:</dt><dd className="bouquet-review-message">{bouquet.message || 'Sem mensagem — apenas as flores.'}</dd><dt>Presente:</dt><dd>{bouquet.stems.map(nameOf).join(', ')} · {PAPERS.find(({ id }) => id === bouquet.paper)?.label} · laço {RIBBONS.find(({ id }) => id === bouquet.ribbon)?.label.toLowerCase()}.</dd></dl>
          <div className="bouquet-actions"><button type="button" onClick={() => setStep('arrange')}>Editar buquê</button><button type="button" onClick={() => setStep('letter')}>Editar carta</button></div>
          <div className="bouquet-sharing"><h3>Guardar ou presentear</h3><p className="bouquet-help">Você pode salvar sem enviar a ninguém. O cartão contém as flores e a carta; o endereço e o assunto ficam fora da arte.</p><div className="bouquet-actions"><button type="button" disabled={busy} onClick={() => exportGift('bouquet')}>Salvar buquê PNG</button><button type="button" disabled={busy} onClick={() => exportGift('card')}>Salvar cartão PNG</button><button type="button" disabled={busy} onClick={() => exportGift('card-html')}>Salvar cartão HTML</button></div><p className="bouquet-help">O HTML mantém o texto selecionável e todas as linhas, inclusive em cartas com muitas quebras.</p>
            <button type="button" className="bouquet-primary" disabled={busy || emailTooLong} onClick={() => share()}>Abrir meu e-mail</button>
            {emailTooLong && <div className="bouquet-email-alternative"><p className="bouquet-help">Esta carta é longa para preencher automaticamente o e-mail. Salve o cartão completo e anexe-o manualmente. A opção abaixo preenche apenas o destinatário e o assunto; sua carta continua intacta aqui.</p><button type="button" disabled={busy} onClick={() => share(true)}>Abrir e-mail sem a carta no corpo</button></div>}
            <p className="bouquet-help">Seu endereço pessoal poderá aparecer para quem receber. O e-mail é apenas preparado: confira e envie pelo seu aplicativo. Anexe o cartão salvo manualmente; nenhum anexo é incluído automaticamente.</p>
            <p className="bouquet-future">Envio sem revelar seu e-mail: disponível em uma etapa futura, após existir um serviço seguro. Nenhum envio anônimo é feito aqui.</p>
          </div>
        </>}
      </div>
    </div>
    <footer className="bouquet-drafts"><h3>Guardar para outro momento</h3><p>A edição fica nesta sessão, inclusive quando você visita outros ambientes. Para retomar depois de fechar o aplicativo, salve um rascunho.</p><label><input type="checkbox" checked={includeLetter} onChange={(event) => setIncludeLetter(event.target.checked)} /> Guardar também a carta e o assunto</label><p className="bouquet-help">Por padrão, só o arranjo é salvo. O endereço do destinatário nunca entra no rascunho.</p><div className="bouquet-actions"><button type="button" disabled={busy} onClick={saveDraft}>Salvar rascunho</button><button type="button" disabled={busy} onClick={(event) => askConfirmation('restore', event)}>Retomar rascunho</button><button type="button" disabled={busy} onClick={(event) => askConfirmation('delete', event)}>Excluir rascunho salvo</button><button type="button" disabled={busy} onClick={(event) => askConfirmation('clear', event)}>Começar outro buquê</button></div>
      {confirmation && <dialog ref={confirmationRef} className="bouquet-confirm" aria-label="Confirmar alteração do rascunho" onCancel={(event) => { event.preventDefault(); setConfirmation(null); }}><p>{confirmation === 'restore' ? 'Retomar o rascunho salvo substitui a edição atual e limpa o destinatário.' : confirmation === 'delete' ? 'Excluir o rascunho guardado neste dispositivo? Sua edição atual permanece na sessão.' : 'Descartar a edição desta sessão e começar outro buquê? O rascunho salvo permanece guardado.'}</p><div className="bouquet-actions"><button type="button" onClick={() => setConfirmation(null)}>Continuar editando</button><button type="button" onClick={confirmAction}>{confirmation === 'restore' ? 'Confirmar retomada' : confirmation === 'delete' ? 'Confirmar exclusão' : 'Descartar esta edição'}</button></div></dialog>}
    </footer>
  </section>;
}

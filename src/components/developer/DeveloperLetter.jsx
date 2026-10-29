import { useEffect, useId, useRef, useState } from 'react';
import { DEVELOPER_CONTACTS, getDeveloperContactUrl } from '../../../shared/developer.js';
import { DEVELOPER_LETTER as letter } from './developerLetterContent.js';
import Icon from '../Icon.jsx';
import './DeveloperLetter.css';

export function PixelStar() {
  return <svg viewBox="0 0 16 16" width="24" height="24" shapeRendering="crispEdges" aria-hidden="true">
    <path d="M7 1h2v4h2v1h4v3h-3v2h-2v4H6v-4H4V9H1V6h4V5h2Z" fill="#a7804e" />
    <path d="M7 2h2v4h5v2h-3v2H9v3H7v-3H5V8H2V6h5Z" fill="#e5c17e" />
    <path d="M7 4h2v2h2v2H7Z" fill="#fff0bf" />
  </svg>;
}

function LetterArtwork() {
  return <svg className="developer-letter-art" viewBox="0 0 184 55" width="184" height="55" shapeRendering="crispEdges" aria-hidden="true">
    <path d="M53 26h78v24H53z" fill="#c5a779" />
    <path d="m53 26 39-23 39 23-39 21Z" fill="#d5b98b" />
    <path d="M61 10h62v34H61z" fill="#fbefd2" />
    <path d="M69 18h31v2H69zM69 24h46v2H69zM69 30h38v2H69z" fill="#b5ae8c" />
    <path d="m53 28 39 18 39-18v22H53Z" fill="#dfc69c" />
    <path d="m53 49 29-15 10 12 10-12 29 15" fill="#e8d1ac" />
    <path d="M30 25h2v17h-2zM24 32h6v3h-6zM32 28h6v3h-6zM148 31h2v16h-2zM142 38h6v3h-6z" fill="#879775" />
    <path d="M27 19h8v10h-8zM25 21h12v6H25zM145 26h8v9h-8zM143 28h12v5h-12z" fill="#c18d83" />
    <path d="M29 22h4v4h-4zM147 29h4v3h-4zM39 9h2v8h-2zM36 12h8v2h-8zM158 9h2v6h-2zM156 11h6v2h-6z" fill="#c5a36b" />
  </svg>;
}

export default function DeveloperLetter({ onClose }) {
  const dialogRef = useRef(null);
  const closeRef = useRef(null);
  const titleId = useId();
  const [notice, setNotice] = useState('');
  const [emailFallback, setEmailFallback] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog.showModal();
    closeRef.current.focus({ preventScroll: true });
    return () => dialog.close();
  }, []);

  async function openContact(event, id) {
    if (!window.haven) return; // Native anchors serve the local web preview.
    event.preventDefault();
    try {
      if (await window.haven.openDeveloperContact(id)) { setNotice(''); return; }
    } catch { /* Only a generic status is shown; no private application data. */ }
    setEmailFallback(id === 'email');
    setNotice(id === 'email'
      ? 'Não foi possível abrir o aplicativo de e-mail. Você pode copiar o endereço abaixo.'
      : 'Não foi possível abrir o navegador. Você pode tentar novamente.');
  }

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(DEVELOPER_CONTACTS.email);
      setNotice('E-mail copiado.');
    } catch {
      setNotice('Selecione o endereço abaixo para copiá-lo manualmente.');
    }
  }

  function handleKeyDown(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      onClose();
    } else if (event.key === 'Tab') {
      const controls = [...dialogRef.current.querySelectorAll('button, a[href]')];
      const first = controls[0];
      const last = controls.at(-1);
      if (event.shiftKey ? document.activeElement === first : document.activeElement === last) {
        event.preventDefault();
        (event.shiftKey ? last : first)?.focus();
      }
    }
  }

  return <dialog ref={dialogRef} className="developer-letter" aria-labelledby={titleId}
    onKeyDown={handleKeyDown} onCancel={(event) => { event.preventDefault(); onClose(); }}>
    <div className="developer-letter-top">
      <span>UMA CARTA PARA VOCÊ</span>
      <button ref={closeRef} type="button" onClick={onClose} aria-label="Fechar carta" title="Fechar (Esc)"><Icon name="close" size={18} /></button>
    </div>
    <div className="developer-letter-scroll" tabIndex="0" aria-label="Mensagem do André">
      <LetterArtwork />
      <h2 id={titleId}>{letter.title}</h2>
      <p className="developer-letter-greeting">{letter.greeting}</p>
      {letter.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
      <p className="developer-letter-signature">{letter.signature}</p>
      <p className="developer-letter-surprise">{letter.surprise}</p>
      <p className="developer-letter-postscript"><em>{letter.postscript}</em></p>
      <footer className="developer-letter-contacts">
        <p>Let's keep in touch! ♡</p>
        <div>
          <a href={getDeveloperContactUrl('email')} onClick={(event) => openContact(event, 'email')}>
            <svg viewBox="0 0 20 16" width="18" height="16" fill="none" stroke="currentColor" aria-hidden="true"><path d="M1 2h18v12H1zM1 2l9 7 9-7" /></svg>E-mail
          </a>
          <a href={getDeveloperContactUrl('linkedin')} target="_blank" rel="noopener noreferrer" onClick={(event) => openContact(event, 'linkedin')}>
            <svg viewBox="0 0 20 20" width="17" height="17" fill="currentColor" aria-hidden="true"><path d="M2 7h3v11H2zM2 2h3v3H2zM8 7h3v1c3-3 7-1 7 3v7h-3v-7c0-3-4-2-4 0v7H8z" /></svg>LinkedIn<span className="sr-only"> (abre no navegador)</span>
          </a>
        </div>
        {notice && <p className="developer-contact-notice" role="status">{notice}</p>}
        {emailFallback && <div className="developer-email-fallback"><span>{DEVELOPER_CONTACTS.email}</span><button type="button" onClick={copyEmail}>Copiar e-mail</button></div>}
      </footer>
    </div>
  </dialog>;
}

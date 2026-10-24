import { useEffect, useId, useRef, useState } from 'react';
import './JourneyKeepsake.css';

const PAGES = [
  {
    title: 'Luzes ao longe',
    message: 'Uma janela acesa entre as montanhas. Por um instante, duas viagens dividem a mesma noite.',
    detail: 'A paisagem cabe num pequeno retângulo de luz.',
  },
  {
    title: 'Entre as folhas',
    message: 'Os pinheiros passam devagar. Entre um verde e outro, o céu deixa pequenos pedaços de azul.',
    detail: 'O vento desenha caminhos que não ficam no papel.',
  },
  {
    title: 'Água e céu',
    message: 'O lago guarda um pouco da cor do céu. O trem segue, e o reflexo fica mais um instante.',
    detail: 'Na margem, a manhã tem a cor do primeiro sol.',
  },
  {
    title: 'Uma página branca',
    message: 'A neve repousa nos galhos. Pela janela, cada montanha parece uma dobra de papel azul.',
    detail: 'Um floco atravessa a paisagem sem deixar pressa.',
  },
];

function BookLandscape({ page }) {
  return (
    <svg className="journey-book-picture" viewBox="0 0 112 74" shapeRendering="crispEdges" aria-hidden="true">
      <path fill={page === 0 ? '#5b6f82' : page === 3 ? '#b6bfce' : '#a8bcb1'} d="M0 0h112v74H0z" />
      <path fill="#e7cc92" d="M78 13h10v3h3v10h-3v3H78v-3h-3V16h3z" />
      <path fill="#748b87" d="M0 40h9v-7h8v-8h7v-7h8v9h8v9h9v8h14v-9h10v-8h8v-9h8v9h8v9h8v7h7v31H0z" />
      {page === 3 && <path fill="#e5e5d4" d="M17 25h7v-7h8v9h8v9h-8v-5h-8v4h-7zM73 27h8v-9h8v9h8v9h-8v-5h-8v4h-8z" />}
      <path fill="#4d7069" d="M0 49h9v-5h14v4h12v-4h12v6h18v-5h15v3h15v-4h17v30H0z" />
      <path fill="#9aaea0" d="M21 53h70v3H21zM12 60h65v2H12zM43 65h61v2H43z" />
      <path fill="#34564d" d="M0 63h14v-4h11v6h19v-3h17v5h27v-4h24v11H0zM8 36h4v5h4v5h4v5h-7v13h-5V51H1v-5h3v-5h4zM95 41h4v6h4v5h5v5h-8v10h-5V57h-7v-5h3v-5h4z" />
      {page === 0 && <><path fill="#53605a" d="M49 47h17v-6h17v18H49z" /><path fill="#e8c78d" d="M53 49h3v4h-3zM61 49h3v4h-3zM71 45h4v5h-4zM78 45h3v5h-3z" /></>}
      {page === 3 && <path fill="#e5e5d4" d="M8 36h4v5h4v5H4v-5h4zM95 41h4v6h4v5H91v-5h4zM19 8h2v2h-2zM51 16h2v2h-2zM94 8h2v2h-2zM65 34h2v2h-2z" />}
    </svg>
  );
}

export default function JourneyKeepsake({ kind, scenery, onClose }) {
  const dialogRef = useRef(null);
  const [page, setPage] = useState(0);
  const [keyboardLocked, setKeyboardLocked] = useState(false);
  const uniqueId = useId();
  const titleId = `journey-keepsake-title-${uniqueId}`;
  const descriptionId = `journey-keepsake-description-${uniqueId}`;
  const isBook = kind === 'book';
  const entry = PAGES[page];

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog.showModal();
    // The desktop embedder consumes Escape before DOM cancel/keydown events.
    // Only a contextual modal in its existing fullscreen may capture this key.
    const keyboard = window.haven && document.fullscreenElement?.contains(dialog) ? navigator.keyboard : null;
    let disposed = false;
    if (keyboard?.lock) {
      void keyboard.lock(['Escape']).then(() => {
        if (!disposed) setKeyboardLocked(true);
      }).catch(() => {});
    }
    return () => {
      disposed = true;
      keyboard?.unlock();
      dialog.close();
    };
  }, []);

  function closeKeepsake() {
    // Remove modal inertness before the caller restores its SVG object's focus.
    dialogRef.current.close();
    onClose();
  }

  function handleKeyDown(event) {
    if (event.key === 'Escape') {
      // Electron's native input path can deliver Escape without a dialog cancel
      // event. Close here as well, before the fullscreen surface can own it.
      event.preventDefault();
      event.stopPropagation();
      closeKeepsake();
      return;
    }
    if (event.key !== 'Tab') return;
    const buttons = [...dialogRef.current.querySelectorAll('button:not(:disabled)')];
    const first = buttons[0];
    const last = buttons[buttons.length - 1];
    const focused = document.activeElement;
    // Chromium may send Tab past a modal's final control to browser chrome.
    // Wrap both ends explicitly while keeping the middle controls in DOM order.
    if (event.shiftKey ? focused === first : focused === last) {
      event.preventDefault();
      (event.shiftKey ? last : first)?.focus({ preventScroll: true });
    }
  }

  return (
    <dialog
      ref={dialogRef}
      data-keyboard-lock={keyboardLocked}
      className={`journey-keepsake journey-keepsake--${isBook ? 'book' : 'ticket'}`}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onKeyDown={handleKeyDown}
      onCancel={(event) => {
        event.preventDefault();
        closeKeepsake();
      }}
    >
      {isBook ? (
        <>
          <div className="journey-book-spread">
            <div className="journey-book-leaf journey-book-leaf--left">
              <span className="journey-keepsake-overline">ANOTAÇÕES DA JANELA</span>
              <h2 id={titleId}>Pequenas <br />paisagens</h2>
              <BookLandscape page={page} />
              <p className="journey-book-detail">{entry.detail}</p>
            </div>
            <div className="journey-book-leaf journey-book-leaf--right" aria-live="polite" aria-atomic="true">
              <span className="journey-keepsake-overline">{entry.title}</span>
              <p id={descriptionId} className="journey-book-message">{entry.message}</p>
              <span className="journey-book-page-number" aria-label={`Página ${page + 1} de ${PAGES.length}`}>{page + 1} / {PAGES.length}</span>
            </div>
          </div>
          <div className="journey-keepsake-actions">
            <button type="button" onClick={() => setPage((current) => current - 1)} disabled={page === 0} aria-label="Página anterior">← Anterior</button>
            <button type="button" onClick={closeKeepsake} autoFocus>Fechar livro</button>
            <button type="button" onClick={() => setPage((current) => current + 1)} disabled={page === PAGES.length - 1} aria-label="Próxima página">Próxima →</button>
          </div>
        </>
      ) : (
        <>
          <div className="journey-ticket-paper">
            <div className="journey-ticket-main">
              <span className="journey-keepsake-overline">LITTLE HAVEN · THE JOURNEY</span>
              <h2 id={titleId}>Bilhete de viagem</h2>
              <span className="journey-ticket-rule" aria-hidden="true" />
              <p className="journey-ticket-scenery">{scenery.label}</p>
              <p id={descriptionId} className="journey-ticket-description">{scenery.poeticDescription}</p>
              <span className="journey-ticket-note">Uma viagem sem pressa</span>
            </div>
            <div className="journey-ticket-stub" aria-hidden="true">
              <svg viewBox="0 0 32 42" shapeRendering="crispEdges">
                <path fill="#506757" d="M6 2h20v3h3v25h-3v5H6v-5H3V5h3zM8 37h4v5H8zM20 37h4v5h-4z" />
                <path fill="#e4d4ab" d="M8 8h16v11H8zM8 26h4v4H8zM20 26h4v4h-4z" />
                <path fill="#b99f6f" d="M15 8h2v11h-2z" />
              </svg>
              <span>LH</span>
            </div>
          </div>
          <div className="journey-keepsake-actions journey-keepsake-actions--ticket">
            <button type="button" onClick={closeKeepsake} autoFocus>Fechar bilhete</button>
          </div>
        </>
      )}
    </dialog>
  );
}

// Scene controls stay on the original pixel grid and work with keyboard or pointer.
function SceneObject({ label, hint, children, onActivate, ...props }) {
  return (
    <g
      className="journey-object"
      role="button"
      tabIndex="0"
      aria-label={label}
      onClick={onActivate}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          if (!event.repeat) onActivate(event);
        }
      }}
      {...props}
    >
      <title>{hint}</title>
      {children}
    </g>
  );
}

export function JourneyCurtains({ open, onToggle, windowId }) {
  return (
    <SceneObject label="Cortinas da janela" hint={open ? 'Fechar cortinas' : 'Abrir cortinas'} aria-expanded={open} onActivate={onToggle}>
      <g clipPath={`url(#${windowId})`}>
        {[false, true].map((right) => (
          <g key={String(right)} className={`journey-curtain journey-curtain--${right ? 'right' : 'left'}${open ? ' is-open' : ''}`}>
            <path d={`M${right ? 241 : 83} 43h159v113h-4v3h-151v-3h-4z`} fill="#7a6059" />
            {Array.from({ length: 15 }, (_, index) => (
              <g key={index}>
                <path d={`M${(right ? 243 : 85) + index * 10} 46h3v109h-3z`} fill="#947369" />
                <path d={`M${(right ? 249 : 91) + index * 10} 46h2v110h-2z`} fill="#584d4a" />
              </g>
            ))}
            <path d={`M${right ? 241 : 83} 151h159v3h-159z`} fill="#b49a79" />
          </g>
        ))}
        <path d="M83 42h316v3H83z" fill="#475a4f" />
        <path d="M84 43h314v1H84z" fill="#c1b18c" />
      </g>
      {open ? (
        <>
          <rect className="journey-object-hit" x="84" y="45" width="21" height="114" />
          <rect className="journey-object-hit" x="377" y="45" width="21" height="114" />
        </>
      ) : <rect className="journey-object-hit" x="84" y="45" width="314" height="114" />}
    </SceneObject>
  );
}

export function JourneyObjectControls({ objects }) {
  return (
    <>
      <SceneObject label="Luminária de leitura" hint={objects.lampOn ? 'Apagar luminária de leitura' : 'Acender luminária de leitura'} aria-pressed={objects.lampOn} onActivate={objects.toggleLamp}>
        <rect className="journey-object-hit" x="414" y="66" width="40" height="59" />
      </SceneObject>
      <SceneObject label="Preparar chá" hint="Preparar uma xícara de chá quentinho" aria-pressed={objects.teaState !== 'cold'} onActivate={objects.prepareTea}>
        <rect className="journey-object-hit" x="210" y="155" width="31" height="26" />
      </SceneObject>
      <SceneObject label="Abrir livro" hint="Abrir o livro de pequenas paisagens" aria-haspopup="dialog" onActivate={(event) => objects.openKeepsake('book', event)}>
        <g className="journey-book-cover">
          <path d="M160 202h27v2h3v7h-30z" fill="#233f3b" />
          <path d="M161 200h25v2h3v5h-28z" fill="#a27758" />
          <path d="M162 207h26v2h-26z" fill="#e4d6ad" />
          <path d="M161 200h4v7h-4zM169 202h12v1h-12zM172 204h6v1h-6z" fill="#d4b680" />
        </g>
        <rect className="journey-object-hit" x="155" y="196" width="39" height="20" />
      </SceneObject>
      <SceneObject label="Consultar bilhete" hint="Consultar seu bilhete de viagem" aria-haspopup="dialog" onActivate={(event) => objects.openKeepsake('ticket', event)}>
        <rect className="journey-object-hit" x="242" y="160" width="31" height="21" />
      </SceneObject>
    </>
  );
}

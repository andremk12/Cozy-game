import { memo, useEffect, useRef, useState } from 'react';

const clamp = (value) => Math.min(1, Math.max(0, value));

// Each mounted image owns one lease. Only the enlarged viewer requests an
// original; the board never decodes all of the full-resolution photographs.
export function MemoryImage({ memory, imageId, variant = 'thumbnail', alt, ...props }) {
  const [source, setSource] = useState('');
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let mounted = true;
    let acquired = false;
    setSource('');
    setFailed(false);
    Promise.resolve().then(() => memory.imageUrl(imageId, variant)).then((url) => {
      acquired = true;
      if (mounted) setSource(url);
      else memory.releaseImage?.(imageId, variant);
    }).catch(() => { if (mounted) setFailed(true); });
    return () => {
      mounted = false;
      if (acquired) memory.releaseImage?.(imageId, variant);
    };
  }, [imageId, variant, memory.imageUrl, memory.releaseImage]);
  if (failed) return <span className="memory-image-error" role="status">Não foi possível abrir esta imagem.</span>;
  return source ? <img {...props} src={source} alt={alt} draggable="false" onError={() => setFailed(true)} />
    : <span className="memory-image-loading" aria-label="Abrindo imagem…" />;
}

function CornerDetails({ decorations }) {
  return <svg className="memory-room-details" viewBox="0 0 960 620" preserveAspectRatio="none" shapeRendering="crispEdges" aria-hidden="true">
    <defs><pattern id="memory-wall-grain" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M3 4h2v2H3zM21 18h2v2h-2z" fill="currentColor" opacity=".1" /></pattern></defs>
    <path fill="url(#memory-wall-grain)" d="M0 0h960v620H0z" />
    <path fill="#66554e" d="M0 565h960v7H0z" /><path fill="#413e48" d="M0 572h960v48H0z" />
    <path fill="#5a4b47" d="M0 580h960v3H0zM120 583h3v37h-3zM425 583h3v37h-3zM770 583h3v37h-3z" />
    <path fill="#7a6653" d="M51 532h115v13H51zM61 545h8v22h-8zM148 545h8v22h-8z" />
    <path fill="#af8c66" d="M70 510h84v26H70z" /><path fill="#cfb089" d="M65 505h94v7H65z" />
    <path fill="#e8d9b5" d="m82 486 29-3 2 24-29 3z" /><path fill="#64847e" d="m87 489 21-2 1 13-21 2z" />
    <path fill="#927c98" d="M125 495h23v11h-23z" /><path fill="#c3b4bb" d="M130 490h13v5h-13z" />
    <path fill="#59654e" d="M828 517h38v41h-38z" /><path fill="#8a8464" d="M824 511h46v9h-46z" />
    <path fill="#718566" d="M844 509v-24h-11v-9h-10v-9h17v11h10v-25h7v-11h12v15h-8v15h-7v37z" />
    <path fill="#98a47e" d="M846 495h-15v-8h-10v-7h14v8h11zM853 482h15v-9h10v-8h-15v9h-10z" />
    {decorations.lights && <g className="memory-lights"><path d="M57 14h20v3h22v3h30v2h45v2h56v2h73v2h78v1h196v-1h78v-2h73v-2h56v-2h45v-2h30v-3h22V14h20" stroke="#4c4846" strokeWidth="3" fill="none" />
      {[95, 167, 251, 343, 440, 538, 633, 721, 802, 865].map((x, i) => <g key={x} transform={`translate(${x} ${i < 5 ? 23 + i : 27 - (i - 5)})`}><path fill="#8d7452" d="M-3-3h6v5h-6z" /><path className="memory-light-glow" fill="#f4d79d" d="M-4 2h8v9h-8zM-2 11h4v2h-4z" /></g>)}
    </g>}
    {decorations.flowers && <g transform="translate(70 373)"><path stroke="#69785a" strokeWidth="4" d="m0 80 16-59M3 80l-8-43M6 78l27-43" /><path fill="#b49db0" d="M9 15h12v5h5v9H13v-5H8zM23 30h14v5h6v8H29v-5h-6zM-12 29h12v6h6v8H-8v-5h-4z" /><path fill="#d5bc98" d="M12 20h7v6h-7zM29 34h7v6h-7zM-6 34h7v6h-7zM-4 65h22v5H-4z" /></g>}
    {decorations.stars && <g fill="#d7bd85"><path d="M883 164h5v8h8v5h-8v8h-5v-8h-8v-5h8zM49 203h4v5h5v4h-5v5h-4v-5h-5v-4h5zM894 348h4v5h5v4h-5v5h-4v-5h-5v-4h5z" /></g>}
  </svg>;
}

const MemoryCard = memo(function MemoryCard({ item, index, selected, position, memory, writable, onSelect, onOpen, onMove, boardRef, onDrag, onEndDrag }) {
  const pointer = useRef(null);
  const isPhoto = item.kind === 'photo';
  const x = position?.x ?? item.x;
  const y = position?.y ?? item.y;
  const label = `${isPhoto ? 'Fotografia' : 'Bilhete'} ${index + 1}${isPhoto ? item.caption ? `: ${item.caption}` : '' : `: ${item.text.slice(0, 60)}`}`;

  function start(event) {
    if (event.button !== 0) return;
    event.stopPropagation();
    onSelect(item.id);
    if (!writable) return;
    const bounds = boardRef.current.getBoundingClientRect();
    pointer.current = { id: event.pointerId, startX: event.clientX, startY: event.clientY,
      width: Math.max(1, bounds.width - event.currentTarget.offsetWidth), height: Math.max(1, bounds.height - event.currentTarget.offsetHeight),
      x: item.x, y: item.y, moved: false, next: { x: item.x, y: item.y } };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function move(event) {
    const drag = pointer.current;
    if (!drag || event.pointerId !== drag.id) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!drag.moved && Math.hypot(dx, dy) < 5) return;
    drag.moved = true;
    drag.next = { x: clamp(drag.x + dx / drag.width), y: clamp(drag.y + dy / drag.height) };
    onDrag({ id: item.id, ...drag.next });
  }
  function end(event, cancel = false) {
    const drag = pointer.current;
    if (!drag || drag.id !== event.pointerId) return;
    pointer.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (drag.moved && !cancel) onMove(item.id, drag.next.x, drag.next.y);
    onEndDrag();
  }
  function keyboard(event) {
    if (event.key === 'Enter') { event.preventDefault(); onOpen(item.id); return; }
    const delta = event.shiftKey ? .05 : .01;
    const changes = { ArrowLeft: [-delta, 0], ArrowRight: [delta, 0], ArrowUp: [0, -delta], ArrowDown: [0, delta] };
    if (writable && changes[event.key]) {
      event.preventDefault();
      onSelect(item.id);
      const [dx, dy] = changes[event.key];
      onMove(item.id, clamp(item.x + dx), clamp(item.y + dy));
    }
  }
  return <button type="button" className={`memory-card memory-card--${item.kind}${selected ? ' is-selected' : ''}${position ? ' is-dragging' : ''}`}
    data-memory-id={item.id} data-kind={item.kind} data-x={x} data-y={y} data-rotation={item.rotation}
    data-frame={item.frame} data-paper={item.paper} data-paper-style={item.style}
    style={{ left: `${x * 100}%`, top: `${y * 100}%`, '--card-translate-x': `${-x * 100}%`, '--card-translate-y': `${-y * 100}%`, '--card-angle': `${item.rotation}deg`, zIndex: index + 1 }}
    aria-label={label} aria-pressed={selected} aria-describedby="memory-card-help"
    onClick={(event) => { event.stopPropagation(); onSelect(item.id); }}
    onDoubleClick={() => onOpen(item.id)} onKeyDown={keyboard}
    onPointerDown={start} onPointerMove={move} onPointerUp={(event) => end(event)} onPointerCancel={(event) => end(event, true)}>
    <span className="memory-pin" aria-hidden="true" />
    {isPhoto ? <><span className="memory-photo-print"><MemoryImage memory={memory} imageId={item.imageId} alt="" loading="lazy" decoding="async" /></span>
      {item.caption && <span className="memory-card-caption">{item.caption}</span>}</>
      : <><span className="memory-note-text">{item.text}</span><span className="memory-note-corner" aria-hidden="true" /></>}
  </button>;
});

export default function MemoryBoard({ board, memory, selectedId, onSelect, onOpen, onMove, writable }) {
  const boardRef = useRef(null);
  const [drag, setDrag] = useState(null);
  return <div className="memory-room" data-theme={board.theme}>
    <CornerDetails decorations={board.decorations} />
    <div className="memory-board-frame"><div ref={boardRef} className="memory-board" role="group" aria-label="Mural de lembranças"
      onPointerDown={(event) => { if (event.target === event.currentTarget) onSelect(null); }}>
      {board.items.length === 0 && <div className="memory-empty" aria-hidden="true">
        <svg viewBox="0 0 64 54" shapeRendering="crispEdges"><path fill="#ac8866" d="M11 8h44v34H11z" /><path fill="#ece0be" d="M7 5h44v34H7z" /><path fill="#77938a" d="M12 10h34v23H12z" /><path fill="#cfb890" d="M12 27h8v-5h8v-6h6v6h7v4h5v7H12z" /><path fill="#efd5a1" d="M36 13h5v5h-5z" /><path fill="#d3a0a1" d="M23 0h12v9H23z" /></svg>
        <p>Algumas lembranças<br /><strong>merecem um lugar.</strong></p><span>Uma fotografia, um bilhete.<br />O que você quiser manter por perto.</span>
      </div>}
      {board.items.map((item, index) => <MemoryCard key={item.id} item={item} index={index} selected={selectedId === item.id}
        position={drag?.id === item.id ? drag : null} memory={memory} writable={writable} boardRef={boardRef}
        onSelect={onSelect} onOpen={onOpen} onMove={onMove} onDrag={setDrag} onEndDrag={() => setDrag(null)} />)}
    </div></div>
    <div className="memory-room-plaque" aria-hidden="true">a place for what matters</div>
    <p id="memory-card-help" className="sr-only">Clique para selecionar. Pressione Enter ou clique duas vezes para ampliar. As setas movem a lembrança; Shift e setas movem um pouco mais.</p>
  </div>;
}

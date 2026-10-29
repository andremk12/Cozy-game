import { useEffect, useId, useRef, useState } from 'react';

const HIDES = [{ x: 31, y: 129 }, { x: 354, y: 146 }, { x: 427, y: 125 }];

export default function GardenCat({ reducedMotion, paused, ObjectControl, onInteract }) {
  const clipId = `garden-cat-hide-${useId().replaceAll(':', '')}`;
  const [hide] = useState(() => HIDES[Math.floor(Math.random() * HIDES.length)]);
  const [visible, setVisible] = useState(false);
  const [reaction, setReaction] = useState(0);
  const remaining = useRef(5200);
  const currentReaction = useRef(0);
  useEffect(() => {
    if (!visible || paused || reducedMotion) return undefined;
    const started = performance.now();
    const generation = reaction;
    const timer = setTimeout(() => { remaining.current = 5200; setVisible(false); }, remaining.current);
    return () => {
      clearTimeout(timer);
      // A fresh activation owns a fresh duration; an older effect cannot shorten it.
      if (currentReaction.current === generation) remaining.current = Math.max(1, remaining.current - (performance.now() - started));
    };
  }, [visible, paused, reducedMotion, reaction]);
  function activate() {
    remaining.current = 5200;
    currentReaction.current += 1;
    setVisible((current) => reducedMotion ? !current : true);
    setReaction(currentReaction.current);
    onInteract?.('cat');
  }
  return <ObjectControl label="Gato laranja entre as plantas" description={visible ? 'O gato aparece e descansa perto do arbusto.' : 'Orelhas e uma cauda laranja espiam entre as folhas. Ative para chamar o gato.'} onActivate={activate} className="garden-cat-object" data-cat-visible={visible}>
    <g transform={`translate(${hide.x} ${hide.y})`}>
      <defs><clipPath id={clipId}><rect x="-20" y="-29" width="42" height="32" /></clipPath></defs>
      <g clipPath={`url(#${clipId})`}>
      <g key={reaction} className={`garden-cat${visible ? ' is-visible' : ''}`}>
        <g className="garden-cat-tail"><path d="M7-6h8v-4h3v-9h-4v7h-4v2H7z" fill="#d49a62" /><path d="M14-19h4v4h-4zM12-12h4v3h-4z" fill="#a66c47" /></g>
        <path d="M-8-12H6v4h4V1h-21v-8h3z" fill="#cb8c54" /><path d="M-7-8h3v8h-3zM3-9h3v9H3z" fill="#dfaa72" />
        <path d="M-12-19h3v-5h4v4h7v-4h4v5h3v12H6v3H-9v-3h-3z" fill="#dda167" />
        <path d="M-9-21h2v4h-2zM3-21h2v4H3z" fill="#af7562" /><path d="M-10-16h2v4h-2zM5-16h2v4H5zM-4-20h2v4h-2z" fill="#ad6e45" />
        <g className="garden-cat-eyes"><path d="M-8-12h3v1h-3zM1-12h3v1H1z" fill="#3e4b3c" /></g>
        <path d="M-4-9h3v2h-3z" fill="#995b53" /><path d="M-5-6h5v2h-5z" fill="#eed1a0" /><path d="M-14-9h5v1h-5zM5-9h5v1H5z" fill="#e9c998" />
      </g>
      </g>
      <path d="M-16-3h6v-4h7v4h6v-5h7v6h6v5h-32z" fill="#6b8b54" /><path d="M-14-3h5v1h-5zM-1-4h4v2h-4zM10-1h4v1h-4z" fill="#9cad6f" />
      <rect className="garden-object-hit" x="-17" y="-25" width="36" height="30" rx="1" />
    </g>
  </ObjectControl>;
}

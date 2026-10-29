import { useEffect, useRef, useState } from 'react';

function Butterfly({ x, y, index, ObjectControl, onInteract }) {
  const [flight, setFlight] = useState(0);
  return <ObjectControl label={`Borboleta ${index + 1}`} description="Uma pequena borboleta pousa perto das flores. Ative para vê-la mudar de pouso." onActivate={() => { setFlight((value) => value + 1); onInteract?.('butterfly'); }} className="garden-butterfly-object">
    <g transform={`translate(${x} ${y})`}><g key={flight} className={`garden-butterfly garden-butterfly--${index}${flight ? ' is-reacting' : ''}`}><g className="garden-butterfly-wings"><path d="M-1-2h-3v-3h-5v7h3v3h4V1h1zM1-2h3v-3h5v7H6v3H2V1H1z" fill={index ? '#c9b7cf' : '#e6bc81'} /><path d="M-7-4h2v3h-2zM5-4h2v3H5z" fill={index ? '#f1d8db' : '#f5ddb0'} /><path d="M-4 1h2v2h-2zM2 1h2v2H2z" fill={index ? '#9982aa' : '#c88e68'} /></g><path d="M-1-3h2v7h-2zM-2-5h1v2h-1zM1-5h1v2H1z" fill="#4f5843" /></g><rect className="garden-object-hit" x="-13" y="-10" width="26" height="23" /></g>
  </ObjectControl>;
}

export default function GardenWildlife({ atmosphere, paused = false, ObjectControl, onInteract }) {
  const [ripples, setRipples] = useState(0);
  const [sparkle, setSparkle] = useState(0);
  const rippleRemaining = useRef(2200);
  const rippleGeneration = useRef(0);
  // This is a short interaction response, never a wildlife simulation loop.
  useEffect(() => {
    if (!ripples || paused) return undefined;
    const started = performance.now();
    const timer = setTimeout(() => setRipples(0), rippleRemaining.current);
    return () => {
      clearTimeout(timer);
      if (rippleGeneration.current === ripples) rippleRemaining.current = Math.max(1, rippleRemaining.current - (performance.now() - started));
    };
  }, [ripples, paused]);
  function feedFish() {
    rippleRemaining.current = 2200;
    rippleGeneration.current += 1;
    setRipples(rippleGeneration.current);
    onInteract?.('pond');
  }
  return <>
    <ObjectControl label="Lago dos peixinhos" description="Três peixinhos nadam no lago. Ative para oferecer um alimento simbólico e formar pequenas ondas." onActivate={feedFish} className="garden-pond-object">
      <g className={ripples ? 'garden-fish-group is-feeding' : 'garden-fish-group'} key={ripples}>
        {[[366,194,0],[410,218,1],[432,186,2]].map(([x,y,index])=><g key={index} transform={`translate(${x} ${y})`}><g className={`garden-fish garden-fish--${index}`}><path d="M-7-2h3v-2h9v2h3v4H5v2h-9V2h-3v2h-3v-8h3z" fill={index === 1 ? '#d2ba83' : '#cb936f'} opacity=".85" /><path d="M-2-3h5v2h-5zM3 0h2v1H3z" fill={index === 1 ? '#e2d1a2' : '#e5bb90'} /><path d="M5-1h1v1H5z" fill="#425f56" /></g></g>)}
      </g>
      {ripples > 0 && <g key={`ripple-${ripples}`} className="garden-pond-response" aria-hidden="true"><g fill="none" stroke="#c1d7c2" strokeWidth="1"><path className="garden-pond-ring" d="M382 198h14m-18 2h22m-22 2h22m-18 2h14" /><path className="garden-pond-ring garden-pond-ring--late" d="M386 209h8m-12 2h16m-12 2h8" /></g><g className="garden-fish-food" fill="#dfc48b"><path d="M387 193h2v2h-2zM394 196h2v2h-2zM381 199h2v2h-2z" /></g></g>}
      <path className="garden-object-hit" d="M343 175h20v-8h52v7h28v10h15v31h-16v13h-55v6h-30v-8h-22v-35h8z" />
    </ObjectControl>
    {atmosphere !== 'night' && <><Butterfly x={104} y={111} index={0} ObjectControl={ObjectControl} onInteract={onInteract} /><Butterfly x={231} y={115} index={1} ObjectControl={ObjectControl} onInteract={onInteract} /></>}
    {atmosphere === 'night' && <ObjectControl label="Vagalumes do jardim" description="Seis pequenos vagalumes iluminam as folhas. Ative para acompanhar um brilho suave." onActivate={() => { setSparkle((value) => value + 1); onInteract?.('fireflies'); }} className="garden-fireflies-object"><g key={sparkle} className={sparkle ? 'garden-fireflies is-reacting' : 'garden-fireflies'}>{[[85,113],[176,121],[300,100],[351,146],[391,128],[444,145]].map(([x,y],i)=><g key={i} transform={`translate(${x} ${y})`}><g className={`garden-firefly garden-firefly--${i}`}><path d="M-3-1h7v3h-7zM-1-3h3v7h-3z" fill="#cbd38b" opacity=".13" /><path d="M0 0h2v2H0z" fill="#e9df9e" /></g></g>)}</g><rect className="garden-object-hit" x="370" y="119" width="32" height="25" /></ObjectControl>}
  </>;
}

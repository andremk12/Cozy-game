// Twenty original plant silhouettes, drawn on the same logical pixel grid as the garden.
function Stem({ young = false }) {
  return <><path d={young ? 'M-1-2v-15h2V-2z' : 'M-1-2v-26h2V-2z'} fill="#476943" /><path d="M0-7h7v-5h-3v2H0zM-1-12h-7v-5h3v2h4z" fill="#789358" /></>;
}

function Daisy({ stage }) {
  if (stage === 0) return <><path d="M-5-2h10v2H-5z" fill="#b19467" /><path d="M-2-4h4v2h-4z" fill="#e1c595" /></>;
  if (stage === 1) return <><path d="M-1-1v-8h2v8z" fill="#709154" /><path d="M-1-7h-5v-3h4v2h1zM1-5h5v-3H2v1H1z" fill="#a5b87b" /></>;
  if (stage === 2) return <><Stem young /><path d="M-4-20h8v3h-8zM-3-22h6v2h-6z" fill="#d9ddb2" /><path d="M-2-18h4v3h-4z" fill="#98a45f" /></>;
  return <><Stem /><path d="M8-2v-17h2v17zM-9-2v-13h2v13z" fill="#577a49" /><DaisyHead x={0} y={-27} /><DaisyHead x={9} y={-20} small /><DaisyHead x={-8} y={-16} small /><path d="M-1-3h-9v-3h6v-2h3zM2-6h9v-3H7v1H2z" fill="#8fa96a" /></>;
}

function DaisyHead({ x, y, small = false }) {
  return <g transform={`translate(${x} ${y})`}><path d={small ? 'M-2-5h4v3h3v4H2v3h-4V2h-3v-4h3z' : 'M-2-7h4v4h4v2h2v3H4v4H1v-3h-3v3h-3V2h-4v-3h2v-3h5z'} fill="#eee8cc" /><path d="M-2-2h4v4h-4z" fill="#d9af62" /><path d="M-1-2h3v1h-3z" fill="#f1d48a" /></g>;
}

function Lavender({ stage }) {
  if (stage === 0) return <><path d="M-5-2h10v2H-5z" fill="#b19467" /><path d="M-2-4h4v2h-4z" fill="#ad92b2" /></>;
  if (stage === 1) return <><path d="M-1 0v-10h2V0zM-1-5h-5v-2h5zM1-7h5v-2H1z" fill="#829b71" /></>;
  const young = stage === 2;
  return <><path d={young ? 'M-1-1v-21h2v21zM-6-1v-15h2v15zM4-1v-17h2v17z' : 'M-1-1v-32h2v32zM-8-1v-26h2v26zM7-1v-29h2v29zM-14-1v-17h2v17zM13-1v-20h2v20z'} fill="#6f8967" />{(young ? [[0,-22],[-5,-17],[5,-19]] : [[0,-33],[-7,-27],[8,-30],[-13,-18],[14,-21]]).map(([x,y])=><g key={x} transform={`translate(${x} ${y})`}><path d="M-2-3h4v3h1v3h-1v3h-4V3h-1V0h1z" fill="#9480ad" /><path d="M-1-3h2v2h-2zM-2 1h2v2h-2zM0 4h2v2H0z" fill="#c5a9cf" /></g>)}<path d="M-1-4h-10v-2h7v-2h3zM1-7h10v-2H6v-2H1z" fill="#a1ae86" /></>;
}

function Hibiscus({ stage }) {
  if (stage === 0) return <><path d="M-5-2h10v2H-5z" fill="#b19467" /><path d="M-2-4h4v2h-4z" fill="#d79a9c" /></>;
  if (stage === 1) return <><path d="M-1 0v-9h2v9z" fill="#668552" /><path d="M-1-6h-6v-4h3v2h3zM1-4h6v-4H4v2H1z" fill="#85a467" /></>;
  return <><path d="M-1-1v-27h2v27zM-2-11h-8v-3h-3v-4h6v3h5zM1-6h9v-3h4v-4H8v3H1z" fill="#60834e" /><path d="M-11-17h4v2h3v2h-4v-2h-3zM8-12h5v2h-5z" fill="#92ad70" />{stage === 2 ? <><path d="M-3-29h6v7h-6zM-1-32h2v3h-2z" fill="#bf7b91" /><path d="M-2-24h5v3h-5z" fill="#78915c" /></> : <><path d="M-4-34h8v4h3v5H2v4h-6v-5h-4v-5h4z" fill="#dc91a4" /><path d="M-13-30h7v4h4v6h-7v-3h-4zM5-29h7v3h3v6H7v-3H3zM-8-21h7v3h3v5h-8v-3h-4zM2-22h7v4h3v5H5v-3H1z" fill="#d3859b" /><path d="M-4-26h7v6h-7z" fill="#a65f80" /><path d="M-1-25h2v-8h2v-2h2v3H3v7z" fill="#efd09a" /><path d="M-10-28h4v1h-4zM8-26h4v1H8zM-4-17h4v1h-4z" fill="#e8a8b5" /></>}</>;
}

function Fern({ stage }) {
  if (stage === 0) return <><path d="M-5-2h10v2H-5z" fill="#b19467" /><path d="M-2-4h4v2h-4z" fill="#b3b57f" /></>;
  if (stage === 1) return <><path d="M-1 0v-7h2v-5h-3v2h1v3h-2v7z" fill="#86a56c" /><path d="M3-2v-6h3v3H5v3z" fill="#a0b57c" /></>;
  return <><path d={stage === 2 ? 'M-1-1v-21h2v21zM-4-17h8v2h-8zM-5-12h10v2H-5zM-5-7h10v2H-5z' : 'M-1-1v-29h2v29zM-3-26h6v2h-6zM-5-22H5v2H-5zM-6-17H6v2H-6zM-5-12H5v2H-5z'} fill="#91ab70" />{[-1,1].map((side)=><g key={side} transform={`scale(${side} 1)`}><path d="M1-2v-5h4v-5h5v-5h5v-3h5v3h-4v5h-5v5H7v5z" fill="#729659" /><path d="M4-9H1v-3h4v-3h3v3H6v4H4zM9-14H6v-3h4v-3h3v3h-2v4H9zM15-18h-3v-3h5v-2h3v3h-4v4h-1z" fill="#a5ba7d" />{stage === 3 && <><path d="M1-2v-3h6v-4h7v-4h6v-2h5v3h-4v4h-7v4H8v3z" fill="#5f864f" /><path d="M7-6H4v-3h4v-3h3v3H9v4H7zM14-10h-3v-3h5v-3h3v4h-3v4h-2zM21-13h-3v-3h5v-2h3v4h-4v3h-1z" fill="#8ca96b" /></>}</g>)}<path d="M-7-4h14v3H-7zM-3-7h6v3h-6z" fill="#61834e" /></>;
}

function Succulent({ stage }) {
  if (stage === 0) return <><path d="M-5-2h10v2H-5z" fill="#b19467" /><path d="M-2-4h4v2h-4z" fill="#b2c1a0" /></>;
  if (stage === 1) return <><path d="M-4-5h4v5h-4zM1-7h4v6H1zM-2-9h4v7h-4z" fill="#91ac8b" /><path d="M-1-8h2v3h-2z" fill="#c0cba8" /></>;
  return <>{stage === 3 && <><path d="M-17-11h7v3h6v6h-9v-3h-4zM10-13h7v8h-4v3H5v-6h5zM-11-19h7v9h-4v-4h-3zM5-20h6v7H8v5H3v-8h2z" fill="#789e8b" /><path d="M-15-10h5v2h-5zM11-12h4v2h-4zM6-19h3v3H6z" fill="#aec1a0" /></>}<path d="M-9-12h6v4h4v6h-7v-3h-3zM4-14h6v8H6v4H0v-7h4z" fill="#9bb89b" /><path d="M-3-19h6v5h3v6H2v5h-4v-5h-3v-6h2z" fill="#b0c4a2" /><path d="M-1-18h2v8h-2zM-7-11h3v2h-3zM5-12h3v2H5z" fill="#d0d6b0" /><path d="M-3-4h6v3h-6z" fill="#698d76" /></>;
}

export default function GardenPlant({ species, stage = 0, effect }) {
  const Sprite = { daisy: Daisy, lavender: Lavender, hibiscus: Hibiscus, fern: Fern, succulent: Succulent }[species] || Daisy;
  return <g className={`garden-plant${effect ? ` is-${effect.kind}` : ''}`} data-species={species} data-stage={stage}><g key={effect?.key ?? 'rest'} className={effect ? `garden-plant-response garden-plant-response--${effect.kind}` : undefined}><Sprite stage={stage} /></g></g>;
}

export function GardenPot({ style = 'terracotta' }) {
  return style === 'wood' ? <g><path d="M-13-12h26V0h-26z" fill="#80664d" /><path d="M-14-13h28v4h-28z" fill="#b69a6b" /><path d="M-11-8h22v7h-22z" fill="#967c56" /><path d="M-7-8h1v7h-1zM1-8h1v7H1zM8-8h1v7H8z" fill="#6b5b47" /><path d="M-11-12h22v2h-22z" fill="#453f32" /></g> : <g><path d="M-12-12h24v5h-2v7h-20v-7h-2z" fill="#b87959" /><path d="M-14-14h28v5h-28z" fill="#ce926a" /><path d="M-11-13h22v3h-22z" fill="#63513b" /><path d="M-9-8h3v7h-3zM-7-9h14v1H-7z" fill="#dfab7c" /><path d="M8-8h2v7H8zM-9-1H9v1H-9z" fill="#895d47" /></g>;
}

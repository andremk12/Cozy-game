// Original modular plants, drawn on the same logical pixel grid as the garden.
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

const flowerColors = {
  sunflower: '#e7b758', 'rose-red': '#bf5861', 'rose-pink': '#df96ae', tulip: '#e0a77d',
  hydrangea: '#91a1ce', peony: '#e6b7be', dahlia: '#c88caa', wildflower: '#a1b4d4', cosmos: '#d296b6',
};

function RoseHead({ pink }) {
  return <g transform="translate(0 -28)"><path d="M-5-8H5v2h3v3h2v6H7v4H-6V4h-4v-7h2v-3h3z" fill={pink ? '#b66f90' : '#914b59'} />
    <path d="M-5-7h9v2h3v4H3v5h-8V1h-3v-4h3zM-3 5h9v-5h3v5H6v2h-9z" fill={pink ? '#df96ae' : '#bf5861'} />
    <path d="M-4-5h7v2h2v3H1v-2h-3v4h-3v-5h1zM-1 3h5v2h-5z" fill={pink ? '#f1bfd0' : '#df8990'} />
    <path d="M-2-2h4v3h-4z" fill={pink ? '#a96686' : '#894452'} /></g>;
}

function ClusterFloret({ x, y, color, highlight }) {
  return <g transform={`translate(${x} ${y})`}><path d="M-1-4h3v2h2v3H2v3h-3V2h-3v-3h2v-2h1z" fill={color} />
    <path d="M-1-3h2v2h-2zM-3 0h2v2h-2z" fill={highlight} /><path d="M0 0h1v1H0z" fill="#eee0b5" /></g>;
}

function FlowerHead({ species }) {
  if (species === 'rose-red' || species === 'rose-pink') return <RoseHead pink={species === 'rose-pink'} />;
  if (species === 'sunflower') return <g transform="translate(0 -28)">
    <path d="M-3-12h6v5h3v-3h4v6h-3v2h5v6H7v3h3v4H4V7H2v5h-5V7h-3v3h-4V4h3V2h-5v-5h5v-3h-3v-4h6v3h1z" fill="#d59b43" />
    <path d="M-2-11h3v5h-3zM5-8h3v4H5zM7-1h4v3H7zM4 5h4v3H4zM-2 7h3v4h-3zM-8 4h3v4h-3zM-11-2h4v3h-4zM-8-8h4v3h-4z" fill="#efd07b" />
    <path d="M-4-6h8v2h2v8H4v2h-8V4h-2v-8h2z" fill="#775340" /><path d="M-3-4h5v2h-5zM-4-1h2v3h-2zM0 1h2v2H0zM3-1h1v2H3z" fill="#aa7950" />
  </g>;
  if (species === 'tulip') return <g><path d="M-8-10h3v4h3v5h-3v-3h-3zM3-4v-8h3v-5h2v12H6v4H3z" fill="#8da668" />
    <path d="M-8-34h3v3h3v-4h4v4h3v-3h3v12H6v3H3v2h-6v-2h-3v-3h-2z" fill="#d28c6e" />
    <path d="M-5-31h3v-4h4v4h3v9H3v3h-5v-3h-3z" fill="#efbc91" /><path d="M0-32h2v11H0zM6-29h2v6H6z" fill="#f5d0a5" /></g>;
  if (species === 'hydrangea') return <g><path d="M-1-9h-10v-4h-3v-4h5v2h5v3h3zM1-7h10v-3h3v-4H8v3H1z" fill="#6c9270" />
    <g transform="translate(0 -28)"><path d="M-7-8H6v3h5v11H6v3H-8V5h-4V-4h5z" fill="#7887b3" />
      {[[-5,-5],[3,-6],[-9,1],[-2,0],[7,0],[-5,6],[3,6]].map(([x,y], index) => <ClusterFloret key={index} x={x} y={y} color={index % 2 ? '#9ca8d4' : '#a5a0cd'} highlight="#ccc7e5" />)}
    </g></g>;
  if (species === 'peony') return <g transform="translate(0 -26)">
    <path d="M-8-9h4v-3h7v3h5v3h4v9H8v4H4v2h-8V7h-5V3h-4v-9h5z" fill="#c48f9f" />
    <path d="M-7-8h5v-3h5v4h4v-1h3v8H8v5H4v2h-8V5h-4V1h-3v-6h4z" fill="#e4b0bc" />
    <path d="M-4-7h5v3h4v-2h3v5H5v4H2v3h-5V2h-4v-5h3z" fill="#f2cbd0" />
    <path d="M-2-4h4v2h3v3H1v2h-3V0h-2v-2h2z" fill="#d39baa" /><path d="M-1-2h2v3h-2z" fill="#f6d8d3" />
  </g>;
  if (species === 'dahlia') return <g transform="translate(0 -27)">
    <path d="M-2-12h4v6h2v-4h4v3h3v4H6v2h7v4H6v2h5v4H7v3H3V6H1v7h-4V6h-2v5h-4V7h-3V3h6V1h-7v-4h7v-2h-5v-4h4v-3h4v6h2z" fill="#a3678e" />
    <path d="M-1-10h2v6h2v-3h4v4H4v2h6v2H4v2h3v4H3V4H1v6h-2V4h-2v3h-4V3h3V1h-6v-2h6v-2h-3v-4h4v3h2z" fill="#d299b5" />
    <path d="M-2-5h4v3h3v4H2v3h-4V2h-3v-4h3z" fill="#efc3cf" /><path d="M-2-2h4v4h-4z" fill="#d5ad77" />
  </g>;
  if (species === 'wildflower') return <g><path d="M-9-3v-18h2v18zM8-2v-17h2v17zM-8-15h-4v-2h4zM9-10h4v-2H9z" fill="#718f68" />
    <ClusterFloret x={-8} y={-22} color="#e8dfbf" highlight="#faf0d1" /><ClusterFloret x={0} y={-30} color="#94abc8" highlight="#c0d2e1" />
    <ClusterFloret x={9} y={-19} color="#bba9d0" highlight="#d8c9df" /><path d="M-3-31h2v3h-2zM-9-23h2v2h-2zM8-20h2v2H8z" fill="#d9b06b" /></g>;
  return <g transform="translate(0 -27)"><path d="M-3-10h6v6h3v-4h4v6H4v3h6v5H4V2H2v8h-5V3h-3v5h-4V2h6V0h-6v-5h6v3h2z" fill="#bc7f9f" />
    <path d="M-2-9h4v5h-4zM6-6h3v3H6zM5 2h4v3H5zM-2 4h3v5h-3zM-9 3h3v4h-3zM-9-4h4v3h-4z" fill="#e2afc8" />
    <path d="M-3-3h6v6h-6z" fill="#d6ae65" /><path d="M-2-2h3v2h-3z" fill="#f0d28b" /></g>;
}

function NewFlower({ species, stage }) {
  const color = flowerColors[species];
  if (stage === 0) return <><path d="M-5-2h10v2H-5z" fill="#b19467" /><path d="M-2-4h4v2h-4z" fill={color} /></>;
  if (stage === 1) return <><path d="M-1 0v-9h2v9z" fill="#668552" /><path d="M-1-7h-5v-3h3v1h2zM1-5h5v-3H3v1H1z" fill="#9ab276" /></>;
  if (stage === 2) return <><Stem young /><path d="M-3-22h6v6h-6zM-1-24h2v2h-2z" fill={color} /><path d="M-3-17h6v2h-6z" fill="#779362" /></>;
  return <><Stem /><FlowerHead species={species} /></>;
}

// A replaceable visual boundary for arrangements. The base is always (0, 0);
// callers place stems without knowing how the bloom is drawn or which asset it uses.
export function FlowerStem({ species }) {
  if (species === 'daisy') return <g data-flower={species}><Stem /><DaisyHead x={0} y={-27} /></g>;
  if (species === 'lavender') return <g data-flower={species}><Lavender stage={3} /></g>;
  if (species === 'hibiscus') return <g data-flower={species}><Hibiscus stage={3} /></g>;
  if (!Object.hasOwn(flowerColors, species)) return null;
  return <g data-flower={species}><NewFlower species={species} stage={3} /></g>;
}

export default function GardenPlant({ species, stage = 0, effect }) {
  const Sprite = { daisy: Daisy, lavender: Lavender, hibiscus: Hibiscus, fern: Fern, succulent: Succulent }[species];
  return <g className={`garden-plant${effect ? ` is-${effect.kind}` : ''}`} data-species={species} data-stage={stage}><g key={effect?.key ?? 'rest'} className={effect ? `garden-plant-response garden-plant-response--${effect.kind}` : undefined}>{Sprite ? <Sprite stage={stage} /> : Object.hasOwn(flowerColors, species) ? <NewFlower species={species} stage={stage} /> : <Daisy stage={stage} />}</g></g>;
}

export function GardenPot({ style = 'terracotta' }) {
  return style === 'wood' ? <g><path d="M-13-12h26V0h-26z" fill="#80664d" /><path d="M-14-13h28v4h-28z" fill="#b69a6b" /><path d="M-11-8h22v7h-22z" fill="#967c56" /><path d="M-7-8h1v7h-1zM1-8h1v7H1zM8-8h1v7H8z" fill="#6b5b47" /><path d="M-11-12h22v2h-22z" fill="#453f32" /></g> : <g><path d="M-12-12h24v5h-2v7h-20v-7h-2z" fill="#b87959" /><path d="M-14-14h28v5h-28z" fill="#ce926a" /><path d="M-11-13h22v3h-22z" fill="#63513b" /><path d="M-9-8h3v7h-3zM-7-9h14v1H-7z" fill="#dfab7c" /><path d="M8-8h2v7H8zM-9-1H9v1H-9z" fill="#895d47" /></g>;
}

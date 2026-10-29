// Original little cat, drawn in whole logical pixels. The origin is between
// its feet: x −18…18 and y −28…0, with a lower silhouette when resting.
const PALETTES = {
  default: { fur: '#d6d0b8', shade: '#8a9d98', light: '#f0e5c9', stripe: '#718b86', edge: '#495e58', ear: '#be9790' },
  ginger: { fur: '#d6a06c', shade: '#a87350', light: '#f0cf9d', stripe: '#a56846', edge: '#685b47', ear: '#c28d7c' },
  midnight: { fur: '#697d86', shade: '#485e6c', light: '#afbbb4', stripe: '#3d5361', edge: '#33484d', ear: '#ad929e' },
};

function Face({ palette: p, closed = false, looking = false, side = false }) {
  return <g className="companion-face">
    <path d="M-8-24h3v-4h3v4h6v-4h3v4h3v13H7v3H-5v-3h-3z" fill={p.edge} />
    <path d="M-7-23h3v-3h1v4h8v-4h1v3h3v11H6v3H-4v-3h-3z" fill={p.fur} />
    <path d="M-5-25h1v4h-1zM6-25h1v4H6z" fill={p.ear} />
    <path d="M-2-23h2v3h-2zM2-23h2v3H2z" fill={p.stripe} />
    <path d="M-6-13h3v3H2v-1h5v-2H3v-2h-5v2z" fill={p.light} />
    <g className={closed ? 'companion-eyes is-closed' : 'companion-eyes'} fill={p.edge}>
      {closed ? <path d="M-5-16h3v1h-3zM3-16h3v1H3z" />
        : <path d={looking ? 'M-5-18h2v2h-2zM3-18h2v2H3z' : side ? 'M-4-17h2v2h-2zM4-17h2v2H4z' : 'M-5-17h2v2h-2zM3-17h2v2H3z'} />}
    </g>
    <path d="M-1-14h3v1h-3zM0-13h1v1H0z" fill="#a77375" />
    <path d="M-10-14h4v1h-4zM7-14h5v1H7z" fill={p.light} />
  </g>;
}

function Resting({ palette: p, sleeping }) {
  return <>
    <g className="companion-tail"><path d="M-12-11h-5v3h-2v7h21v-3h-17v-3h4z" fill={p.shade} /><path d="M-16-6h2v3h-2zM-9-3h7v1h-7z" fill={p.light} /></g>
    <path d="M-12-13h4v-3H4v2h7v3h3v8H-13v-3h-2v-4h3z" fill={p.edge} />
    <path d="M-11-12h4v-3H3v2h7v3h3v6h-25v-3h-2v-3h3z" fill={p.fur} />
    <path d="M-8-13h2v5h-2zM-2-14h2v5h-2zM5-11h2v4H5z" fill={p.stripe} />
    <path d="M-9-4h14v2H-9zM-10-6h4v2h-4z" fill={p.light} />
    <g transform={`translate(7 ${sleeping ? 9 : 6})`}><Face palette={p} closed={sleeping} side /></g>
  </>;
}

export default function CompanionSprite({ pose = 'idle', appearance = 'default', airborne = false, breathingClassName = '' }) {
  const p = PALETTES[appearance] || PALETTES.default;
  const resting = pose === 'sleeping' || pose === 'lying';
  const stretching = pose === 'stretching';
  const standing = pose === 'idle' || pose === 'walking';
  const affectionate = pose === 'petting';
  return <g className={`companion-sprite companion-pose--${pose}${airborne ? ' is-airborne' : ''}`} aria-hidden="true">
    <path className="companion-shadow" d="M-15 0h31v2h-31zM-10-1h20v1h-20z" fill="#263d36" opacity=".22" />
    <g className={`companion-breathe ${breathingClassName}`}>
      {resting ? <Resting palette={p} sleeping={pose === 'sleeping'} /> : stretching ? <>
        <g className="companion-tail"><path d="M-14-11h-4v-8h2v5h3v5h-1z" fill={p.shade} /><path d="M-18-20h2v3h-2z" fill={p.light} /></g>
        <path d="M-13-18h8v3h8v3h8v3h5v8h-6v-4H1v-3H-7v7h-7v-9h-2v-5h3z" fill={p.edge} />
        <path d="M-12-17h6v3h8v3h8v3h5v6h-4v-4H0v-3h-8v7h-5v-9h-2v-3h3z" fill={p.fur} />
        <path d="M-10-16h2v5h-2zM-5-13h2v5h-2zM1-10h3v3H1z" fill={p.stripe} />
        <g transform="translate(10 11)"><Face palette={p} closed /></g>
        <path d="M10-2h8v2h-8zM-14-2h7v2h-7z" fill={p.light} />
      </> : standing ? <>
        <g className="companion-tail"><path d="M-12-12h-4v-6h-3v-7h3v6h3v5h3z" fill={p.shade} /><path d="M-18-25h2v3h-2z" fill={p.light} /></g>
        <path d="M-12-18H8v3h6v11H8v3H-12v-3h-3v-11h3z" fill={p.edge} />
        <path d="M-11-17H7v3h6v9H7v3h-18v-3h-3v-9h3z" fill={p.fur} />
        <path d="M-8-16h2v6h-2zM-2-16h2v5h-2zM4-14h2v4H4z" fill={p.stripe} />
        <path d="M-8-5H8v3H-8z" fill={p.light} />
        <g transform="translate(8 1)"><Face palette={p} side /></g>
        <g className="companion-paws companion-paws--front"><path d="M5-6h4v6H5zM-10-6h4v6h-4z" fill={p.light} /></g>
        <g className="companion-paws companion-paws--back"><path d="M9-5h3v5H9zM-5-5h3v5h-3z" fill={p.shade} /></g>
      </> : <>
        <g className="companion-tail"><path d="M7-8h7v-3h2v-8h-3v6h-3v2H7zM3-3h10v3H3z" fill={p.shade} /><path d="M13-19h3v3h-3zM9-2h4v1H9z" fill={p.light} /></g>
        <path d="M-7-16H7v5h3v9H7v2H-9v-2h-3v-7h3v-4h2z" fill={p.edge} />
        <path d="M-6-15H6v5h3v7H6v2H-8v-2h-3v-5h3v-4h2z" fill={p.fur} />
        <path d="M-2-13h5v10h-5zM-8-3h6v2h-6zM3-3h5v2H3z" fill={p.light} />
        <path d="M-9-9h2v3h-2zM6-10h2v3H6z" fill={p.stripe} />
        <g className="companion-looking-head" transform={pose === 'looking' ? 'translate(0 -1)' : undefined}><Face palette={p} closed={affectionate} looking={pose === 'looking'} /></g>
      </>}
    </g>
    {affectionate && <g className="companion-affection" fill="#e8c59f"><path d="M-15-26h1v5h-1zM-17-24h5v1h-5zM14-28h1v5h-1zM12-26h5v1h-5z" /></g>}
  </g>;
}

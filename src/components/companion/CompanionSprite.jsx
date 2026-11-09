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

function ChefAccessories({ palette: p, pose, action, celebrate }) {
  const resting = pose === 'sleeping' || pose === 'lying';
  const head = resting ? 'translate(7 9)' : pose === 'walking' || pose === 'idle' ? 'translate(8 1)'
    : pose === 'stretching' ? 'translate(10 11)' : pose === 'looking' ? 'translate(0 -1)' : undefined;
  return <g className={`companion-chef${celebrate ? ' is-presenting' : ''}`}>
    <path d={resting ? 'M-9-9H1v6H-9zM-8-11h2v3h-2z' : 'M-7-8H7v7H-7zM-5-10h2v3h-2zM3-10h2v3H3z'} fill="#e6deba" />
    <path d={resting ? 'M-7-7h6v1h-6z' : 'M-6-5H6v1H-6zM-2-3h4v2h-4z'} fill="#a5b5a0" />
    <g transform={head}>
      <path d="M-8-26v-5h-2v-4h3v-3h5v2h5v-2h5v3h3v4H9v5z" fill="#686c59" />
      <path d="M-7-27v-5h-2v-2h3v-3h3v3h7v-3h3v3h3v2H8v5z" fill="#f0e7c9" />
      <path d="M-7-29H8v2H-7zM-5-34h2v3h-2zM4-34h2v3H4z" fill="#c7c8ab" />
    </g>
    {(action === 'mixing' || action === 'stirring') && <>
      <path d="M9-7h17v3h-2v4H12v-3H9z" fill={action === 'mixing' ? '#a48268' : '#697d76'} />
      <path d="M10-7h15v2H10zM13-4h10v2H13z" fill={action === 'mixing' ? '#e0c993' : '#b2b7a1'} />
      <g key={action} className="companion-kitchen-work companion-chef-spoon">
        <path d="M15-18h2v12h-2zM14-20h4v4h-4z" fill="#b6986a" />
        <path d="M8-11h8v3H8z" fill={p.fur} /><path d="M13-11h3v3h-3z" fill={p.light} />
      </g>
    </>}
    {action === 'icing' && <g key={action} className="companion-kitchen-work companion-chef-spatula">
      <path d="M8-12h9v3H8z" fill={p.fur} /><path d="M15-18h2v12h-2z" fill="#b6986a" />
      <path d="M13-21h6v6h-6z" fill="#b5b7a3" /><path d="M13-19h6v4h-6z" fill="#6b483a" />
    </g>}
    {action === 'reading' && <g className="companion-chef-book">
      <path d="M6-8h9l3 2 3-2h9v9h-9l-3 2-3-2H6z" fill="#786650" />
      <path d="M7-7h8l2 2v6l-2-1H7zM19-5l2-2h8v7h-8l-2 1z" fill="#e1d6ad" />
      <path d="M9-5h5v1H9zM22-4h5v1h-5zM9-2h4v1H9z" fill="#a99b79" />
    </g>}
    {action === 'baking' && <path d="M7-9h6v3H7zM12-10h3v5h-3z" fill={p.light} />}
    {action === 'presenting' && <g className="companion-chef-present">
      <path d="M7-10h7v3h6v3h-9v-2H7z" fill={p.fur} /><path d="M16-7h4v3h-4z" fill={p.light} />
    </g>}
  </g>;
}

export default function CompanionSprite({ pose = 'idle', appearance = 'default', airborne = false, breathingClassName = '',
  chef = false, kitchenAction, celebrate = false }) {
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
      {chef && <ChefAccessories palette={p} pose={pose} action={kitchenAction} celebrate={celebrate} />}
    </g>
    {affectionate && <g className="companion-affection" fill="#e8c59f"><path d="M-15-26h1v5h-1zM-17-24h5v1h-5zM14-28h1v5h-1zM12-26h5v1h-5z" /></g>}
  </g>;
}

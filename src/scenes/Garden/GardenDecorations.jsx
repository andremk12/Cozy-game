function Bench() {
  return <g><path d="M-27-3h54v5h-54z" fill="#314e3d" opacity=".3" /><path d="M-24-28h48v5h-48zM-24-21h48v5h-48z" fill="#b09569" /><path d="M-25-28h50v2h-50zM-25-21h50v2h-50z" fill="#d0b07b" /><path d="M-21-30h3V0h-3zM18-30h3V0h-3z" fill="#5a6650" /><path d="M-28-14h56v5h-56z" fill="#b5976b" /><path d="M-28-14h56v2h-56z" fill="#ddbd89" /><path d="M-25-9h4V1h-4zM21-9h4V1h-4zM-28-18h3v9h-3zM25-18h3v9h-3z" fill="#63705a" /><path d="M-15-27h1v3h-1zM8-20h1v3H8zM-8-13h14v1H-8z" fill="#8d7859" /></g>;
}

function Lantern({ lit }) {
  return <g>{lit && <g className="garden-lantern-glow" fill="#f0cb83"><path d="M-11-30h22v24h-22z" opacity=".09" /><path d="M-17-6h34v4h-34zM-12-9h24v3h-24z" opacity=".11" /></g>}<path d="M-2-37h4v37h-4zM-8-36h10v2H-8zM-9-35h2v5h-2z" fill="#515c49" /><path d="M-13-30h13v3h-13zM-12-27h11v13h-11zM-14-14H1v3h-15z" fill="#5b5d45" /><path className="garden-lantern-glass" d="M-10-26h7v10h-7z" fill={lit ? '#edc078' : '#a4a283'} /><path d="M-9-25h3v8h-3z" fill={lit ? '#f4dc9a' : '#c0b991'} /><path d="M-7-27h1v12h-1zM-13-30h13v1h-13zM-3-37h6v2h-6z" fill="#8e8c64" /><path d="M-6-2H6v2H-6z" fill="#444f3e" /></g>;
}

function Stones() {
  return <g><path d="M-14-4h5v-5h14v3h7v3h3v4h-29z" fill="#879085" /><path d="M-9-8H4v2h7v3H-8v2h-5v-3h4z" fill="#b5b6a0" /><path d="M-7-6h6v1h-6zM5-3h4v1H5z" fill="#d0cbb2" /><path d="M-14-1h29v2h-29zM-5-3h2v3h-2z" fill="#67776b" /><path d="M-17 0h3v-3h2v3h5v2h-10zM11 1h7v-3h1v4h-8z" fill="#668652" /></g>;
}

function Mushrooms() {
  return <g><path d="M-6-11h4v12h-4zM6-7h3v8H6z" fill="#dbccaa" /><path d="M-14-11h3v-5h12v3h4v5h-19z" fill="#b57561" /><path d="M-11-16H0v2h-11zM-12-13h4v2h-4zM-3-15h3v2h-3z" fill="#e4ba94" /><path d="M1-7h2v-4h10v3h3v3H1z" fill="#bf8f69" /><path d="M4-10h4v2H4zM11-8h3v1h-3z" fill="#edd3a6" /><path d="M-10 0H1v2h-11zM4 0h9v2H4z" fill="#5a7851" /></g>;
}

export default function GardenDecoration({ decoration }) {
  if (!decoration) return <g className="garden-empty-decoration"><path d="M-5-3H5v1H-5zM-1-7h2v9h-2z" fill="#ccd3a3" opacity=".65" /></g>;
  if (decoration.kind === 'bench') return <Bench />;
  if (decoration.kind === 'lantern') return <Lantern lit={decoration.lit !== false} />;
  if (decoration.kind === 'mushroom') return <Mushrooms />;
  return <Stones />;
}

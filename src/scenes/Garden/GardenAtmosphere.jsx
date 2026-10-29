export default function GardenAtmosphere({ atmosphere, weather, rainId }) {
  return <g pointerEvents="none" aria-hidden="true">
    {atmosphere === 'sunset' && <path d="M0 0h480v270H0z" fill="#d9a080" opacity=".08" />}
    {atmosphere === 'night' && <path d="M0 0h480v270H0z" fill="#1d294b" opacity=".24" />}
    {weather === 'rain' && <g className="garden-rain"><path d="M0 0h480v270H0z" fill="#5e7e85" opacity=".14" /><g className="garden-rainfall"><rect x="0" y="-48" width="480" height="366" fill={`url(#${rainId})`} /></g><g className="garden-rain-ripples" fill="none" stroke="#b8d0c0" strokeWidth="1" opacity=".32"><path d="M358 197h10m-12 2h14M413 211h8m-11 2h14M393 181h8m-10 2h12" /></g></g>}
  </g>;
}

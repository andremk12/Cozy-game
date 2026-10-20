// Original pixel artwork. Each landscape layer repeats after exactly 320 logical pixels.
// Two identical tiles cover the window throughout the horizontal animation.
const PALETTES = {
  'rainy-night': {
    sky: ['#293d50', '#344d60', '#435e6b'],
    cloud: '#788b94',
    far: '#4c666e',
    ridge: '#38535c',
    trees: '#2b484d',
    leaves: '#34575a',
    ground: '#233e40',
    grass: '#3c5953',
  },
  forest: {
    sky: ['#a5bbb0', '#b8c8b2', '#d4d5af'],
    cloud: '#e2dfbd',
    far: '#8baf99',
    ridge: '#6b927e',
    trees: '#456f60',
    leaves: '#659173',
    ground: '#35594b',
    grass: '#7d9a6c',
  },
  sunset: {
    sky: ['#a77c8b', '#cd9390', '#e9b68b'],
    cloud: '#f2c6a1',
    far: '#a18891',
    ridge: '#797d85',
    trees: '#5b686d',
    leaves: '#798578',
    ground: '#425b57',
    grass: '#9a9d79',
  },
};

function RepeatingLayer({ name, children }) {
  return (
    <g className={`journey-parallax journey-parallax--${name}`}>
      <g>{children}</g>
      <g transform="translate(320 0)">{children}</g>
    </g>
  );
}

function Pine({ x, y, size = 1, color, highlight }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${size})`}>
      <path d="M-1 0h3v39h-3z" fill={color} />
      <path d="M-2 0h4v5h4v6h4v6h4v6h5v7h-37v-7h5v-6h4v-6h4V5h3z" fill={color} />
      <path d="M-2 5h3v6h-4v6h-4v6h-6v3h-3v-3h5v-6h4v-6h4z" fill={highlight} />
    </g>
  );
}

function Cottage({ x, y, night }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M0 8h24v17H0z" fill={night ? '#304c52' : '#bfa58c'} />
      <path d="M-3 8h4V4h5V0h12v4h5v4h4v3H-3z" fill={night ? '#243e47' : '#6a6d6c'} />
      <path d="M3 14h4v5H3zM16 14h4v5h-4z" fill={night ? '#e0ba7e' : '#efd1a5'} />
      <path d="M10 17h4v8h-4zM17-2h3v7h-3z" fill={night ? '#253f45' : '#647472'} />
      {night && <path d="M0 25h25v1H0zM4 28h17v1H4z" fill="#d6b77e" opacity=".25" />}
    </g>
  );
}

export default function JourneyLandscape({ scenery, windowId, rainId, nearRainId, rainOn }) {
  const palette = PALETTES[scenery] || PALETTES['rainy-night'];
  const night = scenery === 'rainy-night';
  const forest = scenery === 'forest';

  return (
    <g clipPath={`url(#${windowId})`}>
      <g transform="translate(83 42)">
        <path d="M0 0h316v119H0z" fill={palette.sky[0]} />
        <path d="M0 33h316v86H0z" fill={palette.sky[1]} />
        <path d="M0 63h316v56H0z" fill={palette.sky[2]} />
        {night ? (
          <g>
            <path d="M241 14h12v3h4v13h-4v4h-12v-4h-4V18h4z" fill="#d5d6bd" opacity=".75" />
            <path d="M249 14h5v3h3v13h-4v4h-8v-3h4v-4h2V17h-2z" fill={palette.sky[0]} />
            <path d="M30 15h1v2h-1zM119 27h2v1h-2zM193 10h1v2h-1zM285 39h1v2h-1z" fill="#d4d8c8" opacity=".6" />
          </g>
        ) : forest ? (
          <g>
            <path d="M252 15h12v3h4v12h-4v4h-12v-4h-4V18h4z" fill="#e6deb2" />
            <path d="M0 48h316v13H0z" fill="#e8dfb9" opacity=".17" />
          </g>
        ) : (
          <g>
            <path d="M234 34h26v4h6v7h4v21h-4v7h-6v4h-26v-4h-6v-7h-4V45h4v-7h6z" fill="#f3cf98" />
            <path d="M224 58h46v2h-46zM226 67h42v2h-42z" fill="#dfaa87" />
            <path d="M0 78h316v5H0z" fill="#efd2a4" opacity=".45" />
          </g>
        )}

        <RepeatingLayer name="far">
          <path d="M10 20h28v-3h18v3h19v3h8v3H0v-3h10zM148 39h16v-4h28v3h26v3h20v3h-90zM263 13h17v-3h22v3h18v6h-57z" fill={palette.cloud} opacity={night ? '.2' : '.46'} />
          <path d="M0 88H12V84H27V77H39V72H53V66H65V61H80V68H91V73H106V79H123V83H136V88H152V80H169V74H184V67H197V63H211V69H227V76H240V82H259V77H277V70H293V75H306V82H316V88H320V119H0z" fill={palette.far} />
          <path d="M44 77h10v-6h13v-5h12v3H68v7H56v5H44zM173 80h12v-6h13v-6h12v3h-10v6h-13v7h-14z" fill={palette.sky[2]} opacity=".23" />
        </RepeatingLayer>

        <RepeatingLayer name="middle">
          <path d="M0 99H18V95H36V89H51V93H68V99H86V95H108V88H122V92H136V99H155V94H176V88H193V93H211V98H230V93H244V87H261V92H276V98H294V94H310V99H320V119H0z" fill={palette.ridge} />
          {forest ? (
            <g>
              {[18, 48, 76, 116, 147, 185, 218, 251, 277, 300].map((x, index) => (
                <Pine key={x} x={x} y={58 + (index % 3) * 7} size={.8} color={palette.ridge} highlight={palette.leaves} />
              ))}
              <path d="M0 100h320v3H0zM15 96h70v2H15zM172 100h80v2h-80z" fill="#a4b59a" opacity=".33" />
            </g>
          ) : (
            <g>
              <path d="M0 101h320v18H0z" fill={night ? '#56717a' : '#d2ab95'} />
              <path d="M0 105h28v1H0zM51 111h58v1H51zM131 104h21v1h-21zM179 115h68v1h-68zM266 107h54v1h-54z" fill={night ? '#8a9d9e' : '#f2cf9e'} opacity=".5" />
              {!night && <path d="M226 102h39v2h-39zM232 106h28v2h-28zM223 112h41v2h-41z" fill="#f3cc98" opacity=".7" />}
              <Cottage x={56} y={76} night={night} />
              <Cottage x={85} y={80} night={night} />
              <Pine x={48} y={68} size={.85} color={palette.trees} highlight={palette.leaves} />
              <Pine x={124} y={75} size={.7} color={palette.trees} highlight={palette.leaves} />
              <path d="M41 101h91v3H41z" fill={palette.ridge} />
            </g>
          )}
        </RepeatingLayer>

        <RepeatingLayer name="near">
          <path d="M0 114h24v-3h27v2h26v-4h23v3h31v2h32v-4h28v2h26v-3h25v4h32v-2h27v3h19v5H0z" fill={palette.ground} />
          <Pine x={forest ? 34 : 24} y={forest ? 49 : 76} size={forest ? 1.7 : 1.1} color={palette.trees} highlight={palette.leaves} />
          <Pine x={forest ? 282 : 290} y={forest ? 34 : 65} size={forest ? 2 : 1.4} color={palette.ground} highlight={palette.trees} />
          {forest && (
            <g>
              <Pine x={66} y={70} size={1.2} color={palette.trees} highlight={palette.leaves} />
              <path d="M194 85h5v34h-5zM181 97h11v-5h17v5h9v8h-8v5h-22v-5h-11v-6h4z" fill="#4d745b" />
              <path d="M185 96h9v-3h13v4h8v3h-12v-2h-18z" fill="#76976c" />
            </g>
          )}
          <path d="M50 116h16v1H50zM139 114h14v1h-14zM208 116h23v1h-23zM256 115h10v1h-10z" fill={palette.grass} opacity=".7" />
        </RepeatingLayer>

        <g className={`journey-rain${rainOn ? ' is-visible' : ''}`}>
          <g className="journey-rainfall">
            <rect x="0" y="-48" width="316" height="215" fill={`url(#${rainId})`} />
          </g>
          <g className="journey-rainfall journey-rainfall--near">
            <rect x="0" y="-48" width="316" height="215" fill={`url(#${nearRainId})`} />
          </g>
          <path d="M48 27h1v8h-1zM47 35h2v3h-2zM189 62h1v7h-1zM188 69h2v3h-2zM278 17h1v9h-1zM277 26h2v3h-2z" fill="#cadcda" opacity=".4" />
        </g>

        <path d="M6 0h3v119H6zM13 0h1v119h-1zM197 0h5v119h-5zM208 0h2v119h-2z" fill="#e9e8c7" opacity=".07" />
        <path d="M0 0h316v3H0zM0 3h3v116H0zM313 3h3v116h-3zM0 117h316v2H0z" fill="#203b3e" opacity=".5" />
      </g>
    </g>
  );
}

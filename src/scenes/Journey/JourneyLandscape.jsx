import './JourneyLandscapes.css';

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

function SnowPine({ x, y, size = 1, distant = false }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${size})`}>
      <Pine x={0} y={0} color={distant ? '#718f9e' : '#476c78'} highlight={distant ? '#91aab6' : '#71909b'} />
      <path d="M-2 0h4v5h4v3H-6V5h4zM-6 11h12v4h4v3H-10v-3h4zM-10 22h20v3h5v3H-15v-3h5z" fill={distant ? '#d5e1e6' : '#eff0e8'} />
      <path d="M0 5h6v3H0zM2 15h8v3H2zM3 25h12v3H3z" fill="#bbcfd9" />
    </g>
  );
}

function Snowfall({ near = false }) {
  // Four identical 48px tiles keep the snowfall continuous without timers or SVG IDs.
  const flakes = near
    ? 'M22 6h2v2h-2zM99 29h2v2h-2zM173 15h2v2h-2zM254 39h2v2h-2zM302 21h2v2h-2z'
    : 'M8 31h1v1H8zM41 13h1v1h-1zM72 41h1v1h-1zM113 3h1v1h-1zM146 23h1v1h-1zM185 44h1v1h-1zM219 9h1v1h-1zM247 27h1v1h-1zM281 4h1v1h-1zM311 40h1v1h-1z';

  return (
    <g className={`journey-snowfall${near ? ' journey-snowfall--near' : ''}`} fill="#fffaf0" opacity={near ? '.8' : '.6'}>
      {[-48, 0, 48, 96].map((y) => <path key={y} d={flakes} transform={`translate(0 ${y})`} />)}
    </g>
  );
}

function SnowyMountains() {
  return (
    <g className="journey-snow-scene">
      <path d="M0 0h316v119H0z" fill="#b5bfd6" />
      <path d="M0 33h316v86H0z" fill="#c5d2df" />
      <path d="M0 65h316v54H0z" fill="#dae1e4" />
      <path d="M254 13h12v3h4v12h-4v4h-12v-4h-4V16h4z" fill="#f4ecdb" opacity=".85" />

      <RepeatingLayer name="far">
        <path d="M7 19h26v-3h18v3h16v3h7v3H0v-3h7zM161 12h23V9h18v3h26v3h10v3h-77zM273 35h20v-3h27v8h-47z" fill="#eef0e9" opacity=".5" />
        <path d="M0 79H9V73H19V66H29V56H38V44H47V34H57V24H66V17H76V24H84V34H93V44H103V55H113V66H123V75H135V84H149V72H159V62H169V50H180V39H190V29H200V21H211V29H219V39H229V52H239V63H250V73H262V80H275V69H284V58H292V50H300V58H307V69H314V79H320V119H0z" fill="#9caec8" />
        <path d="M38 44h9V34h10V24h9v-7h10v7h8v10h9v10h10v8H90v-6H80v-8H69v7H59v8H48v8H37v-7h-9v-7h10zM169 50h11V39h10V29h10v-8h11v8h8v10h10v13h10v8h-13v-8h-9v-8h-9v7h-10v8h-13v-5h-16zM284 58h8v-8h8v8h7v8h-10v-6h-5v6h-8z" fill="#e8eaf0" />
        <path d="M76 27h8v7h9v10h10v11h10v11h10v9h12v9h-18v-8h-9v-9h-9V56H90V45h-7V34h-7zM212 31h8v8h10v13h10v11h11v10h12v7h-20v-8h-10V61h-9V49h-7V38h-5z" fill="#899fbf" />
        <path d="M0 91h320v28H0z" fill="#c1d0db" opacity=".55" />
      </RepeatingLayer>

      <RepeatingLayer name="middle">
        <path d="M0 99H12V93H24V82H35V72H47V62H58V53H69V45H80V53H89V62H100V72H111V82H124V92H137V100H155V93H168V84H180V74H192V65H204V57H216V48H228V57H238V66H250V76H262V86H275V94H290V99H304V96H312V99H320V119H0z" fill="#95aebd" />
        <path d="M35 72h12V62h11v-9h11v-8h11v8h9v9h11v10h11v7H98v-7H87v-8H77v9H66v7H53v7H40v-6H26v-5h9zM180 74h12V65h12v-8h12v-9h12v9h10v9h12v10h12v7h-14v-7h-12v-7h-10v7h-12v8h-15v-6h-19z" fill="#f0eee9" />
        <path d="M0 103h25v-3h31v3h35v-3h32v4h32v-2h35v3h32v-4h40v2h30v-3h28v19H0z" fill="#dbe4e6" />
        {[24, 46, 139, 162, 273, 298].map((x, index) => <SnowPine key={x} x={x} y={80 + (index % 2) * 4} size={.65} distant />)}
        <path d="M9 111h49v1H9zM90 107h32v1H90zM184 111h63v1h-63zM275 109h32v1h-32z" fill="#b0c5d1" />
      </RepeatingLayer>

      <RepeatingLayer name="near">
        <path d="M0 114h20v-3h29v1h26v-3h31v4h30v2h32v-3h30v-2h30v3h30v-2h33v3h29v5H0z" fill="#edf0eb" />
        <SnowPine x={35} y={58} size={1.4} />
        <SnowPine x={72} y={80} size={.95} />
        <SnowPine x={278} y={48} size={1.7} />
        <path d="M16 115h44v2H16zM61 116h25v1H61zM250 116h51v2h-51zM135 115h20v1h-20zM197 113h19v1h-19z" fill="#bdcfd9" />
        <path d="M126 117h5v-3h5v3h4v2h-14zM215 116h4v-2h4v2h3v3h-11z" fill="#90a6b1" />
        <path d="M126 116h10v1h-10zM215 115h8v1h-8z" fill="#f6f3e9" />
      </RepeatingLayer>
      <Snowfall />
      <Snowfall near />
    </g>
  );
}

function MorningLake() {
  return (
    <g className="journey-morning-scene">
      <path d="M0 0h316v119H0z" fill="#b8cad5" />
      <path d="M0 29h316v90H0z" fill="#d4c9cc" />
      <path d="M0 52h316v67H0z" fill="#e9cdb9" />
      <path d="M0 69h316v50H0z" fill="#eddbc0" />
      <path d="M232 38h18v3h5v5h3v18h-3v5h-5v3h-18v-3h-5v-5h-3V46h3v-5h5z" fill="#f5e6b6" />
      <path d="M0 79h316v40H0z" fill="#9ebdc1" />
      <path d="M0 95h316v24H0z" fill="#8daeb4" />

      <RepeatingLayer name="far">
        <path d="M14 25h20v-3h22v3h18v3h8v2H6v-2h8zM151 16h28v-3h19v3h27v3h-74zM279 39h17v-3h24v7h-41z" fill="#f2ddcf" opacity=".55" />
        <path d="M0 80V76H13V72H27V64H39V57H51V49H63V43H75V49H87V57H99V65H112V72H126V78H146V71H160V64H174V57H187V51H201V46H215V51H228V58H241V66H255V73H271V79H288V73H300V66H308V73H316V76H320V94H0z" fill="#a5aebc" />
        <path d="M51 57h12v-8h12v6h12v8h12v8h13v7H94v-6H82v-7H70v-7H59v6H45v7H32v-5h7v-9zM187 57h13v-6h14v-5h14v5h13v7h13v8h14v7h16v6h-20v-5h-14v-7h-13v-8h-12v-5h-12v5h-13v7h-13z" fill="#c1bec5" />
        <path d="M0 84H19V82H39V79H61V77H84V80H107V83H130V84H152V81H177V78H202V80H225V83H250V84H272V81H296V79H308V83H316V84H320V91H0z" fill="#829e9f" />
        <path d="M0 91h320v2H0z" fill="#c6d4ce" opacity=".7" />
        <g className="journey-lake-birds" fill="#6a818d">
          <path d="M91 32h3v2h3v2h-3v-1h-3zM97 34h3v-2h3v3h-3v1h-3zM121 24h2v1h2v2h-2v-1h-2zM125 25h2v-1h2v2h-2v1h-2zM137 39h2v1h2v2h-2v-1h-2zM141 40h2v-1h2v2h-2v1h-2z" />
        </g>
      </RepeatingLayer>

      <g className="journey-lake-reflections" fill="#f0ddb7">
        <path d="M222 92h38v1h-38zM229 96h23v1h-23zM217 101h46v1h-46zM226 106h32v2h-32zM215 112h49v1h-49zM231 116h27v1h-27z" opacity=".8" />
        <path d="M37 96h27v1H37zM77 107h34v1H77zM132 99h21v1h-21zM173 114h25v1h-25zM281 103h35v1h-35z" opacity=".3" />
      </g>

      <RepeatingLayer name="middle">
        <g className="journey-lake-mist" fill="#e7e2d3" opacity=".38">
          <path d="M0 85h38v-2h46v2h37v3H0zM145 89h33v-2h57v2h35v3H145zM292 83h28v5h-28z" />
          <path d="M26 94h40v-1h34v1h19v2H26zM209 97h32v-1h47v3h-79z" opacity=".6" />
        </g>
        <path d="M0 109h21v-2h24v-2h22v2h18v3h19v4H0zM178 114h15v-3h19v-3h27v2h25v3h19v-3h18v-1h19v10H178z" fill="#75958a" />
        <path d="M20 106h5v-5h4v-6h3v6h4v5h6v3H20zM220 108h5v-4h4v-7h3v7h4v4h6v3h-22zM288 108h4v-5h4v-6h3v6h4v5h5v3h-20z" fill="#8aa295" />
        <path d="M0 112h41v1H0zM53 110h23v1H53zM196 115h42v1h-42zM270 114h50v1h-50z" fill="#b6c6a7" />
      </RepeatingLayer>

      <RepeatingLayer name="near">
        <path d="M0 117h19v-3h23v-3h19v3h30v3h38v-2h29v2h35v-3h23v-2h24v3h28v1h30v-2h22v5H0z" fill="#486e62" />
        <Pine x={29} y={73} color="#557b6d" highlight="#779783" />
        <path d="M62 116h2V98h-2zM57 109h2v3h5v2h-5v-1h-2zM64 104h3v-3h2v4h-3v3h-2zM268 119h2V99h-2zM263 109h2v3h5v2h-5v-1h-2zM270 106h3v-3h2v4h-3v3h-2zM287 117h2V95h-2zM282 103h2v4h5v2h-5v-1h-2zM289 101h3v-3h2v4h-3v3h-2z" fill="#537969" />
        <path d="M62 96h2v5h-2zM268 97h2v5h-2zM287 93h2v5h-2z" fill="#c5b78b" />
        <path d="M99 117h2v-5h2v5h2v-3h2v5h-8zM176 116h2v-4h2v5h2v-7h2v9h-8zM233 116h2v-3h2v4h3v2h-7z" fill="#9aa57a" />
        <path d="M111 117h2v2h-2zM245 116h2v2h-2z" fill="#e0cd9a" />
      </RepeatingLayer>
    </g>
  );
}

export default function JourneyLandscape({ scenery, windowId, rainId, nearRainId, rainOn }) {
  if (scenery === 'snowy-mountains' || scenery === 'morning-lake') {
    return (
      <g clipPath={`url(#${windowId})`}>
        <g transform="translate(83 42)">
          {scenery === 'snowy-mountains' ? <SnowyMountains /> : <MorningLake />}
          <path d="M6 0h3v119H6zM13 0h1v119h-1zM197 0h5v119h-5zM208 0h2v119h-2z" fill="#e9e8c7" opacity=".07" />
          <path d="M0 0h316v3H0zM0 3h3v116H0zM313 3h3v116h-3zM0 117h316v2H0z" fill="#203b3e" opacity=".5" />
        </g>
      </g>
    );
  }

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

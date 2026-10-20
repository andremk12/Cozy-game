import { useEffect, useId, useState } from 'react';
import Icon from '../../components/Icon.jsx';
import JourneyLandscape from './JourneyLandscape.jsx';
import './Journey.css';

const SCENERIES = [
  { id: 'rainy-night', label: 'Noite chuvosa', description: 'uma noite azul, com montanhas, pinheiros e pequenas casas iluminadas' },
  { id: 'forest', label: 'Floresta', description: 'uma floresta verde, com pinheiros próximos e montanhas ao longe' },
  { id: 'sunset', label: 'Pôr do sol', description: 'um pôr do sol dourado e rosado sobre um lago entre montanhas' },
];

function CarriageWalls() {
  return (
    <g>
      <path d="M0 0h480v270H0z" fill="#253d38" />
      <path d="M9 9h462v176H9z" fill="#4f5c49" />
      <path d="M11 34h458v137H11z" fill="#66705a" />
      <path d="M13 36h454v2H13zM13 172h454v4H13z" fill="#a5966b" />
      <path d="M0 0h480v8H0zM0 8h11v262H0zM469 8h11v262h-11z" fill="#20362f" />
      <path d="M11 8h458v4H11zM17 13h446v3H17zM25 18h430v3H25z" fill="#7f7957" />
      <path d="M11 12h458v1H11zM17 16h446v1H17zM25 21h430v1H25z" fill="#b09a6b" />
      <path d="M63 27h352v8H63zM68 23h342v5H68z" fill="#425143" />
      <path d="M80 29h319v1H80z" fill="#839071" />
      <path d="M12 178h456v92H12z" fill="#6d6350" />
      <path d="M12 181h456v16H12zM12 222h456v20H12z" fill="#776e56" />
      <path d="M12 198h456v2H12zM12 220h456v2H12zM12 243h456v2H12zM12 266h456v2H12z" fill="#4e5140" />
      <path d="M97 180h2v18h-2zM265 180h2v18h-2zM420 180h2v18h-2zM48 200h2v20h-2zM211 200h2v20h-2zM381 200h2v20h-2zM122 222h2v21h-2zM291 222h2v21h-2zM60 245h2v21h-2zM228 245h2v21h-2zM403 245h2v21h-2z" fill="#555440" />
      <path d="M22 188h28v1H22zM310 192h31v1h-31zM137 210h23v1h-23zM398 211h35v1h-35zM30 231h29v1H30zM214 235h19v1h-19zM329 254h30v1h-30zM114 261h37v1h-37z" fill="#aea079" opacity=".35" />
      <path d="M12 174h456v8H12z" fill="#354638" />
      <path d="M12 176h456v2H12z" fill="#8c835f" />

      {/* Left wall panel, luggage rack, folded blankets and a quiet landscape print. */}
      <path d="M19 43h43v102H19z" fill="#445340" />
      <path d="M21 45h39v97H21zM23 147h35v19H23z" fill="#59634a" />
      <path d="M23 45h1v96h-1zM22 148h36v1H22z" fill="#7b7f5b" />
      <path d="M25 72h31v41H25z" fill="#2d4337" />
      <path d="M27 74h27v36H27z" fill="#ae9970" />
      <path d="M29 76h23v31H29z" fill="#d1c29b" />
      <path d="M31 78h19v27H31z" fill="#8d9c88" />
      <path d="M31 93h3v-3h4v-5h4v4h3v5h5v11H31z" fill="#5c7968" />
      <path d="M31 100h5v-3h6v3h8v5H31zM44 81h3v3h-3z" fill="#c8c5a0" />
      <path d="M20 57h44v4H20zM23 61h3v6h-3zM59 61h3v6h-3z" fill="#2e4437" />
      <path d="M20 56h44v2H20zM23 53h37v2H23z" fill="#baa577" />
      <path d="M25 39h13v14H25zM38 36h14v17H38zM52 42h8v11h-8z" fill="#a9906b" />
      <path d="M27 40h9v1h-9zM40 38h10v2H40zM54 43h4v8h-4z" fill="#d7bf91" />
      <path d="M29 41h2v12h-2zM43 40h2v13h-2zM25 50h35v2H25z" fill="#6f7355" />
      <path d="M31 119h17v3H31zM34 123h11v1H34z" fill="#a0a184" />
      <path d="M22 154h1v7h-1zM28 154h1v7h-1zM34 154h1v7h-1zM40 154h1v7h-1zM46 154h1v7h-1zM52 154h1v7h-1z" fill="#354a3a" />

      {/* Window surround, brass trim and gathered curtains. */}
      <path d="M75 33h332v132H75z" fill="#2b4036" />
      <path d="M77 35h328v129H77z" fill="#baa67b" />
      <path d="M80 38h322v125H80z" fill="#827c5d" />
      <path d="M83 42h316v119H83z" fill="#2e4648" />
    </g>
  );
}

function WindowFrame() {
  return (
    <g>
      <path d="M80 38h322v3H80zM80 41h3v122h-3zM399 41h3v122h-3zM81 160h319v4H81z" fill="#d0b78a" />
      <path d="M82 40h318v1H82zM80 41h1v119h-1zM84 163h313v1H84z" fill="#e0c799" />
      <path d="M239 41h5v120h-5z" fill="#827e60" />
      <path d="M239 42h2v117h-2z" fill="#c8b58a" />
      <path d="M244 42h1v118h-1z" fill="#223c3d" opacity=".6" />
      <path d="M246 139h3v9h-3zM244 140h2v3h-2z" fill="#d0b98b" />
      <path d="M70 163h338v6H70zM74 169h330v4H74z" fill="#4e513b" />
      <path d="M70 162h338v3H70zM74 165h330v1H74z" fill="#b59a6d" />
      <path d="M74 162h330v1H74z" fill="#ddbe8b" />
      <path d="M65 29h352v4H65zM63 28h4v7h-4zM415 28h4v7h-4z" fill="#293e31" />
      <path d="M64 29h353v1H64z" fill="#b49b6c" />
      <path d="M67 34h25v20h-3v25h-3v33h-4v32h-3v16H65V38h2z" fill="#7e8260" />
      <path d="M69 35h5v109h-3v14h-4V38h2zM80 35h5v40h-2v33h-3v32h-3v-27h2V67h1z" fill="#a3a07a" />
      <path d="M64 122h22v5H64zM65 123h20v1H65z" fill="#c7ae7b" />
      <path d="M395 34h21v123h-3v3h-12v-19h-3v-33h-3V75h-2V49h2z" fill="#7b805e" />
      <path d="M401 35h5v46h2v40h3v36h-6v-22h-3V97h-2V63h1z" fill="#a5a17a" />
      <path d="M413 35h2v121h-2zM395 123h22v5h-22z" fill="#585f45" />
      <path d="M395 122h22v4h-22zM396 123h20v1h-20z" fill="#c7ae7b" />
    </g>
  );
}

function Bench() {
  return (
    <g>
      <path d="M67 176h218v9H67zM73 184h207v46H73zM69 227h215v8H69zM75 235h10v11H75zM268 235h10v11h-10z" fill="#334335" />
      <path d="M70 178h212v5H70zM76 183h201v40H76z" fill="#6f7550" />
      <path d="M79 184h195v3H79zM76 188h3v30h-3z" fill="#a0a174" />
      <path d="M81 190h61v24H81zM146 190h61v24h-61zM211 190h59v24h-59z" fill="#82865b" />
      <path d="M82 190h59v1H82zM147 190h59v1h-59zM212 190h57v1h-57zM142 188h2v28h-2zM207 188h2v28h-2z" fill="#5f6c49" />
      <path d="M108 201h3v3h-3zM174 201h3v3h-3zM238 201h3v3h-3z" fill="#66734c" />
      <path d="M69 216h216v10H69zM72 226h211v5H72z" fill="#495a3c" />
      <path d="M72 217h210v6H72zM76 226h203v2H76z" fill="#8a8a58" />
      <path d="M75 217h204v2H75zM76 230h203v1H76z" fill="#b1a676" />
      <path d="M62 202h10v29H62zM281 202h10v29h-10zM60 198h15v6H60zM278 198h15v6h-15z" fill="#344435" />
      <path d="M62 198h11v3H62zM280 198h11v3h-11zM65 204h3v24h-3zM284 204h3v24h-3z" fill="#b49a6c" />
      <path d="M77 235h5v9h-5zM270 235h5v9h-5z" fill="#8b7753" />

      {/* A soft cushion and a folded, woven blanket. */}
      <path d="M91 190h30v2h4v21H88v-18h3z" fill="#485b46" />
      <path d="M93 188h26v3h4v18H90v-16h3z" fill="#bea57c" />
      <path d="M94 190h23v1H94zM91 194h2v12h-2zM119 194h2v13h-2z" fill="#d5bb8c" />
      <path d="M99 195h4v3h4v4h-4v3h-4v-3h-4v-4h4zM112 193h2v14h-2z" fill="#a08f69" />
      <path d="M236 211h35v20h-3v9h-29v-8h-3z" fill="#bd9472" />
      <path d="M239 212h4v25h-4zM251 212h4v26h-4zM263 212h4v26h-4z" fill="#dab58c" />
      <path d="M237 218h33v2h-33zM237 228h33v2h-33zM239 238h29v2h-29z" fill="#8f775e" />
      <path d="M240 240h2v4h-2zM246 240h2v3h-2zM252 240h2v4h-2zM258 240h2v3h-2zM264 240h2v4h-2z" fill="#c49d78" />
    </g>
  );
}

function TableAndTea() {
  return (
    <g>
      <path d="M325 189h10v54h-10zM306 241h46v5h-46z" fill="#344639" />
      <path d="M328 191h4v50h-4zM310 241h38v2h-38z" fill="#9c8762" />
      <path d="M285 181h92v9h-92zM289 190h84v4h-84z" fill="#4d503a" />
      <path d="M285 180h92v6h-92z" fill="#b19970" />
      <path d="M289 180h84v2h-84zM290 186h82v1h-82z" fill="#dbc091" />
      <path d="M289 189h83v2h-83z" fill="#7c7050" />
      <path d="M295 171h25v3h-25zM297 167h24v4h-24z" fill="#556e5a" />
      <path d="M298 168h22v2h-22zM296 172h23v1h-23z" fill="#d8cfac" />
      <path d="M295 171h2v4h-2zM297 167h2v4h-2z" fill="#b78e67" />

      <path d="M324 178h26v3h-26z" fill="#d3b991" />
      <path d="M328 166h15v11h-15zM343 168h6v7h-6z" fill="#4b6556" />
      <path d="M329 165h13v11h-13zM344 169h3v4h-3z" fill="#ddd4ad" />
      <path d="M330 166h11v2h-11z" fill="#897357" />
      <path d="M330 169h2v5h-2zM333 176h7v1h-7z" fill="#f0e1b8" />
      <g fill="none" stroke="#e2ddbc" strokeWidth="1">
        <path className="journey-steam" d="M333 162v-4h2v-5h-1v-3" />
        <path className="journey-steam journey-steam--late" d="M339 161v-3h-1v-4" />
      </g>

      <path d="M352 175h13v5h-13zM350 174h17v1h-17z" fill="#ded2ab" />
      <path d="M353 176h9v1h-9zM355 178h7v1h-7z" fill="#9e997b" />
      <path d="M363 175h2v5h-2z" fill="#c2996b" />
    </g>
  );
}

function LampAndPlant() {
  return (
    <g>
      <g className="journey-lamp-glow" fill="#f1cd8a">
        <path d="M411 56h31v12h13v19h9v45h-10v22h-54v-22h-10V87h9V68h12z" opacity=".07" />
        <path d="M416 77h21v10h10v42h-8v15h-31v-15h-8V91h8V81h8z" opacity=".09" />
        <path d="M416 99h19v5h7v38h-10v17h-19v-17h-8v-38h11z" opacity=".12" />
      </g>
      <path d="M425 51h5v31h-5zM421 48h13v5h-13zM423 104h10v4h-10z" fill="#334637" />
      <path d="M426 52h2v28h-2zM423 49h9v2h-9z" fill="#b79c6c" />
      <path d="M418 77h19v5h-19zM414 82h27v8h-27zM411 90h33v9h-33z" fill="#4c513a" />
      <path d="M420 78h15v4h-15zM416 82h23v8h-23zM413 90h29v7h-29z" fill="#e5c286" />
      <path d="M420 79h4v3h-4zM417 83h5v6h-5zM414 91h6v5h-6z" fill="#f2dca5" />
      <path d="M433 80h2v3h-2zM436 84h3v6h-3zM439 91h3v6h-3z" fill="#bb9d68" />
      <path d="M413 98h29v3h-29z" fill="#f0d49a" />
      <path d="M419 112h17v3h-17zM422 117h11v1h-11z" fill="#9a9c79" />

      <path d="M420 183h7v47h-7zM449 183h7v47h-7zM418 179h40v7h-40z" fill="#344939" />
      <path d="M420 180h36v3h-36zM422 185h2v43h-2zM451 185h2v43h-2z" fill="#9b8b63" />
      <path d="M430 160h3v18h-3zM424 150h22v8h-22zM427 158h16v19h-16z" fill="#704f3d" />
      <path d="M425 150h20v4h-20zM428 155h13v20h-13z" fill="#b38760" />
      <path d="M426 151h18v1h-18zM429 157h3v16h-3z" fill="#d2a575" />
      <g className="journey-plant-leaves">
        <path d="M434 119h2v32h-2zM434 138h-10v-7h2v5h8zM436 132h9v-9h2v11h-11z" fill="#4b6c4e" />
        <path d="M428 112h9v3h4v7h-4v4h-8v-3h-4v-7h3zM441 116h9v3h4v6h-4v4h-9v-3h-3v-6h3zM417 123h8v3h6v7h-5v4h-8v-3h-4v-7h3zM437 135h10v3h4v7h-4v3h-10v-4h-4v-6h4z" fill="#809767" />
        <path d="M429 114h6v2h-4v5h-4v-5h2zM442 118h6v2h-7v4h-2v-4h3zM419 125h5v3h5v2h-7v-2h-6v-1h3zM439 137h6v2h-7v4h-3v-4h4z" fill="#acb487" />
      </g>
    </g>
  );
}

function TravelBag() {
  return (
    <g>
      <path d="M373 225h46v19h-46zM377 220h37v5h-37zM386 213h17v3h-17zM383 216h4v6h-4zM402 216h4v6h-4z" fill="#354a3d" />
      <path d="M375 226h42v16h-42zM378 221h34v5h-34z" fill="#aa8059" />
      <path d="M378 223h34v2h-34zM377 228h2v12h-2z" fill="#c79b6f" />
      <path d="M383 224h4v18h-4zM405 224h4v18h-4zM375 232h42v2h-42z" fill="#745f44" />
      <path d="M383 230h4v5h-4zM405 230h4v5h-4z" fill="#d2b57c" />
      <path d="M389 235h10v5h-10zM391 233h5v2h-5z" fill="#d9c49a" />
      <path d="M391 237h6v1h-6zM387 214h14v2h-14z" fill="#9c8d68" />
    </g>
  );
}

function MovementIcon({ paused }) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      {paused ? <path d="m5 3 7 5-7 5V3Z" stroke="currentColor" strokeWidth="1.2" /> : <path d="M5 3v10M11 3v10" stroke="currentColor" strokeWidth="2" />}
    </svg>
  );
}

export default function Journey({
  scenery = 'rainy-night',
  onSceneryChange,
  rainOn = true,
  onToggleRain,
  paused = false,
  onTogglePaused,
  reducedMotion = false,
  onBack,
}) {
  const uniqueId = useId().replaceAll(':', '');
  const windowId = `journey-window-${uniqueId}`;
  const rainId = `journey-rain-${uniqueId}`;
  const nearRainId = `journey-rain-near-${uniqueId}`;
  const sceneryId = `journey-scenery-${uniqueId}`;
  const selectedScenery = SCENERIES.find((item) => item.id === scenery) || SCENERIES[0];
  const effectiveRain = selectedScenery.id === 'rainy-night' && rainOn;
  const [hidden, setHidden] = useState(() => document.hidden);

  useEffect(() => {
    const updateVisibility = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', updateVisibility);
    return () => document.removeEventListener('visibilitychange', updateVisibility);
  }, []);

  const sceneClassName = [
    'journey-scene',
    (paused || hidden) && 'is-paused',
    reducedMotion && 'is-reduced-motion',
    effectiveRain && 'is-rain-on',
  ].filter(Boolean).join(' ');

  return (
    <section className={sceneClassName} data-scenery={selectedScenery.id} aria-label="The Journey: uma viagem sem pressa">
      <svg
        className="journey-art"
        viewBox="0 0 480 270"
        xmlns="http://www.w3.org/2000/svg"
        shapeRendering="crispEdges"
        role="img"
        aria-labelledby={`journey-title-${uniqueId} journey-desc-${uniqueId}`}
      >
        <title id={`journey-title-${uniqueId}`}>Seu cantinho em um trem tranquilo</title>
        <desc id={`journey-desc-${uniqueId}`}>
          Um vagão em pixel art com banco verde, manta, bolsa de viagem, planta, luminária dourada
          e uma mesa com chá e livro. Pela janela panorâmica, {selectedScenery.description}.
        </desc>
        <defs>
          <clipPath id={windowId}><rect x="83" y="42" width="316" height="119" /></clipPath>
          <pattern id={rainId} width="37" height="48" patternUnits="userSpaceOnUse">
            <path d="M7 2h1v5H7zM6 7h1v4H6zM28 24h1v4h-1zM27 28h1v5h-1z" fill="#bfd6db" opacity=".3" />
          </pattern>
          <pattern id={nearRainId} width="63" height="48" patternUnits="userSpaceOnUse">
            <path d="M17 8h1v5h-1zM16 13h1v5h-1zM49 32h1v5h-1zM48 37h1v4h-1z" fill="#dae3da" opacity=".4" />
          </pattern>
        </defs>
        <CarriageWalls />
        <JourneyLandscape scenery={selectedScenery.id} windowId={windowId} rainId={rainId} nearRainId={nearRainId} rainOn={effectiveRain} />
        <WindowFrame />
        <path d="M84 174h226v4h-10v3H79v-3h5zM94 183h201v3H94z" fill="#d0be91" opacity=".1" />
        <path d="M106 242h169v4h8v12h-8v4H106v-4h-8v-12h8z" fill="#3b4c3a" opacity=".6" />
        <path d="M110 243h161v3h8v10h-8v3H110v-3h-8v-10h8z" fill="#8a8964" />
        <path d="M113 246h155v2h7v5h-7v3H113v-3h-7v-5h7z" fill="#5d7055" />
        <path d="M122 249h136v1H122zM122 253h136v1H122zM103 246h-5v2h5zM103 252h-5v2h5zM279 246h5v2h-5zM279 252h5v2h-5z" fill="#beb18b" />
        <Bench />
        <TableAndTea />
        <LampAndPlant />
        <TravelBag />
        <path d="M0 264h480v6H0zM0 0h480v2H0z" fill="#1b332d" />
      </svg>
      <div className="journey-controls" role="group" aria-label="Controles da viagem">
        <div className="journey-scenery-control">
          <label htmlFor={sceneryId}>Paisagem</label>
          <select id={sceneryId} aria-label="Paisagem da viagem" value={selectedScenery.id} onChange={(event) => onSceneryChange?.(event.target.value)}>
            {SCENERIES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
        </div>
        <div className="journey-motion-controls">
          {selectedScenery.id === 'rainy-night' && (
            <button type="button" className="journey-control" onClick={onToggleRain} aria-label={rainOn ? 'Parar chuva' : 'Ativar chuva'} aria-pressed={rainOn}>
              <Icon name="rain" size={15} />
              <span>Chuva {rainOn ? 'ligada' : 'desligada'}</span>
            </button>
          )}
          <button type="button" className="journey-control" onClick={onTogglePaused} aria-pressed={paused} disabled={reducedMotion}>
            <MovementIcon paused={paused || reducedMotion} />
            <span>{reducedMotion ? 'Movimento reduzido' : paused ? 'Retomar movimento' : 'Pausar movimento'}</span>
          </button>
        </div>
        <button type="button" className="journey-control journey-back" onClick={onBack}>
          <Icon name="back" size={15} /><span>Voltar ao quarto</span>
        </button>
      </div>
    </section>
  );
}

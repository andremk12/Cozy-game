import { useId } from 'react';
import { SPECIES, PLANT_SLOTS, DECOR_SLOTS, getPlantStage } from '../../../shared/garden.js';
import GardenPlant, { GardenPot } from './GardenPlants.jsx';
import GardenDecoration from './GardenDecorations.jsx';
import GardenWildlife from './GardenWildlife.jsx';
import GardenCat from './GardenCat.jsx';
import GardenAtmosphere from './GardenAtmosphere.jsx';
import Companion from '../../components/companion/Companion.jsx';
import './GardenArt.css';

export function GardenObject({ label, description, onActivate, className = '', children, ...props }) {
  return <g className={`garden-object ${className}`} role="button" tabIndex="0" aria-label={label} aria-description={description} onClick={onActivate} onKeyDown={(event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (!event.repeat) onActivate?.(event);
    }
  }} {...props}><title>{description || label}</title>{children}</g>;
}

function Shrub({ x, y, shade = false, flowers = false }) {
  return <g transform={`translate(${x} ${y})`}><g className="garden-shrub-leaves"><path d="M-20 0v-10h4v-7h9v-6H6v5h11v7h5V1h-42z" fill={shade ? '#466848' : '#56794d'} /><path d="M-17-9v-7h10v-5H5v5h9v7h-7v-4H-4v5h-13z" fill={shade ? '#648251' : '#76925c'} /><path d="M-14-12h4v2h-4zM-4-19h5v2h-5zM8-13h5v2H8zM-2-7h4v2h-4zM15-5h3v2h-3z" fill="#9eae72" opacity=".7" />{flowers && <path d="M-12-10h3v3h-3zM8-7h3v3H8zM-2-16h3v3h-3z" fill="#c6b7a0" />}</g><path d="M-21 0h45v3h-45z" fill="#405f42" /></g>;
}

function GardenBackground({ atmosphere }) {
  const night = atmosphere === 'night';
  const sunset = atmosphere === 'sunset';
  return <g aria-hidden="true" pointerEvents="none">
    <path d="M0 0h480v270H0z" fill={night ? '#344c61' : sunset ? '#c89d8a' : '#a9beb0'} />
    <path d="M0 58h480v49H0z" fill={night ? '#4b6470' : sunset ? '#dcb69b' : '#bfd0b9'} />
    <path d="M0 82h480v35H0z" fill={night ? '#6a7a79' : sunset ? '#d6bf9d' : '#d1d6b1'} />
    {night ? <><path d="M370 22h12v3h4v12h-4v4h-12v-4h-4V25h4z" fill="#e5dfb1" /><path d="M369 24h6v3h-3v9h-3z" fill="#bdc5a1" />{[[104,24],[149,43],[213,20],[266,43],[326,17],[421,53],[450,23]].map(([x,y])=><path key={x} d={`M${x} ${y}h2v2h-2z`} fill="#d5d6b4" opacity=".8" />)}</> : <><path d={`M${sunset ? 339 : 362} ${sunset ? 65 : 24}h17v3h5v17h-5v5h-17v-5h-5v-17h5z`} fill={sunset ? '#edcb9b' : '#efe3b7'} /><path d="M110 30h29v-4h19v4h19v5h-67zM244 51h20v-4h18v4h27v4h-65z" fill={sunset ? '#e6c1ac' : '#dce1c9'} opacity=".75" /><path d="m286 39 3-2 3 2m5 1 3-2 3 2" stroke="#7a8d7c" fill="none" /></>}
    <path d="M0 99h19V85h22V75h20v10h18v9h25V81h16V69h16v9h21v13h19V80h19V68h21v12h19v14h20V82h21V71h21v12h19v9h24V80h17v-8h20v14h22V76h23V65h19v15h19v11h21V78h18V68h15v13h18V70h12v66H0z" fill={night ? '#536f68' : '#8ba585'} />
    <path d="M0 112h18V99h21v7h21V96h21v12h25v-9h22v11h29V98h23v11h20v-9h31v9h21V98h23v10h30V97h22v10h22V96h26v10h24V94h20v11h24V92h19v15h22V97h26v39H0z" fill={night ? '#4b675a' : '#718e6a'} />
    <path d="M0 120h480v150H0z" fill="#7e9367" />
    <path d="M0 125h480v9H0zM0 188h480v13H0zM0 256h480v14H0z" fill="#879c6d" />
    <path d="M0 131h34v6h46v-5h45v6h58v-4h42v5h61v-6h66v5h71v-6h57v22H0z" fill="#93a576" opacity=".52" />
    <path d="M0 97h480v4H0zM0 119h480v4H0z" fill="#a39770" /><path d="M0 98h480v1H0zM0 119h480v1H0z" fill="#c2b48b" />
    {Array.from({length:20},(_,i)=><g key={i}><path d={`M${i*25+8} 93h5v39h-5z`} fill="#aa9e77" /><path d={`M${i*25+8} 91h5v3h-5zM${i*25+9} 94h1v35h-1z`} fill="#c8bd95" /></g>)}
    <path d="M41 208h22v-5h80v-4h63v-4h88v-6h34v12h-26v8h-92v5h-64v5H67v4H0v-10h41z" fill="#b4ad83" />
    <path d="M0 217h67v-5h81v-4h61v-5h93v-7h24v4h-19v7h-93v5h-61v5H72v5H0z" fill="#d0c29b" />
    <path d="M29 213v8m52-13v10m52-15v10m51-13v9m46-13v8m49-11v8" stroke="#8f9370" strokeWidth="2" />
    <path d="M44 214h16v1H44zM93 209h20v1H93zM157 206h14v1h-14zM233 199h17v1h-17zM294 195h16v1h-16z" fill="#e2d5aa" opacity=".65" />
    <path d="M17 247h14v-2h23v3h26v-3h40v7H17zM146 259h29v-3h25v4h35v4h-89zM276 221h20v-3h21v7h-41z" fill="#6c895c" opacity=".6" />
    {/* Shallow stone-rimmed pond: all fish remain within this fixed silhouette. */}
    <path d="M344 165h19v-9h51v7h29v10h16v12h9v32h-12v13h-23v10h-73v-6h-22v-11h-13v-35h7v-14h12z" fill="#667d6d" />
    <path d="M345 169h19v-9h47v7h29v10h16v12h8v25h-12v13h-23v9h-66v-6h-22v-11h-12v-28h7v-14h9z" fill="#b0ae8c" />
    <path d="M349 173h20v-8h39v8h29v10h15v10h8v18h-12v13h-23v8h-59v-6h-21v-11h-12v-22h8v-13h8z" fill="#658e86" />
    <path d="M356 180h16v-8h32v8h29v10h14v17h-12v13h-27v7h-37v-6h-20v-11h-10v-15h8v-9h7z" fill="#749e91" />
    <path d="M369 174h31v2h-31zM348 192h23v2h-23zM378 217h23v2h-23zM422 191h18v2h-18zM405 201h22v1h-22zM363 204h19v1h-19z" fill="#b3c8ae" opacity=".48" />
    <g className="garden-pond-shimmer" fill="#c5d0b1" opacity=".38"><path d="M376 183h24v1h-24zM390 185h13v1h-13zM414 216h13v1h-13zM350 213h12v1h-12z" /></g>
    <path d="M343 166h18v3h-18zM365 156h16v3h-16zM397 158h16v3h-16zM433 167h10v4h-10zM457 184h9v4h-9zM450 224h7v4h-7zM403 237h20v3h-20zM369 233h14v3h-14zM329 205h4v11h-4z" fill="#d0c6a1" />
    <path d="M411 179h15v6h-4v3h-13v-3h-3v-4h5zM351 218h14v6h-17v-3h3z" fill="#688b63" /><path d="M416 179h1v7h-1z" fill="#88a275" /><path d="M419 177h4v3h-4z" fill="#d6b3ac" />
    <path d="M454 176v-25h2v25zM460 181v-23h2v23zM451 170h-5v-8h2v6h3zM460 174h6v-9h-2v7h-4z" fill="#617e50" /><path d="M453 146h4v11h-4zM459 151h4v11h-4z" fill="#9e855e" />
    {/* A mature tree frames the composition without obscuring any planting point. */}
    <path d="M16 134h18v-13h-4V76h7V46H21v45h-5zM28 82h16v-6H32zM17 97H6v-6h15z" fill="#6b6950" /><path d="M22 60h4v65h-4zM28 80h3v37h-3z" fill="#8f8460" /><path d="M10 133h31v4H10z" fill="#5c7650" />
    <g className="garden-tree-foliage"><path d="M0 0h91v12h12v24H91v14H76v14H53v-5H32v8H8v-9H0z" fill="#3d674c" /><path d="M0 4h75v9h16v20H74v13H53v-6H30v12H8V40H0z" fill="#547b52" /><path d="M0 7h48v6h19v12H48v9H22v-4H0zM66 18h14v9H66z" fill="#77935c" />
    <path d="M2 12h12v2H2zM28 8h14v2H28zM53 18h10v2H53zM17 33h11v2H17zM76 34h10v2H76zM38 45h10v2H38z" fill="#a2b274" opacity=".65" /></g>
    <path d="M429 0h51v89h-9V72h-12V53h-15V37h-15z" fill="#476d4b" /><path d="M441 0h39v58h-10V39h-12V26h-17z" fill="#66834f" /><path d="M444 9h12v3h-12zM463 29h11v2h-11zM472 49h8v2h-8z" fill="#94a369" />
    <Shrub x={31} y={131} flowers /><Shrub x={354} y={148} shade /><Shrub x={427} y={127} flowers />
    <Shrub x={9} y={180} shade /><Shrub x={477} y={254} shade />
    {[[14,227],[41,187],[96,195],[175,192],[236,188],[310,178],[298,258],[336,251],[466,137],[449,252],[18,149],[118,145],[203,137],[373,132]].map(([x,y],i)=><g key={x} transform={`translate(${x} ${y})`}><path d="M0 0v-4h1v3h3v-5h1v6h3v-3h1v4z" fill={i%2 ? '#6c8a56' : '#a9b47b'} />{i%3 === 0 && <path d="M3-7h3v3H3z" fill="#dbc39b" />}</g>)}
    <path d="M0 267h480v3H0z" fill="#536d50" opacity=".6" />
  </g>;
}

const DECOR_LABELS = { bench: 'banco de madeira', lantern: 'lanterna', stone: 'pedras decorativas', mushroom: 'cogumelos' };

export default function GardenScene({ garden, reducedMotion = false, paused = false, tool = 'observe', selectedSlot, onPlantSlot, onDecorationSlot, onWildlife, onOpenTools, onOpenAtmosphere, activePlantEffect, companion }) {
  const uniqueId = useId().replaceAll(':', '');
  const rainId = `garden-rain-${uniqueId}`;
  return <svg className={`garden-art${paused ? ' is-paused' : ''}${reducedMotion ? ' is-reduced-motion' : ''}`} viewBox="0 0 480 270" xmlns="http://www.w3.org/2000/svg" shapeRendering="crispEdges" role="group" aria-labelledby={`garden-title-${uniqueId} garden-description-${uniqueId}`} data-atmosphere={garden.atmosphere} data-weather={garden.weather}>
    <title id={`garden-title-${uniqueId}`}>The Garden: um pequeno jardim onde tudo cresce sem pressa</title>
    <desc id={`garden-description-${uniqueId}`}>Um jardim original em pixel art entre árvores, com quatro canteiros, quatro vasos, um banco e um lago com peixinhos. Borboletas visitam as flores, vagalumes iluminam a noite e um gato laranja se esconde entre os arbustos. Explore com Tab e Enter, plante e cuide no seu tempo.</desc>
    <defs><pattern id={rainId} width="37" height="48" patternUnits="userSpaceOnUse"><path d="M7 2h1v5H7zM6 7h1v4H6zM28 24h1v4h-1zM27 28h1v5h-1zM17 40h1v4h-1z" fill="#d4e0ca" opacity=".38" /></pattern></defs>
    <GardenBackground atmosphere={garden.atmosphere} />
    {DECOR_SLOTS.map((slot) => {
      const decoration = garden.decorations.find((item) => item.slotId === slot.id);
      const type = slot.kinds?.[0] || slot.kind;
      const width = type === 'bench' ? 62 : 34;
      const top = type === 'bench' ? -34 : type === 'lantern' ? -40 : -22;
      return <GardenObject key={slot.id} label={`${slot.label}: ${decoration ? DECOR_LABELS[decoration.kind] : 'espaço livre'}`} description="Escolher, mover ou guardar uma decoração deste ponto." onActivate={(event) => onDecorationSlot?.(slot.id, event)} data-slot-id={slot.id} aria-pressed={selectedSlot === slot.id} className={`garden-decoration-object${selectedSlot === slot.id ? ' is-selected' : ''}`}><g transform={`translate(${slot.x} ${slot.y})`}><GardenDecoration decoration={decoration} atmosphere={garden.atmosphere} /><rect className="garden-object-hit" x={-width/2} y={top} width={width} height={-top+5} /></g></GardenObject>;
    })}
    {PLANT_SLOTS.map((slot) => {
      const plant = garden.plants.find((item) => item.slotId === slot.id);
      const species = SPECIES.find((item) => item.id === plant?.species);
      const stage = plant ? getPlantStage(plant) : undefined;
      const pot = garden.pots.find((item) => item.slotId === slot.id);
      const effect = activePlantEffect?.slotId === slot.id ? activePlantEffect : null;
      return <GardenObject key={slot.id} label={`${slot.label}: ${plant ? species?.label || plant.species : 'espaço livre'}`} description={plant ? `${['Semente plantada', 'Pequeno broto', 'Planta jovem', 'Planta desenvolvida'][stage]}. ${tool === 'water' ? 'Ative para regar.' : 'Ative para tocar ou escolher uma ação.'}` : 'Um espaço pronto para plantar. Ative para escolher uma espécie.'} onActivate={(event) => onPlantSlot?.(slot.id, event)} data-slot-id={slot.id} data-stage={stage} aria-pressed={selectedSlot === slot.id} className={`garden-plant-object${selectedSlot === slot.id ? ' is-selected' : ''}`}>
        <g transform={`translate(${slot.x} ${slot.y})`}><path d="M-20-1h40v4h-40z" fill="#4f694c" opacity=".26" /><g key={effect?.kind === 'move' ? effect.key : 'arrangement'} className={effect?.kind === 'move' ? 'garden-arrangement-response' : undefined}>{slot.kind === 'bed' ? <><path d="M-24-9h48V1h-48z" fill="#8e7953" /><path d="M-25-11h50v4h-50z" fill="#bc9c6d" /><path d="M-22-10h44v4h-44z" fill="#72674a" /><path d="M-19-8h7v1h-7zM9-9h5v1H9zM-18-3h2v3h-2zM17-3h2v3h-2z" fill="#b09868" /></> : <GardenPot style={pot?.style} />}
          {plant ? <g transform={`translate(0 ${slot.kind === 'bed' ? -9 : -12})`}><GardenPlant species={plant.species} stage={stage} effect={effect} /></g> : <path className="garden-empty-plant" d="M-4-14h8v1h-8zM-1-17h2v7h-2z" fill="#d5c797" opacity=".7" />}
          {effect?.kind === 'water' && <g key={`water-${effect.key}`} className="garden-watering" pointerEvents="none"><g className="garden-watering-can"><path d="M12-43h13v3h4v12H12zM25-43h7v3h3v8h-6v-3h3v-4h-7zM12-37H8v-4H4v4h2v5h6z" fill="#7e9f96" /><path d="M13-42h11v2H13zM14-38h3v8h-3zM4-42h4v3H4z" fill="#c0cbb0" /><path d="M12-30h16v3H12z" fill="#4f7871" /></g><g className="garden-water-drops" fill="#c0d9cc"><path d="M3-33h2v4H3zM-1-27h2v3h-2zM6-25h2v4H6zM-5-21h2v3h-2zM2-17h2v3H2z" /></g><path className="garden-water-spark" d="M-14-30h2v6h-2zM-16-28h6v2h-6zM14-16h2v6h-2zM12-14h6v2h-6z" fill="#e8d9a0" /></g>}
          </g><rect className="garden-object-hit" x="-26" y="-53" width="52" height="58" />
        </g>
      </GardenObject>;
    })}
    <GardenCat reducedMotion={reducedMotion} paused={paused} ObjectControl={GardenObject} onInteract={onWildlife} />
    <GardenWildlife atmosphere={garden.atmosphere} reducedMotion={reducedMotion} paused={paused} ObjectControl={GardenObject} onInteract={onWildlife} />
    {companion && <Companion world="garden" settings={companion.settings} reducedMotion={reducedMotion}
      paused={paused || companion.paused} context={{ atmosphere: garden.atmosphere, rainOn: garden.weather === 'rain' }}
      onInteract={companion.onInteract} />}
    <GardenAtmosphere atmosphere={garden.atmosphere} weather={garden.weather} rainId={rainId} />
    <GardenObject label="Ferramentas do jardim" description="Abrir as ferramentas para plantar, regar, mover e decorar." onActivate={onOpenTools} className="garden-tool-object"><g transform="translate(19 225)"><path d="M-10-15h21V0h-21z" fill="#8c7353" /><path d="M-12-18h25v5h-25zM-9-14h3v13h-3z" fill="#b79a6c" /><path d="M-11-13h23v2h-23zM-1-17h4v5h-4z" fill="#d7be8a" /><path d="M-6-20v-12h2v12zM-9-33h8v5h-8z" fill="#657b66" /><path d="M7-20v-9h2v9zM4-30h8v2H4zM6-34h2v4H6zM9-34h2v4H9z" fill="#d0bf92" /><rect className="garden-object-hit" x="-15" y="-36" width="31" height="41" /></g></GardenObject>
    <GardenObject label="Atmosfera do jardim" description="Escolher o período do dia e uma chuva suave." onActivate={onOpenAtmosphere} className="garden-atmosphere-object"><g transform="translate(462 112)"><path d="M-2-29h3V0h-3zM-14-27h26v14h-26z" fill="#8f7f59" /><path d="M-13-26h24v11h-24z" fill="#c4b489" /><path d="M-7-24h6v2h-6zM-8-22h8v4h-8zM-7-18h6v2h-6z" fill="#e6d19e" /><path d="M4-23h3v3H4zM5-18h1v2H5z" fill="#738b75" /><rect className="garden-object-hit" x="-16" y="-31" width="32" height="35" /></g></GardenObject>
  </svg>;
}

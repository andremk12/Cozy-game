import { PAPERS, RIBBONS } from '../../../shared/bouquets.js';
import { FlowerStem } from '../Garden/GardenPlants.jsx';

// Positions belong to the composition, not to the artwork's eventual file format.
export function bouquetPositions(count) {
  if (count < 1) return [];
  if (count === 1) return [{ x: 0, y: -8 }];
  const back = Math.ceil(count / 2);
  const front = count - back;
  const row = (size, y, width) => Array.from({ length: size }, (_, i) => ({
    x: size === 1 ? 0 : Math.round((i / (size - 1) - 0.5) * width),
    y: y + Math.round(Math.abs(i - (size - 1) / 2) * 3),
  }));
  return [...row(back, -29, Math.min(100, (back - 1) * 24)), ...row(front, -2, Math.min(88, (front - 1) * 27))];
}

export function BouquetArrangement({ bouquet }) {
  const paper = PAPERS.find(({ id }) => id === bouquet.paper)?.color || '#b79468';
  const ribbon = RIBBONS.find(({ id }) => id === bouquet.ribbon)?.color || '#eee6ce';
  const positions = bouquetPositions(bouquet.stems.length);
  const paperScale = Math.min(1, .3 + bouquet.stems.length * .1);
  const leafScale = Math.min(1, .4 + bouquet.stems.length * .1);
  if (!bouquet.stems.length) return <g opacity=".65"><path d="M83 142h74v3H83zM94 148h52v2H94z" fill="#ac9875" /><path d="M117 97h6v26h-6zM107 107h26v6h-26z" fill="#a5b28c" /></g>;
  return <g transform="translate(120 137)">
    <g transform={`scale(${paperScale} 1)`}><g className="bouquet-paper-back"><path d="M-59-39L-29 40H28L59-39 0-16z" fill={paper} /><path d="M-59-39L0-16 59-39 39-40 0-28-38-40z" fill="#fff5da" opacity=".28" /></g></g>
    {bouquet.foliage && <g fill="#708c61" transform={`scale(${leafScale})`}><path d="M-15 20L-49-40h-10v-9h-8v-13h9v9h8v12L-9 18zM10 21L42-48h9v-11h9v-12h-10v12h-9v11L6 18z" /><path d="M-16 0h-21v-10h-11v-9h13v8h15zM15-6h17v-12h12v-11H31v11H19z" fill="#95ab75" /></g>}
    <g className="bouquet-flower-layer">
      {bouquet.stems.map((species, index) => <g key={`${species}-${index}`} data-bouquet-stem={species}>
        <path d={`M${positions[index].x} ${positions[index].y - 2}L0 34`} stroke="#617b4d" strokeWidth="2" />
        <g transform={`translate(${positions[index].x} ${positions[index].y})`}><FlowerStem species={species} /></g>
      </g>)}
    </g>
    <g transform={`scale(${paperScale} 1)`}><g className="bouquet-paper-front"><path d="M-48-9L-27 42H27L45-9 0 12z" fill={paper} /><path d="M-48-9L0 12 27 42H18L-8 18z" fill="#fff8e7" opacity=".25" /><path d="M45-9L0 12-27 42h9L8 18z" fill="#675545" opacity=".16" /><path d="M-27 42h54v3h-54z" fill="#675545" opacity=".18" /></g></g>
    <g transform={`translate(0 21) scale(${paperScale}) translate(0 -21)`}><g className="bouquet-ribbon" fill={ribbon}><path d="M-24 19h48v5h-48zM-5 18L-19 8h-8v10l16 9h8zM5 18L19 8h8v10l-16 9H3zM-4 24l-10 18 8-3 4 4 4-19zM4 24l10 18-8-3-4 4-4-19z" /><path d="M-4 18h8v8h-8z" /><path d="M-22 12h4l8 7h-5l-7-4zM22 12h-4l-8 7h5l7-4z" fill="#736052" opacity=".22" /></g></g>
    {bouquet.tag && <g transform={`translate(${Math.round(29 * paperScale)} 17)`}><path d="M0-2h15v19H0z" fill="#f3e6c7" /><path d="M3 4h3v3h3V4h3v6H9v3H6v-3H3z" fill="#bc7380" /><path d="M0 1L-8 4" stroke="#8b775b" /></g>}
  </g>;
}

export default function BouquetCanvas({ bouquet, svgRef, className = '', label = 'Buquê montado' }) {
  return <svg ref={svgRef} className={`bouquet-canvas ${className}`} viewBox="0 0 240 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-label={label} shapeRendering="crispEdges">
    <title>{label}</title><BouquetArrangement bouquet={bouquet} />
  </svg>;
}

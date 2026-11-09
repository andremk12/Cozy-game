import { FlowerStem, GardenPot } from '../Garden/GardenPlants.jsx';
import Companion from '../../components/companion/Companion.jsx';
import { BouquetArrangement } from './BouquetCanvas.jsx';

export default function WorkshopArt({ bouquet, companion, reducedMotion, active }) {
  return <svg className="bouquet-workshop-art" viewBox="0 0 480 270" role="group" aria-label="Ateliê de flores: mesa de madeira, janela para o jardim, papéis, fitas e seu buquê" shapeRendering="crispEdges">
    <rect width="480" height="270" fill="#7b7056" /><path d="M0 0h480v175H0z" fill="#b7aa84" />
    <path d="M0 12h480v2H0zM0 166h480v8H0z" fill="#8d795a" />
    {Array.from({ length: 12 }, (_, i) => <path key={i} d={`M${i * 42} 14v152h1V14z`} fill="#aa9d78" />)}
    <path d="M164 17h153v125H164z" fill="#74634e" /><path d="M170 23h141v111H170z" fill="#d0ca9e" />
    <path d="M175 28h131v99H175z" fill="#a9c1ad" /><path d="M175 84h25V72h21v8h28V67h22v11h35v49H175z" fill="#829b71" />
    <path d="M175 105h131v22H175z" fill="#6b8960" /><path d="M180 107h12v3h-12zM279 99h9v3h-9z" fill="#e7d29b" />
    <path d="M236 24h6v109h-6zM171 73h139v5H171z" fill="#8f7958" /><path d="M159 133h163v7H159z" fill="#ceb18a" />
    <path d="M169 23h10v105h-6V39h-4zM300 23h11v105h-6V39h-5z" fill="#e7d6ad" />
    <path d="M28 60h105v6H28zM35 66h6v9h-6zM120 66h6v9h-6z" fill="#816648" />
    <g transform="translate(52 60)"><FlowerStem species="lavender" /><GardenPot /></g>
    <g transform="translate(104 60)"><FlowerStem species="daisy" /><GardenPot style="wood" /></g>
    <path d="M345 49h99v7h-99zM353 56h5v8h-5zM432 56h5v8h-5z" fill="#816648" />
    <path d="M357 32h21v17h-21z" fill="#e3c7b0" /><path d="M359 32l8 7 9-7M359 47l6-6M376 47l-7-6" fill="none" stroke="#b7977d" />
    <path d="M391 28h18v21h-18zM413 33h16v16h-16z" fill="#ddd3af" /><path d="M395 35h10v2h-10zM395 40h8v2h-8z" fill="#b69d78" />
    <path d="M0 178h480v92H0z" fill="#8c7356" /><path d="M0 207h480v2H0zM0 241h480v2H0zM90 178v29h2v-29zM324 209v32h2v-32zM166 243v27h2v-27z" fill="#6e5c48" />
    <path d="M38 183h406v18H38zM50 201h14v63H50zM414 201h14v63h-14z" fill="#65513e" /><path d="M30 173h422v14H30z" fill="#b58b61" /><path d="M34 174h414v4H34z" fill="#d3ab7b" /><path d="M38 186h406v4H38z" fill="#785c43" />
    <path d="M61 151h48v19H61z" fill="#d1c1a0" /><path d="M68 146h48v20H68z" fill="#b0b89b" /><path d="M76 142h44v20H76z" fill="#c5afc6" />
    <g transform="translate(51 173)"><FlowerStem species="rose-pink" /><GardenPot /></g>
    <g transform="translate(425 173)"><FlowerStem species="hydrangea" /><GardenPot style="wood" /></g>
    <path d="M355 154h17v16h-17zM378 151h17v19h-17z" fill="#927263" /><path d="M358 157h11v9h-11z" fill="#e7ceba" /><path d="M381 154h11v12h-11z" fill="#a7b9bf" />
    <path d="M122 170l12-11M123 156l12 14" stroke="#c8c8ad" strokeWidth="3" /><path d="M116 155h6v6h-6zM117 167h6v6h-6z" fill="none" stroke="#63785c" strokeWidth="2" />
    <path d="M331 161h17v11h-17z" fill="#e5d5b3" /><path d="M332 162l7 5 8-5" fill="none" stroke="#ab9472" />
    <path d="M339 0h3v20h-3z" fill="#78664f" /><path d="M326 19h28v6h5v8h-38v-8h5z" fill="#d9bc78" /><path d="M326 33h28v4h-28z" fill="#f2d99d" />
    <g transform="translate(120 10)"><BouquetArrangement bouquet={bouquet} /></g>
    <path d="M85 231h65v22H85zM88 226h59v5H88z" fill="#aa8961" /><path d="M89 236h57v2H89zM89 244h57v2H89zM100 231v21h2v-21zM118 231v21h2v-21zM136 231v21h2v-21z" fill="#806344" />
    {companion && <g transform="translate(-16 -8)"><Companion {...companion} world="garden" reducedMotion={reducedMotion} paused={!active || companion.paused} /></g>}
  </svg>;
}

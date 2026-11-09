import { useId } from 'react';
import Companion from '../../components/companion/Companion.jsx';
import { KITCHEN_COMPANION_PLACES, kitchenHeadAnchor } from '../../services/kitchenCompanionMotion.js';
import { PreparationDrawing, RecipeDrawing } from './KitchenRecipeArt.jsx';

function KitchenObject({ label, hint, onActivate, children, ...props }) {
  return <g className="kitchen-object" role="button" tabIndex="0" aria-label={label} onClick={onActivate}
    onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); if (!event.repeat) onActivate(event); } }} {...props}>
    <title>{hint || label}</title>{children}
  </g>;
}

function Plant({ x, y, small = false }) {
  return <g transform={`translate(${x} ${y}) scale(${small ? .75 : 1})`}>
    <path d="M-8-10H9V0H6v4H-5V0h-3z" fill="#a36e51" /><path d="M-9-12h19v4H-9zM-6-6h2v8h-2z" fill="#c69769" />
    <path d="M0-11v-20h2v20zM0-22h-8v-5h-4v-5h7v5h5zM1-18h9v-5h4v-5H7v5H1zM0-29h-5v-8h6v8z" fill="#718b53" />
    <path d="M-10-31h5v2h-5zM8-27h5v2H8zM-3-36h3v2h-3z" fill="#a3b775" />
  </g>;
}

function Window({ atmosphere, weather, id }) {
  const night = atmosphere === 'night';
  const sunset = atmosphere === 'sunset';
  return <g aria-hidden="true">
    <path d="M164 24h143v99H164z" fill="#624e3f" /><path d="M168 28h135v90H168z" fill="#af9064" />
    <g clipPath={`url(#${id})`}>
      <path d="M173 33h125v81H173z" fill={night ? '#4e6579' : sunset ? '#d5a284' : '#a7c4bc'} />
      <path d="M173 62h125v52H173z" fill={night ? '#617889' : sunset ? '#e9bd92' : '#ced7b8'} />
      <path d="M264 43h10v3h3v10h-3v3h-10v-3h-3V46h3z" fill={night ? '#e0d7ac' : '#f2dbac'} />
      {night && <path d="M186 44h2v2h-2zM213 39h2v2h-2zM245 48h2v2h-2zM290 38h2v2h-2z" fill="#e6dfb9" />}
      <path d="M173 89h12V78h12V68h13v10h11v9h13V76h14V66h14v12h15v8h21v28H173z" fill={night ? '#4a6465' : '#879c7b'} />
      <path d="M173 99h18v-9h18v8h16v-8h16v9h20v-9h14v8h23v16H173z" fill={night ? '#345654' : '#617e61'} />
      <path d="M174 104h125v3H174zM181 96h5v18h-5zM210 96h5v18h-5zM239 96h5v18h-5zM269 96h5v18h-5z" fill="#a89b7a" />
      {weather === 'rain' && <g className="kitchen-window-rain" stroke="#dbe0ce" strokeWidth="1" opacity=".5"><path d="M180 26v9m21 4v9m18-21v11m19 14v10m25-37v9m18 10v9M190 70v12m24-20v10m20 12v11m28-28v10m21 11v12" /></g>}
    </g>
    <path d="M170 29h131v5H170zM170 110h131v8H170zM170 32h5v81h-5zM295 32h6v81h-6zM232 32h5v81h-5zM173 72h124v4H173z" fill="#d3bd8b" />
    <path d="M161 117h148v7H161zM165 124h141v3H165z" fill="#b78e61" /><path d="M162 117h145v2H162z" fill="#e0c490" />
    <path d="M159 26h10v71h-4v10h-7zM299 26h12v80h-5v-9h-7z" fill="#879479" /><path d="M160 29h3v64h-3zM304 29h3v66h-3z" fill="#b1b59a" />
  </g>;
}

function Backdrop({ settings, fridgeOpen, kettleOn, simmering, utensils, recipeId, stage, progress, status, celebrate, id }) {
  const lamp = settings.lampOn;
  return <>
    <g aria-hidden="true" pointerEvents="none">
      <path d="M0 0h480v270H0z" fill="#b4ac86" /><path d="M0 0h480v12H0zM0 12h480v5H0z" fill="#7b6651" /><path d="M0 17h480v3H0z" fill="#d1bd91" />
      <path d="M0 129h480v62H0z" fill="#c3b999" />
      {Array.from({length:7},(_,i)=><path key={i} d={`M0 ${131+i*8}h480v1H0z`} fill="#aaa385" />)}
      {Array.from({length:30},(_,i)=><path key={i} d={`M${i*18+(i%2)*8} 130h1v60h-1z`} fill="#b3ac8e" />)}
      <path d="M0 189h480v81H0z" fill="#9b7c5b" /><path d="M0 190h480v5H0z" fill="#745c47" />
      {[207,228,250,269].map(y=><g key={y}><path d={`M0 ${y}h480v2H0z`} fill="#80684e" /><path d={`M0 ${y+2}h480v1H0z`} fill="#b18e63" /></g>)}
      <path d="M37 195v12m105-12v12m117-12v12m114-12v12M82 209v19m115-19v19m114-19v19m114-19v19M22 230v20m115-20v20m114-20v20m114-20v20M79 252v17m115-17v17m114-17v17m114-17v17" stroke="#80684e" />
      <path d="M100 250h216v4H100zM103 236h210v22H103zM109 232h197v30H109z" fill="#7c8a6d" /><path d="M113 237h189v20H113z" fill="#aab18b" /><path d="M118 240h179v14H118z" fill="#929f78" /><path d="M125 244h166v2H125zM125 250h166v2H125z" fill="#b8bd94" />
      <Window atmosphere={settings.atmosphere} weather={settings.weather} id={id} />
      {/* Upper cabinets, pottery and a handwritten family kitchen. */}
      <path d="M9 28h135v53H9z" fill="#786749" /><path d="M13 32h60v45H13zM77 32h63v45H77z" fill="#a4a580" /><path d="M17 36h52v36H17zM81 36h55v36H81z" fill="#b1b18b" />
      <path d="M19 38h48v2H19zM83 38h51v2H83zM64 52h3v9h-3zM83 52h3v9h-3z" fill="#d2c59b" /><path d="M10 80h135v5H10z" fill="#b18e62" />
      <path d="M18 22h19v5H18zM20 17h15v5H20z" fill="#9c7351" /><path d="M48 20h17v7H48zM52 16h9v5h-9z" fill="#d0c3a0" />
      <path d="M321 50h109v5H321zM327 55h4v8h-4zM417 55h4v8h-4zM322 97h110v5H322zM329 102h4v8h-4zM419 102h4v8h-4z" fill="#9c7954" /><path d="M321 49h109v2H321zM322 96h110v2H322z" fill="#dcc08b" />
      {[332,351,371].map((x,i)=><g key={x}><path d={`M${x} ${i===1?29:34}h12v15h-12z`} fill={['#c0bea0','#9aac98','#c69367'][i]} /><path d={`M${x-1} ${i===1?27:32}h14v3h-14z`} fill="#d8ccaa" /><path d={`M${x+3} ${i===1?35:40}h6v6h-6z`} fill="#e4d4ac" /></g>)}
      <path d="M332 84h19v12h-19zM335 78h13v7h-13z" fill="#b89167" /><path d="M362 79h12v16h-12zM374 81h6v10h-6v-3h3v-4h-3z" fill="#dad4b3" /><path d="M387 80h13v15h-13zM400 83h6v9h-6v-3h3v-3h-3z" fill="#96aba0" />
      <Plant x={414} y={47} small /><Plant x={286} y={117} small />
      {/* Refrigerator has a real opening, with shelves and tiny local ingredients. */}
      <path d="M15 87h71v132H15z" fill="#626e5d" /><path d="M19 91h63v124H19z" fill="#b0bb9d" /><path d="M22 95h57v116H22z" fill="#dde0c1" />
      {fridgeOpen ? <>
        <path d="M26 105h49v3H26zM26 133h49v3H26zM26 164h49v3H26zM26 193h49v3H26z" fill="#a0b09c" />
        <path d="M32 112h10v17H32zM34 108h6v4h-6zM52 117h15v13H52z" fill="#c3b386" /><path d="M34 116h6v7h-6z" fill="#90aa98" /><path d="M31 142h10v16H31zM46 145h10v13H46zM60 142h10v16H60z" fill="#c69a61" /><path d="M30 179h16v10H30zM51 174h18v15H51z" fill="#839c69" />
        <path d="M6 95h16v119H6z" fill="#a6b596" /><path d="M8 100h9v20H8zM8 133h9v28H8zM8 178h9v25H8z" fill="#d5d9b9" /><path d="M13 126h4v9h-4z" fill="#697e6e" />
      </> : <>
        <path d="M19 91h63v39H19zM19 134h63v81H19z" fill="#b7c0a0" /><path d="M23 94h55v2H23zM23 138h55v2H23zM24 96h3v31h-3zM24 140h3v70h-3z" fill="#d4d6b1" />
        <path d="M72 113h4v13h-4zM72 142h4v22h-4z" fill="#647e6d" /><path d="M31 145h24v27H31z" fill="#e4d4a5" /><path d="M34 153h17v1H34zM34 158h12v1H34zM34 164h16v1H34z" fill="#b29f75" /><path d="M40 142h7v5h-7z" fill="#ad7961" />
        <path d="M29 103h7v7h-7zM48 115h6v6h-6zM60 96h7v5h-7z" fill="#ad795c" /><path d="M32 105h2v3h-2zM49 115h4v2h-4z" fill="#d8bc88" />
      </>}
      <path d="M22 219h9v4h-9zM71 219h9v4h-9z" fill="#594e3c" />
      {/* Low sage cabinets and a substantial wooden worktop. */}
      <path d="M98 145h211v68H98z" fill="#71836b" /><path d="M103 155h62v53h-62zM169 155h65v53h-65zM238 155h67v53h-67z" fill="#8f9d7c" /><path d="M108 160h52v43h-52zM174 160h55v43h-55zM244 160h55v43h-55z" fill="#99a582" />
      <path d="M157 174h3v10h-3zM174 174h3v10h-3zM243 174h3v10h-3z" fill="#d5bf8a" /><path d="M97 211h214v5H97zM98 216h10v5H98zM299 216h10v5h-10z" fill="#635c45" />
      <path d="M94 138h219v9H94zM98 147h212v5H98z" fill="#a77d52" /><path d="M95 137h218v3H95zM103 142h196v1H103z" fill="#d0aa72" />
      <path d="M111 140h55v4h-55zM117 133h43v7h-43z" fill="#83958a" /><path d="M121 135h35v5h-35z" fill="#596e66" /><path d="M139 132v-10h3v-3h11v3h-8v10z" fill="#b9c5ad" />
      <path d="M179 130h16v7h-16zM183 120h8v10h-8z" fill="#b99667" /><path d="M182 113h2v12h-2zM187 110h2v15h-2zM191 114h2v11h-2z" fill="#6f6249" />
      {/* Stove, glowing oven and hanging copper utensils. */}
      <path d="M316 133h75v82h-75z" fill="#4c615a" /><path d="M319 140h69v13h-69z" fill="#a7b0a0" />
      {[329,345,362,379].map(x=><g key={x}><path d={`M${x-3} 143h7v7h-7z`} fill="#5c6d5f" /><path d={`M${x} 143h1v3h-1z`} fill="#ddd1a4" /></g>)}
      <path d="M322 158h63v48h-63z" fill="#333e39" /><path d="M326 164h55v34h-55z" fill={status==='running' && ['cooking','oven','baking'].includes(stage) ? '#b27c47' : '#555c4a'} /><path d="M327 165h53v3h-53zM327 195h53v3h-53z" fill="#b99861" /><path d="M328 158h51v3h-51z" fill="#d7caa3" /><path d="M318 132h71v8h-71z" fill="#b9bdab" /><path d="M325 132h20v3h-20zM361 132h20v3h-20z" fill="#44524c" />
      <path d="M320 214h8v8h-8zM381 214h8v8h-8z" fill="#4c5140" />
      <path d="M317 118h30v12h-30zM313 118h4v5h-4zM347 118h5v5h-5z" fill="#b07e56" /><path d="M318 115h28v4h-28zM327 112h10v3h-10z" fill="#d4ae76" />
      {simmering && <g className="kitchen-pot-steam kitchen-dish-steam" fill="#f1dfb6" opacity=".65"><path d="M322 110v-5h2v-7h2v8h-2v4zM338 107v-5h2v-7h2v8h-2v4z" /></g>}
      <path d="M321 67h107v3H321z" fill="#7a6850" />
      <g className={utensils ? 'kitchen-utensils is-touched' : 'kitchen-utensils'}>
        <path d="M333 70v13m20-13v15m22-15v13m21-13v13" stroke="#75614a" strokeWidth="2" />
        <path d="M326 82h15v12h-15zM328 80h11v3h-11zM348 85h10v10h-10zM373 82h4v12h-4zM389 82h14v12h-14z" fill="#b88459" />
        <path d="M329 84h9v2h-9zM351 87h4v2h-4zM392 84h8v2h-8z" fill="#e2bd84" />
      </g>
      {/* Kettle station and the recipe book are drawn objects, never icons. */}
      <path d="M400 143h68v70h-68z" fill="#8a9676" /><path d="M397 138h74v9h-74z" fill="#b18a5c" /><path d="M402 154h60v49h-60z" fill="#9daa84" /><path d="M407 159h50v39h-50zM429 155h4v4h-4z" fill="#b6b995" />
      <path d="M409 130v-16h4v-4h18v4h4v16zM408 123h-7v-11h4v7h4zM432 115h10v7h-7z" fill="#8da69b" /><path d="M415 109v-7h13v7h-3v-4h-7v4zM413 110h19v3h-19z" fill="#5f7b70" /><path d="M411 130h25v4h-25zM413 116h3v11h-3z" fill="#b4c4a9" />
      {kettleOn && <g className="kitchen-kettle-steam" fill="#f1dfb6" opacity=".75"><path d="M439 109v-6h2v-7h2v8h-2v5zM431 100v-5h2v-8h2v9h-2v4z" /></g>}
      <path d="M444 120h13v14h-13zM457 122h7v9h-7v-3h4v-3h-4z" fill="#d4c8a5" /><path d="M445 120h11v3h-11z" fill="#876143" />
      <path d="M449 20h18v4h4v26h-4v4h-18v-4h-4V24h4z" fill="#866b4f" /><path d="M450 25h16v24h-16zM447 28h22v17h-22z" fill="#d8d0ac" /><path d="M457 28h2v10h8v2h-10zM457 45h2v3h-2zM450 36h3v2h-3z" fill="#6d775e" />
      <Plant x={451} y={208} /><path d="M430 212h37v4h-37zM434 216h4v13h-4zM459 216h4v13h-4z" fill="#8c6f4e" />
      {/* A linen-covered table for the finished dish. */}
      <path d="M157 219h159v11H157zM162 230h9v33h-9zM303 230h9v33h-9z" fill="#7e6047" /><path d="M153 214h167v8H153z" fill="#b88f60" /><path d="M154 214h166v2H154z" fill="#ddba80" />
      <path d="M184 212h102v19h-7v4h-13v-4h-68v-4h-14z" fill="#ddd0a6" /><path d="M188 216h94v2h-94zM188 222h94v2h-94zM203 212h2v18h-2zM269 212h2v20h-2z" fill="#b77b5f" opacity=".6" />
      <path d="M123 223h23v6h-23zM126 229h4v25h-4zM139 229h4v25h-4z" fill="#896949" /><path d="M120 221h29v5h-29z" fill="#ba9566" />
      {/* Pendant lights: warm stepped pools keep the pixel grid intact. */}
      <path d="M121 17h2v22h-2zM359 17h2v12h-2z" fill="#625440" /><path d="M108 42h28v6h-28zM113 36h18v6h-18zM348 33h25v6h-25zM352 28h17v5h-17z" fill="#78856a" /><path d="M109 48h26v3h-26zM349 39h23v3h-23z" fill={lamp ? '#f0d39a' : '#b2a782'} />
      {lamp && <g fill="#efd498" opacity=".1"><path d="M109 51h26v15h8v15h8v28h-58V81h8V66h8zM349 42h23v16h8v20h8v40h-55V78h8V58h8z" /></g>}
      {!lamp && <path d="M0 0h480v270H0z" fill="#293f43" opacity=".22" />}
    </g>
    {recipeId && status !== 'cancelled' && <g aria-hidden="true" pointerEvents="none" data-kitchen-stage={stage}>
      {status === 'completed' ? <g transform="translate(206 175) scale(.82)"><RecipeDrawing recipeId={recipeId} progress={1} ready animate={celebrate} /></g>
        : ['cooking','oven','baking'].includes(stage) && ['cake','bread','cookies','toast'].includes(recipeId)
          ? <g transform="translate(329 166) scale(.67 .55)"><PreparationDrawing recipeId={recipeId} stage={stage} progress={progress} /></g>
          : <g transform="translate(244 98) scale(.68)"><PreparationDrawing recipeId={recipeId} stage={stage} progress={progress} /></g>}
    </g>}
  </>;
}

export default function KitchenScene({ settings, objects, view, session, companion, reducedMotion, paused, celebrate, onObject, renderSpeech }) {
  const uniqueId = useId().replaceAll(':','');
  const windowId = `kitchen-window-${uniqueId}`;
  const fallbackState={position:KITCHEN_COMPANION_PLACES.table,pose:'sitting',facing:-1,kitchenPhase:'acting',action:'presenting'};
  return <svg className="kitchen-art" viewBox="0 0 480 270" shapeRendering="crispEdges" role="group" aria-labelledby={`kitchen-title-${uniqueId} kitchen-desc-${uniqueId}`}>
    <title id={`kitchen-title-${uniqueId}`}>Uma cozinha caseira, um tempo só seu</title>
    <desc id={`kitchen-desc-${uniqueId}`}>Cozinha original em pixel art, com armários verdes, bancada de madeira, fogão, forno, geladeira com bilhetes, prateleiras, panelas, plantas, luminárias e uma janela tranquila. Um livro de receitas repousa ao lado da pia. Explore os objetos com Tab e Enter.</desc>
    <defs><clipPath id={windowId}><path d="M173 33h125v81H173z" /></clipPath></defs>
    <Backdrop settings={settings} fridgeOpen={objects.fridgeOpen} kettleOn={objects.kettleOn} simmering={objects.simmering} utensils={objects.utensils}
      recipeId={session?.recipeId} stage={view.stage?.id} progress={view.progress} status={session?.status} celebrate={celebrate} id={windowId} />
    <KitchenObject label="Luminárias da cozinha" hint={settings.lampOn ? 'Apagar luminárias' : 'Acender luminárias'} aria-pressed={settings.lampOn} onActivate={(event)=>onObject('lamp',event)}><rect className="kitchen-object-hit" x="102" y="32" width="40" height="34" /></KitchenObject>
    <KitchenObject label="Janela da cozinha" hint="Escolher a luz e o clima" aria-haspopup="dialog" onActivate={(event)=>onObject('atmosphere',event)}><rect className="kitchen-object-hit" x="170" y="30" width="132" height="87" /></KitchenObject>
    <KitchenObject label="Livro de receitas" hint="Abrir as sete receitas" aria-haspopup="dialog" onActivate={(event)=>onObject('book',event)}
      transform="translate(198 104)" data-kitchen-book="closed">
      <g aria-hidden="true" pointerEvents="none">
        <path d="M0 33h40v2H0zM3 35h34v1H3z" fill="#785e44" opacity=".4" />
        <g data-book-support="wood"><path d="M4 17h3v14H4zM32 17h3v14h-3zM1 30h38v4H1zM6 27h29v4H6z" fill="#9e7951" /><path d="M3 30h34v2H3zM6 18h1v10H6zM33 18h1v10h-1z" fill="#c8a36b" /></g>
        <g data-book-art="closed" className="kitchen-book-cover">
          <path d="M5 4h27v2h3v23H5z" fill="#71513e" /><path d="M8 25h26v3H8zM10 28h23v1H10z" fill="#e7d4a5" />
          <path d="M6 2h25v2h3v21H6z" fill="#a86f52" /><path d="M6 2h4v23H6z" fill="#79513e" /><path d="M11 5h19v16H11z" fill="#b7815b" />
          <path d="M12 6h17v1H12zM12 19h17v1H12zM8 5h1v3H8zM8 18h1v3H8zM11 23h20v1H11z" fill="#d2aa73" />
          <path d="M15 12h12v3h-2v3h-8v-3h-2zM17 10h8v2h-8zM20 8h2v2h-2z" fill="#ead3a1" />
          <path className="kitchen-book-glint" d="M12 6h17v2H12zM12 8h2v11h-2z" fill="#f0d8a3" />
          <path d="M26 25h3v7l-2-1-1 1z" fill="#75866b" />
        </g>
        {!settings.lampOn&&<path d="M1 2h34v32H1z" fill="#293f43" opacity=".13" />}
      </g>
      <rect className="kitchen-object-hit" data-book-hit="true" x="0" y="0" width="40" height="34" />
    </KitchenObject>
    <KitchenObject label="Geladeira" hint={objects.fridgeOpen ? 'Fechar geladeira' : 'Abrir geladeira'} aria-expanded={objects.fridgeOpen} onActivate={(event)=>onObject('fridge',event)}><rect className="kitchen-object-hit" x="20" y="90" width="62" height="45" /></KitchenObject>
    <KitchenObject label="Bilhete da geladeira" hint="Ler um pequeno bilhete" aria-haspopup="dialog" onActivate={(event)=>onObject('note',event)}><rect className="kitchen-object-hit" x="29" y="140" width="31" height="37" /></KitchenObject>
    <KitchenObject label="Utensílios da cozinha" hint="Tocar as pequenas panelas" onActivate={(event)=>onObject('utensils',event)}><rect className="kitchen-object-hit" x="322" y="67" width="87" height="28" /></KitchenObject>
    <KitchenObject label="Panela no fogão" hint="Ouvir o cozimento suave e ver um pouco de vapor" aria-pressed={objects.simmering} onActivate={(event)=>onObject('pot',event)}><rect className="kitchen-object-hit" x="311" y="109" width="43" height="23" /></KitchenObject>
    <KitchenObject label="Chaleira" hint="Preparar um pouco de vapor" aria-pressed={objects.kettleOn} onActivate={(event)=>onObject('kettle',event)}><rect className="kitchen-object-hit" x="401" y="99" width="42" height="36" /></KitchenObject>
    <KitchenObject label="Relógio da cozinha" hint="Consultar e controlar o tempo da receita" aria-haspopup="dialog" onActivate={(event)=>onObject('clock',event)}><rect className="kitchen-object-hit" x="443" y="18" width="30" height="39" /></KitchenObject>
    {session?.status==='completed'&&<KitchenObject label="Prato pronto na mesa" hint="Ver o prato e sua mensagem, sem repetir a celebração" onActivate={(event)=>onObject('result',event)}><rect className="kitchen-object-hit" x="205" y="181" width="62" height="37" /></KitchenObject>}
    {companion?.settings?.enabled!==false ? <Companion world="kitchen" settings={companion?.settings} reducedMotion={reducedMotion}
      paused={paused || companion?.paused} context={{ kitchenStage:view.stage,kitchenStatus:session?.status || 'idle',kitchenProgress:view.progress,
        kitchenSessionId:session?.id,kitchenElapsedMs:session?.elapsedMs,kitchenRecipeId:session?.recipeId,kitchenCelebrate:celebrate }}
      onInteract={companion?.onInteract} renderAnchoredContent={renderSpeech} />
      : <g className="companion-anchor" transform={`translate(${fallbackState.position.x} ${fallbackState.position.y})`}
        style={{'--kitchen-base-x':fallbackState.position.x,'--kitchen-base-y':fallbackState.position.y,'--kitchen-dx':0,'--kitchen-dy':0,'--kitchen-travel-progress':0}}>
        <g className="companion-travel">{renderSpeech?.({state:fallbackState,headAnchor:kitchenHeadAnchor(fallbackState)})}</g>
      </g>}
  </svg>;
}

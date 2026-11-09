// Original drawings on a small integer grid, shared by the book and the kitchen.
export function RecipeDrawing({ recipeId = 'tea', ready = true, progress = 1, stage = 'ready', animate = false }) {
  const warmth = progress > .65 ? '#dcaa61' : '#e5c88d';
  return <g className={`kitchen-dish kitchen-dish--${recipeId}${ready ? ' is-ready' : ''}${animate ? ' is-presenting' : ''}`} data-recipe-art={recipeId}>
    <path d="M7 48h58v3H7zM12 51h48v3H12z" fill="#a17d5b" opacity=".32" />
    {recipeId === 'tea' && <>
      <path d="M8 44h53v3H8zM15 47h40v2H15z" fill="#d9d8ba" />
      <path d="M18 20h31v22h-4v3H22v-3h-4zM49 23h11v3h3v12h-3v3H49v-5h8v-9h-8z" fill="#9bb6a5" />
      <path d="M21 20h25v5H21z" fill="#99623f" /><path d="M21 27h3v12h-3zM26 41h17v2H26z" fill="#d2d9b8" />
      <path d="M34 23h1v10h6v9h-8v-9h1z" fill="#d9b97d" />
      <g className="kitchen-dish-steam" fill="#e8dfc1" opacity=".7"><path d="M24 14v-5h2V3h2v7h-2v4zM39 14V9h2V2h2v8h-2v4z" /></g>
      <path d="M57 46h7v2h-7zM63 39h2v7h-2z" fill="#cab894" />
    </>}
    {recipeId === 'toast' && <>
      <path d="M7 42h59v6H7zM12 48h49v3H12z" fill="#d8d5b4" />
      <g className="kitchen-toast"><path d="M14 39V18h-3v-8h4V6h24v4h4v8h-3v21z" fill="#a96d3c" /><path d="M17 35V16h-3v-5h5V9h16v3h5v4h-3v19z" fill="#e5bd76" /><path d="M22 17h10v7H22z" fill="#eddb8b" /></g>
      <g className="kitchen-toast kitchen-toast--second"><path d="M34 42V23h-3v-8h5v-3h22v4h4v8h-3v18z" fill="#b57841" /><path d="M37 39V22h-3v-4h5v-3h15v4h5v3h-3v17z" fill="#e8c889" /><path d="M39 27h14v6H39zM42 24h9v12h-9z" fill="#bd6c55" /><path d="M42 25h6v2h-6z" fill="#d39468" /></g>
    </>}
    {recipeId === 'cookies' && <>
      <path d="M6 22h61v26H6zM9 25h55v20H9z" fill="#6f827b" /><path d="M10 26h53v18H10z" fill="#d6bf91" />
      {[[18,30],[38,30],[55,33],[27,40],[46,41]].map(([x,y],i) => <g key={i} className={`kitchen-cookie kitchen-cookie--${i}`}><path d={`M${x-7} ${y-4}h4v-3h7v3h4v8h-4v2h-7v-2h-4z`} fill={i%2 ? '#c58a4e' : '#dba460'} /><path d={`M${x-3} ${y-3}h3v3h-3zM${x+3} ${y+2}h2v2h-2zM${x-4} ${y+3}h2v2h-2z`} fill="#72513c" /></g>)}
      <path d="M4 21h65v3H4zM4 47h65v3H4z" fill="#acb9a3" />
    </>}
    {recipeId === 'soup' && <>
      <path d="M8 45h55v4H8zM15 49h42v3H15z" fill="#d7d1ac" /><path d="M12 26h47v13h-4v6H18v-6h-6z" fill="#bb7858" /><path d="M15 24h41v7H15z" fill="#d4b476" /><path d="M18 25h35v4H18z" fill="#b99358" />
      <path d="M22 25h5v3h-5zM36 26h4v3h-4zM46 25h4v3h-4z" fill="#b5653f" /><path d="M29 24h4v3h-4zM42 25h3v2h-3z" fill="#6d8c55" /><path d="M16 32h4v7h-4z" fill="#dfad79" />
      <g className="kitchen-soup-bubbles" fill="#e4cc91"><path d="M22 20h3v3h-3zM42 18h3v3h-3z" /></g><g className="kitchen-dish-steam" fill="#ddd7b6"><path d="M25 18v-5h2V7h2v7h-2v4zM42 15v-5h2V4h2v7h-2v4z" /></g>
      <path d="M61 19h3v21h-3zM59 15h7v7h-7z" fill="#acb9a7" />
    </>}
    {recipeId === 'pasta' && <>
      <path d="M5 35h62v8h-5v5H11v-5H5z" fill="#dedcc0" /><path d="M11 34h49v6H11z" fill="#b9bca1" /><path d="M15 30h7v-4h29v5h7v9H15z" fill="#d9ac65" />
      <g className="kitchen-pasta" fill="none" stroke="#edcd85" strokeWidth="2"><path d="M20 36v-7h7v8h7V26h7v11h7v-7h6M17 32h14v9h9v-9h10M23 24h21v5H23z" /></g><path d="M25 25h18v3h7v8H23v-8h2z" fill="#b76548" /><path d="M29 26h5v3h-5zM40 31h4v3h-4z" fill="#db9670" /><path d="M33 22h6v5h-6zM39 20h4v4h-4z" fill="#6b8a50" />
      <path d="M60 8h2v20h-2zM56 5h2v8h-2zM60 5h2v8h-2zM64 5h2v8h-2zM56 12h10v3H56z" fill="#b7c3b2" />
    </>}
    {recipeId === 'bread' && <>
      <path d="M4 42h65v7H4zM9 49h55v3H9z" fill="#b18b62" /><path d="M8 43h57v2H8z" fill="#dbbb82" />
      <g className="kitchen-loaf" style={{ '--loaf-rise': .7 + progress * .3 }}><path d="M10 40V25h4v-7h7v-5h27v4h8v7h4v16z" fill="#a96d3f" /><path d="M13 35V25h5v-6h7v-3h20v4h8v6h4v9z" fill={warmth} /><path d="M23 18h4v13h-4zM36 16h4v13h-4zM48 21h4v11h-4z" fill="#f0d39b" /><path d="M17 36h37v2H17z" fill="#bd884d" /></g>
      <path d="M53 39h11v7H53zM55 36h8v3h-8z" fill="#ead09a" /><path d="M58 38h2v5h-2z" fill="#c9a064" />
      {ready&&<g className="kitchen-bread-steam" fill="#e9dfbc" opacity=".6"><path d="M24 8V3h2v6h-2zM43 8V1h2v8h-2z" /></g>}
    </>}
    {recipeId === 'cake' && <>
      <path d="M4 44h65v4H4zM10 48h53v3H10z" fill="#d3d3b2" />
      <g className="kitchen-cake" style={{ '--cake-rise': .65 + progress * .35 }}><path d="M13 42V21h5v-6h36v6h5v21z" fill="#ba7742" /><path d="M17 25h38v15H17zM21 18h30v8H21z" fill={warmth} /><path d="M20 29h3v3h-3zM29 35h3v3h-3zM43 30h2v3h-2zM49 36h3v2h-3z" fill="#f1cf88" />
      {(ready || stage==='serving') && <g className="kitchen-cake-chocolate"><path d="M14 20h4v-6h36v5h5v8h-5v5h-5v-7h-7v4h-5v-4h-8v8h-5v-8H14z" fill="#604335" /><path d="M20 17h32v3H20zM48 23h5v3h-5z" fill="#95644a" /></g>}</g>
      {ready && <><path d="M34 12h3v-7h4v7z" fill="#da8b4b" /><path d="M35 4h3v3h-3zM39 2h3v5h-3z" fill="#6d8a50" /></>}
    </>}
  </g>;
}

export default function KitchenRecipeArt({ recipeId, ready = true, progress = 1, stage, animate = false, className = '' }) {
  return <svg className={`kitchen-recipe-art ${className}`} viewBox="0 0 72 58" shapeRendering="crispEdges" aria-hidden="true">
    <RecipeDrawing recipeId={recipeId} ready={ready} progress={progress} stage={stage} animate={animate} />
  </svg>;
}

export function PreparationDrawing({ recipeId, stage, progress }) {
  const baking = ['cooking','oven','baking'].includes(stage);
  const finishing = ['finishing','chocolate','serving','ready'].includes(stage);
  if (stage==='chocolate') return <g className="kitchen-chocolate-preparation"><g transform="translate(-8 -5) scale(.65)"><RecipeDrawing recipeId="cake" ready={false} progress={progress} stage={stage} /></g><path d="M34 29h28v17H34zM62 32h8v4h-8z" fill="#9a7757" /><path d="M36 28h24v6H36z" fill="#624331" /><g className="kitchen-spoon"><path d="M45 30V12h3v21z" fill="#b59367" /></g><path d="M53 17h10v8H53zM55 19h6v4h-6z" fill="#624331" /></g>;
  if (finishing) return <RecipeDrawing recipeId={recipeId} progress={progress} stage={stage} ready={stage === 'ready'} />;
  if (baking && ['toast','cookies','bread','cake'].includes(recipeId)) return <g className={`kitchen-oven-dish kitchen-oven-dish--${recipeId}`}><RecipeDrawing recipeId={recipeId} progress={progress} stage={stage} ready={false} /></g>;
  if (recipeId === 'tea') return <RecipeDrawing recipeId="tea" ready={false} progress={progress} stage={stage} />;
  return <g className={`kitchen-preparation kitchen-preparation--${recipeId}`}>
    {['ingredients'].includes(stage) ? <>
      <path d="M7 30h14v18H7zM9 26h10v4H9z" fill="#e0d4b0" /><path d="M10 35h8v7h-8z" fill="#a8b4a0" />
      <path d="M29 36h5v-5h7v5h4v10H29z" fill="#e8d8b0" /><path d="M48 30h5v-5h9v5h4v16H48z" fill="#e6c28a" />
      {recipeId === 'cake' && <><path d="M21 46h18v-5H21zM27 40h15v-5H27z" fill="#d68b4b" /><path d="M38 35h6v-4h3v7h-9z" fill="#76915b" /></>}
      {recipeId === 'toast' && <><path d="M23 43V24h3v-4h16v4h3v19z" fill="#d6b57a" /><path d="M27 25h13v13H27z" fill="#ead39a" /><path d="M49 35h14v5H49z" fill="#e5d38d" /></>}
      {recipeId === 'cookies' && <><path d="M22 42h24v6H22zM26 35h16v7H26z" fill="#d6b274" /><path d="M40 31h22v6H40zM35 33h31v2H35z" fill="#ad8453" /></>}
      {recipeId === 'soup' && <><path d="M22 46h19v-4H22zM27 40h18v-4H27z" fill="#d69450" /><path d="M37 35h6v-7h3v10h-9zM52 43h12v4H52zM55 39h6v4h-6z" fill="#78945d" /></>}
      {recipeId === 'pasta' && <><path d="M22 41h24v7H22zM26 36h16v5H26z" fill="#d8b975" /><path d="M47 33h4v14h-4zM54 31h4v16h-4zM61 34h4v13h-4z" fill="#e2ca91" /></>}
      {recipeId === 'bread' && <><path d="M23 41h4v-7h18v7h4v7H23z" fill="#e4cc97" /><path d="M26 37h17v2H26zM49 44h14v3H49z" fill="#f0dfb4" /></>}
    </> : <>
      <path d="M10 28h51v13h-5v7H17v-7h-7z" fill={recipeId === 'soup' ? '#a56b54' : '#91ada1'} /><path d="M13 25h45v6H13z" fill="#cdb98b" /><path d="M19 27h33v3H19z" fill={recipeId === 'pasta' ? '#d8b76d' : '#e1c28c'} />
      <g className="kitchen-spoon"><path d="M39 28V8h4v23z" fill="#a77e50" /><path d="M37 29h8v6h-8z" fill="#b88b58" /></g>
      {baking && <g className="kitchen-dish-steam" fill="#e3d9b5"><path d="M22 18v-5h2V6h2v8h-2v4zM48 18v-6h2V5h2v8h-2v5z" /></g>}
    </>}
  </g>;
}

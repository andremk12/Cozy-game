export function PaperBoat({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 44 29" shapeRendering="crispEdges" aria-hidden="true">
      <path d="M3 18h38l-9 10H13Z" fill="#e9d5af" />
      <path d="m3 18 19 4 19-4-9 10H13Z" fill="#c7aa83" />
      <path d="M22 1 5 18h17Z" fill="#f4e9cc" />
      <path d="M22 1v17h17Z" fill="#d6c29d" />
      <path d="m22 1-4 17h4Z" fill="#a68a6b" />
      <path d="M13 28h19v1H13Z" fill="#678a8e" />
    </svg>
  );
}

export default function River({ children, phase = 'writing' }) {
  return (
    <div className={`river-scene river-${phase}`}>
      <svg
        className="river-art"
        viewBox="0 0 480 270"
        shapeRendering="crispEdges"
        role="img"
        aria-label="Um rio tranquilo sob a lua, cercado por árvores e pequenos vagalumes."
      >
        <rect width="480" height="270" fill="#263b4b" />
        <path d="M0 0h480v105H0Z" fill="#293b50" />
        <path
          d="M0 74h26V61h29V46h24v12h21V41h28v15h30V37h25v23h22V48h40v17h23V43h25v14h31V37h24v19h34V44h25v20h24V42h31v18h28v44H0Z"
          fill="#344656"
        />
        <path
          d="M0 94h45V76h29v11h37V67h21v23h35V74h34v22h30V74h39v10h32V68h32v20h39V69h24v25h42V77h41v39H0Z"
          fill="#435460"
        />
        <path d="M357 24h18v3h6v17h-6v5h-18v-5h-6V30h6Z" fill="#e6d7b2" />
        <path d="M370 24h5v3h6v17h-6v5h-10v-5h7v-5h3v-9h-5Z" fill="#c8c4b0" />
        {[
          [38, 23],
          [91, 33],
          [151, 17],
          [225, 29],
          [292, 20],
          [419, 21],
          [449, 56],
          [188, 39],
        ].map(([x, y]) => (
          <path key={x} d={`M${x} ${y}h2v2h-2Z`} fill="#9ca8a1" />
        ))}
        <path d="M0 111h480v159H0Z" fill="#365962" />
        <path
          d="M0 126h480v3H0Zm36 13h297v2H36Zm95 17h349v2H131ZM0 179h282v3H0Zm81 24h399v2H81ZM0 230h480v2H0Zm40 26h340v2H40Z"
          fill="#456c70"
        />
        <path
          d="M342 115h48v2h-48Zm-10 9h68v2h-68Zm16 9h34v2h-34Zm-13 15h49v2h-49Zm12 16h27v2h-27Z"
          fill="#9b9d80"
          opacity=".45"
        />
        <path d="M0 83h54v12h34v10h27v10h48v12h35v8h47v15h-64v11h-62v9H75v16H0Z" fill="#203f3e" />
        <path d="M0 99h42v12h35v7h55v12h52v8h-33v9H94v12H49v10H0Z" fill="#365348" />
        <path d="M0 139h41v-9h53v8h38v9H96v10H54v11H0Z" fill="#52705b" />
        <path d="M480 91h-36v13h-41v13h-49v10h-38v11h-31v10h52v12h55v14h43v20h45Z" fill="#203e3e" />
        <path d="M480 119h-40v10h-43v8h-41v11h-31v5h49v13h45v13h61Z" fill="#3c5a4b" />
        <path
          d="M0 247h30v-8h28v11h27v9h34v11H0Zm480-6h-28v-11h-30v9h-28v15h-28v16h114Z"
          fill="#243f39"
        />
        <path d="M0 20h11v143H0Zm18-20h9v148h-9Zm432 7h11v151h-11Zm22-7h8v177h-8Z" fill="#172e32" />
        <path d="M0 0h91v14H68v13H41v17H0Zm390 0h90v40h-30V26h-32V13h-28Z" fill="#1a3435" />
        <path d="M0 3h71v8H49v14H21v10H0Zm414 0h66v23h-32V13h-34Z" fill="#29463c" />
        <path
          d="M49 163v-29h2v29Zm7-3v-38h2v38Zm8-6v-23h2v23Zm371 25v-35h2v35Zm7 5v-50h2v50Zm8 5v-30h2v30Z"
          fill="#789277"
        />
        <path d="M55 123v-7h4v7Zm386 13v-8h4v8Z" fill="#ac9370" />
        <path d="M77 146h15v4h7v8H73v-8h4Zm317 17h17v4h6v9h-31v-7h8Z" fill="#718078" />
        <path d="M77 146h15v3H77Zm317 17h17v3h-17Z" fill="#9a9b85" />
        {[
          [39, 105],
          [117, 124],
          [270, 132],
          [409, 117],
          [455, 209],
          [62, 221],
          [208, 83],
        ].map(([x, y], i) => (
          <g key={x} className={`firefly firefly-${i % 3}`}>
            <rect x={x - 2} y={y - 2} width="6" height="6" fill="#d8d69a" opacity=".12" />
            <rect x={x} y={y} width="2" height="2" fill="#d7d497" />
          </g>
        ))}
      </svg>
      {children}
    </div>
  );
}

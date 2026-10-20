// Original carriage artwork on the same 480 × 270 grid as the landscape.
// The window opening stays at (83, 42), 316 × 119; all fittings belong to the train.
export function CarriageShell() {
  return (
    <g>
      <path d="M0 0h480v270H0z" fill="#253b38" />
      <path d="M9 30h462v158H9z" fill="#657365" />
      <path d="M13 40h454v135H13z" fill="#748071" />
      <path d="M13 43h454v2H13zM13 170h454v4H13z" fill="#8d977f" />

      {/* Faceted roof shell and structural ribs turning down into the carriage sides. */}
      <path d="M0 48V25h7V15h12V8h20V3h402v5h20v7h12v10h7v23h-9V30h-7V20h-14v-7H30v7H16v10H9v18z" fill="#1e3332" />
      <path d="M12 32V22h12v-9h19V8h394v5h19v9h12v10h-7v-6h-13v-8H32v8H19v6z" fill="#a3aa90" />
      <path d="M33 19h414v11H33z" fill="#858f7a" />
      <path d="M42 20h396v2H42zM28 30h424v4H28z" fill="#586a5f" />
      <path d="M205 9h70v9h-70z" fill="#3f5550" />
      <path d="M211 11h2v5h-2zM217 11h2v5h-2zM223 11h2v5h-2zM229 11h2v5h-2zM235 11h2v5h-2zM241 11h2v5h-2zM247 11h2v5h-2zM253 11h2v5h-2zM259 11h2v5h-2zM265 11h2v5h-2z" fill="#7d8c79" />

      {/* Pressed wall panels, joints, bolts and a fixed heater below the glazing. */}
      <path d="M11 176h458v53H11z" fill="#4d6359" />
      <path d="M13 179h454v2H13zM13 222h454v4H13z" fill="#96a08a" />
      <path d="M73 37h5v193h-5zM405 37h5v193h-5z" fill="#354d47" />
      <path d="M74 40h1v178h-1zM406 40h1v178h-1z" fill="#bdba97" />
      <path d="M153 185h177v25H153z" fill="#334c46" />
      {Array.from({ length: 23 }, (_, index) => (
        <path key={index} d={`M${158 + index * 7} 188h2v18h-2z`} fill="#728275" />
      ))}
      <path d="M153 184h177v2H153zM153 210h177v3H153z" fill="#9ba28c" />
      <path d="M77 224h328v2H77zM81 179h2v2h-2zM397 179h2v2h-2zM81 219h2v2h-2zM397 219h2v2h-2z" fill="#c1b591" />

      {/* Rubber carriage floor, mounting channels and a clear central aisle. */}
      <path d="M9 229h462v41H9z" fill="#3e514b" />
      <path d="M10 232h460v2H10zM10 258h460v2H10z" fill="#2b403c" />
      <path d="M9 237h462v2H9zM9 249h462v2H9z" fill="#66756a" />
      <path d="M70 230h2v40h-2zM408 230h2v40h-2z" fill="#2a403b" />
      <path d="M218 239h5v1h-5zM233 239h5v1h-5zM248 239h5v1h-5zM263 239h5v1h-5zM211 246h5v1h-5zM226 246h5v1h-5zM241 246h5v1h-5zM256 246h5v1h-5zM271 246h5v1h-5zM218 253h5v1h-5zM233 253h5v1h-5zM248 253h5v1h-5zM263 253h5v1h-5z" fill="#8e9980" opacity=".35" />

      <VestibuleDoor />
      <LuggageRack />

      {/* Deep mechanical window surround, rather than domestic woodwork. */}
      <path d="M81 34h320v3h5v5h3v119h-3v5h-5v3H81v-3h-5v-5h-3V42h3v-5h5z" fill="#304b47" />
      <path d="M82 37h318v3h4v122h-4v4H82v-4h-4V40h4z" fill="#9ea38b" />
      <path d="M81 40h321v124H81z" fill="#223c3d" />
      <path d="M83 42h316v119H83z" fill="#2e4648" />
    </g>
  );
}

function VestibuleDoor() {
  return (
    <g>
      <path d="M17 40h46v4h5v193H12V44h5z" fill="#263f3b" />
      <path d="M19 44h42v3h3v186H16V47h3z" fill="#939d88" />
      <path d="M21 48h37v179H20V48z" fill="#526c61" />
      <path d="M22 50h2v174h-2zM57 50h2v174h-2z" fill="#bac0a3" />
      <path d="M28 63h24v3h3v57h-3v3H28v-3h-3V66h3z" fill="#213c3c" />
      <path d="M30 67h20v2h2v51h-2v2H30v-2h-2V69h2z" fill="#6b9190" />
      <path d="M31 69h2v50h-2zM35 69h1v50h-1z" fill="#c8d6be" opacity=".35" />
      <path d="M28 102h24v3H28zM28 105h24v15H28z" fill="#3f645f" opacity=".55" />
      <path d="M49 142h6v4h-6zM50 146h3v22h-3zM49 168h6v4h-6z" fill="#d0bf92" />
      <path d="M51 147h1v20h-1zM27 183h24v22H27z" fill="#344e45" />
      <path d="M30 187h18v2H30zM30 192h18v2H30zM30 197h18v2H30z" fill="#8a9982" />
      <path d="M28 134h23v3H28zM26 218h27v2H26z" fill="#83937c" />
      <path d="M13 232h54v5H13zM17 237h46v4H17z" fill="#aeb49a" />
      <path d="M16 234h48v1H16zM20 239h40v1H20z" fill="#546e62" />
      <path d="M25 32h30v10H25z" fill="#b9ac83" />
      <path d="M30 34h6v6h-6zM32 35v4h2v-4z" fill="#344c43" fillRule="evenodd" />
      <path d="M43 34h6v1h-6zM48 35h1v4h-1zM44 36h4v1h-4zM43 39h6v1h-6z" fill="#344c43" />
    </g>
  );
}

function LuggageRack() {
  return (
    <g>
      {/* Shallow metal basket with crossbars and diagonal wall brackets. */}
      <path d="M91 26h300l9 7H82z" fill="#354c45" />
      <path d="M94 27h294l5 4H87z" fill="#8f9d86" />
      {Array.from({ length: 24 }, (_, index) => (
        <path key={index} d={`M${96 + index * 12} 27h2l-3 5h-2z`} fill="#405950" />
      ))}
      <path d="M82 32h318v3H82zM84 32h314v1H84z" fill="#c0b78e" />
      <path d="M95 35h3v5h-3zM98 35h8v2h-5v3h-3zM383 35h3v5h-3zM373 35h10v2h-7v3h-3z" fill="#4a6256" />
      <path d="M112 11h35v3h4v12h-43V14h4zM121 7h16v3h-16zM118 10h4v5h-4zM136 10h4v5h-4z" fill="#4b4d3e" />
      <path d="M113 13h33v12h-33zM110 16h39v8h-39z" fill="#ac825b" />
      <path d="M118 13h3v12h-3zM138 13h3v12h-3z" fill="#d0b283" />
      <path d="M123 19h10v5h-10zM113 14h33v1h-33z" fill="#dfc79a" />
      <path d="M308 14h29v12h-29zM313 10h19v4h-19z" fill="#425b4e" />
      <path d="M310 15h25v9h-25zM316 12h13v2h-13z" fill="#82927a" />
      <path d="M315 15h3v10h-3zM329 15h3v10h-3z" fill="#c2b58e" />
    </g>
  );
}

export function TrainWindowFrame() {
  return (
    <g>
      <path d="M83 38h316v3H83zM79 42h3v119h-3zM400 42h3v119h-3zM83 162h316v4H83z" fill="#b9b797" />
      <path d="M83 41h316v1H83zM82 42h1v119h-1zM399 42h1v119h-1zM83 161h316v1H83z" fill="#435e55" />
      <path d="M83 42h3v2h-3zM396 42h3v2h-3zM83 159h3v2h-3zM396 159h3v2h-3z" fill="#435e55" />
      <path d="M239 41h5v120h-5z" fill="#8d9a86" />
      <path d="M239 42h1v118h-1zM243 42h2v118h-2z" fill="#c9c2a0" />
      <path d="M244 43h1v116h-1z" fill="#294842" />
      <path d="M246 137h3v12h-3zM244 138h2v3h-2zM245 147h5v3h-5z" fill="#cfbb8c" />
      <path d="M217 156h13v3h-13zM255 156h13v3h-13z" fill="#c7be98" />
      <path d="M221 157h5v1h-5zM259 157h5v1h-5z" fill="#4a6255" />
      <path d="M76 50h2v2h-2zM76 92h2v2h-2zM76 148h2v2h-2zM404 50h2v2h-2zM404 92h2v2h-2zM404 148h2v2h-2zM91 166h2v2h-2zM389 166h2v2h-2z" fill="#d0c29b" />
      <path d="M79 166h324v4H79zM83 170h316v2H83z" fill="#4c6658" />
      <path d="M82 166h318v1H82z" fill="#afb294" />
    </g>
  );
}

function PassengerSeat({ mirrored = false }) {
  return (
    <g transform={mirrored ? 'translate(480 0) scale(-1 1)' : undefined}>
      {/* Reclining upright back, light antimacassar, armrest and bolted pedestal. */}
      <path d="M103 139h21v4h7v15h3v38h5v12h60v5h8v17H104v-9h-5v-22h-3v-48h3v-8h4z" fill="#233f3e" />
      <path d="M104 143h18v4h6v14h3v36h5v15h-31v-15h-5v-44h4z" fill="#567e72" />
      <path d="M104 146h3v48h4v14h-5v-12h-5v-42h3z" fill="#87a18a" />
      <path d="M122 161h4v34h4v13h-5v-12h-3zM115 167h2v27h-2z" fill="#385e57" />
      <path d="M106 146h17v3h3v13h-18v-3h-2z" fill="#ded8b5" />
      <path d="M109 148h12v2h-12zM110 160h14v2h-14z" fill="#f0e3bc" />
      <path d="M132 209h64v3h7v10h-72v-3h-5v-7h6z" fill="#72917c" />
      <path d="M134 210h60v2h-60zM132 213h2v6h-2z" fill="#a2ae88" />
      <path d="M106 222h96v6h-96zM109 228h91v3h-91z" fill="#375b50" />
      <path d="M109 222h89v2h-89z" fill="#97a17d" />
      <path d="M126 191h8v5h66v4h-72v9h-4v-13h2zM195 199h4v11h-4z" fill="#263f38" />
      <path d="M130 191h65v4h-65zM129 192h67v1h-67z" fill="#c0a37a" />
      <path d="M138 231h22v15h-22zM121 245h57v5h-57z" fill="#253e38" />
      <path d="M141 233h4v10h-4zM124 246h51v1h-51zM128 248h3v1h-3zM167 248h3v1h-3z" fill="#a8ae92" />
      <path d="M188 231h4v11h18v5h-24v-14h2zM188 242h21v2h-21z" fill="#7e9280" />
      <path d="M190 243h16v1h-16z" fill="#c1b998" />
    </g>
  );
}

function FoldingTable() {
  return (
    <g>
      {/* Wall hinge and cantilever brace leave the aisle free of table legs. */}
      <path d="M235 173h10v29h-10zM238 201h5v13h-5z" fill="#304c43" />
      <path d="M238 179h3v21h-3zM241 198h4v5h-4zM245 194h4v5h-4zM249 190h4v5h-4z" fill="#9ca88e" />
      <path d="M209 179h62v4h5v6h-72v-6h5z" fill="#3b5143" />
      <path d="M210 179h60v3h4v4h-68v-4h4z" fill="#b09b72" />
      <path d="M211 180h58v1h-58zM208 185h64v1h-64z" fill="#e0c392" />
      <path d="M215 177h21v3h-21zM220 166h13v11h-13zM233 169h5v6h-5z" fill="#ddd6b2" />
      <path d="M222 167h10v2h-10z" fill="#796750" />
      <path d="M234 170h3v3h-3z" fill="#526e5c" />
      <g fill="none" stroke="#e2ddbc" strokeWidth="1">
        <path className="journey-steam" d="M223 162v-4h2v-5h-1v-3" />
        <path className="journey-steam journey-steam--late" d="M229 161v-3h-1v-4" />
      </g>
      {/* Perforated travel ticket, with printed lines and a punched validation. */}
      <path d="M246 170h21v3h-1v2h1v3h-21v-3h1v-2h-1z" fill="#e2c897" />
      <path d="M249 172h9v1h-9zM249 175h5v1h-5zM261 171h1v2h-1zM261 175h1v2h-1z" fill="#8b7957" />
      <path d="M264 173h2v2h-2z" fill="#527362" />
    </g>
  );
}

function WallLamp() {
  return (
    <g>
      <g className="journey-lamp-glow" fill="#f2cc89">
        <path d="M418 57h30v8h10v52h-10v13h-31v-13h-10V70h11z" opacity=".07" />
        <path d="M422 67h21v7h8v36h-8v9h-23v-9h-7V76h9z" opacity=".12" />
        <path d="M417 137h35v58h-35z" opacity=".05" />
      </g>
      <path d="M422 70h24v4h4v34h-4v4h-24v-4h-4V74h4z" fill="#344e44" />
      <path d="M423 73h22v4h2v27h-2v4h-22v-4h-2V77h2z" fill="#b19b70" />
      <path d="M425 77h18v26h-18z" fill="#edd69a" />
      <path d="M427 79h3v21h-3zM425 89h18v2h-18z" fill="#f7e6b6" />
      <path d="M422 75h24v3h-24zM422 103h24v3h-24z" fill="#7f8060" />
      <path d="M430 113h9v3h-9zM430 119h9v2h-9z" fill="#a7ae8d" />
      <path d="M430 145h8v4h-8zM432 149h4v49h-4zM430 198h8v4h-8z" fill="#b8bc9a" />
      <path d="M432 151h1v45h-1z" fill="#e2d5ae" />
      <path d="M421 212h25v5h-25zM424 218h19v2h-19z" fill="#344e43" />
    </g>
  );
}

function Suitcase() {
  return (
    <g>
      <path d="M416 225h32v3h4v24h-40v-24h4zM422 218h17v3h-17zM419 221h4v6h-4zM438 221h4v6h-4z" fill="#293f36" />
      <path d="M417 227h30v3h2v19h-34v-19h2z" fill="#b18a61" />
      <path d="M417 229h29v2h-29zM416 232h2v14h-2z" fill="#d1ac7c" />
      <path d="M421 228h3v21h-3zM440 228h3v21h-3zM415 240h34v2h-34z" fill="#755f45" />
      <path d="M421 237h3v5h-3zM440 237h3v5h-3z" fill="#d7bf8b" />
      <path d="M428 232h9v7h-9zM431 230h3v2h-3z" fill="#dfd4ae" />
      <path d="M430 234h5v1h-5zM430 236h3v1h-3z" fill="#9d9773" />
    </g>
  );
}

export function CarriageInterior() {
  return (
    <g>
      <WallLamp />
      <FoldingTable />
      <PassengerSeat />
      <PassengerSeat mirrored />
      <Suitcase />
      <path d="M0 263h480v7H0zM0 0h480v2H0zM0 45h8v218H0zM472 45h8v218h-8z" fill="#1e3531" />
      <path d="M8 263h464v2H8z" fill="#89947a" />
    </g>
  );
}

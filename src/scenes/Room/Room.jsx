import { useEffect, useId, useState } from 'react';
import Companion from '../../components/companion/Companion.jsx';
import './Room.css';

// Original artwork, drawn on a 480 × 270 grid. All scene details are local SVG.
const FLOOR_GRAINS = [
  [20, 196, 25],
  [88, 200, 18],
  [193, 193, 34],
  [274, 201, 16],
  [394, 195, 37],
  [65, 218, 24],
  [168, 222, 31],
  [259, 214, 21],
  [356, 220, 25],
  [438, 216, 15],
  [18, 243, 22],
  [96, 240, 16],
  [373, 245, 35],
  [426, 249, 21],
  [66, 262, 40],
  [245, 264, 32],
  [324, 260, 21],
  [142, 194, 18],
  [308, 191, 28],
];

const WINDOW_DROPS = [
  [76, 48],
  [116, 96],
  [158, 57],
  [195, 101],
];

function Plant({ x, y, large = false }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <g className="room-plant-leaves">
        <path d="M14 0h2v31h-2zM8 9h2v4h5v2H8zM15 18h7v-4h2v6h-9z" fill="#516b53" />
        <path d="M5 2h7v2h3v7H9V9H5V7H2V4h3z" fill="#92a47b" />
        <path d="M2 4h7v2h3v3H9V7H4V6H2z" fill="#b1b993" />
        <path d="M18 7h8v2h4v5h-3v3h-8v-2h-4v-5h3z" fill="#738e68" />
        <path d="M21 8h5v2h-6v3h-4v-3h3V9h2z" fill="#a1b38a" />
        <path d="M1 17h8v2h6v5h-4v2H4v-3H1z" fill="#6e8b67" />
        <path d="M2 18h6v2h4v2H7v-1H2z" fill="#a0ad7d" />
        {large && (
          <path d="M20-4h8v3h3v5h-5v3h-8V3h-3v-4h5zM-3 11h6v3h3v6H0v-2h-3z" fill="#7c986e" />
        )}
        <path
          d="M15 0h1v12h-1zM7 5h6v1H7zM20 12h7v1h-7zM6 21h6v1H6z"
          fill="#c1c79a"
          opacity=".45"
        />
      </g>
      <path d="M3 28h25v5h-2v17H6V33H3z" fill="#513f39" />
      <path d="M5 29h21v5H5zM7 34h17v13H7z" fill="#ad795a" />
      <path d="M7 34h4v12H7zM11 47h11v2H11z" fill="#c99268" />
      <path d="M24 35h2v12h-3v-2h1z" fill="#805d49" />
      <path d="M5 29h21v2H5z" fill="#d2a47b" />
    </g>
  );
}

function Window({ rainOn, windowId, rainId, nearRainId }) {
  return (
    <g>
      <path d="M38 27h192v120H38z" fill="#1b3032" />
      <path d="M42 29h183v115H42z" fill="#8e8d72" />
      <path d="M46 32h175v108H46z" fill="#c2b58c" />
      <g clipPath={`url(#${windowId})`}>
        <path d="M51 36h166v101H51z" fill="#365669" />
        <path d="M51 36h166v22H51z" fill="#304c60" />
        <path d="M51 58h166v22H51z" fill="#3d5c6e" />
        <path d="M51 80h166v29H51z" fill="#466776" />
        <path
          d="M55 51h7v-3h23v3h12v3h15v4H55zM140 63h10v-4h27v3h19v4h21v5h-77z"
          fill="#78909a"
          opacity=".22"
        />
        <path
          d="M172 44h9v2h3v10h-3v3h-9v-3h-3v-9h3z"
          fill="#c9cdaf"
          opacity={rainOn ? '.43' : '.8'}
        />
        <path d="M179 43h5v13h-3v3h-6v-3h4z" fill="#365669" />
        <g className={`room-stars ${rainOn ? '' : 'is-visible'}`} fill="#d8d8bb">
          <path className="room-star" d="M73 42h2v2h-2zM197 79h2v2h-2z" />
          <path
            className="room-star room-star--late"
            d="M106 58h2v2h-2zM147 44h1v4h-1zM145 45h5v1h-5z"
          />
          <path className="room-star room-star--soft" d="M112 77h1v3h-1zM111 78h3v1h-3z" />
        </g>
        <path
          d="M51 112h7v-3h10v-5h9v-5h13v4h9v5h14v-7h7v-7h12v4h7v6h12v6h16v-5h10v-8h8v-5h8v5h8v9h16v31H51z"
          fill="#304c54"
        />
        <path
          d="M51 121h12v-3h15v-4h16v3h20v4h11v-7h16v-4h17v5h11v3h20v-5h12v6h16v18H51z"
          fill="#263f47"
        />
        <path
          d="M62 117h2v20h-2zM55 119h16v3H55zM58 114h10v4H58zM60 110h6v4h-6zM202 106h2v31h-2zM193 120h21v4h-21zM196 114h15v5h-15zM199 108h9v5h-9zM201 103h4v5h-4z"
          fill="#203d45"
        />
        <path d="M95 124h20v13H95zM92 124v-2h4v-3h17v3h5v2z" fill="#213a42" />
        <path d="M99 127h3v4h-3zM107 127h3v4h-3z" fill="#d4aa70" opacity=".8" />
        <path d="M51 135h166v2H51z" fill="#708685" />
        <path
          d="M57 38h2v96h-2zM61 38h1v96h-1zM142 38h2v96h-2zM147 38h1v96h-1z"
          fill="#c1d2cc"
          opacity=".13"
        />
        <g className={`room-rain ${rainOn ? 'is-visible' : ''}`}>
          <g className="room-rainfall">
            <rect x="51" y="-59" width="166" height="242" fill={`url(#${rainId})`} />
          </g>
          <g className="room-rainfall-near">
            <rect x="51" y="-59" width="166" height="242" fill={`url(#${nearRainId})`} />
          </g>
          {WINDOW_DROPS.map(([x, y], index) => (
            <g key={x} transform={`translate(${x} ${y})`}>
              <path
                className={`room-window-drop room-window-drop--${index}`}
                d="M0 0h1v5H0zM-1 5h2v2h-2z"
                fill="#c1d8d6"
              />
            </g>
          ))}
          <path
            className="room-sill-splash"
            d="M73 134h4v1h-4zM72 132h1v1h-1zM78 132h1v1h-1zM163 134h4v1h-4zM162 132h1v1h-1z"
            fill="#b0c9cf"
          />
        </g>
      </g>
      <path d="M48 34h171v3H48zM48 36h3v102h-3zM217 36h3v102h-3zM50 135h168v4H50z" fill="#665f4c" />
      <path d="M130 35h6v104h-6zM50 86h169v5H50z" fill="#8f8566" />
      <path d="M130 36h2v101h-2zM51 86h166v2H51z" fill="#c7b98b" />
      <path d="M136 37h1v98h-1zM51 91h166v1H51z" fill="#203b42" opacity=".7" />
      <path d="M136 102h3v8h-3z" fill="#c4b386" />
      <path d="M35 140h197v6H35zM39 146h190v5H39z" fill="#5b5d4c" />
      <path d="M35 139h197v4H35z" fill="#b4aa83" />
      <path d="M39 140h189v1H39z" fill="#d3c59b" />
      <path d="M29 22h210v4H29zM26 20h5v8h-5zM237 20h5v8h-5z" fill="#1d3334" />
      <path d="M31 27h22v30h-3v29h-4v30h-4v22H30v-3h-4V30h5z" fill="#576e64" />
      <path d="M32 28h6v95h-4v12h-4v-3h-2V32h4z" fill="#84917a" />
      <path d="M43 27h6v46h-3v31h-3v23h-4v-21h3V63h1z" fill="#9aa28a" />
      <path d="M28 105h19v6H28z" fill="#b1a079" />
      <path d="M29 106h17v2H29z" fill="#d1b78c" />
      <path d="M219 27h19v109h-4v4h-10v-23h-3V83h-3V48h1z" fill="#60766a" />
      <path d="M226 28h6v103h-4v-24h-3V69h1z" fill="#8d9a80" />
      <path d="M234 29h3v105h-3zM220 31h3v52h-3z" fill="#445d55" />
      <path d="M220 105h18v6h-18z" fill="#b1a079" />
      <path d="M221 106h16v2h-16z" fill="#d1b78c" />
    </g>
  );
}

function WallDetails() {
  return (
    <g>
      <path d="M271 78h69v5h-69zM277 83h5v7h-5zM329 83h5v7h-5z" fill="#213735" />
      <path d="M271 76h69v4h-69z" fill="#a48e67" />
      <path d="M273 76h65v1h-65z" fill="#d0b389" />
      <path d="M279 55h7v21h-7z" fill="#b79b6d" />
      <path d="M280 58h5v1h-5zM280 71h5v1h-5z" fill="#dfc89b" />
      <path d="M287 50h6v26h-6z" fill="#718a7d" />
      <path d="M288 53h4v2h-4zM288 70h4v1h-4z" fill="#a8b9a0" />
      <path d="M294 57h8v19h-8z" fill="#bd947e" />
      <path d="M296 59h1v14h-1zM299 59h1v14h-1z" fill="#e3b598" />
      <path d="M304 53h6v23h-6z" fill="#b9ba98" />
      <path d="M306 56h2v2h-2zM306 70h2v2h-2z" fill="#6f8371" />
      <path d="M312 60h5v16h-5z" fill="#54746a" />
      <path d="M321 64h14v4h-14zM323 68h10v8h-10z" fill="#d2b49a" />
      <path d="M326 55h3v10h-3zM329 50h2v9h-2zM323 52h2v9h-2zM325 47h4v6h-4z" fill="#92a77c" />
      <path d="M334 63h5v5h-3v7h6v7h-3v9h5v6h-3v8h-3v-15h-3v-16h-3v-8h2z" fill="#6d8d6b" />
      <path d="M338 77h5v4h-5zM341 92h5v4h-5zM335 86h5v4h-5zM336 65h4v4h-4z" fill="#9dae80" />
      <path d="M356 28h72v61h-72z" fill="#213735" />
      <path d="M358 30h68v57h-68z" fill="#9e8764" />
      <path d="M361 33h62v51h-62z" fill="#dac8a0" />
      <path d="M365 37h54v43h-54z" fill="#4a6465" />
      <path d="M365 37h54v25h-54z" fill="#4b5d66" />
      <path d="M397 43h8v2h2v7h-2v2h-8v-2h-2v-7h2z" fill="#e6c995" />
      <path d="M365 69h5v-5h7v-6h6v-5h5v5h5v7h7v6h8v-4h5v-4h6v17h-54z" fill="#96a28b" />
      <path d="M365 75h8v-4h9v-4h9v3h9v5h8v-4h11v9h-54z" fill="#b2b59a" />
      <path d="M381 60h8v2h-8zM381 62h10v2h-10z" fill="#e5d3ac" />
      <path d="M359 31h66v1h-66zM359 32h1v53h-1z" fill="#c2a27a" />
      <path d="M288 112h30v24h-30z" fill="#263f3d" />
      <path d="M289 111h27v22h-27z" fill="#bbbaa0" />
      <path d="M296 109h12v4h-12z" fill="#b7a885" />
      <path d="M293 117h11v1h-11zM293 121h17v1h-17zM293 125h13v1h-13z" fill="#7b8a77" />
      <path
        d="M248 24h18v2h-18zM266 26h21v2h-21zM287 28h24v2h-24zM311 30h25v2h-25zM336 28h26v2h-26zM362 25h29v2h-29zM391 21h29v2h-29zM420 18h23v2h-23z"
        fill="#74816b"
      />
      {[258, 283, 309, 337, 366, 396, 427].map((x, index) => (
        <g key={x} transform={`translate(${x} ${[26, 28, 30, 30, 27, 23, 20][index]})`}>
          <path d="M0 0h2v3H0zM-1 3h4v5h-4z" fill="#a68d60" />
          <path d="M0 3h2v4H0z" fill="#e8cb87" />
        </g>
      ))}
    </g>
  );
}

function Desk({ lampOn }) {
  return (
    <g>
      <g className="room-lamplight" opacity={lampOn ? 1 : 0}>
        <g className="room-lamp-breathe">
          <path
            d="M207 64h45v8h17v11h14v20h10v46h-9v20h-16v15h-74v-9h-18v-17h-11v-42h9V94h12V77h21z"
            fill="#efc779"
            opacity=".075"
          />
          <path
            d="M217 86h26v7h13v11h10v19h7v29h-9v18h-58v-7h-13v-18h-6v-24h8v-18h12V93h10z"
            fill="#f2c982"
            opacity=".09"
          />
          <path d="M219 129h24l22 34h-68z" fill="#f4cc84" opacity=".12" />
        </g>
      </g>
      <path d="M40 173h10v51H40zM45 174h4v50h-4zM218 173h36v50h-36z" fill="#584d3f" />
      <path d="M221 175h30v43h-30z" fill="#816d51" />
      <path d="M222 177h28v11h-28zM222 190h28v11h-28zM222 203h28v11h-28z" fill="#947b58" />
      <path d="M224 178h23v1h-23zM224 191h23v1h-23zM224 204h23v1h-23z" fill="#b4996c" />
      <path d="M232 181h8v2h-8zM232 194h8v2h-8zM232 207h8v2h-8z" fill="#514b3c" />
      <path d="M220 218h5v8h-5zM246 218h5v8h-5zM41 220h8v6h-8z" fill="#3c4137" />
      <path d="M31 159h230v15H31z" fill="#514b3d" />
      <path d="M31 159h230v7H31z" fill="#b09368" />
      <path d="M34 160h224v2H34z" fill="#d0b17e" />
      <path d="M33 167h226v5H33z" fill="#8c7252" />
      <path d="M36 168h220v1H36z" fill="#b09568" />
      <path d="M65 159h31v-3H65zM68 151h32v5H68z" fill="#566f64" />
      <path d="M67 156h28v2H67zM70 152h29v2H70z" fill="#d1c9a5" />
      <path d="M64 157h3v3h-3zM67 151h3v5h-3z" fill="#a98c6c" />
      <path d="M104 151h15v9h-15zM119 153h5v6h-5z" fill="#50665c" />
      <path d="M105 151h13v7h-13zM119 154h3v3h-3z" fill="#d4cfad" />
      <path d="M107 151h9v2h-9z" fill="#7d6955" />
      <path d="M106 159h14v2h-14z" fill="#d2b789" />
      <g stroke="#d7d6b2" strokeWidth="1" fill="none">
        <path className="room-tea-steam" d="M109 146v-4h2v-5" />
        <path className="room-tea-steam room-tea-steam--late" d="M115 147v-3h-1v-4" />
      </g>
      <path d="M143 152h19v-2h20v2h5v10h-44z" fill="#5a614b" />
      <path d="M145 151h17v2h2v-2h19v9h-19v1h-2v-1h-17z" fill="#ded4b1" />
      <path
        d="M147 153h12v1h-12zM147 155h12v1h-12zM147 157h9v1h-9zM167 153h13v1h-13zM167 155h13v1h-13zM167 157h9v1h-9z"
        fill="#94a18a"
      />
      <path d="M162 152h2v9h-2z" fill="#b2ae8e" />
      <path d="M177 150h2v6h-2z" fill="#bd8b6d" />
      <path d="M190 155h14v2h-14zM203 154h3v2h-3z" fill="#3c5148" />
      <path d="M192 155h10v1h-10z" fill="#c3ac7e" />
      <path d="M218 158h27v4h-27zM222 156h19v2h-19zM229 130h4v26h-4z" fill="#514e3c" />
      <path d="M220 158h23v2h-23zM230 130h2v26h-2z" fill="#b8a476" />
      <path
        d="M228 109h6v5h-6zM218 113h25v5h-25zM215 118h31v6h-31zM212 124h37v7h-37z"
        fill="#55513f"
      />
      <path
        d="M220 114h21v4h-21zM217 118h27v6h-27zM214 124h33v4h-33z"
        className="room-lampshade"
        fill={lampOn ? '#edca87' : '#a3976b'}
      />
      <path
        d="M221 115h4v3h-4zM218 118h5v5h-5zM215 124h6v4h-6z"
        className="room-lampshade"
        fill={lampOn ? '#f7dfa6' : '#beb187'}
      />
      <path
        d="M238 115h2v3h-2zM240 118h3v6h-3zM242 124h4v4h-4z"
        className="room-lampshade"
        fill={lampOn ? '#cda66b' : '#827c5a'}
      />
      <path
        className="room-lampshade"
        d="M216 129h29v2h-29z"
        fill={lampOn ? '#f2d69a' : '#776f51'}
      />
      <g className="room-lamplight" opacity={lampOn ? 1 : 0} fill="#f0d18d">
        <path className="room-dust" d="M208 132h1v1h-1zM245 95h1v1h-1z" />
        <path className="room-dust room-dust--late" d="M230 103h1v1h-1zM253 143h1v1h-1z" />
        <path className="room-dust room-dust--slow" d="M199 149h1v1h-1zM251 119h1v1h-1z" />
        <g className="room-lamp-breathe">
          <path d="M192 157h62v2h-62zM202 155h43v2h-43z" opacity=".16" />
          <path d="M179 162h75v1h-75z" opacity=".35" />
        </g>
      </g>
      <path d="M121 177h35v4h4v25h-42v-25h3z" fill="#293e36" />
      <path d="M124 179h29v3h4v20h-36v-20h3z" fill="#71846a" />
      <path d="M125 180h28v2h-28zM122 183h2v16h-2z" fill="#96a387" />
      <path d="M128 184h1v14h-1zM149 184h1v14h-1z" fill="#566f59" />
      <path d="M114 204h49v9h-49zM118 213h5v24h-5zM153 213h5v24h-5z" fill="#514c3c" />
      <path d="M116 204h45v4h-45z" fill="#a58f64" />
      <path d="M119 205h39v1h-39zM119 214h2v21h-2zM154 214h2v21h-2z" fill="#c0a378" />
      <path d="M122 213h31v3h-31z" fill="#2f4135" />
    </g>
  );
}

function Bed() {
  return (
    <g>
      <path d="M294 126h10v96h-10zM441 126h10v96h-10zM302 132h140v42H302z" fill="#403f34" />
      <path d="M297 127h5v89h-5zM443 127h5v89h-5zM303 134h138v35H303z" fill="#7c6950" />
      <path d="M304 135h135v2H304zM298 128h2v85h-2zM444 128h2v85h-2z" fill="#aa8d65" />
      <path d="M311 141h122v23H311z" fill="#927858" />
      <path
        d="M314 143h116v1H314zM331 144h1v19h-1zM350 144h1v19h-1zM370 144h1v19h-1zM390 144h1v19h-1zM410 144h1v19h-1z"
        fill="#725e49"
      />
      <path d="M298 162h149v46H298z" fill="#4d5645" />
      <path d="M300 163h145v42H300z" fill="#c8c4a1" />
      <path d="M302 164h141v6H302z" fill="#e5d8b1" />
      <path d="M310 150h44v2h3v17h-49v-16h2z" fill="#a6af93" />
      <path d="M312 149h40v3h3v14h-45v-14h2z" fill="#e4d7b1" />
      <path d="M313 151h37v2h-37zM311 154h2v10h-2zM352 154h2v11h-2z" fill="#f1e3bb" />
      <path d="M367 151h44v2h3v16h-50v-15h3z" fill="#9da68b" />
      <path d="M369 149h40v3h3v13h-46v-13h3z" fill="#c3c4a4" />
      <path d="M369 151h38v2h-38zM367 154h2v9h-2z" fill="#d9d7b3" />
      <path d="M299 171h147v35H299zM302 168h139v4H302z" fill="#788e78" />
      <path d="M303 171h138v3H303zM300 175h3v28h-3z" fill="#a6b092" />
      <path d="M307 176h130v24H307z" fill="#8fa187" />
      {[0, 1, 2].map((row) =>
        Array.from({ length: 9 }, (_, col) => (
          <g key={`${row}-${col}`} transform={`translate(${310 + col * 14} ${176 + row * 8})`}>
            <path
              d="M3 0h4v2h3v4H7v2H3V6H0V2h3z"
              fill={(row + col) % 3 === 0 ? '#c8bc91' : '#9eaf91'}
            />
            <path
              d="M4 2h2v4H4z"
              fill={(row + col) % 3 === 0 ? '#ddd0a4' : '#b6c0a0'}
              opacity=".6"
            />
          </g>
        )),
      )}
      <path
        d="M305 183h134v1H305zM305 191h134v1H305zM319 175h1v25h-1zM347 175h1v25h-1zM375 175h1v25h-1zM403 175h1v25h-1zM431 175h1v25h-1z"
        fill="#617e69"
        opacity=".32"
      />
      <path d="M300 201h144v5H300z" fill="#647c67" />
      <path d="M302 201h138v1H302z" fill="#b3b99a" />
      <path d="M418 174h21v37h-3v5h-18z" fill="#b28e69" />
      <path d="M421 175h3v37h-3zM432 175h3v38h-3z" fill="#d1b087" />
      <path d="M419 183h19v2h-19zM419 193h19v2h-19zM419 205h18v2h-18z" fill="#8f755b" />
      <path d="M299 206h148v10H299zM303 216h9v10h-9zM434 216h9v10h-9z" fill="#4c4639" />
      <path d="M301 207h144v5H301zM305 216h4v8h-4zM436 216h4v8h-4z" fill="#907350" />
      <path d="M303 208h140v1H303z" fill="#b19063" />
    </g>
  );
}

function FloorDetails() {
  return (
    <g>
      <path d="M145 225h203v4h10v27h-10v5H145v-4h-10v-27h10z" fill="#424c3c" opacity=".45" />
      <path d="M148 223h195v4h11v26h-11v5H148v-4h-11v-27h11z" fill="#b2a180" />
      <path d="M149 227h192v3h9v20h-9v4H149v-4h-8v-20h8z" fill="#626e59" />
      <path d="M153 230h184v3h8v14h-8v4H153v-4h-8v-14h8z" fill="#87947a" />
      <path d="M163 233h163v1H163zM163 247h163v1H163z" fill="#c5b68e" />
      {[172, 207, 242, 277, 312].map((x) => (
        <path
          key={x}
          d={`M${x} 235h4v2h4v3h4v2h-4v3h-4v2h-4v-2h-4v-3h-4v-2h4v-3h4z`}
          fill="#b8b28d"
        />
      ))}
      <path
        d="M171 239h6v4h-6zM206 239h6v4h-6zM241 239h6v4h-6zM276 239h6v4h-6zM311 239h6v4h-6z"
        fill="#73846a"
      />
      {[228, 233, 238, 243, 248].map((y) => (
        <path key={y} d={`M132 ${y}h6v2h-6zM353 ${y}h6v2h-6z`} fill="#c1b08c" />
      ))}
      <path d="M23 215h33v22H23zM26 210h27v5H26z" fill="#554d3b" />
      <path d="M24 216h31v19H24zM27 212h25v4H27z" fill="#a88c61" />
      <path
        d="M25 218h29v2H25zM25 223h29v2H25zM25 228h29v2H25zM29 217h2v18h-2zM35 217h2v18h-2zM41 217h2v18h-2zM47 217h2v18h-2z"
        fill="#7d6e4c"
      />
      <path d="M27 209h20v3h4v12H35v-4h-8z" fill="#9aaa92" />
      <path d="M29 210h14v2H29zM35 213h2v10h-2zM47 214h2v9h-2z" fill="#c4cab0" />
      <path d="M65 232h32v6H65zM69 226h27v6H69z" fill="#485f53" />
      <path d="M67 233h27v3H67zM71 227h23v3H71z" fill="#c6c09b" />
      <path d="M68 226h3v6h-3zM64 232h3v6h-3z" fill="#a38061" />
      <path d="M373 231h10v4h4v9h-17v-8h3zM393 233h10v4h4v9h-17v-8h3z" fill="#4d5948" />
      <path d="M374 231h7v4h3v6h-12v-5h2zM394 233h7v4h3v6h-12v-5h2z" fill="#b3ab87" />
      <path d="M375 235h5v2h-5zM395 237h5v2h-5z" fill="#d3c59e" />
    </g>
  );
}

export default function Room({
  lampOn = true,
  rainOn = true,
  onToggleLamp,
  onToggleRain,
  onOpenNotebook,
  reducedMotion = false,
  companion,
}) {
  const uniqueId = useId().replaceAll(':', '');
  const windowId = `room-window-${uniqueId}`;
  const rainId = `room-rain-${uniqueId}`;
  const nearRainId = `room-rain-near-${uniqueId}`;
  const [paused, setPaused] = useState(() => document.hidden);
  const sceneClassName = [
    'room-scene',
    reducedMotion && 'is-reduced-motion',
    lampOn && 'is-lamp-on',
    rainOn && 'is-rain-on',
    paused && 'is-paused',
  ].filter(Boolean).join(' ');

  useEffect(() => {
    const updateVisibility = () => setPaused(document.hidden);
    updateVisibility();
    document.addEventListener('visibilitychange', updateVisibility);
    return () => document.removeEventListener('visibilitychange', updateVisibility);
  }, []);

  return (
    <div className={sceneClassName}>
      <svg
        className="room-art"
        viewBox="0 0 480 270"
        xmlns="http://www.w3.org/2000/svg"
        shapeRendering="crispEdges"
        role="group"
        aria-labelledby={`room-title-${uniqueId} room-desc-${uniqueId}`}
      >
        <title id={`room-title-${uniqueId}`}>Seu pequeno refúgio em uma noite tranquila</title>
        <desc id={`room-desc-${uniqueId}`}>
          Um quarto em pixel art, com janela para a floresta, plantas, uma escrivaninha com chá e
          caderno aberto e luminária dourada. Um pequeno companheiro pode descansar por aqui.
        </desc>
        <defs>
          <clipPath id={windowId}>
            <rect x="51" y="36" width="166" height="101" />
          </clipPath>
          <pattern id={rainId} width="31" height="48" patternUnits="userSpaceOnUse">
            <path
              d="M7 2h1v4H7zM6 6h1v4H6zM23 18h1v4h-1zM22 22h1v3h-1zM13 33h1v4h-1zM12 37h1v4h-1z"
              fill="#b7d0d5"
              opacity=".27"
            />
          </pattern>
          <pattern id={nearRainId} width="53" height="48" patternUnits="userSpaceOnUse">
            <path
              d="M17 4h1v5h-1zM16 9h1v5h-1zM39 29h1v4h-1zM38 33h1v4h-1z"
              fill="#c4dbdc"
              opacity=".42"
            />
          </pattern>
          <pattern
            id={`room-wall-${uniqueId}`}
            width="18"
            height="18"
            patternUnits="userSpaceOnUse"
          >
            <path d="M4 7h1v1H4zM13 15h1v1h-1z" fill="#90a18a" opacity=".06" />
          </pattern>
        </defs>
        <path d="M0 0h480v270H0z" fill="#233a3b" />
        <path d="M9 8h461v174H9z" fill="#354d49" />
        <path d="M9 8h461v174H9z" fill={`url(#room-wall-${uniqueId})`} />
        <path d="M0 0h480v8H0zM0 8h10v262H0zM470 8h10v262h-10z" fill="#1d3233" />
        <path d="M10 8h460v4H10zM10 12h460v2H10z" fill="#526253" />
        <path d="M438 15h32v162h-32z" fill="#2d4441" />
        <path d="M437 15h1v161h-1z" fill="#243b39" />
        <path d="M11 175h458v11H11z" fill="#243b36" />
        <path d="M11 175h458v3H11z" fill="#62705a" />
        <path d="M11 182h458v88H11z" fill="#696c54" />
        <path d="M11 185h458v21H11zM11 230h458v21H11z" fill="#73725a" />
        <path
          d="M11 184h458v2H11zM11 206h458v2H11zM11 228h458v2H11zM11 251h458v2H11z"
          fill="#4d5946"
        />
        <path
          d="M77 186h2v20h-2zM231 186h2v20h-2zM386 186h2v20h-2zM143 208h2v20h-2zM317 208h2v20h-2zM64 230h2v21h-2zM224 230h2v21h-2zM401 230h2v21h-2zM142 253h2v17h-2zM306 253h2v17h-2z"
          fill="#505b46"
        />
        {FLOOR_GRAINS.map(([x, y, width]) => (
          <path
            key={`${x}-${y}`}
            d={`M${x} ${y}h${width}v1h-${width}z`}
            fill="#a19a70"
            opacity=".3"
          />
        ))}
        <path d="M13 185h455v3H13z" fill="#263d35" opacity=".35" />
        <Window rainOn={rainOn} windowId={windowId} rainId={rainId} nearRainId={nearRainId} />
        <WallDetails />
        <FloorDetails />
        <g className={`room-rain-reflection${rainOn ? ' is-visible' : ''}`} fill="#a5c6c7">
          <g className="room-rain-shimmer">
            <path d="M58 186h90v5h10v7h-86v-5H58zM80 202h81v3h9v5H90v-4H80z" opacity=".045" />
            <path d="M64 187h31v2H64zM108 192h36v2h-36zM96 204h49v1H96z" opacity=".13" />
          </g>
        </g>
        <g className="room-lamplight" opacity={lampOn ? 1 : 0} fill="#edc783">
          <g className="room-lamp-breathe">
            <path d="M192 205h61v5h16v8h14v7H171v-7h10v-8h11z" opacity=".075" />
            <path d="M202 210h45v4h13v5h-70v-5h12z" opacity=".065" />
          </g>
        </g>
        <Bed />
        <Desk lampOn={lampOn} />
        <Plant x={31} y={109} large />
        <Plant x={440} y={176} large />
        <path d="M451 175h2v30h-2zM451 178h-8v-8h2v6h6zM453 186h8v-9h2v11h-10z" fill="#536e50" />
        <path
          d="M436 160h9v3h5v7h-5v3h-9v-3h-4v-7h4zM459 164h7v3h5v7h-4v4h-8v-3h-4v-8h4zM450 149h8v3h4v7h-4v3h-9v-4h-3v-6h4z"
          fill="#829b6e"
        />
        <path
          d="M438 162h5v2h4v3h-5v-2h-6v-1h2zM460 167h5v2h-6v4h-3v-4h4zM452 151h4v6h-3v-3h-1z"
          fill="#a8b589"
        />
        <path d="M0 264h480v6H0zM0 0h480v2H0z" fill="#152d30" />
        {companion && <Companion world="room" settings={companion.settings} reducedMotion={reducedMotion}
          paused={paused || companion.paused} context={{ rainOn, lampOn }} onInteract={companion.onInteract} />}
        <rect
          className="room-night-shade"
          width="480"
          height="270"
          fill="#0c2038"
          opacity={lampOn ? 0 : 0.19}
          pointerEvents="none"
        />
      </svg>
      <button
        type="button"
        className="room-object room-object--window"
        onClick={onToggleRain}
        aria-label={rainOn ? 'Parar chuva' : 'Ativar chuva'}
        aria-pressed={rainOn}
      >
        <span className="room-object-corner" aria-hidden="true" />
        <span className="room-object-label">
          {rainOn ? 'Uma pausa na chuva' : 'Deixar chover'}
          <span aria-hidden="true"> ↗</span>
        </span>
      </button>
      <button
        type="button"
        className="room-object room-object--lamp"
        onClick={onToggleLamp}
        aria-label={lampOn ? 'Apagar luminária' : 'Acender luminária'}
        aria-pressed={lampOn}
      >
        <span className="room-object-corner" aria-hidden="true" />
        <span className="room-object-label">
          {lampOn ? 'Apagar a luz' : 'Acender a luz'}
          <span aria-hidden="true"> ↗</span>
        </span>
      </button>
      <button
        type="button"
        className="room-object room-object--notebook"
        onClick={onOpenNotebook}
        aria-label="Abrir caderno"
      >
        <span className="room-notebook-spark" aria-hidden="true">
          ✧
        </span>
        <span className="room-object-corner" aria-hidden="true" />
        <span className="room-object-label">
          Um espaço para soltar<span aria-hidden="true"> ↗</span>
        </span>
      </button>
    </div>
  );
}

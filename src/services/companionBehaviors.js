// Original paths on the scenes' 480 × 270 grid. Walking segments use one axis;
// only the bed's front edge permits an explicit leap between two surfaces.
export const COMPANION_POSES = Object.freeze([
  'idle', 'sitting', 'walking', 'sleeping', 'lying', 'stretching', 'petting', 'looking',
]);

const point = (x, y) => Object.freeze({ x, y });
export const COMPANION_PLACES = Object.freeze({
  room: Object.freeze({ bed: point(381, 187), 'bed-edge': point(335, 187),
    landing: point(335, 258), floor: point(276, 258), lamp: point(276, 240),
    'window-floor': point(180, 258), window: point(180, 240) }),
  // This reserved strip is clear even when every plant/decorative slot is used.
  garden: Object.freeze({ grass: point(350, 265), pond: point(395, 265) }),
  journey: Object.freeze({ seat: point(320, 211), window: point(303, 211), rest: point(330, 211) }),
});
const connections = {
  room: [['bed', 'bed-edge'], ['bed-edge', 'landing', 'hop'], ['landing', 'floor'],
    ['floor', 'lamp'], ['floor', 'window-floor'], ['window-floor', 'window']],
  garden: [['grass', 'pond']],
  journey: [['seat', 'window'], ['seat', 'rest']],
};
const cycles = {
  room: ['sleeping', 'stretching', 'idle', 'sitting', 'looking', 'lying'],
  garden: ['lying', 'idle', 'looking', 'sitting', 'sleeping', 'stretching'],
  journey: ['sitting', 'looking', 'lying', 'sleeping', 'stretching', 'idle'],
};
const clampRandom = (value) => Number.isFinite(value) ? Math.min(0.999999, Math.max(0, value)) : 0.5;

export function companionRoute(world, from, to) {
  const places = COMPANION_PLACES[world];
  if (!places || !places[from] || !places[to]) return [];
  const queue = [[from]];
  const visited = new Set([from]);
  while (queue.length) {
    const path = queue.shift();
    const last = path.at(-1);
    if (last === to) return path.slice(1);
    for (const [a, b] of connections[world]) {
      const next = a === last ? b : b === last ? a : null;
      if (next && !visited.has(next)) { visited.add(next); queue.push([...path, next]); }
    }
  }
  return [];
}

function restDuration(pose, random) {
  if (pose === 'stretching') return 3000;
  const ranges = pose === 'sleeping' ? [24_000, 20_000] : pose === 'looking' ? [12_000, 12_000] : [10_000, 12_000];
  return ranges[0] + Math.floor(clampRandom(random) * ranges[1]);
}

export function initialCompanion(world = 'room', random = 0.5) {
  const safeWorld = Object.hasOwn(COMPANION_PLACES, world) ? world : 'room';
  const place = safeWorld === 'room' ? 'bed' : safeWorld === 'garden' ? 'grass' : 'seat';
  const pose = cycles[safeWorld][0];
  return { world: safeWorld, place, position: { ...COMPANION_PLACES[safeWorld][place] }, pose,
    restIndex: 0, sequence: 0, reaction: 0, waitMs: restDuration(pose, random), travel: null, returnState: null };
}

function startSegment(state, path) {
  const destination = path[0];
  const from = COMPANION_PLACES[state.world][state.place];
  const to = COMPANION_PLACES[state.world][destination];
  const edge = connections[state.world].find(([a, b]) => (a === state.place && b === destination) || (b === state.place && a === destination));
  const mode = edge?.[2] === 'hop' ? 'hop' : 'walk';
  const distance = Math.abs(to.x - from.x) + Math.abs(to.y - from.y);
  const duration = mode === 'hop' ? 1500 : Math.max(2200, Math.round(distance / 8 * 1000));
  return { ...state, pose: 'walking', sequence: state.sequence + 1, position: { ...from }, waitMs: duration,
    travel: { from: { ...from }, to: { ...to }, destination, remainingPath: path.slice(1), mode, duration, elapsedStart: 0 }, returnState: null };
}

function destinationFor(state, context, random) {
  if (state.world === 'room') {
    if (state.place === 'bed') return context.rainOn ? 'window' : 'lamp';
    if (state.place === 'window') return random < 0.45 ? 'lamp' : 'bed';
    return random < 0.6 ? 'bed' : 'window';
  }
  if (state.world === 'garden') return state.place === 'grass' ? 'pond' : 'grass';
  return state.place === 'seat' ? random < 0.5 ? 'window' : 'rest' : 'seat';
}

/** One transition per settled pose or path segment; no continuous simulation. */
export function nextCompanion(state, context = {}, random = 0.5) {
  if (state.pose === 'petting' && state.returnState) {
    return { ...state.returnState, sequence: state.sequence + 1, reaction: state.reaction, returnState: null };
  }
  if (state.travel) {
    const arrived = { ...state, place: state.travel.destination, position: { ...state.travel.to }, travel: null };
    if (state.travel.remainingPath.length) return startSegment(arrived, state.travel.remainingPath);
    const pose = state.world === 'room' && arrived.place === 'bed' ? 'sleeping'
      : arrived.place === 'window' || (state.world === 'garden' && arrived.place === 'pond') ? 'looking' : 'lying';
    return { ...arrived, pose, sequence: state.sequence + 1, waitMs: restDuration(pose, random) };
  }
  const restIndex = state.restIndex + 1;
  if (restIndex % 3 === 0) {
    const destination = destinationFor(state, context, clampRandom(random));
    const route = companionRoute(state.world, state.place, destination);
    if (route.length) return startSegment({ ...state, restIndex }, route);
  }
  let pose = cycles[state.world][restIndex % cycles[state.world].length];
  if (state.world === 'garden' && pose === 'looking' && context.atmosphere === 'night') pose = 'sitting';
  return { ...state, pose, restIndex, sequence: state.sequence + 1, waitMs: restDuration(pose, random), returnState: null };
}

/** Pixel-exact position matching the stepped CSS walk/leap, including pauses. */
export function companionPositionAt(state, elapsedMs = 0) {
  const travel = state.travel;
  if (!travel) return { ...state.position };
  const progress = Math.min(1, Math.max(0, (travel.elapsedStart + elapsedMs) / travel.duration));
  const dx = travel.to.x - travel.from.x;
  const dy = travel.to.y - travel.from.y;
  if (travel.mode === 'hop') {
    const offset = dy > 0
      ? progress < 0.2 ? -Math.floor(6 * progress / 0.2) : -6 + Math.floor((dy + 6) * (progress - 0.2) / 0.8)
      : progress < 0.8 ? -Math.floor((-dy + 6) * progress / 0.8) : dy - 6 + Math.floor(6 * (progress - 0.8) / 0.2);
    return { x: travel.from.x, y: travel.from.y + offset };
  }
  const distance = Math.abs(dx || dy);
  const pixels = Math.floor(distance * progress);
  return { x: travel.from.x + Math.sign(dx) * (dx ? pixels : 0),
    y: travel.from.y + Math.sign(dy) * (dy ? pixels : 0) };
}

/** Freeze a moving cat at its current pixel, then resume the same trip after petting. */
export function petCompanion(state, elapsedMs = 0) {
  if (state.pose === 'petting') return state;
  const elapsed = Math.min(state.waitMs, Math.max(0, elapsedMs));
  const returnState = { ...state, waitMs: Math.max(1, state.waitMs - elapsed), returnState: null,
    travel: state.travel ? { ...state.travel, elapsedStart: state.travel.elapsedStart + elapsed } : null };
  return { ...state, pose: 'petting', position: companionPositionAt(state, elapsed), travel: null,
    sequence: state.sequence + 1, reaction: state.reaction + 1, waitMs: 1800, returnState };
}

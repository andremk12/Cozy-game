// Feet positions on the original 480 x 270 scene. The foreground corridor is
// below the table legs (ending at y=263); work stations remain on the floor.
const point = (x, y) => Object.freeze({ x, y });
export const KITCHEN_COMPANION_PLACES = Object.freeze({
  wait: point(130, 266), book: point(205, 266), corner: point(350, 266),
  oven: point(350, 220), prep: point(400, 220),
  'table-floor': point(340, 266), table: point(340, 244),
});
export const KITCHEN_COMPANION_CONNECTIONS = Object.freeze([
  ['wait', 'book'], ['book', 'table-floor'], ['table-floor', 'corner'],
  ['corner', 'oven'], ['oven', 'prep'], ['table-floor', 'table'],
].map((edge) => Object.freeze(edge)));
export const KITCHEN_WALK_SPEED = 24;
export const KITCHEN_PREPARE_MS = 350;
export const KITCHEN_ARRIVE_MS = 300;

export function kitchenRoute(from, to) {
  if (!KITCHEN_COMPANION_PLACES[from] || !KITCHEN_COMPANION_PLACES[to]) return [];
  const paths = [[from]];
  const visited = new Set([from]);
  while (paths.length) {
    const path = paths.shift();
    const last = path.at(-1);
    if (last === to) return path.slice(1);
    for (const [a, b] of KITCHEN_COMPANION_CONNECTIONS) {
      const next = a === last ? b : b === last ? a : null;
      if (next && !visited.has(next)) { visited.add(next); paths.push([...path, next]); }
    }
  }
  return [];
}

const distance = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const targetFacing = (target, fallback = 1) => target.place === 'table' ? -1 : fallback;

function acting(state, target, targetKey) {
  return { ...state, ...target, position: { ...KITCHEN_COMPANION_PLACES[target.place] },
    sequence: state.sequence + 1, waitMs: target.celebrate ? 1700 : 20_000,
    kitchenPhase: 'acting', kitchenTarget: { ...target }, kitchenTargetKey: targetKey,
    kitchenRoute: [], travel: null, returnState: null,
    facing: targetFacing(target, state.facing),
  };
}

export function initializeKitchenMotion(base, target, targetKey) {
  return { ...acting(base, target, targetKey), kitchenCelebrationClaimed: Boolean(target.celebrate) };
}

/** Retarget at a captured current pixel. An interrupted walk first returns to a
 * connected endpoint; it never cuts diagonally through the furniture. */
export function directKitchenMotion(state, target, targetKey, { position = state.position, immediate = false } = {}) {
  if (immediate) return initializeKitchenMotion(state, target, targetKey);
  let entry = state.place;
  if (state.travel) {
    const other = state.travel.destination;
    if (distance(position, KITCHEN_COMPANION_PLACES[other]) < distance(position, KITCHEN_COMPANION_PLACES[entry])) entry = other;
  }
  const route = [...(distance(position, KITCHEN_COMPANION_PLACES[entry]) ? [entry] : []), ...kitchenRoute(entry, target.place)];
  const first = KITCHEN_COMPANION_PLACES[route[0]];
  const facing = first && first.x !== position.x ? Math.sign(first.x - position.x) : state.facing || 1;
  return { ...state, position: { ...position }, place: entry, pose: 'looking', action: undefined,
    celebrate: false, facing, travel: null, returnState: null,
    sequence: state.sequence + 1, waitMs: KITCHEN_PREPARE_MS,
    kitchenPhase: 'preparing', kitchenTarget: { ...target }, kitchenTargetKey: targetKey,
    kitchenRoute: route, kitchenCelebrationClaimed: Boolean(target.celebrate),
  };
}

function startSegment(state) {
  const [destination, ...remainingPath] = state.kitchenRoute;
  if (!destination) return { ...state, pose: 'idle', action: undefined,
    kitchenPhase: 'arriving', sequence: state.sequence + 1, waitMs: KITCHEN_ARRIVE_MS, travel: null };
  const from = { ...state.position };
  const to = { ...KITCHEN_COMPANION_PLACES[destination] };
  const duration = Math.max(1, Math.round(distance(from, to) / KITCHEN_WALK_SPEED * 1000));
  return { ...state, pose: 'walking', action: undefined, celebrate: false, kitchenPhase: 'walking',
    sequence: state.sequence + 1, waitMs: duration,
    facing: from.x === to.x ? state.facing : Math.sign(to.x - from.x),
    kitchenRoute: remainingPath,
    travel: { from, to, destination, remainingPath, mode: 'walk', duration, elapsedStart: 0 },
  };
}

export function nextKitchenMotion(state) {
  if (state.kitchenPhase === 'preparing') return startSegment(state);
  if (state.kitchenPhase === 'walking') {
    const arrived = { ...state, place: state.travel.destination, position: { ...state.travel.to }, travel: null };
    return startSegment(arrived);
  }
  if (state.kitchenPhase === 'arriving') return acting(state, state.kitchenTarget, state.kitchenTargetKey);
  if (state.celebrate) return { ...state, celebrate: false, sequence: state.sequence + 1, waitMs: 20_000 };
  return state;
}

/** Head coordinates are relative to the same moving group as sprite and speech. */
export function kitchenHeadAnchor(state) {
  if (state.pose === 'sleeping' || state.pose === 'lying') return { x: 7 * (state.facing || 1), y: -29 };
  if (state.pose === 'walking' || state.pose === 'idle') return { x: 8 * (state.facing || 1), y: -37 };
  return { x: 0, y: state.pose === 'looking' ? -39 : -38 };
}

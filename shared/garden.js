// This module is deliberately dependency-free: renderer and main validate the
// same small, non-sensitive document. No writing-ritual state enters this model.
export const GARDEN_VERSION = 1;
export const MAX_GARDEN_BYTES = 32_768;
export const GROWTH_THRESHOLDS = Object.freeze([120_000, 480_000, 1_200_000]);
export const SPECIES = Object.freeze([
  { id: 'daisy', label: 'Margarida' },
  { id: 'lavender', label: 'Lavanda' },
  { id: 'hibiscus', label: 'Hibisco rosa' },
  { id: 'fern', label: 'Samambaia' },
  { id: 'succulent', label: 'Suculenta' },
]);
export const PLANT_SLOTS = Object.freeze([
  { id: 'bed-1', label: 'Canteiro 1', kind: 'bed', x: 83, y: 181 },
  { id: 'bed-2', label: 'Canteiro 2', kind: 'bed', x: 150, y: 174 },
  { id: 'bed-3', label: 'Canteiro 3', kind: 'bed', x: 217, y: 181 },
  { id: 'bed-4', label: 'Canteiro 4', kind: 'bed', x: 284, y: 174 },
  { id: 'pot-1', label: 'Vaso 1', kind: 'pot', x: 65, y: 246 },
  { id: 'pot-2', label: 'Vaso 2', kind: 'pot', x: 131, y: 239 },
  { id: 'pot-3', label: 'Vaso 3', kind: 'pot', x: 197, y: 246 },
  { id: 'pot-4', label: 'Vaso 4', kind: 'pot', x: 263, y: 239 },
]);
export const DECOR_SLOTS = Object.freeze([
  { id: 'bench-1', label: 'Recanto do banco', x: 281, y: 127, kinds: ['bench'] },
  { id: 'lantern-1', label: 'Lanterna do caminho', x: 36, y: 196, kinds: ['lantern'] },
  { id: 'lantern-2', label: 'Lanterna do lago', x: 319, y: 141, kinds: ['lantern'] },
  { id: 'accent-1', label: 'Recanto das pedras', x: 110, y: 211, kinds: ['stone', 'mushroom'] },
  { id: 'accent-2', label: 'Recanto do gramado', x: 302, y: 247, kinds: ['stone', 'mushroom'] },
  { id: 'accent-3', label: 'Recanto do lago', x: 448, y: 244, kinds: ['stone', 'mushroom'] },
]);
const speciesIds = new Set(SPECIES.map(({ id }) => id));
const plantIds = new Set(PLANT_SLOTS.map(({ id }) => id));
const potIds = new Set(PLANT_SLOTS.filter(({ kind }) => kind === 'pot').map(({ id }) => id));
const decorSlots = new Map(DECOR_SLOTS.map((slot) => [slot.id, slot]));
const atmospheres = new Set(['day', 'sunset', 'night']);
const weatherKinds = new Set(['clear', 'rain']);
const potStyles = new Set(['terracotta', 'wood']);
const maximumElapsed = GROWTH_THRESHOLDS.at(-1);
const maxTimestamp = 8_640_000_000_000_000;
const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)
  && [Object.prototype, null].includes(Object.getPrototypeOf(value));
const validTime = (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= maxTimestamp;
const timestamp = (now) => validTime(now) ? now : Date.now();
const exactKeys = (value, keys) => isRecord(value) && Object.keys(value).length === keys.length
  && keys.every((key) => Object.hasOwn(value, key));
const copyPlant = (plant) => ({ ...plant, wateredStages: [...plant.wateredStages] });
export const cloneGarden = (garden) => ({
  ...garden,
  plants: garden.plants.map(copyPlant),
  pots: garden.pots.map((pot) => ({ ...pot })),
  decorations: garden.decorations.map((item) => ({ ...item })),
});

export function createGarden() {
  return {
    version: GARDEN_VERSION,
    plants: [],
    pots: [...potIds].map((slotId) => ({ slotId, style: 'terracotta' })),
    decorations: [
      { slotId: 'bench-1', kind: 'bench', lit: false },
      { slotId: 'lantern-1', kind: 'lantern', lit: true },
      { slotId: 'lantern-2', kind: 'lantern', lit: true },
      { slotId: 'accent-1', kind: 'stone', lit: false },
    ],
    atmosphere: 'day',
    weather: 'clear',
  };
}

function elapsedAt(plant, now) {
  return Math.min(maximumElapsed, plant.elapsedMs + Math.max(0, timestamp(now) - plant.updatedAt));
}

export function getPlantStage(plant, now = Date.now()) {
  const elapsed = elapsedAt(plant, now);
  return GROWTH_THRESHOLDS.filter((threshold) => elapsed >= threshold).length;
}

export function reconcileGarden(garden, now = Date.now()) {
  const currentTime = timestamp(now);
  let changed = false;
  const plants = garden.plants.map((plant) => {
    const elapsedMs = elapsedAt(plant, currentTime);
    // A backwards clock never subtracts growth or counts the same interval twice.
    const updatedAt = Math.max(plant.updatedAt, currentTime);
    if (elapsedMs === plant.elapsedMs && (plant.elapsedMs === maximumElapsed || updatedAt === plant.updatedAt)) return plant;
    changed = true;
    return { ...plant, elapsedMs, updatedAt };
  });
  return changed ? { ...garden, plants } : garden;
}

export function nextGrowthDelay(garden, now = Date.now()) {
  let delay = Infinity;
  for (const plant of garden.plants) {
    const elapsed = elapsedAt(plant, now);
    const next = GROWTH_THRESHOLDS.find((threshold) => threshold > elapsed);
    if (next !== undefined) delay = Math.min(delay, next - elapsed + Math.max(0, plant.updatedAt - now));
  }
  return Number.isFinite(delay) ? Math.max(1, delay) : null;
}

function validPlant(plant) {
  return exactKeys(plant, ['slotId', 'species', 'elapsedMs', 'updatedAt', 'wateredStages'])
    && plantIds.has(plant.slotId) && speciesIds.has(plant.species)
    && typeof plant.elapsedMs === 'number' && Number.isFinite(plant.elapsedMs)
    && plant.elapsedMs >= 0 && plant.elapsedMs <= maximumElapsed && validTime(plant.updatedAt)
    && Array.isArray(plant.wateredStages) && plant.wateredStages.length <= 3
    && plant.wateredStages.every((stage) => Number.isInteger(stage) && stage >= 0 && stage <= 2)
    && new Set(plant.wateredStages).size === plant.wateredStages.length;
}
const validPot = (pot) => exactKeys(pot, ['slotId', 'style']) && potIds.has(pot.slotId) && potStyles.has(pot.style);
const validDecoration = (item) => exactKeys(item, ['slotId', 'kind', 'lit'])
  && decorSlots.get(item.slotId)?.kinds.includes(item.kind) && typeof item.lit === 'boolean'
  && (item.kind === 'lantern' || item.lit === false);
const uniqueSlots = (items) => new Set(items.map(({ slotId }) => slotId)).size === items.length;

/** Strict boundary for every write: arbitrary fields and free text are refused. */
export function validateGarden(value) {
  if (!exactKeys(value, ['version', 'plants', 'pots', 'decorations', 'atmosphere', 'weather'])
    || value.version !== GARDEN_VERSION || !atmospheres.has(value.atmosphere) || !weatherKinds.has(value.weather)
    || !Array.isArray(value.plants) || value.plants.length > plantIds.size || !value.plants.every(validPlant) || !uniqueSlots(value.plants)
    || !Array.isArray(value.pots) || value.pots.length !== potIds.size || !value.pots.every(validPot) || !uniqueSlots(value.pots)
    || !Array.isArray(value.decorations) || value.decorations.length > decorSlots.size
    || !value.decorations.every(validDecoration) || !uniqueSlots(value.decorations)) {
    throw new TypeError('Invalid garden document.');
  }
  return cloneGarden(value);
}

/** Recover only known fields. A newer version is never silently overwritten. */
export function recoverGarden(value) {
  if (isRecord(value) && Number.isInteger(value.version) && value.version > GARDEN_VERSION) {
    return { garden: createGarden(), status: 'unsupported' };
  }
  try {
    return { garden: validateGarden(value), status: 'ok' };
  } catch {
    const garden = createGarden();
    if (!isRecord(value) || value.version !== GARDEN_VERSION) return { garden, status: 'recovered' };
    const recoverItems = (items, keys, validator, limit) => {
      const accepted = [];
      if (!Array.isArray(items)) return accepted;
      for (const item of items.slice(0, 64)) {
        if (!isRecord(item)) continue;
        const safe = Object.fromEntries(keys.map((key) => [key, item[key]]));
        if (validator(safe) && !accepted.some(({ slotId }) => slotId === safe.slotId)) accepted.push(safe);
        if (accepted.length === limit) break;
      }
      return accepted;
    };
    garden.plants = recoverItems(value.plants, ['slotId', 'species', 'elapsedMs', 'updatedAt', 'wateredStages'], validPlant, plantIds.size).map(copyPlant);
    const pots = recoverItems(value.pots, ['slotId', 'style'], validPot, potIds.size);
    garden.pots = garden.pots.map((pot) => pots.find(({ slotId }) => slotId === pot.slotId) ?? pot);
    garden.decorations = recoverItems(value.decorations, ['slotId', 'kind', 'lit'], validDecoration, decorSlots.size);
    if (atmospheres.has(value.atmosphere)) garden.atmosphere = value.atmosphere;
    if (weatherKinds.has(value.weather)) garden.weather = value.weather;
    return { garden, status: 'recovered' };
  }
}

export function gardenReducer(garden, action, now = Date.now()) {
  if (!action || typeof action.type !== 'string') return garden;
  const current = reconcileGarden(garden, now);
  const plant = current.plants.find(({ slotId }) => slotId === action.slotId);
  switch (action.type) {
    case 'reconcile': return current;
    case 'plant':
      if (!plantIds.has(action.slotId) || !speciesIds.has(action.species) || plant) return current;
      return { ...current, plants: [...current.plants, { slotId: action.slotId, species: action.species, elapsedMs: 0, updatedAt: timestamp(now), wateredStages: [] }] };
    case 'replacePlant':
      if (!plantIds.has(action.slotId) || !speciesIds.has(action.species) || !plant) return current;
      return { ...current, plants: current.plants.map((item) => item === plant
        ? { slotId: action.slotId, species: action.species, elapsedMs: 0, updatedAt: timestamp(now), wateredStages: [] } : item) };
    case 'removePlant':
      return plant ? { ...current, plants: current.plants.filter((item) => item !== plant) } : current;
    case 'water': {
      if (!plant) return current;
      const stage = getPlantStage(plant, now);
      if (stage === 3 || plant.wateredStages.includes(stage)) return current;
      const duration = GROWTH_THRESHOLDS[stage] - (GROWTH_THRESHOLDS[stage - 1] ?? 0);
      return { ...current, plants: current.plants.map((item) => item === plant
        ? { ...plant, elapsedMs: Math.min(maximumElapsed, plant.elapsedMs + duration * 0.2), wateredStages: [...plant.wateredStages, stage] }
        : item) };
    }
    case 'potStyle':
      if (!potIds.has(action.slotId) || !potStyles.has(action.style)) return current;
      return { ...current, pots: current.pots.map((pot) => pot.slotId === action.slotId ? { ...pot, style: action.style } : pot) };
    case 'movePot':
      if (action.from === action.to || !potIds.has(action.from) || !potIds.has(action.to)) return current;
      return { ...current,
        pots: current.pots.map((pot) => ({ ...pot, slotId: pot.slotId === action.from ? action.to : pot.slotId === action.to ? action.from : pot.slotId })),
        plants: current.plants.map((item) => ({ ...item, slotId: item.slotId === action.from ? action.to : item.slotId === action.to ? action.from : item.slotId })),
      };
    case 'decorate':
      if (!decorSlots.get(action.slotId)?.kinds.includes(action.kind)) return current;
      return { ...current, decorations: [...current.decorations.filter(({ slotId }) => slotId !== action.slotId), { slotId: action.slotId, kind: action.kind, lit: action.kind === 'lantern' }] };
    case 'removeDecoration':
      return { ...current, decorations: current.decorations.filter(({ slotId }) => slotId !== action.slotId) };
    case 'toggleLantern':
      return { ...current, decorations: current.decorations.map((item) => item.slotId === action.slotId && item.kind === 'lantern' ? { ...item, lit: !item.lit } : item) };
    case 'moveDecoration': {
      const source = current.decorations.find(({ slotId }) => slotId === action.from);
      const destination = current.decorations.find(({ slotId }) => slotId === action.to);
      if (!source || action.from === action.to || !decorSlots.get(action.to)?.kinds.includes(source.kind)
        || (destination && !decorSlots.get(action.from)?.kinds.includes(destination.kind))) return current;
      return { ...current, decorations: current.decorations.map((item) => ({ ...item, slotId: item.slotId === action.from ? action.to : item.slotId === action.to ? action.from : item.slotId })) };
    }
    case 'atmosphere': return atmospheres.has(action.value) ? { ...current, atmosphere: action.value } : current;
    case 'weather': return weatherKinds.has(action.value) ? { ...current, weather: action.value } : current;
    default: return current;
  }
}

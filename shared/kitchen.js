import { getKitchenRecipe } from './kitchenRecipes.js';

export const KITCHEN_VERSION = 1;
export const MAX_KITCHEN_BYTES = 16_384;
export const MIN_KITCHEN_DURATION = 5 * 60_000;
export const MAX_KITCHEN_DURATION = 60 * 60_000;
export const DEFAULT_KITCHEN_SETTINGS = Object.freeze({ lampOn: true, atmosphere: 'sunset', weather: 'clear',
  messagesEnabled: true, completionSoundEnabled: false, effectsEnabled: false });
const maxTimestamp = 8_640_000_000_000_000;
const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)
  && [Object.prototype, null].includes(Object.getPrototypeOf(value));
const exact = (value, keys) => isRecord(value) && Object.keys(value).length === keys.length
  && keys.every((key) => Object.hasOwn(value, key));
const time = (value) => Number.isFinite(value) && value >= 0 && value <= maxTimestamp;
const duration = (value) => Number.isInteger(value) && value % 60_000 === 0
  && value >= MIN_KITCHEN_DURATION && value <= MAX_KITCHEN_DURATION;
const uuid = (value) => typeof value === 'string'
  && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value);
const states = new Set(['running', 'paused', 'completed', 'cancelled']);
const presentations = new Set(['pending', 'presented', 'closed']);

export function createKitchen() {
  return { version: KITCHEN_VERSION, session: null, settings: { ...DEFAULT_KITCHEN_SETTINGS } };
}

export function cloneKitchen(kitchen) {
  return { version: kitchen.version, session: kitchen.session ? { ...kitchen.session } : null, settings: { ...kitchen.settings } };
}

export function validateKitchenSettings(patch, complete = false) {
  const keys = Object.keys(DEFAULT_KITCHEN_SETTINGS);
  if (!isRecord(patch) || !Object.keys(patch).length || Object.keys(patch).some((key) => !keys.includes(key))
    || (complete && !exact(patch, keys))) throw new TypeError('Invalid kitchen settings.');
  for (const [key, value] of Object.entries(patch)) {
    if (key === 'atmosphere' ? !['day', 'sunset', 'night'].includes(value)
      : key === 'weather' ? !['clear', 'rain'].includes(value) : typeof value !== 'boolean') {
      throw new TypeError('Invalid kitchen settings.');
    }
  }
  return { ...patch };
}

export function validateKitchen(value) {
  if (!exact(value, ['version', 'session', 'settings']) || value.version !== KITCHEN_VERSION) {
    throw new TypeError('Invalid kitchen document.');
  }
  validateKitchenSettings(value.settings, true);
  const s = value.session;
  if (s !== null && (!exact(s, ['id', 'recipeId', 'durationMs', 'elapsedMs', 'updatedAt', 'status', 'presentation', 'completedAt'])
    || !uuid(s.id) || !getKitchenRecipe(s.recipeId) || !duration(s.durationMs)
    || !Number.isFinite(s.elapsedMs) || s.elapsedMs < 0 || s.elapsedMs > s.durationMs || !time(s.updatedAt)
    || !states.has(s.status) || !presentations.has(s.presentation)
    || (s.status === 'completed' ? s.elapsedMs !== s.durationMs || !time(s.completedAt)
      : s.completedAt !== null || s.presentation !== 'closed' || s.elapsedMs >= s.durationMs))) {
    throw new TypeError('Invalid kitchen session.');
  }
  return cloneKitchen(value);
}

export function recoverKitchen(value) {
  if (isRecord(value) && Number.isInteger(value.version) && value.version > KITCHEN_VERSION) {
    return { kitchen: createKitchen(), status: 'unsupported' };
  }
  try { return { kitchen: validateKitchen(value), status: 'ok' }; }
  catch {
    // Invalid documents remain untouched in storage. A temporary kitchen starts
    // with safe defaults, so damaged data cannot restore sound consent or a timer.
    return { kitchen: createKitchen(), status: 'recovered' };
  }
}

export function validateKitchenCommand(value) {
  if (!isRecord(value) || typeof value.type !== 'string') throw new TypeError('Invalid kitchen command.');
  const fields = value.type === 'start' ? ['type', 'recipeId', ...(Object.hasOwn(value, 'durationMs') ? ['durationMs'] : [])]
    : ['present', 'close'].includes(value.type) ? ['type', 'sessionId']
      : value.type === 'settings' ? ['type', 'patch'] : ['type'];
  if (!exact(value, fields) || !['start', 'pause', 'resume', 'cancel', 'restart', 'present', 'close', 'settings'].includes(value.type)
    || (value.type === 'start' && (!getKitchenRecipe(value.recipeId)
      || (Object.hasOwn(value, 'durationMs') && !duration(value.durationMs))))
    || (['present', 'close'].includes(value.type) && !uuid(value.sessionId))) {
    throw new TypeError('Invalid kitchen command.');
  }
  return value.type === 'settings' ? { type: 'settings', patch: validateKitchenSettings(value.patch) } : { ...value };
}

const normalStages = [
  { until: 0.12, id: 'ingredients', label: 'Separando os ingredientes', pose: 'read' },
  { until: 0.32, id: 'preparing', label: 'Preparando com carinho', pose: 'stir' },
  { until: 0.88, id: 'cooking', label: 'A receita ganha forma', pose: 'oven' },
  { until: 1, id: 'finishing', label: 'Cuidando dos últimos detalhes', pose: 'decorate' },
];
const cakeStages = [
  { until: 0.08, id: 'ingredients', label: 'Separando cenouras, ovos, farinha e utensílios', pose: 'read' },
  { until: 0.25, id: 'batter', label: 'Preparando a massa na tigela', pose: 'mix' },
  { until: 0.32, id: 'oven', label: 'Colocando a forma no forno', pose: 'oven' },
  { until: 0.72, id: 'baking', label: 'O bolo cresce e fica douradinho', pose: 'wait' },
  { until: 0.90, id: 'chocolate', label: 'Preparando a cobertura de chocolate', pose: 'stir' },
  { until: 1, id: 'serving', label: 'Finalizando o bolo para a mesa', pose: 'decorate' },
];

export function getKitchenView(kitchen) {
  const s = kitchen?.session;
  const recipe = getKitchenRecipe(s?.recipeId);
  if (!s || s.status === 'cancelled') return { recipe, remainingMs: 0, progress: 0,
    stage: { id: 'idle', label: 'Uma receita no seu tempo', pose: 'read' } };
  const progress = Math.min(1, Math.max(0, s.elapsedMs / s.durationMs));
  const stage = s.status === 'completed' ? { id: 'ready', label: 'Prontinho, com carinho', pose: 'present' }
    : (s.recipeId === 'cake' ? cakeStages : normalStages).find(({ until }) => progress < until);
  return { recipe, remainingMs: Math.max(0, s.durationMs - s.elapsedMs), progress, stage: { ...stage } };
}

export function formatKitchenTime(milliseconds) {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
  return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
}

/** Runtime clocks never enter the persisted document. Callbacks only request reconciliation. */
export class KitchenTimer {
  constructor(kitchen = createKitchen(), { now = Date.now, monotonic = () => performance.now(),
    idFactory = () => globalThis.crypto.randomUUID() } = {}) {
    this.now = now;
    this.monotonic = monotonic;
    this.idFactory = idFactory;
    this.kitchen = validateKitchen(kitchen);
    this.lastWall = now();
    this.lastMono = monotonic();
    this.suspended = false;
    this.clockChanged = false;
    const s = this.kitchen.session;
    if (s?.status === 'running') {
      if (this.lastWall < s.updatedAt) {
        this.kitchen.session = { ...s, status: 'paused', updatedAt: this.lastWall };
        this.clockChanged = true;
      } else this.advance(this.lastWall - s.updatedAt, this.lastWall);
    }
  }

  advance(delta, wall) {
    const s = this.kitchen.session;
    if (s?.status !== 'running') return;
    const accumulated = s.elapsedMs + Math.max(0, delta);
    const elapsedMs = Math.min(s.durationMs, accumulated);
    this.kitchen = { ...this.kitchen, session: { ...s, elapsedMs, updatedAt: wall,
      ...(elapsedMs >= s.durationMs ? { status: 'completed', presentation: 'pending',
        completedAt: Math.max(0, wall - (accumulated - s.durationMs)) } : {}) } };
  }

  reconcile() {
    const wall = this.now();
    const mono = this.monotonic();
    const monoDelta = Math.max(0, mono - this.lastMono);
    // On return from sleep, count the gap once whether the platform's monotonic
    // clock included sleep or stopped. Ordinary wall-clock edits never drive time.
    this.advance(this.suspended ? Math.max(monoDelta, wall - this.lastWall) : monoDelta, wall);
    this.lastWall = wall;
    this.lastMono = mono;
    return cloneKitchen(this.kitchen);
  }

  suspend() { this.reconcile(); this.suspended = true; return cloneKitchen(this.kitchen); }
  resume() { this.reconcile(); this.suspended = false; return cloneKitchen(this.kitchen); }

  command(input) {
    const command = validateKitchenCommand(input);
    this.reconcile();
    let s = this.kitchen.session;
    let presented = false;
    if (command.type === 'settings') {
      this.kitchen = { ...this.kitchen, settings: { ...this.kitchen.settings, ...command.patch } };
    } else if (command.type === 'start' || (command.type === 'restart' && s)) {
      // Starting another recipe never silently replaces an active session.
      if (command.type === 'start' && ['running', 'paused'].includes(s?.status)) return { kitchen: cloneKitchen(this.kitchen), presented };
      const recipe = getKitchenRecipe(command.type === 'restart' ? s.recipeId : command.recipeId);
      this.kitchen = { ...this.kitchen, session: { id: this.idFactory(), recipeId: recipe.id,
        durationMs: command.type === 'restart' ? s.durationMs : command.durationMs ?? recipe.durationMs,
        elapsedMs: 0, updatedAt: this.lastWall, status: 'running', presentation: 'closed', completedAt: null } };
    } else if (command.type === 'pause' && s?.status === 'running') {
      this.kitchen = { ...this.kitchen, session: { ...s, status: 'paused', updatedAt: this.lastWall } };
    } else if (command.type === 'resume' && s?.status === 'paused') {
      this.kitchen = { ...this.kitchen, session: { ...s, status: 'running', updatedAt: this.lastWall } };
      this.clockChanged = false;
    } else if (command.type === 'cancel' && ['running', 'paused'].includes(s?.status)) {
      this.kitchen = { ...this.kitchen, session: { ...s, status: 'cancelled', updatedAt: this.lastWall } };
    } else if (command.type === 'present' && s?.id === command.sessionId && s.status === 'completed' && s.presentation === 'pending') {
      presented = true;
      this.kitchen = { ...this.kitchen, session: { ...s, presentation: 'presented' } };
    } else if (command.type === 'close' && s?.id === command.sessionId && s.status === 'completed') {
      this.kitchen = { ...this.kitchen, session: { ...s, presentation: 'closed' } };
    }
    return { kitchen: cloneKitchen(this.kitchen), presented };
  }
}

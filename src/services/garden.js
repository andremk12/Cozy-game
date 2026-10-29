import {
  createGarden, gardenReducer, MAX_GARDEN_BYTES, recoverGarden, reconcileGarden, validateGarden,
} from '../../shared/garden.js';

export const GARDEN_STORAGE_KEY = 'haven.garden.v1';
const STORAGE_ERROR = 'Não foi possível salvar o jardim neste dispositivo. Suas mudanças continuam nesta sessão.';
const FUTURE_VERSION = 'Este jardim foi salvo por uma versão mais nova. Você pode explorar uma sessão temporária; o arquivo original será preservado.';
const statuses = new Set(['ok', 'missing', 'recovered', 'unavailable', 'unsupported']);

function defaultStorage() {
  try { return globalThis.localStorage ?? null; } catch { return null; }
}

/** Each durable edit is handed to main immediately; only main serializes writes. */
export function createGardenStore({ bridge = globalThis.window?.haven ?? null, storage = defaultStorage(), now = Date.now } = {}) {
  const desktop = bridge && typeof bridge.getGarden === 'function' && typeof bridge.saveGarden === 'function' ? bridge : null;
  const listeners = new Set();
  const writes = new Set();
  let snapshot = { garden: createGarden(), ready: false, status: 'missing', storageError: null };
  let initialization;
  let revision = 0;
  let latestSettled = 0;
  const emit = (value) => {
    snapshot = value;
    for (const listener of listeners) listener();
  };

  function persist(garden) {
    if (snapshot.status === 'unsupported') return Promise.resolve(false);
    const safeGarden = validateGarden(garden);
    const currentRevision = ++revision;
    let result;
    try {
      // Browser writes must happen synchronously, before a possible reload.
      if (desktop) result = desktop.saveGarden(safeGarden);
      else {
        if (!storage) throw new Error('Garden storage unavailable.');
        storage.setItem(GARDEN_STORAGE_KEY, JSON.stringify(safeGarden));
      }
    } catch {
      result = Promise.reject(new Error('Garden storage unavailable.'));
    }
    const operation = Promise.resolve(result).then(() => {
      if (currentRevision >= latestSettled) {
        latestSettled = currentRevision;
        emit({ ...snapshot, status: 'ok', storageError: null });
      }
      return true;
    }, () => {
      if (currentRevision >= latestSettled) {
        latestSettled = currentRevision;
        emit({ ...snapshot, status: 'unavailable', storageError: STORAGE_ERROR });
      }
      return false;
    });
    writes.add(operation);
    void operation.finally(() => writes.delete(operation));
    return operation;
  }

  function initialize() {
    if (initialization) return initialization;
    initialization = (async () => {
      let result;
      try {
        if (desktop) {
          const restored = await desktop.getGarden();
          result = { garden: validateGarden(restored.garden), status: statuses.has(restored.status) ? restored.status : 'recovered' };
        } else {
          if (!storage) throw new Error('Garden storage unavailable.');
          const raw = storage.getItem(GARDEN_STORAGE_KEY);
          result = raw === null ? { garden: createGarden(), status: 'missing' }
            : new TextEncoder().encode(raw).byteLength > MAX_GARDEN_BYTES ? { garden: createGarden(), status: 'recovered' }
              : recoverGarden(JSON.parse(raw));
        }
      } catch (error) {
        result = { garden: createGarden(), status: error instanceof SyntaxError ? 'recovered' : 'unavailable' };
      }
      const garden = reconcileGarden(result.garden, now());
      emit({ garden, ready: true, status: result.status,
        storageError: result.status === 'unsupported' ? FUTURE_VERSION : result.status === 'unavailable' ? STORAGE_ERROR : null });
      if (result.status !== 'unsupported' && result.status !== 'unavailable' && garden !== result.garden) void persist(garden);
      return snapshot;
    })();
    return initialization;
  }

  function dispatch(action) {
    if (!snapshot.ready) return false;
    const garden = gardenReducer(snapshot.garden, action, now());
    if (garden === snapshot.garden || JSON.stringify(garden) === JSON.stringify(snapshot.garden)) return false;
    emit({ ...snapshot, garden });
    void persist(garden);
    return true;
  }

  return {
    getSnapshot: () => snapshot,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    initialize,
    dispatch,
    retry() {
      if (!snapshot.ready) return initialize();
      const garden = reconcileGarden(snapshot.garden, now());
      if (garden !== snapshot.garden) emit({ ...snapshot, garden });
      return persist(garden);
    },
    async flush() {
      await initialize();
      while (writes.size) await Promise.all([...writes]);
    },
  };
}

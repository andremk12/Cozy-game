import { cloneKitchen, createKitchen, KitchenTimer, MAX_KITCHEN_BYTES, recoverKitchen, validateKitchen, validateKitchenCommand } from '../../shared/kitchen.js';

export const KITCHEN_STORAGE_KEY = 'haven.kitchen.v1';
const notices = {
  unavailable: 'Não foi possível salvar a cozinha neste dispositivo. A receita continua nesta sessão.',
  recovered: 'Não foi possível ler a cozinha salva. Você pode explorar uma sessão temporária; o arquivo original será preservado.',
  unsupported: 'Esta cozinha foi salva por uma versão mais nova. O arquivo original será preservado nesta sessão temporária.',
  'clock-changed': 'O relógio do dispositivo mudou. A receita ficou pausada; você pode retomá-la no seu tempo.',
};
const statuses = new Set(['ok', 'missing', 'recovered', 'unavailable', 'unsupported', 'clock-changed']);
function defaultStorage() {
  try { return globalThis.localStorage ?? null; } catch { return null; }
}

/** The renderer observes main on desktop, and uses the same clock model offline in a browser. */
export function createKitchenStore({ bridge = globalThis.window?.haven ?? null, storage = defaultStorage(),
  now = Date.now, monotonic = () => performance.now(), idFactory,
  setTimer = setTimeout, clearTimer = clearTimeout } = {}) {
  const desktop = bridge && typeof bridge.getKitchen === 'function' && typeof bridge.commandKitchen === 'function' ? bridge : null;
  const listeners = new Set();
  let snapshot = { kitchen: createKitchen(), ready: false, status: 'missing', storageError: null };
  let initialization;
  let pending = Promise.resolve();
  let runtime;
  let connected = false;
  let unsubscribe;
  let timer;
  let checkpoint = monotonic();
  const emit = (result) => {
    const kitchen = validateKitchen(result.kitchen);
    const status = statuses.has(result.status) ? result.status : 'recovered';
    snapshot = { kitchen, ready: true, status, storageError: notices[status] ?? null };
    for (const listener of listeners) listener();
    return { kitchen: cloneKitchen(kitchen), status, ...(typeof result.presented === 'boolean' ? { presented: result.presented } : {}) };
  };

  function persist() {
    if (['unsupported', 'recovered'].includes(snapshot.status)) return snapshot.status;
    try {
      if (!storage) throw new Error('Kitchen storage unavailable.');
      storage.setItem(KITCHEN_STORAGE_KEY, JSON.stringify(runtime.kitchen));
      checkpoint = monotonic();
      return runtime.clockChanged ? 'clock-changed' : 'ok';
    } catch { return 'unavailable'; }
  }

  function schedule() {
    clearTimer(timer);
    timer = undefined;
    const s = runtime?.kitchen.session;
    if (!desktop && connected && s?.status === 'running') {
      timer = setTimer(() => { timer = undefined; void refresh(); }, Math.max(1, Math.ceil(s.durationMs - s.elapsedMs)));
      timer?.unref?.();
    }
  }

  function initialize() {
    if (initialization) return initialization;
    initialization = (async () => {
      if (desktop) {
        try { emit(await desktop.getKitchen()); }
        catch { emit({ kitchen: createKitchen(), status: 'unavailable' }); }
      } else {
        let result;
        try {
          if (!storage) throw new Error('Kitchen storage unavailable.');
          const raw = storage.getItem(KITCHEN_STORAGE_KEY);
          result = raw === null ? { kitchen: createKitchen(), status: 'missing' }
            : new TextEncoder().encode(raw).byteLength > MAX_KITCHEN_BYTES ? { kitchen: createKitchen(), status: 'recovered' }
              : recoverKitchen(JSON.parse(raw));
        } catch (error) {
          result = { kitchen: createKitchen(), status: error instanceof SyntaxError ? 'recovered' : 'unavailable' };
        }
        runtime = new KitchenTimer(result.kitchen, { now, monotonic, ...(idFactory ? { idFactory } : {}) });
        emit({ kitchen: runtime.kitchen, status: runtime.clockChanged ? 'clock-changed' : result.status });
        if (JSON.stringify(result.kitchen) !== JSON.stringify(runtime.kitchen)) emit({ kitchen: runtime.kitchen, status: persist() });
        schedule();
      }
      return snapshot;
    })();
    return initialization;
  }

  function enqueue(operation) {
    const result = pending.then(async () => { await initialize(); return operation(); });
    pending = result.catch(() => undefined);
    return result;
  }

  function refresh() {
    return enqueue(async () => {
      if (desktop) {
        try { return emit(await desktop.getKitchen()); }
        catch { return emit({ kitchen: snapshot.kitchen, status: 'unavailable' }); }
      }
      const oldStatus = runtime.kitchen.session?.status;
      runtime.reconcile();
      const status = runtime.kitchen.session?.status !== oldStatus || monotonic() - checkpoint >= 30_000 ? persist() : snapshot.status;
      const result = emit({ kitchen: runtime.kitchen, status });
      schedule();
      return result;
    });
  }

  function dispatch(input) {
    const command = validateKitchenCommand(input);
    return enqueue(async () => {
      if (desktop) {
        try { return emit(await desktop.commandKitchen(command)); }
        catch { return emit({ kitchen: snapshot.kitchen, status: 'unavailable', presented: false }); }
      }
      const result = runtime.command(command);
      const output = emit({ ...result, status: persist() });
      schedule();
      return output;
    });
  }

  return {
    getSnapshot: () => snapshot,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    initialize,
    dispatch,
    refresh,
    connect() {
      connected = true;
      if (desktop && !unsubscribe && typeof desktop.onKitchenChanged === 'function') {
        unsubscribe = desktop.onKitchenChanged((result) => { try { emit(result); } catch { /* Refuse invalid bridge data. */ } });
      }
      schedule();
    },
    disconnect() { connected = false; unsubscribe?.(); unsubscribe = undefined; clearTimer(timer); timer = undefined; },
    setHidden(hidden) {
      if (desktop) return refresh();
      return enqueue(async () => {
        if (hidden) runtime.suspend(); else runtime.resume();
        const result = emit({ kitchen: runtime.kitchen, status: persist() });
        schedule();
        return result;
      });
    },
    retry() {
      if (desktop) return refresh();
      return enqueue(() => { runtime.reconcile(); const result = emit({ kitchen: runtime.kitchen, status: persist() }); schedule(); return result; });
    },
    async flush() { await initialize(); await pending; },
  };
}

import { DEFAULT_MIXER, normalizeMixer, validateMixer } from '../../shared/audio.js';
import { DEFAULT_COMPANION, normalizeCompanion, validateCompanion } from '../../shared/companion.js';

export const PREFERENCES_STORAGE_KEY = 'haven.preferences.v1';

export const DEFAULT_PREFERENCES = Object.freeze({
  lampOn: true,
  rainOn: true,
  audioEnabled: false,
  volume: 0.25,
  mixer: DEFAULT_MIXER,
  companion: DEFAULT_COMPANION,
});

const BOOLEAN_KEYS = new Set(['lampOn', 'rainOn', 'audioEnabled']);
const STORAGE_ERROR = 'Não foi possível salvar as preferências neste dispositivo.';

/** Only the explicit settings schema can cross the persistence boundary. */
export function normalizePreferences(input) {
  const source = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const result = { ...DEFAULT_PREFERENCES };

  for (const key of BOOLEAN_KEYS) {
    if (typeof source[key] === 'boolean') result[key] = source[key];
  }
  if (typeof source.volume === 'number' && Number.isFinite(source.volume)) {
    result.volume = Math.min(1, Math.max(0, source.volume));
  }
  result.mixer = normalizeMixer(source.mixer);
  result.companion = normalizeCompanion(source.companion);
  return result;
}

function defaultStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

function defaultBridge() {
  return globalThis.window?.haven ?? null;
}

/**
 * Keeps asynchronous desktop reads and writes ordered. Changes made while a read
 * is pending win over restored values. Text from the writing ritual never enters
 * this service; unknown keys are rejected, and every save is whitelisted again.
 */
export function createPreferenceStore({
  bridge = defaultBridge(),
  storage = defaultStorage(),
} = {}) {
  const desktop =
    bridge &&
    typeof bridge.getPreferences === 'function' &&
    typeof bridge.savePreferences === 'function'
      ? bridge
      : null;
  const listeners = new Set();
  const editedBeforeRestore = new Set();
  let snapshot = { preferences: { ...DEFAULT_PREFERENCES }, ready: false, storageError: null };
  let initialization;
  let pendingSave = null;
  let writing = false;
  let writePromise = Promise.resolve();

  const emit = (next) => {
    snapshot = next;
    for (const listener of listeners) listener();
  };

  async function read() {
    if (desktop) return desktop.getPreferences();
    if (!storage) throw new Error('Preference storage unavailable');
    const raw = storage.getItem(PREFERENCES_STORAGE_KEY);
    return raw === null ? DEFAULT_PREFERENCES : JSON.parse(raw);
  }

  async function persist(preferences) {
    const safePreferences = normalizePreferences(preferences);
    if (desktop) {
      await desktop.savePreferences(safePreferences);
      return;
    }
    if (!storage) throw new Error('Preference storage unavailable');
    storage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(safePreferences));
  }

  function queueSave() {
    pendingSave = { ...snapshot.preferences };
    if (writing) return;
    writing = true;
    writePromise = (async () => {
      while (pendingSave) {
        const preferences = pendingSave;
        pendingSave = null;
        try {
          await persist(preferences);
          if (snapshot.storageError) emit({ ...snapshot, storageError: null });
        } catch {
          if (!snapshot.storageError) emit({ ...snapshot, storageError: STORAGE_ERROR });
        }
      }
      writing = false;
    })();
  }

  function initialize() {
    if (initialization) return initialization;
    initialization = (async () => {
      let restored = { ...DEFAULT_PREFERENCES };
      let storageError = null;
      try {
        restored = normalizePreferences(await read());
      } catch {
        storageError = STORAGE_ERROR;
      }
      const preferences = { ...restored };
      for (const key of editedBeforeRestore) preferences[key] = snapshot.preferences[key];
      emit({ preferences, ready: true, storageError });
      if (editedBeforeRestore.size) queueSave();
      editedBeforeRestore.clear();
      return snapshot;
    })();
    return initialization;
  }

  function setPreference(key, valueOrUpdater) {
    if (!Object.hasOwn(DEFAULT_PREFERENCES, key)) return false;
    const value =
      typeof valueOrUpdater === 'function'
        ? valueOrUpdater(snapshot.preferences[key])
        : valueOrUpdater;
    if (BOOLEAN_KEYS.has(key) && typeof value !== 'boolean') return false;
    if (key === 'volume' && (typeof value !== 'number' || !Number.isFinite(value))) return false;
    let safeValue = key === 'volume' ? Math.min(1, Math.max(0, value)) : value;
    if (key === 'mixer') {
      try { safeValue = validateMixer(value); } catch { return false; }
    }
    if (key === 'companion') {
      try { safeValue = validateCompanion(value); } catch { return false; }
    }
    // Mark even unchanged defaults as intentional choices during restoration.
    if (!snapshot.ready) editedBeforeRestore.add(key);
    if (snapshot.preferences[key] === safeValue) return true;
    emit({ ...snapshot, preferences: { ...snapshot.preferences, [key]: safeValue } });
    if (snapshot.ready) queueSave();
    return true;
  }

  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    initialize,
    setPreference,
    async flush() {
      await initialize();
      await writePromise;
    },
  };
}

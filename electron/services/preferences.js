import { mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

export const DEFAULT_PREFERENCES = Object.freeze({
  lampOn: true,
  rainOn: true,
  audioEnabled: false,
  volume: 0.25,
});

const booleanKeys = ['lampOn', 'rainOn', 'audioEnabled'];
const keys = Object.keys(DEFAULT_PREFERENCES);
const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)
  && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);

/** Recover only known, valid fields from disk. Unrelated data is never retained. */
export function normalizePreferences(value) {
  const result = { ...DEFAULT_PREFERENCES };
  if (!isRecord(value)) return result;
  for (const key of booleanKeys) {
    if (typeof value[key] === 'boolean') result[key] = value[key];
  }
  if (typeof value.volume === 'number' && Number.isFinite(value.volume)) {
    result.volume = Math.min(1, Math.max(0, value.volume));
  }
  return result;
}

/** IPC writes are stricter than recovery: reject every unknown or invalid field. */
export function validatePreferencePatch(patch) {
  if (!isRecord(patch)) throw new TypeError('Preferences must be a plain object.');
  const patchKeys = Object.keys(patch);
  if (patchKeys.length === 0 || patchKeys.some((key) => !keys.includes(key))) {
    throw new TypeError('Unknown or empty preferences.');
  }
  for (const key of patchKeys) {
    if (key === 'volume') {
      if (typeof patch[key] !== 'number' || !Number.isFinite(patch[key]) || patch[key] < 0 || patch[key] > 1) {
        throw new TypeError('Volume must be between zero and one.');
      }
    } else if (typeof patch[key] !== 'boolean') {
      throw new TypeError('Preference switches must be booleans.');
    }
  }
  return Object.fromEntries(patchKeys.map((key) => [key, patch[key]]));
}

export class PreferencesStore {
  #value = { ...DEFAULT_PREFERENCES };
  #ready;
  #pending = Promise.resolve();

  constructor(filePath) {
    this.filePath = filePath;
    this.#ready = this.#load();
  }

  async #load() {
    try {
      // A preference document is tiny; refuse unexpectedly large files.
      if ((await stat(this.filePath)).size > 16_384) return;
      this.#value = normalizePreferences(JSON.parse(await readFile(this.filePath, 'utf8')));
    } catch (error) {
      if (error.code !== 'ENOENT' && !(error instanceof SyntaxError)) throw error;
    }
  }

  async get() {
    await this.#ready;
    await this.#pending;
    return { ...this.#value };
  }

  save(patch) {
    const validated = validatePreferencePatch(patch);
    const operation = this.#pending.then(async () => {
      await this.#ready;
      const next = { ...this.#value, ...validated };
      await mkdir(path.dirname(this.filePath), { recursive: true });
      const temporaryFile = `${this.filePath}.tmp`;
      await writeFile(temporaryFile, `${JSON.stringify(next, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
      await rename(temporaryFile, this.filePath);
      this.#value = next;
      return { ...next };
    });
    // A failed disk write must not poison subsequent requests.
    this.#pending = operation.catch(() => undefined);
    return operation;
  }

  async flush() {
    await this.#ready;
    await this.#pending;
  }
}

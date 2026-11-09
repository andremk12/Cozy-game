import { mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { cloneKitchen, createKitchen, KitchenTimer, MAX_KITCHEN_BYTES, recoverKitchen, validateKitchenCommand } from '../../shared/kitchen.js';

/** One authoritative desktop session. No renderer callbacks are needed for completion. */
export class KitchenStore {
  #runtime;
  #status = 'missing';
  #ready;
  #pending = Promise.resolve();
  #listeners = new Set();
  #timer;
  #disposed = false;
  #checkpoint = 0;

  constructor(filePath, { now = Date.now, monotonic = () => performance.now(), idFactory = randomUUID,
    setTimer = setTimeout, clearTimer = clearTimeout } = {}) {
    this.filePath = filePath;
    this.clocks = { now, monotonic, idFactory };
    this.setTimer = setTimer;
    this.clearTimer = clearTimer;
    this.#ready = this.#load();
  }

  async #load() {
    let kitchen = createKitchen();
    try {
      if ((await stat(this.filePath)).size > MAX_KITCHEN_BYTES) this.#status = 'recovered';
      else {
        const recovered = recoverKitchen(JSON.parse(await readFile(this.filePath, 'utf8')));
        kitchen = recovered.kitchen;
        this.#status = recovered.status;
      }
    } catch (error) {
      this.#status = error.code === 'ENOENT' ? 'missing' : error instanceof SyntaxError ? 'recovered' : 'unavailable';
    }
    this.#runtime = new KitchenTimer(kitchen, this.clocks);
    this.#checkpoint = this.clocks.monotonic();
    if (this.#runtime.clockChanged) this.#status = 'clock-changed';
    if (JSON.stringify(kitchen) !== JSON.stringify(this.#runtime.kitchen)) await this.#write();
    this.#schedule();
  }

  #snapshot(extra = {}) {
    return { kitchen: cloneKitchen(this.#runtime.kitchen), status: this.#status, ...extra };
  }

  async #write() {
    if (['unsupported', 'recovered'].includes(this.#status)) return;
    try {
      await mkdir(path.dirname(this.filePath), { recursive: true });
      const temporary = `${this.filePath}.tmp`;
      await writeFile(temporary, `${JSON.stringify(this.#runtime.kitchen, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
      await rename(temporary, this.filePath);
      this.#status = this.#runtime.clockChanged ? 'clock-changed' : 'ok';
      this.#checkpoint = this.clocks.monotonic();
    } catch {
      // Keep the session usable, and allow a later retry to recover disk access.
      this.#status = 'unavailable';
    }
  }

  #schedule() {
    this.clearTimer(this.#timer);
    this.#timer = undefined;
    const s = this.#runtime?.kitchen.session;
    if (this.#disposed || s?.status !== 'running') return;
    this.#timer = this.setTimer(() => {
      this.#timer = undefined;
      void this.get();
    }, Math.max(1, Math.ceil(s.durationMs - s.elapsedMs)));
    this.#timer?.unref?.();
  }

  #enqueue(action, { durable = false, force = false } = {}) {
    const operation = this.#pending.then(async () => {
      await this.#ready;
      const before = this.#runtime.kitchen;
      const oldStatus = this.#status;
      const result = action();
      const next = this.#runtime.kitchen;
      const terminal = before.session?.status !== next.session?.status;
      const changed = JSON.stringify(before) !== JSON.stringify(next);
      if (force || (changed && (durable || terminal || this.clocks.monotonic() - this.#checkpoint >= 30_000))) await this.#write();
      this.#schedule();
      const snapshot = this.#snapshot(typeof result?.presented === 'boolean' ? { presented: result.presented } : {});
      if ((changed && (durable || terminal)) || this.#status !== oldStatus) {
        for (const listener of this.#listeners) {
          try { listener(this.#snapshot()); } catch { /* One observer cannot interrupt the timer. */ }
        }
      }
      return snapshot;
    });
    this.#pending = operation.catch(() => undefined);
    return operation;
  }

  get() { return this.#enqueue(() => this.#runtime.reconcile()); }
  command(input) {
    const command = validateKitchenCommand(input);
    return this.#enqueue(() => this.#runtime.command(command), { durable: true });
  }
  subscribe(listener) {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }
  suspend() { return this.#enqueue(() => this.#runtime.suspend(), { durable: true, force: true }); }
  resume() { return this.#enqueue(() => this.#runtime.resume(), { durable: true, force: true }); }
  async flush() { await this.#enqueue(() => this.#runtime.reconcile(), { force: true }); }
  dispose() {
    this.#disposed = true;
    this.clearTimer(this.#timer);
    this.#listeners.clear();
  }
}

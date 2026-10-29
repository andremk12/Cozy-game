import { mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { cloneGarden, createGarden, MAX_GARDEN_BYTES, recoverGarden, validateGarden } from '../../shared/garden.js';

export class GardenStore {
  #garden = createGarden();
  #status = 'missing';
  #ready;
  #pending = Promise.resolve();

  constructor(filePath) {
    this.filePath = filePath;
    this.#ready = this.#load();
  }

  async #load() {
    try {
      if ((await stat(this.filePath)).size > MAX_GARDEN_BYTES) {
        this.#status = 'recovered';
        return;
      }
      const recovered = recoverGarden(JSON.parse(await readFile(this.filePath, 'utf8')));
      this.#garden = recovered.garden;
      this.#status = recovered.status;
    } catch (error) {
      this.#status = error.code === 'ENOENT' ? 'missing' : error instanceof SyntaxError ? 'recovered' : 'unavailable';
    }
  }

  async get() {
    await this.flush();
    return { garden: cloneGarden(this.#garden), status: this.#status };
  }

  save(value) {
    const garden = validateGarden(value);
    const operation = this.#pending.then(async () => {
      await this.#ready;
      if (this.#status === 'unsupported') throw new Error('Garden version is unsupported.');
      await mkdir(path.dirname(this.filePath), { recursive: true });
      const temporaryFile = `${this.filePath}.tmp`;
      await writeFile(temporaryFile, `${JSON.stringify(garden, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
      await rename(temporaryFile, this.filePath);
      this.#garden = garden;
      this.#status = 'ok';
      return cloneGarden(garden);
    });
    this.#pending = operation.catch(() => undefined);
    return operation;
  }

  async flush() {
    await this.#ready;
    let pending;
    do {
      pending = this.#pending;
      await pending;
    } while (pending !== this.#pending);
  }
}

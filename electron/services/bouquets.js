import { mkdir, readFile, rename, stat, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  buildBouquetMailto, buildBouquetCardHtml, exactBouquetKeys, MAX_BOUQUET_BYTES, MAX_BOUQUET_IMAGE_BYTES, MAX_MAILTO_LENGTH,
  prepareBouquetDraft, validateBouquet, validateBouquetImage,
} from '../../shared/bouquets.js';

// A single explicitly saved draft, separate from garden, preferences and ritual.
export class BouquetStore {
  #draft = null;
  #problem = null;
  #ready;
  #pending = Promise.resolve();
  constructor(filePath) {
    this.filePath = filePath;
    this.#ready = this.#load();
  }
  async #load() {
    try {
      if ((await stat(this.filePath)).size > MAX_BOUQUET_BYTES) throw new Error('Rascunho inválido.');
      this.#draft = validateBouquet(JSON.parse(await readFile(this.filePath, 'utf8')));
    } catch (error) {
      if (error.code !== 'ENOENT') this.#problem = new Error('Não foi possível ler o rascunho. Você pode excluí-lo e começar outro.');
    }
  }
  async get() {
    await this.flush();
    if (this.#problem) throw this.#problem;
    return this.#draft ? validateBouquet(this.#draft) : null;
  }
  #enqueue(action) {
    const operation = this.#pending.then(async () => { await this.#ready; return action(); });
    this.#pending = operation.catch(() => undefined);
    return operation;
  }
  save(value, options) {
    const draft = prepareBouquetDraft(value, options);
    return this.#enqueue(async () => {
      // Unknown/corrupt versions are preserved until explicit deletion.
      if (this.#problem) throw this.#problem;
      await mkdir(path.dirname(this.filePath), { recursive: true });
      const temporary = `${this.filePath}.tmp`;
      await writeFile(temporary, `${JSON.stringify(draft)}\n`, { encoding: 'utf8', mode: 0o600 });
      await rename(temporary, this.filePath);
      this.#draft = draft;
      return validateBouquet(draft);
    });
  }
  delete() {
    return this.#enqueue(async () => {
      // Fixed application-owned paths; the renderer never supplies a path.
      for (const file of [this.filePath, `${this.filePath}.tmp`]) {
        try { await unlink(file); } catch (error) { if (error.code !== 'ENOENT') throw error; }
      }
      this.#draft = null;
      this.#problem = null;
    });
  }
  async flush() {
    await this.#ready;
    let pending;
    do { pending = this.#pending; await pending; } while (pending !== this.#pending);
  }
}

export function decodeBouquetPng(value, decodeImage) {
  const { dataUrl } = validateBouquetImage(value);
  const bytes = Buffer.from(dataUrl.slice(22), 'base64');
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (bytes.length < 45 || bytes.length > MAX_BOUQUET_IMAGE_BYTES || !bytes.subarray(0, 8).equals(signature)
    || bytes.readUInt32BE(8) !== 13 || bytes.toString('ascii', 12, 16) !== 'IHDR') throw new TypeError('PNG inválido.');
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  if (!width || !height || width > 8192 || height > 8192 || width * height > 24_000_000) throw new TypeError('A imagem ultrapassa o tamanho permitido.');
  const image = decodeImage(bytes);
  if (image.isEmpty()) throw new TypeError('PNG inválido.');
  const size = image.getSize();
  if (size.width !== width || size.height !== height) throw new TypeError('Dimensões de PNG inválidas.');
  // Re-encoding removes arbitrary embedded metadata and trailing payloads.
  const clean = image.toPNG();
  if (clean.length > MAX_BOUQUET_IMAGE_BYTES) throw new TypeError('A imagem ultrapassa o tamanho permitido.');
  return clean;
}

export function registerBouquets({ ipcMain, verifySender, store, dialog, getWindow, openExternal, decodeImage, writeImage = writeFile }) {
  let sharing = false;
  let exporting = false;
  const register = (action, count, callback) => ipcMain.handle(`haven:bouquets:${action}`, async (event, ...args) => {
    verifySender(event);
    if (args.length !== count) throw new TypeError('Argumentos de buquê inválidos.');
    return callback(...args);
  });
  register('get', 0, () => store.get());
  register('delete', 0, () => store.delete());
  register('save', 1, (value) => {
    if (!exactBouquetKeys(value, ['bouquet', 'includeLetter'])) throw new TypeError('Rascunho inválido.');
    return store.save(value.bouquet, { includeLetter: value.includeLetter });
  });
  register('email', 1, async (value) => {
    const destination = buildBouquetMailto(value);
    if (destination.length > MAX_MAILTO_LENGTH) throw new TypeError('Esta carta é longa para abrir no e-mail. Salve o cartão completo e use a opção de abrir o e-mail sem a carta no corpo.');
    if (sharing) return false;
    sharing = true;
    try { await openExternal(destination); return true; }
    catch { return false; }
    finally { sharing = false; }
  });
  register('export', 1, async (value) => {
    validateBouquetImage(value);
    if (exporting) return { canceled: true };
    exporting = true;
    try {
      const png = decodeBouquetPng(value, decodeImage);
      const html = value.kind === 'card-html';
      const extension = html ? '.html' : '.png';
      const result = await dialog.showSaveDialog(getWindow(), {
        title: 'Guardar este presente',
        defaultPath: html ? 'Little-Haven-cartao.html' : value.kind === 'card' ? 'Little-Haven-cartao.png' : 'Little-Haven-buque.png',
        filters: [{ name: html ? 'Cartão HTML' : 'Imagem PNG', extensions: [extension.slice(1)] }],
        properties: ['showOverwriteConfirmation'],
      });
      if (result.canceled || !result.filePath) return { canceled: true };
      if (path.extname(result.filePath).toLowerCase() !== extension) throw new TypeError(`Escolha um nome terminado em ${extension}.`);
      const content = html ? buildBouquetCardHtml({ dataUrl: `data:image/png;base64,${png.toString('base64')}`, message: value.message, letterPaper: value.letterPaper }) : png;
      await writeImage(result.filePath, content, { mode: 0o600 });
      return { canceled: false };
    } finally { exporting = false; }
  });
}

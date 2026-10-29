import { randomUUID } from 'node:crypto';
import { lstat, mkdir, open, readdir, realpath, rename, rm } from 'node:fs/promises';
import path from 'node:path';
import {
  createMemoryBoard, inspectMemoryImage, isMemoryId, MEMORY_LIMITS, validateMemoryBoard,
} from '../../shared/memory.js';
import { memoryDigest, readMemoryBackup, writeMemoryBackup } from './memoryBackup.js';

const MIME_EXTENSIONS = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const exact = (value, keys) => value && typeof value === 'object' && !Array.isArray(value)
  && Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
const normalizePath = (value) => process.platform === 'win32' ? path.resolve(value).toLowerCase() : path.resolve(value);
const photoIds = (board) => new Set(board.items.filter((item) => item.kind === 'photo').map((item) => item.imageId));

function memoryError(code = 'MEMORY_STORAGE') {
  const error = new Error(code === 'MEMORY_READ_ONLY' ? 'Memory board is read-only.' : 'The memory operation could not be completed.');
  error.code = code;
  return error;
}

function validateAssets(assets, maximum = MEMORY_LIMITS.maxStoredImages) {
  if (!Array.isArray(assets) || assets.length > maximum) throw memoryError('MEMORY_INVALID');
  const ids = new Set();
  let total = 0;
  return assets.map((asset) => {
    if (!exact(asset, ['id', 'mime', 'width', 'height', 'bytes', 'sha256'])
      || !isMemoryId(asset.id) || ids.has(asset.id) || !Object.hasOwn(MIME_EXTENSIONS, asset.mime)
      || ![asset.width, asset.height, asset.bytes].every(Number.isInteger)
      || asset.width < 1 || asset.height < 1 || asset.width > MEMORY_LIMITS.maxEdge || asset.height > MEMORY_LIMITS.maxEdge
      || asset.width * asset.height > MEMORY_LIMITS.maxPixels || asset.bytes < 12 || asset.bytes > MEMORY_LIMITS.maxImageBytes
      || typeof asset.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(asset.sha256)) throw memoryError('MEMORY_INVALID');
    total += asset.bytes;
    if (total > MEMORY_LIMITS.maxOriginalBytes) throw memoryError('MEMORY_LIMIT');
    ids.add(asset.id);
    return { ...asset };
  });
}

function validateDocument(value, backup = false) {
  const keys = backup ? ['version', 'board', 'assets'] : ['format', 'version', 'board', 'assets'];
  if (!exact(value, keys) || value.version !== 1 || (!backup && value.format !== 'little-haven-memory')) throw memoryError('MEMORY_INVALID');
  const board = validateMemoryBoard(value.board);
  const assets = validateAssets(value.assets, backup ? MEMORY_LIMITS.maxItems : MEMORY_LIMITS.maxStoredImages);
  const ids = new Set(assets.map((asset) => asset.id));
  if ([...photoIds(board)].some((id) => !ids.has(id))) throw memoryError('MEMORY_INVALID');
  if (backup && ids.size !== photoIds(board).size) throw memoryError('MEMORY_INVALID');
  return { board, assets };
}

export class MemoryCornerStore {
  #board = createMemoryBoard();
  #assets = new Map();
  #allowed = new Set();
  #status = 'missing';
  #writable = true;
  #ready;
  #pending = Promise.resolve();
  #decodeImage;

  constructor(directory, { decodeImage } = {}) {
    if (!path.isAbsolute(directory) || typeof decodeImage !== 'function') throw new TypeError('Invalid memory store configuration.');
    Object.defineProperty(this, 'directory', { value: path.resolve(directory), enumerable: true });
    this.#decodeImage = decodeImage;
    this.#ready = this.#load();
  }

  async #guardDirectory(directory) {
    const info = await lstat(directory);
    if (!info.isDirectory() || info.isSymbolicLink() || normalizePath(await realpath(directory)) !== normalizePath(directory)) {
      throw memoryError('MEMORY_ACCESS');
    }
  }

  async #directories(create = false) {
    if (create) await mkdir(this.directory, { recursive: true, mode: 0o700 });
    await this.#guardDirectory(this.directory);
    for (const name of ['images', 'thumbnails']) {
      const directory = path.join(this.directory, name);
      if (create) await mkdir(directory, { recursive: true, mode: 0o700 });
      try { await this.#guardDirectory(directory); }
      catch (error) { if (!create && error.code === 'ENOENT') continue; throw error; }
    }
  }

  async #readBounded(file, limit) {
    const info = await lstat(file);
    if (!info.isFile() || info.isSymbolicLink()) throw memoryError('MEMORY_ACCESS');
    if (info.size > limit) throw memoryError('MEMORY_LIMIT');
    const handle = await open(file, 'r');
    try {
      const opened = await handle.stat();
      if (!opened.isFile() || opened.size !== info.size || opened.size > limit) throw memoryError('MEMORY_ACCESS');
      const bytes = Buffer.alloc(opened.size);
      let offset = 0;
      while (offset < bytes.length) {
        const result = await handle.read(bytes, offset, bytes.length - offset, offset);
        if (!result.bytesRead) throw memoryError('MEMORY_ACCESS');
        offset += result.bytesRead;
      }
      const beyond = await handle.read(Buffer.alloc(1), 0, 1, bytes.length);
      if (beyond.bytesRead) throw memoryError('MEMORY_ACCESS');
      return bytes;
    } finally { await handle.close(); }
  }

  async #load() {
    try {
      await this.#directories();
      const bytes = await this.#readBounded(path.join(this.directory, 'board.json'), MEMORY_LIMITS.maxDocumentBytes);
      const value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
      if (Number(value?.version) > 1 || Number(value?.board?.version) > 1) {
        this.#status = 'future'; this.#writable = false; return;
      }
      const { board, assets } = validateDocument(value);
      this.#board = board;
      this.#assets = new Map(assets.map((asset) => [asset.id, asset]));
      this.#allowed = photoIds(board);
      this.#status = 'ready';
      this.#writable = true;
    } catch (error) {
      this.#status = error.code === 'ENOENT' ? 'missing' : error instanceof SyntaxError || ['MEMORY_INVALID', 'MEMORY_LIMIT'].includes(error.code)
        || error instanceof TypeError ? 'invalid' : 'error';
      this.#writable = this.#status === 'missing';
    }
  }

  #queue(action) {
    const operation = this.#pending.then(async () => {
      await this.#ready;
      try { return await action(); }
      catch (error) {
        const codes = ['MEMORY_ACCESS', 'MEMORY_IMAGE', 'MEMORY_INVALID', 'MEMORY_LIMIT', 'MEMORY_READ_ONLY'];
        // Never return codec/OS messages: those may contain local paths or
        // user filenames. Only the bounded public error code crosses IPC.
        throw memoryError(codes.includes(error?.code) ? error.code : 'MEMORY_STORAGE');
      }
    });
    this.#pending = operation.catch(() => undefined);
    return operation;
  }

  #checkWritable() { if (!this.#writable) throw memoryError('MEMORY_READ_ONLY'); }

  async #atomicJSON(board, assets) {
    await this.#directories(true);
    const destination = path.join(this.directory, 'board.json');
    try {
      const current = await lstat(destination);
      if (!current.isFile() || current.isSymbolicLink()) throw memoryError('MEMORY_ACCESS');
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
    const bytes = Buffer.from(`${JSON.stringify({ format: 'little-haven-memory', version: 1, board, assets: [...assets.values()] })}\n`);
    if (bytes.length > MEMORY_LIMITS.maxDocumentBytes) throw memoryError('MEMORY_LIMIT');
    const temporary = path.join(this.directory, `.board-${randomUUID()}.tmp`);
    let handle;
    try {
      handle = await open(temporary, 'wx', 0o600);
      await handle.writeFile(bytes);
      await handle.sync();
      await handle.close(); handle = undefined;
      await rename(temporary, destination);
    } finally {
      await handle?.close().catch(() => {});
      await rm(temporary, { force: true }).catch(() => {});
    }
  }

  #assetPath(asset, variant, directory = this.directory) {
    if (!isMemoryId(asset.id) || !['thumbnail', 'original'].includes(variant) || !Object.hasOwn(MIME_EXTENSIONS, asset.mime)) {
      throw memoryError('MEMORY_ACCESS');
    }
    return path.join(directory, variant === 'original' ? 'images' : 'thumbnails', `${asset.id}.${variant === 'original' ? MIME_EXTENSIONS[asset.mime] : 'png'}`);
  }

  async #prepare(bytes) {
    const header = inspectMemoryImage(bytes);
    const sha256 = memoryDigest(bytes);
    const decoded = await this.#decodeImage(bytes, header.mime);
    if (!decoded || !Number.isInteger(decoded.width) || !Number.isInteger(decoded.height)
      || !((decoded.width === header.width && decoded.height === header.height)
        || (decoded.width === header.height && decoded.height === header.width))
      || !(decoded.thumbnail instanceof Uint8Array) || memoryDigest(bytes) !== sha256) throw memoryError('MEMORY_IMAGE');
    const thumbnail = Buffer.from(decoded.thumbnail);
    const thumbnailHeader = inspectMemoryImage(thumbnail);
    if (thumbnailHeader.mime !== 'image/png' || thumbnailHeader.width > 1024 || thumbnailHeader.height > 1024
      || thumbnail.length > 4 * 1024 * 1024) throw memoryError('MEMORY_IMAGE');
    return { mime: header.mime, width: decoded.width, height: decoded.height, bytes: bytes.length, sha256, thumbnail };
  }

  async #writeAsset(asset, original, thumbnail, directory = this.directory) {
    for (const [variant, bytes] of [['original', original], ['thumbnail', thumbnail]]) {
      const handle = await open(this.#assetPath(asset, variant, directory), 'wx', 0o600);
      try { await handle.writeFile(bytes); await handle.sync(); }
      finally { await handle.close(); }
    }
  }

  async #removeAsset(asset) {
    await this.#directories();
    for (const variant of ['original', 'thumbnail']) {
      const file = this.#assetPath(asset, variant);
      try {
        const info = await lstat(file);
        if (!info.isFile() || info.isSymbolicLink()) throw memoryError('MEMORY_ACCESS');
        await rm(file);
      } catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
  }

  get() {
    return this.#queue(async () => {
      // Retry may follow a repaired disk permission or a manually recovered
      // document. Re-reading a protected board never writes, resets or accepts
      // a still-invalid/future file; editable session state is not reloaded.
      if (!this.#writable) await this.#load();
      return { board: validateMemoryBoard(this.#board), status: this.#status, writable: this.#writable };
    });
  }

  save(value) {
    const board = validateMemoryBoard(value);
    return this.#queue(async () => {
      this.#checkWritable();
      if ([...photoIds(board)].some((id) => !this.#assets.has(id) || !this.#allowed.has(id))) throw memoryError('MEMORY_ACCESS');
      await this.#atomicJSON(board, this.#assets);
      this.#board = board;
      this.#status = 'ready';
      return validateMemoryBoard(board);
    });
  }

  importImages(paths) {
    if (!Array.isArray(paths) || paths.length > MEMORY_LIMITS.maxItems || paths.some((file) => typeof file !== 'string' || !path.isAbsolute(file))) {
      return Promise.reject(memoryError('MEMORY_LIMIT'));
    }
    return this.#queue(async () => {
      this.#checkWritable();
      await this.#directories(true);
      const board = validateMemoryBoard(this.#board);
      const assets = new Map(this.#assets);
      const created = [];
      let rejected = 0;
      let total = [...assets.values()].reduce((sum, asset) => sum + asset.bytes, 0);
      try {
        for (const source of paths) {
          if (board.items.length >= MEMORY_LIMITS.maxItems || assets.size >= MEMORY_LIMITS.maxStoredImages) { rejected++; continue; }
          let bytes;
          let decoded;
          try {
            bytes = await this.#readBounded(source, MEMORY_LIMITS.maxImageBytes);
            decoded = await this.#prepare(bytes);
          } catch { rejected++; continue; }
          if (total + bytes.length > MEMORY_LIMITS.maxOriginalBytes) { rejected++; continue; }
          const { thumbnail, ...properties } = decoded;
          const asset = { id: randomUUID(), ...properties };
          created.push(asset);
          await this.#writeAsset(asset, bytes, thumbnail);
          assets.set(asset.id, asset);
          total += bytes.length;
          const index = board.items.length;
          board.items.push({ id: randomUUID(), kind: 'photo', x: 0.12 + ((index * 0.23) % 0.7), y: 0.1 + ((index * 0.19) % 0.7),
            rotation: index % 2 ? 4 : -4, imageId: asset.id, frame: 'polaroid', caption: '' });
        }
        if (created.length) {
          await this.#atomicJSON(board, assets);
          this.#board = board; this.#assets = assets; this.#status = 'ready';
          for (const asset of created) this.#allowed.add(asset.id);
        }
        return { board: validateMemoryBoard(this.#board), imported: created.length, rejected };
      } catch (error) {
        for (const asset of created) await this.#removeAsset(asset).catch(() => {});
        throw error;
      }
    });
  }

  async #readOriginal(asset) {
    await this.#directories();
    const bytes = await this.#readBounded(this.#assetPath(asset, 'original'), MEMORY_LIMITS.maxImageBytes);
    if (bytes.length !== asset.bytes || memoryDigest(bytes) !== asset.sha256) throw memoryError('MEMORY_IMAGE');
    return bytes;
  }

  readImage(imageId, variant) {
    return this.#queue(async () => {
      if (!isMemoryId(imageId) || !['thumbnail', 'original'].includes(variant) || !this.#allowed.has(imageId) || !this.#assets.has(imageId)) {
        throw memoryError('MEMORY_ACCESS');
      }
      const asset = this.#assets.get(imageId);
      try {
        if (variant === 'original') return { bytes: await this.#readOriginal(asset), mime: asset.mime };
        await this.#directories();
        const file = this.#assetPath(asset, 'thumbnail');
        let bytes;
        try {
          bytes = await this.#readBounded(file, 4 * 1024 * 1024);
          const header = inspectMemoryImage(bytes);
          if (header.mime !== 'image/png' || header.width > 1024 || header.height > 1024) throw memoryError('MEMORY_IMAGE');
        } catch {
          const decoded = await this.#prepare(await this.#readOriginal(asset));
          // Derived previews can always be rebuilt from the untouched original.
          const temporary = path.join(this.directory, 'thumbnails', `.thumbnail-${randomUUID()}.tmp`);
          const handle = await open(temporary, 'wx', 0o600);
          try { await handle.writeFile(decoded.thumbnail); await handle.sync(); }
          finally { await handle.close(); }
          try {
            try { const target = await lstat(file); if (target.isSymbolicLink() || !target.isFile()) throw memoryError('MEMORY_ACCESS'); }
            catch (error) { if (error.code !== 'ENOENT') throw error; }
            await rename(temporary, file);
          } finally { await rm(temporary, { force: true }).catch(() => {}); }
          bytes = decoded.thumbnail;
        }
        return { bytes, mime: 'image/png' };
      } catch { throw memoryError('MEMORY_IMAGE'); }
    });
  }

  exportBackup(destination) {
    return this.#queue(async () => {
      this.#checkWritable();
      if (typeof destination !== 'string' || !path.isAbsolute(destination)) throw memoryError('MEMORY_ACCESS');
      const actualParent = await realpath(path.dirname(destination));
      const relative = path.relative(this.directory, path.join(actualParent, path.basename(destination)));
      if (!relative || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative))) throw memoryError('MEMORY_ACCESS');
      const assets = [...photoIds(this.#board)].map((id) => this.#assets.get(id));
      await writeMemoryBackup(destination, { version: 1, board: this.#board, assets }, (asset) => this.#readOriginal(asset));
      return { exported: true };
    });
  }

  restoreBackup(source) {
    return this.#queue(async () => {
      if (typeof source !== 'string' || !path.isAbsolute(source)) throw memoryError('MEMORY_ACCESS');
      // Explicit restore is allowed for an invalid/future document, but its old
      // file is untouched until every incoming image has decoded successfully.
      await this.#directories(true);
      const stage = path.join(this.directory, `.restore-${randomUUID()}`);
      const staged = [];
      const installed = [];
      await mkdir(stage, { mode: 0o700 });
      await mkdir(path.join(stage, 'images'), { mode: 0o700 });
      await mkdir(path.join(stage, 'thumbnails'), { mode: 0o700 });
      try {
        const mapping = new Map();
        const incoming = await readMemoryBackup(source, (value) => validateDocument(value, true), async (original, bytes) => {
          const { thumbnail, ...properties } = await this.#prepare(bytes);
          if (properties.mime !== original.mime || properties.width !== original.width || properties.height !== original.height) throw memoryError('MEMORY_INVALID');
          const asset = { id: randomUUID(), ...properties };
          mapping.set(original.id, asset.id);
          await this.#writeAsset(asset, bytes, thumbnail, stage);
          staged.push(asset);
        });
        const board = validateMemoryBoard({ ...incoming.board, items: incoming.board.items.map((item) => item.kind === 'photo'
          ? { ...item, imageId: mapping.get(item.imageId) } : item) });
        // Replacement discards the old asset registry, without deleting old
        // files before commit. A large board can restore its own backup without
        // counting old and new originals twice against the logical quota.
        const assets = new Map(staged.map((asset) => [asset.id, asset]));
        validateAssets([...assets.values()]);
        await this.#directories();
        for (const asset of staged) {
          installed.push(asset);
          for (const variant of ['original', 'thumbnail']) await rename(this.#assetPath(asset, variant, stage), this.#assetPath(asset, variant));
        }
        // This one atomic envelope commits metadata AND asset references.
        await this.#atomicJSON(board, assets);
        this.#board = board; this.#assets = assets; this.#allowed = photoIds(board);
        this.#status = 'ready'; this.#writable = true;
        return validateMemoryBoard(board);
      } catch (error) {
        for (const asset of installed) await this.#removeAsset(asset).catch(() => {});
        throw error;
      } finally {
        // Only a generated direct child of the managed board directory is
        // recursively removed. Backup entry names never become filesystem paths.
        if (path.dirname(path.resolve(stage)) === this.directory && /^\.restore-[a-f0-9-]{36}$/.test(path.basename(stage))) {
          await rm(stage, { recursive: true, force: true }).catch(() => {});
        }
      }
    });
  }

  cleanup() {
    return this.#queue(async () => {
      if (!this.#writable || this.#status === 'missing') return;
      await this.#directories();
      const retained = photoIds(this.#board);
      const assets = new Map(this.#assets);
      for (const asset of assets.values()) if (!retained.has(asset.id)) {
        await this.#removeAsset(asset);
        assets.delete(asset.id);
      }
      await this.#atomicJSON(this.#board, assets);
      this.#assets = assets; this.#allowed = retained;
      // Also remove files from an interrupted import, matching only the app's
      // generated UUID naming scheme, never arbitrary user files or directories.
      for (const name of ['images', 'thumbnails']) {
        const directory = path.join(this.directory, name);
        for (const entry of await readdir(directory, { withFileTypes: true })) {
          const match = /^([a-f0-9-]{36})\.(jpg|png|webp)$/.exec(entry.name);
          if (match && isMemoryId(match[1]) && !retained.has(match[1]) && entry.isFile() && !entry.isSymbolicLink()) {
            await rm(path.join(directory, entry.name)).catch(() => {});
          }
        }
      }
    });
  }

  async flush() {
    await this.#ready;
    let pending;
    do { pending = this.#pending; await pending; } while (pending !== this.#pending);
  }
}

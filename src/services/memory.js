import { createMemoryBoard, validateMemoryBoard } from '../../shared/memory.js';
import { createMemoryDatabase } from './memoryDatabase.js';

const SAVE_ERROR = 'Não foi possível salvar o mural. Suas mudanças continuam nesta sessão. Tente novamente antes de fechar.';
const READ_ERROR = 'Não foi possível abrir o mural. Seus arquivos foram preservados. Você pode tentar novamente.';
const READ_ONLY = 'Este mural está danificado ou foi criado por uma versão mais nova. O arquivo foi preservado e não será sobrescrito. Você pode restaurar um backup no aplicativo desktop.';

function chooseImages() {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.jpg,.jpeg,.png,.webp';
    input.multiple = true;
    input.hidden = true;
    const finish = (files) => { input.remove(); resolve(files); };
    input.onchange = () => finish([...input.files]);
    input.oncancel = () => finish([]);
    document.body.append(input);
    input.click();
  });
}

/** Memory content has its own explicit boundary. No ritual state is accepted. */
export function createMemoryStore({ bridge = globalThis.window?.haven, database, selectImages = chooseImages } = {}) {
  const desktop = typeof bridge?.memoryGet === 'function' && typeof bridge?.memorySave === 'function' ? bridge : null;
  const browser = desktop ? null : database || createMemoryDatabase();
  let snapshot = { board: createMemoryBoard(), ready: false, writable: false, busy: false,
    saving: false, error: '', notice: '', status: 'missing' };
  let initialization;
  let revision = 0;
  let settled = 0;
  let saveFailed = false;
  let disposed = false;
  const writes = new Set();
  const listeners = new Set();
  const urls = new Map();
  const emit = (patch) => {
    snapshot = { ...snapshot, ...patch };
    if (!disposed) for (const listener of listeners) listener();
  };

  async function initialize() {
    if (initialization) return initialization;
    initialization = (async () => {
      try {
        const result = await (desktop ? desktop.memoryGet() : browser.get());
        const board = validateMemoryBoard(result.board);
        const writable = result.writable === true && ['missing', 'ready'].includes(result.status);
        emit({ board, ready: true, writable, status: result.status,
          error: writable ? '' : ['future', 'invalid'].includes(result.status) ? READ_ONLY : READ_ERROR });
      } catch { emit({ ready: true, writable: false, error: READ_ERROR, status: 'error' }); }
      return snapshot;
    })();
    return initialization;
  }

  function persist(board) {
    const attempt = ++revision;
    let result;
    try { result = desktop ? desktop.memorySave(board) : browser.save(board); }
    catch { result = Promise.reject(new Error('Memory save unavailable.')); }
    const operation = Promise.resolve(result).then(() => {
      if (attempt >= settled) { settled = attempt; saveFailed = false; emit({ status: 'ready', error: '' }); }
      return true;
    }, () => {
      if (attempt >= settled) { settled = attempt; saveFailed = true; emit({ error: SAVE_ERROR }); }
      return false;
    }).finally(() => {
      writes.delete(operation);
      emit({ saving: writes.size > 0 });
    });
    writes.add(operation);
    emit({ saving: true });
    return operation;
  }

  function updateBoard(update) {
    if (disposed || !snapshot.ready || !snapshot.writable || snapshot.busy) return false;
    try {
      const board = validateMemoryBoard(typeof update === 'function' ? update(snapshot.board) : update);
      if (JSON.stringify(board) === JSON.stringify(snapshot.board)) return true;
      emit({ board, notice: '' });
      // Invoke desktop IPC now, before the user can close the window. Main
      // serializes the actual atomic writes and waits for accepted edits on quit.
      void persist(board);
      return true;
    } catch { emit({ error: 'Essa alteração não pôde ser aplicada ao mural.' }); return false; }
  }

  async function flush() {
    while (writes.size) await Promise.all([...writes]);
    return !saveFailed;
  }

  function clearUrls() {
    for (const entry of urls.values()) if (entry.url) URL.revokeObjectURL(entry.url);
    urls.clear();
  }

  async function operation(kind) {
    if (disposed || !snapshot.ready || snapshot.busy || (kind !== 'restore' && !snapshot.writable)) return false;
    emit({ busy: true, notice: '' });
    try {
      if (snapshot.writable && !await flush()) throw new Error('Pending save failed.');
      let result;
      if (kind === 'import') {
        if (desktop) result = await desktop.memoryImport();
        else {
          const files = await selectImages();
          result = files.length ? await browser.importFiles(files) : { canceled: true };
        }
      } else if (kind === 'export') result = await desktop.memoryExport();
      else result = await desktop.memoryRestore();
      if (result.canceled) return false;
      if (result.board) {
        const board = validateMemoryBoard(result.board);
        if (kind === 'restore') clearUrls();
        emit({ board, writable: true, status: 'ready', error: '' });
      }
      if (kind === 'import' && result.rejected) {
        emit({ error: `${result.rejected} arquivo(s) não puderam ser importados. Use JPG, PNG ou WebP válidos de até 20 MB, 40 megapixels e 16.000 pixels por lado. O mural aceita até 60 itens e 512 MB de originais.` });
      } else emit({ error: '', notice: kind === 'export' ? 'Backup completo salvo no local escolhido.'
        : kind === 'restore' ? 'Seu mural foi restaurado.' : 'Lembranças guardadas neste dispositivo.' });
      return true;
    } catch {
      emit({ error: kind === 'restore' ? 'O backup não pôde ser restaurado. O mural atual foi preservado.'
        : kind === 'export' ? 'Não foi possível guardar o backup. Seu mural continua neste dispositivo.'
          : 'Não foi possível importar as fotografias. Confira o formato, o tamanho e o espaço disponível.' });
      return false;
    } finally { emit({ busy: false }); }
  }

  async function imageUrl(imageId, variant) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(imageId)
      || !['thumbnail', 'original'].includes(variant)) throw new Error('Invalid memory resource.');
    if (desktop) return `haven-memory://local/${imageId}/${variant}`;
    const key = `${imageId}:${variant}`;
    let entry = urls.get(key);
    if (!entry) {
      entry = { refs: 0, url: null };
      urls.set(key, entry);
      entry.promise = browser.image(imageId, variant).then((blob) => {
        entry.url = URL.createObjectURL(blob);
        if (disposed || urls.get(key) !== entry) URL.revokeObjectURL(entry.url);
        return entry.url;
      }).catch(() => {
        if (urls.get(key) === entry) urls.delete(key);
        throw new Error('Memory image unavailable.');
      });
    }
    entry.refs += 1;
    return entry.promise;
  }

  function releaseImage(imageId, variant) {
    const key = `${imageId}:${variant}`;
    const entry = urls.get(key);
    if (!entry || --entry.refs > 0) return;
    if (entry.url) URL.revokeObjectURL(entry.url);
    urls.delete(key);
  }

  return {
    getSnapshot: () => snapshot,
    subscribe(listener) { disposed = false; listeners.add(listener); return () => listeners.delete(listener); },
    initialize, updateBoard, flush, imageUrl, releaseImage,
    importPhotos: () => operation('import'),
    exportBackup: () => desktop ? operation('export') : Promise.resolve(false),
    restoreBackup: () => desktop ? operation('restore') : Promise.resolve(false),
    async retry() {
      if (disposed || snapshot.busy) return false;
      if (!snapshot.ready || !snapshot.writable) {
        emit({ busy: true });
        try {
          // Share an initial read and serialize explicit reloads. A late second
          // read must never replace edits made after the first retry succeeded.
          if (snapshot.ready) initialization = null;
          await initialize();
          return snapshot.writable;
        } finally { emit({ busy: false }); }
      }
      return persist(validateMemoryBoard(snapshot.board));
    },
    dispose() { disposed = true; clearUrls(); browser?.close(); },
    backupAvailable: Boolean(desktop), storageKind: desktop ? 'desktop' : 'browser',
  };
}

import { useEffect, useState, useSyncExternalStore } from 'react';
import { createMemoryStore } from '../services/memory.js';

export function useMemoryBoard({ active }) {
  const [store] = useState(() => createMemoryStore());
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  useEffect(() => { if (active) void store.initialize(); }, [active, store]);
  useEffect(() => () => store.dispose(), [store]);
  return { ...snapshot, updateBoard: store.updateBoard, importPhotos: store.importPhotos,
    exportBackup: store.exportBackup, restoreBackup: store.restoreBackup, retry: store.retry,
    imageUrl: store.imageUrl, releaseImage: store.releaseImage,
    backupAvailable: store.backupAvailable, storageKind: store.storageKind };
}

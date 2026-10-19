import { useEffect, useState, useSyncExternalStore } from 'react';
import { createPreferenceStore } from '../services/preferences.js';

export function usePreferences() {
  const [store] = useState(() => createPreferenceStore());
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);

  useEffect(() => {
    void store.initialize();
  }, [store]);

  return { ...snapshot, setPreference: store.setPreference };
}

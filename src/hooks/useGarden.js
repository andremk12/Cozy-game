import { useEffect, useState, useSyncExternalStore } from 'react';
import { nextGrowthDelay } from '../../shared/garden.js';
import { createGardenStore } from '../services/garden.js';

export function useGarden({ active }) {
  const [store] = useState(() => createGardenStore());
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const [visible, setVisible] = useState(() => document.visibilityState !== 'hidden');
  useEffect(() => { void store.initialize(); }, [store]);
  useEffect(() => {
    const change = () => setVisible(document.visibilityState !== 'hidden');
    document.addEventListener('visibilitychange', change);
    return () => document.removeEventListener('visibilitychange', change);
  }, []);
  useEffect(() => {
    if (active && visible && snapshot.ready) store.dispatch({ type: 'reconcile' });
  }, [active, visible, snapshot.ready, store]);
  useEffect(() => {
    if (!active || !visible || !snapshot.ready) return undefined;
    const delay = nextGrowthDelay(snapshot.garden);
    if (delay === null) return undefined;
    const timer = setTimeout(() => store.dispatch({ type: 'reconcile' }), Math.min(delay, 2_147_483_647));
    return () => clearTimeout(timer);
  }, [active, visible, snapshot.garden, snapshot.ready, store]);
  return { ...snapshot, dispatch: store.dispatch, retry: store.retry };
}

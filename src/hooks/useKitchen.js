import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { getKitchenView } from '../../shared/kitchen.js';
import { getKitchenRecipe } from '../../shared/kitchenRecipes.js';
import { createKitchenStore } from '../services/kitchen.js';

// Mount this hook in App, outside the scene: navigation never owns the clock.
export function useKitchen({ active = false } = {}) {
  const [store] = useState(() => createKitchenStore());
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const [visible, setVisible] = useState(() => !document.hidden);
  // A claim can settle after the Kitchen scene unmounts. Keep its delivery here,
  // above navigation, until the visible scene has actually presented the result.
  const [delivery, setDelivery] = useState(null);
  const dispatch = useCallback(async (command) => {
    const result = await store.dispatch(command);
    const session = result.kitchen.session;
    if (result.presented && session?.status === 'completed') {
      setDelivery({ id: session.id, recipe: getKitchenRecipe(session.recipeId) });
    } else {
      setDelivery((current) => current && (current.id !== session?.id
        || (command.type === 'close' && command.sessionId === current.id)) ? null : current);
    }
    return result;
  }, [store]);
  const clearDelivery = useCallback((id) => {
    setDelivery((current) => current?.id === id ? null : current);
  }, []);
  useEffect(() => {
    store.connect();
    void store.initialize();
    const change = () => {
      setVisible(!document.hidden);
      void store.setHidden(document.hidden);
    };
    document.addEventListener('visibilitychange', change);
    window.addEventListener('focus', change);
    window.addEventListener('pageshow', change);
    return () => {
      document.removeEventListener('visibilitychange', change);
      window.removeEventListener('focus', change);
      window.removeEventListener('pageshow', change);
      store.disconnect();
    };
  }, [store]);
  useEffect(() => {
    if (!active || !visible || !snapshot.ready) return undefined;
    void store.refresh();
    if (snapshot.kitchen.session?.status !== 'running') return undefined;
    // This refresh only redraws a timestamp-derived value. It never counts time.
    const timer = setInterval(() => { void store.refresh(); }, 1000);
    return () => clearInterval(timer);
  }, [active, visible, snapshot.ready, snapshot.kitchen.session?.status, store]);
  return { ...snapshot, view: getKitchenView(snapshot.kitchen), dispatch, delivery, clearDelivery, retry: store.retry };
}

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

// Fullscreen is transient UI state. The same scene stays mounted; no preferences
// or scene data pass through the desktop bridge.
export function useImmersiveMode() {
  const targetRef = useRef(null);
  const triggerRef = useRef(null);
  const entering = useRef(false);
  const mounted = useRef(true);
  const [active, setActive] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    mounted.current = true;
    const target = targetRef.current;
    const sync = () => setActive(Boolean(target && document.fullscreenElement === target));
    document.addEventListener('fullscreenchange', sync);
    sync();
    return () => {
      mounted.current = false;
      document.removeEventListener('fullscreenchange', sync);
      if (document.fullscreenElement === target) void document.exitFullscreen().catch(() => {});
    };
  }, []);

  useLayoutEffect(() => {
    if (!active) return undefined;
    const target = targetRef.current;
    const scroll = { x: window.scrollX, y: window.scrollY };
    const isolated = [];
    // Fullscreen visually hides the rest of the document. Inert also removes it
    // from keyboard and assistive-technology navigation until the scene returns.
    for (let node = target; node?.parentElement; node = node.parentElement) {
      for (const sibling of node.parentElement.children) {
        if (sibling === node || !(sibling instanceof HTMLElement)) continue;
        isolated.push([sibling, sibling.getAttribute('inert')]);
        sibling.inert = true;
      }
    }
    const root = document.documentElement;
    const hadClass = root.classList.contains('has-immersive-scene');
    root.classList.add('has-immersive-scene');
    target.focus({ preventScroll: true });
    return () => {
      for (const [element, previous] of isolated) {
        if (previous === null) element.removeAttribute('inert');
        else element.setAttribute('inert', previous);
      }
      if (!hadClass) root.classList.remove('has-immersive-scene');
      if (triggerRef.current?.isConnected) triggerRef.current.focus({ preventScroll: true });
      window.scrollTo(scroll.x, scroll.y);
    };
  }, [active]);

  const exit = useCallback(async () => {
    if (document.fullscreenElement !== targetRef.current) return;
    try {
      await document.exitFullscreen();
    } catch {
      if (mounted.current && document.fullscreenElement === targetRef.current) {
        setError('Não foi possível sair da tela cheia. Pressione Esc para retornar.');
      }
    }
  }, []);

  useEffect(() => {
    if (!active) return undefined;
    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      void exit();
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [active, exit]);

  const enter = useCallback(async () => {
    const target = targetRef.current;
    if (!target || entering.current || document.fullscreenElement === target) return;
    setError('');
    if (!document.fullscreenEnabled || !target.requestFullscreen) {
      setError('A tela cheia não está disponível neste ambiente. Você pode continuar a viagem aqui.');
      return;
    }
    entering.current = true;
    setPending(true);
    try {
      // Call within the button gesture, before yielding user activation.
      await target.requestFullscreen({ navigationUI: 'hide' });
    } catch {
      if (mounted.current) setError('Não foi possível abrir o Modo Imersivo. Você pode tentar novamente.');
    } finally {
      entering.current = false;
      if (mounted.current) setPending(false);
    }
  }, []);

  return { targetRef, triggerRef, active, pending, error, enter, exit };
}

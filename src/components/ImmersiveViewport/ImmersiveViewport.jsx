import { useLayoutEffect, useRef, useState } from 'react';
import Icon from '../Icon.jsx';
import { fitPixelArt } from './fitPixelArt.js';
import './ImmersiveViewport.css';

export default function ImmersiveViewport({
  targetRef,
  active,
  onExit,
  contextualOpen = false,
  width = 480,
  height = 270,
  children,
}) {
  const [fit, setFit] = useState(null);
  const [exitVisible, setExitVisible] = useState(false);
  const [exitFocused, setExitFocused] = useState(false);
  const exitRef = useRef(null);
  const focusRequested = useRef(false);
  const timer = useRef(null);

  useLayoutEffect(() => {
    setExitVisible(false);
    setExitFocused(false);
    focusRequested.current = false;
    if (!active) {
      setFit(null);
      return undefined;
    }
    const target = targetRef.current;
    const update = () => setFit(fitPixelArt(target.clientWidth, target.clientHeight, width, height, window.devicePixelRatio));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(target);
    window.addEventListener('resize', update);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
      clearTimeout(timer.current);
    };
  }, [active, targetRef, width, height]);

  useLayoutEffect(() => {
    let frame;
    if (exitVisible && focusRequested.current) {
      focusRequested.current = false;
      // Give the browser a frame to apply visibility before moving keyboard focus.
      frame = requestAnimationFrame(() => {
        if (document.fullscreenElement === targetRef.current) {
          exitRef.current?.focus({ preventScroll: true });
        }
      });
    }
    return () => cancelAnimationFrame(frame);
  }, [exitVisible, targetRef]);

  function onPointerMove(event) {
    if (!active) return;
    const bounds = targetRef.current.getBoundingClientRect();
    const inCorner = event.clientX >= bounds.right - 120 && event.clientY <= bounds.top + 72;
    clearTimeout(timer.current);
    setExitVisible(inCorner);
    if (inCorner) timer.current = setTimeout(() => setExitVisible(false), 1800);
  }

  function onKeyDown(event) {
    if (!active || contextualOpen || targetRef.current?.querySelector('dialog[open]') || event.key !== 'Tab') return;
    clearTimeout(timer.current);
    const target = targetRef.current;
    const focused = document.activeElement;
    const objects = [...target.querySelectorAll('[tabindex="0"], button, a[href], input, select, textarea')]
      .filter((element) => element !== exitRef.current && !element.disabled
        && element.getAttribute('tabindex') !== '-1' && !element.closest('[inert], [hidden]')
        && element.getClientRects().length > 0);
    const first = objects[0];
    const last = objects[objects.length - 1];

    // Keep the initial exit shortcut, then let Tab visit the carriage objects.
    // Only wrap the boundaries: the rest of their DOM order remains native.
    if (focused === exitRef.current && first) {
      event.preventDefault();
      (event.shiftKey ? last : first).focus({ preventScroll: true });
      return;
    }
    const needsExit = focused === target
      || focused === exitRef.current
      || (event.shiftKey ? focused === first : focused === last);
    if (!needsExit) return;
    event.preventDefault();
    focusRequested.current = true;
    if (exitVisible) {
      focusRequested.current = false;
      exitRef.current?.focus({ preventScroll: true });
    } else setExitVisible(true);
  }

  return (
    <div
      ref={targetRef}
      className={`immersive-viewport${active ? ' is-immersive' : ''}${active && (exitVisible || exitFocused) ? ' is-exit-visible' : ''}`}
      tabIndex={active ? -1 : undefined}
      role={active ? 'region' : undefined}
      aria-label={active ? 'Cenário em tela cheia. Pressione Esc para sair, M para ajustar os sons, C para My Companion ou Tab para acessar o botão de saída.' : undefined}
      onPointerMove={onPointerMove}
      onPointerLeave={() => setExitVisible(false)}
      onKeyDownCapture={onKeyDown}
    >
      <div className="immersive-art" style={active && fit ? fit : undefined}>
        {children}
      </div>
      <button
        ref={exitRef}
        type="button"
        className="immersive-exit"
        hidden={!active}
        tabIndex={active ? 0 : -1}
        aria-label="Sair do Modo Imersivo"
        title="Sair do Modo Imersivo (Esc)"
        onClick={onExit}
        onFocus={() => setExitFocused(true)}
        onBlur={() => {
          setExitFocused(false);
          setExitVisible(false);
        }}
      >
        <Icon name="collapse" size={20} />
      </button>
    </div>
  );
}

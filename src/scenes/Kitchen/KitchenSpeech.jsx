import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { getKitchenSpeechLayout } from '../../services/kitchenSpeech.js';
import './KitchenSpeech.css';

/** A native-text bubble in the same moving SVG group as the companion.
 * The inverse scale preserves text size; shared CSS progress clamps its box
 * while the sprite walks, without per-frame React renders or DOM measurements. */
export default function KitchenSpeech({ state, headAnchor, contentKey, children, visible, suppress,
  kind = 'message', onPresented, hasCompanion = true }) {
  const foreign = useRef(null);
  const pixels = useRef(null);
  const callback = useRef(onPresented);
  callback.current = onPresented;
  const [retained, setRetained] = useState(null);
  const [leaving, setLeaving] = useState(false);
  const [size, setSize] = useState({ width: 960, height: 540, controlsBottom: 48 });
  const [cardHeight, setCardHeight] = useState(0);
  const presented = useRef(new Set());
  const show = visible && !suppress;
  const content = show ? children : retained?.content;
  const key = show ? contentKey : retained?.key;
  const contentKind = show ? kind : retained?.kind || kind;
  const present = show || Boolean(retained);

  useEffect(() => {
    if (show) { setRetained({ content: children, key: contentKey, kind }); setLeaving(false); return undefined; }
    if (suppress) { setRetained(null); setLeaving(false); return undefined; }
    if (!retained) return undefined;
    setLeaving(true);
    const timer = setTimeout(() => { setRetained(null); setLeaving(false); }, 160);
    return () => clearTimeout(timer);
  }, [show, suppress, contentKey, kind]);

  useLayoutEffect(() => {
    if (!present) return undefined;
    const svg = foreign.current.ownerSVGElement;
    const scene = svg.closest('.kitchen-scene');
    const controls = scene.querySelector('.kitchen-in-scene-controls');
    const measure = () => {
      const rect = svg.getBoundingClientRect();
      const controlRect = controls?.getBoundingClientRect();
      const controlsBottom = controlRect ? Math.max(0, controlRect.bottom - rect.top) : 40;
      setSize((old) => old.width === rect.width && old.height === rect.height && old.controlsBottom === controlsBottom
        ? old : { width: rect.width, height: rect.height, controlsBottom });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(svg);
    if (controls) observer.observe(controls);
    return () => observer.disconnect();
  }, [present]);

  useLayoutEffect(() => {
    if (!present) return undefined;
    const element = pixels.current;
    const measure = () => {
      const height = element.offsetHeight;
      setCardHeight((old) => Math.abs(old - height) < 0.5 ? old : height);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [present, key, size.width]);

  useEffect(() => {
    if (!show || !contentKey || presented.current.has(contentKey)) return undefined;
    const frame = requestAnimationFrame(() => {
      if (document.hidden || !foreign.current?.isConnected) return;
      presented.current.add(contentKey);
      callback.current?.();
    });
    return () => cancelAnimationFrame(frame);
  }, [show, contentKey]);

  if (!present || !content || size.width <= 0) return null;
  const head = { x: state.position.x + headAnchor.x, y: state.position.y + headAnchor.y };
  const layout = getKitchenSpeechLayout({ ...size, head, kind: contentKind, naturalHeight: cardHeight || undefined });
  const logical = (value) => `${value / layout.scale}px`;
  const worldX = 'calc((var(--kitchen-base-x) + var(--kitchen-dx) * var(--kitchen-travel-progress)) * 1px)';
  const worldY = 'calc((var(--kitchen-base-y) + var(--kitchen-dy) * var(--kitchen-travel-progress)) * 1px)';
  const globalHeadX = `calc(${worldX} + ${headAnchor.x}px)`;
  const globalHeadY = `calc(${worldY} + ${headAnchor.y}px)`;
  const desiredX = layout.placement === 'left' ? `calc(${globalHeadX} - 14px - ${logical(layout.gap + layout.width)})`
    : layout.placement === 'right' ? `calc(${globalHeadX} + 14px + ${logical(layout.gap)})`
      : `calc(${globalHeadX} - ${logical(layout.width / 2)})`;
  const desiredY = layout.placement === 'above' ? `calc(${globalHeadY} - ${logical(layout.gap + layout.height)})`
    : `calc(${globalHeadY} - ${logical(layout.height / 2)})`;
  const globalLeft = `clamp(${logical(layout.margin)}, ${desiredX}, ${logical(size.width - layout.width - layout.margin)})`;
  const globalTop = `clamp(${logical(layout.top)}, ${desiredY}, ${logical(size.height - layout.height - layout.margin)})`;
  const style = {
    x: `calc(${globalLeft} - ${worldX})`, y: `calc(${globalTop} - ${worldY})`,
    '--speech-width': `${layout.width}px`, '--speech-max-height': `${layout.maxHeight}px`,
    '--speech-inverse-scale': 1 / layout.scale,
    '--speech-tip-x': `calc((${globalHeadX} - ${globalLeft}) * ${layout.scale})`,
    '--speech-tip-y': `calc((${globalHeadY} - ${globalTop}) * ${layout.scale})`,
  };
  return <foreignObject ref={foreign} className="kitchen-speech-anchor" width={layout.width / layout.scale}
    height={layout.height / layout.scale} style={style} data-speech-placement={layout.placement}>
    <div xmlns="http://www.w3.org/1999/xhtml" className="kitchen-speech-pixels">
      <div ref={pixels} className={`kitchen-speech kitchen-speech--${contentKind}${leaving ? ' is-leaving' : ''}${layout.width < 270 ? ' is-compact' : ''}${layout.maxHeight < 130 ? ' is-tight' : ''}`}
        data-speech-placement={layout.placement} data-has-companion={hasCompanion}>
        <div className="kitchen-speech-card" key={key}>{content}</div>
        {hasCompanion && <span className="kitchen-speech-tail" aria-hidden="true" />}
      </div>
    </div>
  </foreignObject>;
}

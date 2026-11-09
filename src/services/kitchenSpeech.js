export const KITCHEN_SCENE_SIZE = Object.freeze({ width: 480, height: 270 });
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

/** Layout is measured only on content/viewport changes. CSS shares the actor's
 * animated progress for the actual position, including edge clamping in motion. */
export function getKitchenSpeechLayout({ width, height, head, kind = 'message', naturalHeight,
  controlsBottom = 40 }) {
  const scale = width / KITCHEN_SCENE_SIZE.width;
  const margin = Math.min(8, width / 30);
  const gap = 8;
  const top = Math.min(height - 50, Math.max(margin, controlsBottom + gap));
  const maxHeight = Math.max(48, height - top - margin);
  const desiredWidth = Math.min(kind === 'completion' ? 360 : 292, width - margin * 2);
  const wantedHeight = naturalHeight || (kind === 'completion' ? 205 : 70);
  const headX = head.x * scale;
  const headY = head.y * scale;
  const aboveFits = headY - gap - wantedHeight >= top;
  let placement = 'above';
  let cardWidth = desiredWidth;
  if (!aboveFits && kind === 'completion') {
    const separation = gap + 14 * scale;
    const leftSpace = headX - separation - margin;
    const rightSpace = width - headX - separation - margin;
    placement = leftSpace >= rightSpace ? 'left' : 'right';
    cardWidth = Math.max(120, Math.min(desiredWidth, Math.max(leftSpace, rightSpace)));
    cardWidth = Math.min(cardWidth, width - margin * 2);
  }
  const cardHeight = Math.min(wantedHeight, maxHeight);
  return { scale, width: cardWidth, height: cardHeight, maxHeight, placement,
    margin, gap, top, sceneWidth: width, sceneHeight: height };
}

/** Numeric equivalent of the CSS expressions; also useful for regression tests. */
export function kitchenSpeechPosition(layout, head) {
  const { scale, width, height, placement, margin, gap, top, sceneWidth, sceneHeight } = layout;
  const hx = head.x * scale;
  const hy = head.y * scale;
  const x = placement === 'left' ? hx - 14 * scale - gap - width
    : placement === 'right' ? hx + 14 * scale + gap : hx - width / 2;
  const y = placement === 'above' ? hy - gap - height : hy - height / 2;
  return { x: clamp(x, margin, sceneWidth - width - margin),
    y: clamp(y, top, sceneHeight - height - margin) };
}

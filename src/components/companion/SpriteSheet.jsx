// A nested SVG clips exactly one atlas cell, without cropping its transparent
// canvas or recentering individual poses. All geometry comes from the manifest.
export default function SpriteSheet({ animation, frame = 0, assetBase, scale = 1 }) {
  const column = frame % animation.columns;
  const row = Math.floor(frame / animation.columns);
  const x = (animation.margin || 0) + column * (animation.frameWidth + (animation.spacing || 0));
  const y = (animation.margin || 0) + row * (animation.frameHeight + (animation.spacing || 0));
  return <svg className="companion-sheet" aria-hidden="true" pointerEvents="none"
    data-animation={animation.stateId} data-frame={frame}
    x={-animation.anchor.x * scale} y={-animation.anchor.y * scale}
    width={animation.frameWidth * scale} height={animation.frameHeight * scale}
    viewBox={`${x} ${y} ${animation.frameWidth} ${animation.frameHeight}`} overflow="hidden"
    style={{ imageRendering: 'pixelated' }}>
    <image href={`${import.meta.env.BASE_URL}${assetBase}${animation.path}`}
      width={animation.sheetWidth} height={animation.sheetHeight} style={{ imageRendering: 'pixelated' }} />
  </svg>;
}

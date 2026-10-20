// Fit a logical pixel grid to the display, snapping both scale and position to
// physical pixels. Very small displays use proportional downscaling instead.
export function fitPixelArt(availableWidth, availableHeight, width, height, pixelRatio = 1) {
  const ratio = Number.isFinite(pixelRatio) && pixelRatio > 0 ? pixelRatio : 1;
  const limit = Math.min(Math.max(0, availableWidth) / width, Math.max(0, availableHeight) / height);
  const scale = limit * ratio >= 1 ? Math.floor(limit * ratio + 1e-9) / ratio : limit;
  const fittedWidth = width * scale;
  const fittedHeight = height * scale;
  return {
    width: fittedWidth,
    height: fittedHeight,
    left: Math.floor(((availableWidth - fittedWidth) * ratio) / 2 + 1e-9) / ratio,
    top: Math.floor(((availableHeight - fittedHeight) * ratio) / 2 + 1e-9) / ratio,
  };
}

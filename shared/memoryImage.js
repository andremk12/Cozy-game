// Chromium handles JPEG EXIF orientation and WebP. Only the derived thumbnail
// is encoded again; callers retain the original Blob/bytes without alteration.
export async function makeMemoryThumbnail(blob) {
  let bitmap;
  try {
    bitmap = await createImageBitmap(blob, { imageOrientation: 'from-image' });
    const { width, height } = bitmap;
    if (!width || !height || width > 16000 || height > 16000 || width * height > 40_000_000) {
      throw new Error('Image dimensions exceed the memory limit.');
    }
    const scale = Math.min(1, 640 / Math.max(width, height));
    const canvas = new OffscreenCanvas(Math.max(1, Math.round(width * scale)), Math.max(1, Math.round(height * scale)));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Image decoding is unavailable.');
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const thumbnail = await canvas.convertToBlob({ type: 'image/png' });
    return { width, height, thumbnail };
  } finally {
    bitmap?.close();
  }
}

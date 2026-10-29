import { makeMemoryThumbnail } from '../../shared/memoryImage.js';

window.memoryDecoder.receive(async ({ bytes, mime }) => {
  try {
    const result = await makeMemoryThumbnail(new Blob([bytes], { type: mime }));
    window.memoryDecoder.complete({ width: result.width, height: result.height,
      thumbnail: new Uint8Array(await result.thumbnail.arrayBuffer()) });
  } catch {
    window.memoryDecoder.complete(null);
  }
});

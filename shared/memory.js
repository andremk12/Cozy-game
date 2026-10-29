// The board is separate from preferences and the ephemeral Let It Float ritual.
export const MEMORY_LIMITS = Object.freeze({
  maxItems: 60,
  maxImageBytes: 20 * 1024 * 1024,
  maxPixels: 40_000_000,
  maxEdge: 16_000,
  maxBackupBytes: 512 * 1024 * 1024,
  maxDocumentBytes: 512 * 1024,
  // Reserve enough room for the bounded metadata/header in a complete backup.
  maxOriginalBytes: 512 * 1024 * 1024 - 512 * 1024 - 12,
  maxStoredImages: 240,
  noteLength: 2000,
  captionLength: 300,
});

export const MEMORY_THEMES = ['warm', 'moonlight', 'garden'];
export const MEMORY_FRAMES = ['polaroid', 'light-wood', 'dark-wood', 'simple', 'floral'];
export const MEMORY_PAPERS = ['beige', 'rose', 'sage', 'blue', 'lilac'];
export const MEMORY_PAPER_STYLES = ['plain', 'lined', 'torn'];
export const MEMORY_ROTATIONS = [-8, -4, 0, 4, 8];

export function isMemoryId(value) {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value);
}

export function createMemoryBoard() {
  return { version: 1, theme: 'warm', decorations: { lights: true, flowers: true, stars: false }, items: [] };
}

export function clampMemoryPosition(x, y) {
  const bound = (value) => Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0.5;
  return { x: bound(x), y: bound(y) };
}

const exact = (value, keys) => value && typeof value === 'object' && !Array.isArray(value)
  && Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
const text = (value, limit) => typeof value === 'string' && value.length <= limit
  && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\p{Cs}]/u.test(value);

// Returns a fresh snapshot, so neither IPC replies nor caller mutations can
// change a pending disk write. Unknown fields are rejected, never persisted.
export function validateMemoryBoard(value) {
  const fail = () => { throw new TypeError('Invalid memory board.'); };
  if (!exact(value, ['version', 'theme', 'decorations', 'items']) || value.version !== 1
    || !MEMORY_THEMES.includes(value.theme)
    || !exact(value.decorations, ['lights', 'flowers', 'stars'])
    || Object.values(value.decorations).some((item) => typeof item !== 'boolean')
    || !Array.isArray(value.items) || value.items.length > MEMORY_LIMITS.maxItems) fail();
  const ids = new Set();
  const items = value.items.map((item) => {
    const common = ['id', 'kind', 'x', 'y', 'rotation'];
    const fields = item?.kind === 'photo' ? ['imageId', 'frame', 'caption'] : ['text', 'paper', 'style'];
    if (!exact(item, [...common, ...fields]) || !isMemoryId(item.id) || ids.has(item.id)
      || !['photo', 'note'].includes(item.kind) || !MEMORY_ROTATIONS.includes(item.rotation)
      || ![item.x, item.y].every((coordinate) => typeof coordinate === 'number'
        && Number.isFinite(coordinate) && coordinate >= 0 && coordinate <= 1)) fail();
    ids.add(item.id);
    const result = Object.fromEntries(common.map((key) => [key, item[key]]));
    if (item.kind === 'photo') {
      if (!isMemoryId(item.imageId) || !MEMORY_FRAMES.includes(item.frame) || !text(item.caption, MEMORY_LIMITS.captionLength)) fail();
    } else if (!text(item.text, MEMORY_LIMITS.noteLength) || !item.text.trim()
      || !MEMORY_PAPERS.includes(item.paper) || !MEMORY_PAPER_STYLES.includes(item.style)) fail();
    return { ...result, ...Object.fromEntries(fields.map((key) => [key, item[key]])) };
  });
  return { version: 1, theme: value.theme, decorations: { ...value.decorations }, items };
}

function imageError() { throw new TypeError('Invalid or unsupported memory image.'); }
const pngCrcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});
function pngCrc(bytes, start, end) {
  let crc = 0xffffffff;
  for (let index = start; index < end; index++) crc = pngCrcTable[(crc ^ bytes[index]) & 255] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
function dimensions(width, height) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1
    || width > MEMORY_LIMITS.maxEdge || height > MEMORY_LIMITS.maxEdge
    || width * height > MEMORY_LIMITS.maxPixels) imageError();
  return { width, height };
}

// Header inspection is shared with the browser, without Node.js or codecs. It
// rejects unsafe containers and excessive decoded dimensions BEFORE a decoder
// allocates pixels. A successful real image decode is still required afterwards.
export function inspectMemoryImage(input) {
  if (!(input instanceof Uint8Array) || input.byteLength < 12 || input.byteLength > MEMORY_LIMITS.maxImageBytes) imageError();
  const bytes = input;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const chars = (start, length) => String.fromCharCode(...bytes.subarray(start, start + length));
  let size;
  if (bytes[0] === 137 && chars(1, 3) === 'PNG' && bytes[4] === 13 && bytes[5] === 10 && bytes[6] === 26 && bytes[7] === 10) {
    if (bytes.length < 45 || view.getUint32(8) !== 13 || chars(12, 4) !== 'IHDR') imageError();
    size = dimensions(view.getUint32(16), view.getUint32(20));
    let offset = 8;
    let data = false;
    let ended = false;
    while (offset + 12 <= bytes.length) {
      const length = view.getUint32(offset);
      if (length > bytes.length - offset - 12) imageError();
      const type = chars(offset + 4, 4);
      if (!/^[A-Za-z]{4}$/.test(type) || type === 'acTL') imageError();
      if (view.getUint32(offset + length + 8) !== pngCrc(bytes, offset + 4, offset + length + 8)) imageError();
      if (type === 'IDAT') data = true;
      offset += length + 12;
      if (type === 'IEND') { if (length !== 0 || offset !== bytes.length) imageError(); ended = true; break; }
    }
    if (!data || !ended) imageError();
    return { mime: 'image/png', extension: 'png', ...size };
  }
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) {
    if (bytes[bytes.length - 2] !== 255 || bytes[bytes.length - 1] !== 217) imageError();
    let offset = 2;
    let scan = false;
    const frames = [0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf];
    while (offset + 4 <= bytes.length) {
      if (bytes[offset++] !== 255) imageError();
      while (bytes[offset] === 255) offset++;
      const marker = bytes[offset++];
      if (marker === 0xda) { scan = true; break; }
      if (marker === 0xd9 || marker === 0 || marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7)) imageError();
      if (offset + 2 > bytes.length) imageError();
      const length = view.getUint16(offset);
      if (length < 2 || offset + length > bytes.length) imageError();
      if (frames.includes(marker)) {
        if (length < 8 || size) imageError();
        size = dimensions(view.getUint16(offset + 5), view.getUint16(offset + 3));
      }
      offset += length;
    }
    if (!size || !scan) imageError();
    return { mime: 'image/jpeg', extension: 'jpg', ...size };
  }
  if (chars(0, 4) === 'RIFF' && chars(8, 4) === 'WEBP') {
    if (view.getUint32(4, true) + 8 !== bytes.length) imageError();
    let offset = 12;
    let encoded = false;
    while (offset + 8 <= bytes.length) {
      const type = chars(offset, 4);
      const length = view.getUint32(offset + 4, true);
      const start = offset + 8;
      if (length > bytes.length - start) imageError();
      if (type === 'ANIM' || type === 'ANMF') imageError();
      let frame;
      if (type === 'VP8X') {
        if (length !== 10 || (bytes[start] & 2)) imageError();
        const read24 = (index) => bytes[index] + bytes[index + 1] * 256 + bytes[index + 2] * 65536 + 1;
        size = dimensions(read24(start + 4), read24(start + 7));
      } else if (type === 'VP8 ') {
        if (length < 10 || chars(start + 3, 3) !== '\x9d\x01\x2a') imageError();
        frame = dimensions(view.getUint16(start + 6, true) & 0x3fff, view.getUint16(start + 8, true) & 0x3fff);
        encoded = true;
      } else if (type === 'VP8L') {
        if (length < 5 || bytes[start] !== 0x2f) imageError();
        const packed = view.getUint32(start + 1, true);
        frame = dimensions((packed & 0x3fff) + 1, ((packed >>> 14) & 0x3fff) + 1);
        encoded = true;
      }
      if (frame) {
        if (size && (size.width !== frame.width || size.height !== frame.height)) imageError();
        size = frame;
      }
      offset = start + length + (length % 2);
    }
    if (!encoded || !size || offset !== bytes.length) imageError();
    return { mime: 'image/webp', extension: 'webp', ...size };
  }
  imageError();
}

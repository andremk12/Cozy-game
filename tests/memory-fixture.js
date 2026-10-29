import { deflateSync } from 'node:zlib';
import { inspectMemoryImage } from '../shared/memory.js';

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit++) value = (value & 1) ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});
function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, content) {
  const name = Buffer.from(type);
  const bytes = Buffer.alloc(content.length + 12);
  bytes.writeUInt32BE(content.length);
  name.copy(bytes, 4); content.copy(bytes, 8);
  bytes.writeUInt32BE(crc32(Buffer.concat([name, content])), bytes.length - 4);
  return bytes;
}

// All fixtures are generated pixels and synthetic headers, never personal data.
export function memoryPng(width = 32, height = 16) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width); header.writeUInt32BE(height, 4);
  header[8] = 8; header[9] = 2;
  const rows = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const position = y * (width * 3 + 1) + 1 + x * 3;
    rows[position] = x % 256; rows[position + 1] = y % 256; rows[position + 2] = 140;
  }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('IDAT', deflateSync(rows)), chunk('IEND', Buffer.alloc(0))]);
}

export function memoryJpegHeader(width = 48, height = 24) {
  const bytes = Buffer.from([255, 216, 255, 192, 0, 11, 8, 0, 0, 0, 0, 1, 1, 17, 0, 255, 218, 0, 8, 1, 1, 0, 0, 63, 0, 0, 255, 217]);
  bytes.writeUInt16BE(height, 7); bytes.writeUInt16BE(width, 9);
  return bytes;
}

export function memoryWebpHeader(width = 48, height = 24) {
  const bytes = Buffer.alloc(26);
  bytes.write('RIFF'); bytes.writeUInt32LE(18, 4); bytes.write('WEBP', 8);
  bytes.write('VP8L', 12); bytes.writeUInt32LE(5, 16); bytes[20] = 47;
  bytes.writeUInt32LE((width - 1) | ((height - 1) << 14), 21);
  return bytes;
}

export async function fakeMemoryDecoder(bytes) {
  const { width, height } = inspectMemoryImage(bytes);
  return { width, height, thumbnail: memoryPng(Math.min(width, 64), Math.min(height, 64)) };
}

export const memoryNote = (overrides = {}) => ({
  id: 'aaaaaaaa-0000-4000-8000-000000000001', kind: 'note', x: 0.25, y: 0.3, rotation: 0,
  text: 'SYNTHETIC: há espaço para descansar.\n小さな思い出 🌿', paper: 'sage', style: 'lined', ...overrides,
});

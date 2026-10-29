import { createHash, randomUUID } from 'node:crypto';
import { lstat, open, rename, rm } from 'node:fs/promises';
import path from 'node:path';
import { MEMORY_LIMITS } from '../../shared/memory.js';

// .haven-memory v1: 8-byte LHAVENM1 magic, uint32LE UTF-8 metadata length,
// metadata {version,board,assets}, then each original's exact bytes, in order.
// There are no entry paths, compression, executable content or JSON/base64 photos.
export const MEMORY_BACKUP_MAGIC = Buffer.from('LHAVENM1');
export const memoryDigest = (bytes) => createHash('sha256').update(bytes).digest('hex');

async function readExactly(handle, length, position) {
  const bytes = Buffer.alloc(length);
  let offset = 0;
  while (offset < length) {
    const result = await handle.read(bytes, offset, length - offset, position + offset);
    if (!result.bytesRead) throw new Error('Invalid memory backup.');
    offset += result.bytesRead;
  }
  return bytes;
}

export async function writeMemoryBackup(destination, metadata, readAsset) {
  const json = Buffer.from(JSON.stringify(metadata));
  const total = 12 + json.length + metadata.assets.reduce((sum, asset) => sum + asset.bytes, 0);
  if (json.length > MEMORY_LIMITS.maxDocumentBytes || total > MEMORY_LIMITS.maxBackupBytes) {
    throw new Error('Memory backup is too large.');
  }
  // A dialog-authorized destination is replaced only after a complete synced
  // package exists; errors leave a previous backup untouched.
  try {
    const target = await lstat(destination);
    if (!target.isFile() || target.isSymbolicLink()) throw new Error('Invalid backup destination.');
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const temporary = path.join(path.dirname(destination), `.haven-backup-${randomUUID()}.tmp`);
  let handle;
  try {
    handle = await open(temporary, 'wx', 0o600);
    const header = Buffer.alloc(12);
    MEMORY_BACKUP_MAGIC.copy(header);
    header.writeUInt32LE(json.length, 8);
    await handle.writeFile(header);
    await handle.writeFile(json);
    for (const asset of metadata.assets) {
      const bytes = await readAsset(asset);
      if (bytes.length !== asset.bytes || memoryDigest(bytes) !== asset.sha256) throw new Error('Memory image is unavailable.');
      await handle.writeFile(bytes);
    }
    await handle.sync();
    await handle.close();
    handle = undefined;
    await rename(temporary, destination);
  } finally {
    await handle?.close().catch(() => {});
    await rm(temporary, { force: true }).catch(() => {});
  }
}

export async function readMemoryBackup(source, validateMetadata, consumeAsset) {
  const info = await lstat(source);
  if (!info.isFile() || info.isSymbolicLink() || info.size < 12 || info.size > MEMORY_LIMITS.maxBackupBytes) {
    throw new Error('Invalid memory backup.');
  }
  const handle = await open(source, 'r');
  try {
    const infoOpened = await handle.stat();
    if (!infoOpened.isFile() || infoOpened.size !== info.size) throw new Error('Invalid memory backup.');
    const header = await readExactly(handle, 12, 0);
    if (!header.subarray(0, 8).equals(MEMORY_BACKUP_MAGIC)) throw new Error('Invalid memory backup.');
    const length = header.readUInt32LE(8);
    if (length < 1 || length > MEMORY_LIMITS.maxDocumentBytes || 12 + length > info.size) throw new Error('Invalid memory backup.');
    const metadata = validateMetadata(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(await readExactly(handle, length, 12))));
    const expected = 12 + length + metadata.assets.reduce((sum, asset) => sum + asset.bytes, 0);
    if (expected !== info.size) throw new Error('Invalid memory backup.');
    let position = 12 + length;
    for (const asset of metadata.assets) {
      // Only one bounded original is in memory at a time, even for large boards.
      const bytes = await readExactly(handle, asset.bytes, position);
      if (memoryDigest(bytes) !== asset.sha256) throw new Error('Invalid memory backup image.');
      await consumeAsset(asset, bytes);
      position += asset.bytes;
    }
    return metadata;
  } finally { await handle.close(); }
}

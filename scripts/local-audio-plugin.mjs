import { readFile } from 'node:fs/promises';
import path from 'node:path';

// Audio is delivered as lazy local JavaScript modules. Buffer decoding therefore
// works under the desktop's connect-src 'none', without a new IPC capability or
// a file/network fetch from the renderer.
export function localAudioPlugin() {
  const prefix = 'virtual:haven-audio/';
  const resolvedPrefix = '\0haven-audio/';
  const directory = path.resolve('public/assets/audio');
  return {
    name: 'haven-local-audio',
    resolveId(id) {
      if (!id.startsWith(prefix)) return null;
      const filename = id.slice(prefix.length);
      if (!/^[a-z][a-z-]*\.(ogg|wav)$/.test(filename)) throw new Error('Invalid local audio asset.');
      return `${resolvedPrefix}${filename}`;
    },
    async load(id) {
      if (!id.startsWith(resolvedPrefix)) return null;
      const filename = path.join(directory, id.slice(resolvedPrefix.length));
      this.addWatchFile(filename);
      return `export default ${JSON.stringify((await readFile(filename)).toString('base64'))};`;
    },
  };
}

// Optional maintainer tool. No downloads; originals and their URLs are listed in
// public/assets/audio/README.md. Uses the already installed Playwright/Edge codec.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { chromium } from '@playwright/test';

const originalRoot = new URL('../work/audio-sources/', import.meta.url);
const destination = new URL('../public/assets/audio/', import.meta.url);
const recordings = [
  { id: 'birds', source: 'birds.ogg', start: 2, duration: 32, lowpass: 8500, rms: 0.10 },
  { id: 'fire', source: 'fire.wav', start: 2, duration: 30, lowpass: 6500, rms: 0.13 },
  { id: 'stream', source: 'stream-waterfall/stream1.ogg', start: 1, duration: 30, lowpass: 7000, rms: 0.13 },
  { id: 'crickets', source: 'crickets.mp3', start: 0, duration: 11, lowpass: 8500, rms: 0.09 },
  { id: 'train-track', source: 'train.ogg', start: 4, duration: 21, highpass: 70, lowpass: 3000, rms: 0.13 },
  { id: 'train-wheels', source: 'train.ogg', start: 4, duration: 21, highpass: 550, lowpass: 5000, rms: 0.09 },
  { id: 'carriage', source: 'train.ogg', start: 4, duration: 21, lowpass: 320, rms: 0.10 },
  { id: 'leaves', sources: ['rustle/rustle02.flac', 'rustle/rustle05.flac', 'rustle/rustle09.flac', 'rustle/rustle12.flac'], duration: 28, lowpass: 6000, rms: 0.08 },
];

await mkdir(destination, { recursive: true });
const browser = await chromium.launch({ channel: process.env.HAVEN_TEST_BROWSER || 'msedge', headless: true });
try {
  const page = await browser.newPage();
  const manifest = [];
  for (const recording of recordings) {
    const sources = await Promise.all((recording.sources ?? [recording.source]).map(async (file) => {
      const bytes = await readFile(new URL(file, originalRoot));
      return { file, base64: bytes.toString('base64'), sha256: createHash('sha256').update(bytes).digest('hex') };
    }));
    const output = await page.evaluate(async ({ recording: settings, sources: inputs }) => {
      const rate = 32000;
      const decoder = new OfflineAudioContext(1, 1, rate);
      const buffers = await Promise.all(inputs.map(async ({ base64 }) => {
        const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
        return decoder.decodeAudioData(bytes.buffer);
      }));
      const duration = settings.sources ? settings.duration : Math.min(settings.duration, buffers[0].duration - settings.start);
      if (duration < 5) throw new Error(`Source too short: ${settings.id}`);
      const context = new OfflineAudioContext(1, Math.floor(duration * rate), rate);
      let destinationNode = context.destination;
      if (settings.lowpass) {
        const filter = context.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = settings.lowpass;
        filter.Q.value = 0.4;
        filter.connect(destinationNode);
        destinationNode = filter;
      }
      if (settings.highpass) {
        const filter = context.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = settings.highpass;
        filter.Q.value = 0.4;
        filter.connect(destinationNode);
        destinationNode = filter;
      }
      buffers.forEach((buffer, index) => {
        const source = context.createBufferSource();
        source.buffer = buffer;
        const gain = context.createGain();
        source.connect(gain);
        gain.connect(destinationNode);
        if (settings.sources) {
          // Space real leaf foley into unhurried gusts, with soft envelopes.
          const start = index * 6.5 + 0.5;
          const length = Math.min(5.5, buffer.duration);
          gain.gain.setValueAtTime(0, start);
          gain.gain.linearRampToValueAtTime(0.6, start + 0.6);
          gain.gain.setValueAtTime(0.6, start + Math.max(0.6, length - 0.7));
          gain.gain.linearRampToValueAtTime(0, start + length);
          source.start(start, 0, length);
        } else source.start(0, settings.start, duration);
      });
      const samples = (await context.startRendering()).getChannelData(0);
      let peak = 0;
      let sum = 0;
      let mean = 0;
      for (const sample of samples) mean += sample / samples.length;
      for (let index = 0; index < samples.length; index += 1) {
        samples[index] -= mean;
        peak = Math.max(peak, Math.abs(samples[index]));
        sum += samples[index] ** 2;
      }
      const rms = Math.sqrt(sum / samples.length);
      const scale = Math.min(0.6 / peak, settings.rms / rms);
      const wav = new ArrayBuffer(44 + samples.length * 2);
      const view = new DataView(wav);
      const ascii = (offset, string) => [...string].forEach((character, index) => view.setUint8(offset + index, character.charCodeAt(0)));
      ascii(0, 'RIFF'); view.setUint32(4, wav.byteLength - 8, true); ascii(8, 'WAVE');
      ascii(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
      view.setUint32(24, rate, true); view.setUint32(28, rate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
      ascii(36, 'data'); view.setUint32(40, samples.length * 2, true);
      for (let index = 0; index < samples.length; index += 1) view.setInt16(44 + index * 2, Math.round(samples[index] * scale * 32767), true);
      const bytes = new Uint8Array(wav);
      let binary = '';
      for (let offset = 0; offset < bytes.length; offset += 8192) binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
      return { base64: btoa(binary), duration, peak: peak * scale, rms: rms * scale, rate, originalDurations: buffers.map((buffer) => buffer.duration) };
    }, { recording, sources });
    const bytes = Buffer.from(output.base64, 'base64');
    await writeFile(new URL(`${recording.id}.wav`, destination), bytes);
    const { base64, ...metrics } = output;
    const entry = { id: recording.id, file: `${recording.id}.wav`, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'), ...metrics, processing: recording, sources: sources.map(({ base64: unused, ...source }) => source) };
    manifest.push(entry);
    console.log(`${recording.id}: ${output.duration.toFixed(2)}s, ${bytes.length} bytes, peak ${output.peak.toFixed(3)}, RMS ${output.rms.toFixed(3)}`);
  }
  await writeFile(new URL('manifest.json', destination), `${JSON.stringify(manifest, null, 2)}\n`);
} finally { await browser.close(); }

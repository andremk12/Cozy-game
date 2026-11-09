// Maintainer-only offline sound design. Uses the existing, licensed originals;
// no download, runtime dependency, or user audio is involved.
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { chromium } from '@playwright/test';
import { measurePcm, readPcm16Wav } from './audio-metrics.mjs';

const directory = new URL('../public/assets/audio/', import.meta.url);
const originalDirectory = new URL('../work/audio-sources/', import.meta.url);
const ids = ['leaves', 'train-track', 'train-wheels', 'carriage'];
const before = {};
for (const id of ids) {
  const bytes = await readFile(new URL(`${id}.wav`, directory));
  before[id] = measurePcm(readPcm16Wav(bytes));
}
const files = ['train.ogg', ...Array.from({ length: 20 }, (_, i) => `rustle/rustle${String(i + 1).padStart(2, '0')}.flac`)];
const originals = await Promise.all(files.map(async (file) => {
  const bytes = await readFile(new URL(file, originalDirectory));
  return { file, base64: bytes.toString('base64'), sha256: createHash('sha256').update(bytes).digest('hex') };
}));
const browser = await chromium.launch({ channel: process.env.HAVEN_TEST_BROWSER || 'msedge', headless: true });
const manifest = JSON.parse(await readFile(new URL('manifest.json', directory), 'utf8'));
const after = {};
try {
  const page = await browser.newPage();
  const decoded = await page.evaluate(async (inputs) => {
    const context = new OfflineAudioContext(1, 1, 32000);
    const result = {};
    for (const { file, base64 } of inputs) {
      const bytes = Uint8Array.from(atob(base64), (value) => value.charCodeAt(0));
      const audio = await context.decodeAudioData(bytes.buffer);
      const samples = audio.getChannelData(0);
      const data = new Uint8Array(samples.buffer);
      let binary = '';
      for (let start = 0; start < data.length; start += 8192) binary += String.fromCharCode(...data.subarray(start, start + 8192));
      result[file] = btoa(binary);
    }
    return result;
  }, originals.map(({ file, base64 }) => ({ file, base64 })));
  const raw = Object.fromEntries(Object.entries(decoded).map(([file, encoded]) => {
    const bytes = Buffer.from(encoded, 'base64');
    return [file, new Float32Array(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength))];
  }));
  for (const id of ids) {
    const { samples, settings } = renderEnvironment(id, raw);
    const bytes = wav16(samples, 32000);
    await writeFile(new URL(`${id}.wav`, directory), bytes);
    const measured = measurePcm(readPcm16Wav(bytes));
    after[id] = measured;
    const inputs = originals.filter(({ file }) => id === 'leaves' ? file.startsWith('rustle/') : file === 'train.ogg');
    const entry = {
      id, file: `${id}.wav`, bytes: bytes.length,
      sha256: createHash('sha256').update(bytes).digest('hex'),
      duration: measured.duration, peak: measured.peak, rms: measured.rms, rate: 32000,
      processing: { script: 'scripts/refine-environment-audio.mjs', ...settings },
      sources: inputs.map(({ base64, ...source }) => source),
    };
    manifest[manifest.findIndex((item) => item.id === id)] = entry;
    console.log(`${id}: ${measured.duration}s; peak ${measured.peak.toFixed(4)}; RMS ${measured.rms.toFixed(4)}; quiet windows ${(measured.quietFraction * 100).toFixed(1)}%`);
  }
} finally { await browser.close(); }
await writeFile(new URL('manifest.json', directory), `${JSON.stringify(manifest, null, 2)}\n`);
const reportFile = new URL('environment-audit.json', directory);
// Preserve the first baseline when regenerating assets; subsequent runs must
// compare against the original audit, rather than overwrite it with themselves.
let baseline = before;
try { baseline = JSON.parse(await readFile(reportFile, 'utf8')).before; } catch { /* First run. */ }
await writeFile(reportFile, `${JSON.stringify({ measured: '2026-10-31', units: 'linear full scale; 100 ms quiet windows below RMS 0.003', before: baseline, after }, null, 2)}\n`);

function renderEnvironment(id, raw) {
  const rate = 32000;
  const seconds = 48;
  const length = rate * seconds;
  const output = new Float32Array(length);
  let state = id === 'leaves' ? 381739 : 724893;
  const random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
  const wrapAdd = (index, value) => { output[((index % length) + length) % length] += value; };
  if (id === 'leaves') {
    // Many individually enveloped fragments of REAL leaf foley. Overlapping
    // short movements retain leaf transients, while large irregular swells
    // describe gusts. This is not a bed of white noise.
    const leaves = files.filter((file) => file.startsWith('rustle/')).map((file) => {
      const sample = bandpass(bandpass(raw[file], 220, 4200, rate), 90, 3200, rate);
      let peak = 0;
      for (const value of sample) peak = Math.max(peak, Math.abs(value));
      return Float32Array.from(sample, (value) => value / Math.max(peak, 0.001));
    });
    let start = -1;
    while (start < seconds) {
      start += 0.027 + random() * 0.041;
      const source = leaves[Math.floor(random() * leaves.length)];
      const speed = 0.67 + random() * 0.55;
      const duration = Math.min(0.35 + random() * 0.4, source.length / rate / speed);
      const size = Math.floor(duration * rate);
      const offset = Math.floor(random() * Math.max(1, source.length - size * speed - 1));
      const gust = 0.63 + 0.19 * Math.sin(2 * Math.PI * start / 16 + 0.9)
        + 0.13 * Math.sin(2 * Math.PI * start / 9.6 + 2.1)
        + 0.08 * Math.sin(2 * Math.PI * start / 6 + 0.5);
      const level = (0.2 + random() * 0.35) * Math.max(0.1, gust);
      const grain = new Float32Array(size);
      let energy = 0;
      let grainPeak = 0;
      for (let i = 0; i < size; i += 1) {
        const position = offset + i * speed;
        const at = Math.floor(position);
        const sample = source[at] * (1 - (position - at)) + (source[at + 1] ?? 0) * (position - at);
        const envelope = Math.sin(Math.PI * i / size) ** 1.8;
        grain[i] = sample * envelope;
        energy += grain[i] ** 2;
        grainPeak = Math.max(grainPeak, Math.abs(grain[i]));
      }
      const grainRms = Math.sqrt(energy / size);
      // Exclude isolated contact knocks; balance individual foley gestures
      // before combining them. No sample clipping, limiter, or compression.
      if (grainRms < 0.0001 || grainPeak / grainRms > 10) continue;
      const balance = Math.min(0.55 / grainPeak, 0.08 / grainRms);
      for (let i = 0; i < size; i += 1) wrapAdd(Math.floor(start * rate) + i, grain[i] * balance * level);
    }
    // A soft two-stage output lowpass also follows pitch-shifted grains. This
    // keeps close dry-leaf contacts from becoming sharp high-frequency ticks.
    const alpha = 1 - Math.exp(-2 * Math.PI * 2600 / rate);
    for (let pass = 0; pass < 2; pass += 1) {
      let low = output[length - 1];
      for (let i = 0; i < length; i += 1) {
        low += alpha * (output[i] - low);
        output[i] = low;
      }
    }
  } else {
    const train = raw['train.ogg'];
    const first = rate * 4;
    const segmentLength = rate * 17;
    const overlap = rate;
    const period = segmentLength - overlap;
    const rawLoop = train.slice(first, first + segmentLength);
    const frequencies = id === 'carriage' ? [45, 260] : id === 'train-wheels' ? [380, 2100] : [100, 1400];
    const filtered = bandpass(rawLoop, ...frequencies, rate);
    let sourceRms = 0;
    for (const value of filtered) sourceRms += value * value;
    sourceRms = Math.sqrt(sourceRms / filtered.length);
    for (let i = 0; i < length; i += 1) {
      const position = i % period;
      let sample = filtered[position];
      if (position < overlap) {
        const blend = (1 - Math.cos(Math.PI * position / overlap)) / 2;
        sample = filtered[period + position] * (1 - blend) + sample * blend;
      }
      const time = i / rate;
      const sway = 0.94 + 0.045 * Math.sin(2 * Math.PI * time / 16) + 0.025 * Math.sin(2 * Math.PI * time / 9.6);
      output[i] = sample / Math.max(sourceRms, 0.001) * (id === 'carriage' ? 0.053 : id === 'train-wheels' ? 0.018 : 0.028) * sway;
    }
    if (id !== 'carriage') {
      // Original paired wheel-joint articulation: rounded body resonance and
      // a short filtered transient, never an exposed sharp metal strike.
      for (let pair = 0; pair < 40; pair += 1) {
        const time = pair * 1.2 + 0.075 * Math.sin(2 * Math.PI * pair / 40);
        for (let wheel = 0; wheel < 2; wheel += 1) {
          const onset = Math.floor((time + wheel * 0.185) * rate);
          const duration = Math.floor(rate * 0.28);
          const strength = (0.86 + random() * 0.2) * (wheel ? 0.73 : 1);
          let softNoise = 0;
          for (let i = 0; i < duration; i += 1) {
            const t = i / rate;
            softNoise += 0.18 * ((random() * 2 - 1) - softNoise);
            const attack = 1 - Math.exp(-t * 90);
            const base = id === 'train-track' ? 155 : 310;
            const body = (Math.sin(2 * Math.PI * base * t) * 0.68
              + Math.sin(2 * Math.PI * base * 1.83 * t) * 0.22
              + Math.sin(2 * Math.PI * base * 3.12 * t) * 0.1) * Math.exp(-t * 13);
            const contact = softNoise * Math.exp(-t * 52);
            const amplitude = id === 'train-track' ? 0.24 : 0.16;
            const release = Math.min(1, (duration - i) / (rate * 0.04));
            wrapAdd(onset + i, (body * 0.8 + contact * 1.4) * attack * release * strength * amplitude);
          }
        }
      }
    }
  }
  // A very short seam interpolation removes the single-sample join without
  // silencing the loop. It does not flatten the long-term gust/rail envelopes.
  const seam = Math.round(rate * 0.008);
  // Boundary is explicitly interpolated between the unmodified surrounding
  // samples; no discontinuity is traded for a second discontinuity 8 ms later.
  const left = output[length - seam - 1];
  const right = output[seam];
  for (let i = 0; i < seam * 2; i += 1) {
    const blend = (1 - Math.cos(Math.PI * i / (seam * 2))) / 2;
    output[(length - seam + i) % length] = left * (1 - blend) + right * blend;
  }
  let mean = 0;
  for (const sample of output) mean += sample / length;
  let sum = 0;
  let peak = 0;
  for (let i = 0; i < length; i += 1) {
    output[i] -= mean;
    sum += output[i] ** 2;
    peak = Math.max(peak, Math.abs(output[i]));
  }
  const targetRms = { leaves: 0.046, 'train-track': 0.06, 'train-wheels': 0.038, carriage: 0.055 }[id];
  const scale = Math.min(0.235 / peak, targetRms / Math.sqrt(sum / length));
  const samples = new Float32Array(length + rate * 0.75);
  for (let i = 0; i < samples.length; i += 1) samples[i] = output[i % length] * scale;
  return { samples, settings: {
    seed: id === 'leaves' ? 381739 : 724893,
    duration: 48.75, loopDuration: 48, headAppendSeconds: 0.75, peakCeiling: 0.235, targetRms,
    description: id === 'leaves' ? '20 CC0 leaf foleys; irregular overlapping grains, two gentle filter stages (220–4200 and 90–3200 Hz), 3 slow gust envelopes'
      : `CC BY train interior; ${id === 'carriage' ? '45–260 Hz' : id === 'train-wheels' ? '380–2100 Hz, soft paired wheel articulation' : '100–1400 Hz, soft paired rail-joint body articulation'}; slow movement; no compressor`,
  } };
}

function bandpass(input, highpass, lowpass, rate) {
  const result = new Float32Array(input.length);
  const lowAlpha = 1 - Math.exp(-2 * Math.PI * lowpass / rate);
  const highAlpha = 1 - Math.exp(-2 * Math.PI * highpass / rate);
  let low = 0;
  let high = 0;
  for (let i = 0; i < input.length; i += 1) {
    low += lowAlpha * (input[i] - low);
    high += highAlpha * (low - high);
    result[i] = low - high;
  }
  return result;
}

function wav16(samples, rate) {
  const bytes = Buffer.alloc(44 + samples.length * 2);
  bytes.write('RIFF', 0); bytes.writeUInt32LE(bytes.length - 8, 4); bytes.write('WAVEfmt ', 8);
  bytes.writeUInt32LE(16, 16); bytes.writeUInt16LE(1, 20); bytes.writeUInt16LE(1, 22);
  bytes.writeUInt32LE(rate, 24); bytes.writeUInt32LE(rate * 2, 28); bytes.writeUInt16LE(2, 32); bytes.writeUInt16LE(16, 34);
  bytes.write('data', 36); bytes.writeUInt32LE(samples.length * 2, 40);
  for (let i = 0; i < samples.length; i += 1) bytes.writeInt16LE(Math.round(samples[i] * 32767), 44 + i * 2);
  return bytes;
}

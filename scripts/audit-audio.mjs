// Reproducible engineering audit; no device playback and no perceptual claims.
// Run: node scripts/audit-audio.mjs. Report: outputs/audio-mix-audit.json.
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { AUDIO_PRESET_LEVELS } from '../shared/audio.js';
import { createProceduralBuffer, prepareLoop, SAMPLE_CEILING } from '../src/services/audio/AudioLayer.js';
import { MAX_MASTER_GAIN } from '../src/services/audio/AudioEngine.js';
import { createKitchenEffect, KITCHEN_EFFECT_SECONDS } from '../src/services/audio/kitchenEffects.js';
import { readPcm16Wav, measurePcm } from './audio-metrics.mjs';

const rate = 32000;
const context = {
  sampleRate: rate,
  createBuffer(channels, length, sampleRate = rate) {
    const samples = Array.from({ length: channels }, () => new Float32Array(length));
    return { length, sampleRate, numberOfChannels: channels, getChannelData: (channel) => samples[channel] };
  },
};
const buffers = {};
for (const id of ['rain-soft', 'rain-heavy', 'rain-window', 'wind']) {
  let seed = 717;
  buffers[id] = createProceduralBuffer(context, id,
    () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296));
}
for (const id of ['leaves', 'birds', 'stream', 'crickets', 'fire', 'train-track', 'train-wheels', 'carriage']) {
  const audio = readPcm16Wav(await readFile(new URL(`../public/assets/audio/${id}.wav`, import.meta.url)));
  buffers[id] = prepareLoop(context, {
    sampleRate: audio.rate, length: audio.length, numberOfChannels: audio.channels,
    getChannelData: (channel) => audio.samples[channel],
  });
}
const measureBuffer = (buffer) => measurePcm({ rate: buffer.sampleRate, length: buffer.length,
  channels: buffer.numberOfChannels, samples: Array.from({ length: buffer.numberOfChannels }, (_, ch) => buffer.getChannelData(ch)) });
const layers = Object.fromEntries(Object.entries(buffers).map(([id, buffer]) => [id, measureBuffer(buffer)]));
const effects = Object.fromEntries(Object.keys(KITCHEN_EFFECT_SECONDS).map((id) => [id, measureBuffer(createKitchenEffect(context, id))]));
const mixes = {};
const combinations = {
  Room: AUDIO_PRESET_LEVELS['rainy-evening'],
  Garden: AUDIO_PRESET_LEVELS['morning-garden'],
  'Journey com chuva': { ...AUDIO_PRESET_LEVELS['peaceful-journey'], 'rain-window': 0.35 },
};
for (const [name, levels] of Object.entries(combinations)) {
  const mixed = context.createBuffer(2, rate * 120);
  for (const [id, gain] of Object.entries(levels)) {
    const buffer = buffers[id];
    for (let channel = 0; channel < 2; channel += 1) {
      const input = buffer.getChannelData(Math.min(channel, buffer.numberOfChannels - 1));
      const output = mixed.getChannelData(channel);
      for (let i = 0; i < output.length; i += 1) output[i] += input[i % input.length] * gain;
    }
  }
  const metrics = measureBuffer(mixed);
  mixes[name] = {
    layers: levels,
    master: Object.fromEntries([0.25, 0.5, 1].map((volume) => {
      const gain = volume * MAX_MASTER_GAIN;
      return [volume, { peak: metrics.peak * gain, rms: metrics.rms * gain,
        peakDbfs: metrics.peakDbfs + 20 * Math.log10(gain), rmsDbfs: metrics.rmsDbfs + 20 * Math.log10(gain) }];
    })),
  };
}
const effectPeakSum = Object.values(effects).reduce((sum, effect) => sum + effect.peak, 0);
const report = {
  method: '120-second static offline sum at 32kHz; source starts aligned; original engine loop preparation; actual preset levels; pre-fade steady state; deterministic procedural seed 717; RMS is not LUFS or perceived loudness',
  layers, effects, mixes,
  conservativeBoundAtFullVolume: {
    note: '13 continuous layers including music, each at engine peak ceiling, plus all four measured finite FX; all sliders at 1. No dynamics processor assumed.',
    sourceCount: 13, sampleCeiling: SAMPLE_CEILING, maxMaster: MAX_MASTER_GAIN,
    absolutePeak: (13 * SAMPLE_CEILING + effectPeakSum) * MAX_MASTER_GAIN,
    absolutePeakUsingEffectCeilings: (13 * SAMPLE_CEILING + 4 * 0.16) * MAX_MASTER_GAIN,
    effectPeakSum,
  },
  listening: 'PENDING: no human/device listening was performed by this script.',
};
await mkdir(new URL('../outputs/', import.meta.url), { recursive: true });
await writeFile(new URL('../outputs/audio-mix-audit.json', import.meta.url), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ mixes, conservativeBoundAtFullVolume: report.conservativeBoundAtFullVolume }, null, 2));

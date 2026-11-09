// Small PCM diagnostics shared by the offline renderer and asset regression
// tests. RMS/crest are engineering measurements, not perceptual loudness.
export function readPcm16Wav(bytes) {
  if (bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WAVE') throw new Error('Expected WAV.');
  let offset = 12;
  let channels;
  let rate;
  let data;
  while (offset + 8 <= bytes.length) {
    const id = bytes.toString('ascii', offset, offset + 4);
    const size = bytes.readUInt32LE(offset + 4);
    if (id === 'fmt ') {
      if (bytes.readUInt16LE(offset + 8) !== 1 || bytes.readUInt16LE(offset + 22) !== 16) throw new Error('Expected PCM16.');
      channels = bytes.readUInt16LE(offset + 10);
      rate = bytes.readUInt32LE(offset + 12);
    }
    if (id === 'data') data = bytes.subarray(offset + 8, offset + 8 + size);
    offset += 8 + size + size % 2;
  }
  if (!data || !channels || !rate) throw new Error('Missing WAV chunks.');
  const length = data.length / 2 / channels;
  const samples = Array.from({ length: channels }, () => new Float32Array(length));
  for (let i = 0; i < length; i += 1) for (let ch = 0; ch < channels; ch += 1) samples[ch][i] = data.readInt16LE((i * channels + ch) * 2) / 32768;
  return { rate, samples, length, channels };
}

export function measurePcm({ rate, samples, length, channels }) {
  let peak = 0;
  let sum = 0;
  let mean = 0;
  let maxStep = 0;
  let seam = 0;
  let quiet = 0;
  const window = Math.floor(rate * 0.1);
  let windows = 0;
  for (const channel of samples) {
    seam = Math.max(seam, Math.abs(channel[0] - channel[length - 1]));
    for (let i = 0; i < length; i += 1) {
      const sample = channel[i];
      peak = Math.max(peak, Math.abs(sample));
      sum += sample * sample;
      mean += sample;
      if (i) maxStep = Math.max(maxStep, Math.abs(sample - channel[i - 1]));
    }
    for (let start = 0; start + window <= length; start += window) {
      let energy = 0;
      for (let i = start; i < start + window; i += 1) energy += channel[i] ** 2;
      if (Math.sqrt(energy / window) < 0.003) quiet += 1;
      windows += 1;
    }
  }
  const rms = Math.sqrt(sum / (length * channels));
  return { duration: length / rate, channels, peak, rms, peakDbfs: 20 * Math.log10(peak), rmsDbfs: 20 * Math.log10(rms), crestDb: 20 * Math.log10(peak / rms), mean: mean / (length * channels), quietFraction: quiet / windows, seam, maxStep };
}

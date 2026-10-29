// At full individual and master volume, twelve simultaneous sources still sum
// below 0.72 peak. This is a conservative absolute ceiling, not loudness matching.
export const SAMPLE_CEILING = 0.24;

/** Overlap the tail into the head instead of tapering every loop to silence. */
export function prepareLoop(context, original) {
  const overlap = Math.min(Math.floor(original.sampleRate * 0.75), Math.floor(original.length / 4));
  const length = original.length - overlap;
  const result = context.createBuffer(Math.min(original.numberOfChannels, 2), length, original.sampleRate);
  let peak = 0;
  for (let channel = 0; channel < result.numberOfChannels; channel += 1) {
    const input = original.getChannelData(channel);
    const output = result.getChannelData(channel);
    for (let i = 0; i < length; i += 1) {
      if (i < overlap) {
        const blend = (1 - Math.cos(Math.PI * i / overlap)) / 2;
        output[i] = input[length + i] * (1 - blend) + input[i] * blend;
      } else output[i] = input[i];
      peak = Math.max(peak, Math.abs(output[i]));
    }
  }
  const scale = peak > SAMPLE_CEILING ? SAMPLE_CEILING / peak : 1;
  if (scale < 1) {
    for (let channel = 0; channel < result.numberOfChannels; channel += 1) {
      const output = result.getChannelData(channel);
      for (let i = 0; i < output.length; i += 1) output[i] *= scale;
    }
  }
  return result;
}

export function createProceduralBuffer(context, id, random = Math.random) {
  const { sampleRate } = context;
  const length = Math.floor(sampleRate * 16);
  const buffer = context.createBuffer(2, length, sampleRate);
  const rain = id.startsWith('rain-');
  for (let channel = 0; channel < 2; channel += 1) {
    const output = buffer.getChannelData(channel);
    let low = 0;
    let texture = 0;
    for (let i = 0; i < length; i += 1) {
      const seconds = i / sampleRate;
      const noise = random() * 2 - 1;
      const smoothing = id === 'wind' ? 0.997 : id === 'rain-heavy' ? 0.62 : id === 'leaves' ? 0.5 : 0.84;
      low = smoothing * low + (1 - smoothing) * noise;
      texture = texture * 0.94 + noise * 0.06;
      const swell = 0.68 + 0.16 * Math.sin(seconds * 0.71 + channel) + 0.1 * Math.sin(seconds * 0.29);
      output[i] = rain ? low * (id === 'rain-heavy' ? 0.55 : 0.38)
        : id === 'wind' ? low * swell * 3.2
          : (low - texture) * swell * 0.13;
    }
    if (id === 'rain-window') {
      // Sparse, softened resonances distinguish nearby glass droplets from the
      // broad, dense texture of heavy rain and distant gentle rain.
      for (let drop = 0; drop < 45; drop += 1) {
        const start = Math.floor(random() * (length - sampleRate * 0.15));
        const frequency = 550 + random() * 1250;
        const duration = Math.floor(sampleRate * 0.12);
        for (let i = 0; i < duration; i += 1) {
          const time = i / sampleRate;
          const envelope = Math.sin(Math.PI * i / duration) ** 2 * Math.exp(-time * 35);
          output[start + i] += Math.sin(2 * Math.PI * frequency * time) * envelope * 0.07;
        }
      }
    }
  }
  return prepareLoop(context, buffer);
}

export function fadeGain(context, parameter, target, seconds = 0.4) {
  const now = context.currentTime;
  if (typeof parameter.cancelAndHoldAtTime === 'function') parameter.cancelAndHoldAtTime(now);
  else {
    parameter.cancelScheduledValues(now);
    parameter.setValueAtTime(parameter.value, now);
  }
  // A finite ramp reaches actual zero, unlike an asymptotic exponential target.
  parameter.linearRampToValueAtTime(target, now + seconds);
}

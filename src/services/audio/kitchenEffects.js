// Original, finite kitchen sounds. They are synthesized locally and use the
// existing AudioEngine master; this module never creates an AudioContext.
export const KITCHEN_EFFECT_SECONDS = Object.freeze({
  completion: 1.6, kettle: 1.8, utensil: 0.45, simmer: 2.4,
});

export function createKitchenEffect(context, kind) {
  if (!Object.hasOwn(KITCHEN_EFFECT_SECONDS, kind)) throw new TypeError('Unknown kitchen effect.');
  const seconds = KITCHEN_EFFECT_SECONDS[kind];
  const rate = context.sampleRate;
  const buffer = context.createBuffer(1, Math.ceil(rate * seconds), rate);
  const samples = buffer.getChannelData(0);
  const tone = (hz, time) => Math.sin(2 * Math.PI * Math.min(hz, rate * 0.4) * time);
  let seed = 27183;
  let softNoise = 0;
  for (let index = 0; index < samples.length; index += 1) {
    const time = index / rate;
    const progress = index / (samples.length - 1);
    const edge = Math.min(1, time / 0.025, (seconds - time) / 0.12);
    seed = (seed * 16807) % 2147483647;
    softNoise = softNoise * 0.88 + (seed / 2147483647 * 2 - 1) * 0.12;
    let sound;
    if (kind === 'completion') {
      // A short, soft bell with no repeated strikes.
      sound = (tone(523.25, time) * 0.7 + tone(784.88, time) * 0.22
        + tone(1048.1, time) * 0.08) * Math.exp(-3.4 * time);
    } else if (kind === 'kettle') {
      sound = (tone(1120 + Math.sin(time * 3) * 24, time) * 0.2 + softNoise * 0.8)
        * Math.sin(Math.PI * progress);
    } else if (kind === 'utensil') {
      sound = (tone(720, time) * 0.6 + tone(1190, time) * 0.4) * Math.exp(-16 * time);
    } else {
      sound = (softNoise * 0.8 + tone(95, time) * 0.08)
        * (0.65 + Math.sin(time * 17) * 0.15) * Math.sin(Math.PI * progress);
    }
    samples[index] = Math.max(-0.16, Math.min(0.16, sound * Math.max(0, edge) * 0.16));
  }
  samples[0] = 0;
  samples[samples.length - 1] = 0;
  return buffer;
}

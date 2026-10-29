export const AUDIO_LAYERS = Object.freeze([
  { id: 'rain-soft', name: 'Chuva suave', category: 'Weather', icon: 'rain', source: 'procedural', available: true },
  { id: 'rain-heavy', name: 'Chuva intensa', category: 'Weather', icon: 'rain', source: 'procedural', available: true },
  { id: 'rain-window', name: 'Chuva na janela', category: 'Weather', icon: 'windowRain', source: 'procedural', available: true },
  { id: 'wind', name: 'Vento suave', category: 'Nature', icon: 'wind', source: 'procedural', available: true },
  { id: 'leaves', name: 'Folhas ao vento', category: 'Nature', icon: 'leaves', source: 'recording', available: true },
  { id: 'birds', name: 'Pássaros', category: 'Nature', icon: 'bird', source: 'recording', available: true },
  { id: 'stream', name: 'Riacho', category: 'Nature', icon: 'stream', source: 'recording', available: true },
  { id: 'crickets', name: 'Grilos noturnos', category: 'Nature', icon: 'cricket', source: 'recording', available: true },
  { id: 'fire', name: 'Lareira', category: 'Cozy', icon: 'fire', source: 'recording', available: true },
  { id: 'train-track', name: 'Trem sobre trilhos', category: 'Journey', icon: 'rails', source: 'recording', available: true },
  { id: 'train-wheels', name: 'Rodas do trem', category: 'Journey', icon: 'wheels', source: 'recording', available: true },
  { id: 'carriage', name: 'Interior do vagão', category: 'Journey', icon: 'carriage', source: 'recording', available: true },
].map((layer) => Object.freeze(layer)));

// Imports are deliberately explicit: Vite emits one lazily loaded local chunk
// for each recording, and never preloads the whole sound library on launch.
const recordingLoaders = {
  leaves: () => import('virtual:haven-audio/leaves.wav'),
  birds: () => import('virtual:haven-audio/birds.wav'),
  stream: () => import('virtual:haven-audio/stream.wav'),
  crickets: () => import('virtual:haven-audio/crickets.wav'),
  fire: () => import('virtual:haven-audio/fire.wav'),
  'train-track': () => import('virtual:haven-audio/train-track.wav'),
  'train-wheels': () => import('virtual:haven-audio/train-wheels.wav'),
  carriage: () => import('virtual:haven-audio/carriage.wav'),
};

export async function loadRecording(context, id) {
  const load = recordingLoaders[id];
  if (!load) throw new Error('Esta gravação ainda não está disponível.');
  const { default: encoded } = await load();
  const decoded = globalThis.atob(encoded);
  const bytes = new Uint8Array(decoded.length);
  for (let i = 0; i < decoded.length; i += 1) bytes[i] = decoded.charCodeAt(i);
  return context.decodeAudioData(bytes.buffer);
}


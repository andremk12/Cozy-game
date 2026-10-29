import { AUDIO_PRESET_LEVELS, createPresetMix } from '../../../shared/audio.js';
import { AUDIO_LAYERS } from './audioLibrary.js';

const names = {
  'rainy-evening': 'Rainy Evening', 'morning-garden': 'Morning Garden',
  'quiet-night': 'Quiet Night', 'peaceful-journey': 'Peaceful Journey', custom: 'Custom',
};
export const AUDIO_PRESETS = Object.freeze(Object.entries(names).map(([id, name]) => Object.freeze({
  id, name, layers: AUDIO_PRESET_LEVELS[id] ?? {},
  available: id === 'custom' || Object.keys(AUDIO_PRESET_LEVELS[id]).every((layerId) => (
    AUDIO_LAYERS.some((layer) => layer.id === layerId && layer.available)
  )),
})));
export { createPresetMix };

// Stable import location for the former ambient service. All scenes now share
// the same layered engine; there is no second context or legacy sound graph.
export { AudioEngine, AudioEngine as AmbientAudio } from './audio/AudioEngine.js';

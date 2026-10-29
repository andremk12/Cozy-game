// Only explicit companion preferences cross the local persistence boundary.
export const COMPANION_APPEARANCES = Object.freeze([
  Object.freeze({ id: 'default', label: 'Creme e cinza' }),
  Object.freeze({ id: 'ginger', label: 'Laranja' }),
  Object.freeze({ id: 'midnight', label: 'Noite' }),
]);
export const DEFAULT_COMPANION = Object.freeze({
  enabled: true, name: '', appearance: 'default', soundEnabled: false, introduced: false,
});

const KEYS = Object.keys(DEFAULT_COMPANION);
const APPEARANCES = new Set(COMPANION_APPEARANCES.map(({ id }) => id));
const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)
  && [Object.prototype, null].includes(Object.getPrototypeOf(value));
const segmenter = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null;
const countCharacters = (value) => segmenter ? [...segmenter.segment(value)].length : Array.from(value).length;
const forbiddenCharacters = /[\p{Cc}\p{Cs}\p{Zl}\p{Zp}\p{Bidi_Control}\ufeff]/u;
const visibleCharacter = /[^\p{White_Space}\p{Default_Ignorable_Code_Point}]/u;

/** Validate rather than truncate: combining accents and emoji count as perceived characters. */
export function validateCompanionName(input) {
  if (typeof input !== 'string') return { valid: false, name: '', error: 'Digite um nome para seu gatinho.', count: 0 };
  const name = input.trim();
  // Bound pathological sequences of thousands of combining marks without
  // limiting ordinary Unicode names or splitting a grapheme cluster.
  if (input.length > 2048) return { valid: false, name, error: 'Esse nome é muito longo. Use até 24 caracteres.', count: 25 };
  const count = countCharacters(name);
  if (forbiddenCharacters.test(input)) {
    return { valid: false, name, error: 'Use um nome em uma única linha, sem caracteres de controle.', count };
  }
  if (!name || !visibleCharacter.test(name)) {
    return { valid: false, name, error: 'Digite um nome, ou escolha depois.', count };
  }
  if (count > 24) return { valid: false, name, error: 'Escolha um nome com até 24 caracteres.', count };
  return { valid: true, name, error: '', count };
}

/** Recovery keeps known fields and never salvages a partial/truncated name. */
export function normalizeCompanion(input) {
  const source = isRecord(input) ? input : {};
  const result = validateCompanionName(source.name);
  return {
    enabled: typeof source.enabled === 'boolean' ? source.enabled : DEFAULT_COMPANION.enabled,
    name: result.valid ? result.name : '',
    appearance: APPEARANCES.has(source.appearance) ? source.appearance : DEFAULT_COMPANION.appearance,
    soundEnabled: false,
    introduced: typeof source.introduced === 'boolean' ? source.introduced : Boolean(result.valid),
  };
}

/** IPC writes reject extras, untrimmed/invalid names and unavailable sounds. */
export function validateCompanion(input) {
  const named = typeof input?.name === 'string' && input.name !== '' ? validateCompanionName(input.name) : null;
  if (!isRecord(input) || Object.keys(input).length !== KEYS.length || !KEYS.every((key) => Object.hasOwn(input, key))
    || typeof input.enabled !== 'boolean' || typeof input.introduced !== 'boolean'
    || !APPEARANCES.has(input.appearance) || input.soundEnabled !== false
    || typeof input.name !== 'string' || (input.name !== '' && (!named?.valid || named.name !== input.name))) {
    throw new TypeError('Invalid companion settings.');
  }
  return Object.fromEntries(KEYS.map((key) => [key, input[key]]));
}

export function displayCompanionName(settings) {
  const result = validateCompanionName(settings?.name);
  return result.valid ? result.name : 'Seu gatinho';
}

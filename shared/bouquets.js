import { BOUQUET_SPECIES } from './garden.js';

export const MAX_STEMS = 12;
export const MAX_MESSAGE_LENGTH = 1000;
export const MAX_SUBJECT_LENGTH = 120;
// Electron's Windows shell integration accepts URLs of up to 2081 characters.
export const MAX_MAILTO_LENGTH = 2081;
export const MAX_BOUQUET_BYTES = 16_384;
export const MAX_BOUQUET_IMAGE_BYTES = 12 * 1024 * 1024;
export const DEFAULT_SUBJECT = 'Um pequeno buquê para você 💐';
export const PAPERS = Object.freeze([
  { id: 'kraft', label: 'Papel kraft', color: '#c39b70' },
  { id: 'rose', label: 'Rosa-claro', color: '#e7b8bd' },
  { id: 'cream', label: 'Creme', color: '#eee0ba' },
  { id: 'sage', label: 'Verde-sálvia', color: '#a9b89b' },
  { id: 'lilac', label: 'Lilás', color: '#c7b4d8' },
]);
export const RIBBONS = Object.freeze([
  { id: 'white', label: 'Branco', color: '#f4ecd9' },
  { id: 'pink', label: 'Rosa', color: '#d98a9c' },
  { id: 'blue', label: 'Azul-claro', color: '#94bbcb' },
  { id: 'red', label: 'Vermelho', color: '#b85261' },
  { id: 'gold', label: 'Dourado', color: '#c4a35e' },
]);
export const LETTER_PAPERS = Object.freeze([
  { id: 'cream', label: 'Papel creme', color: '#fff3d9' },
  { id: 'rose', label: 'Papel rosado', color: '#fae4e4' },
  { id: 'sage', label: 'Papel sálvia', color: '#e8eddd' },
]);
const species = new Set(BOUQUET_SPECIES.map(({ id }) => id));
const hasOption = (choices, id) => choices.some((choice) => choice.id === id);
export const exactBouquetKeys = (value, keys) => value !== null && typeof value === 'object' && !Array.isArray(value)
  && [Object.prototype, null].includes(Object.getPrototypeOf(value))
  && Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));

export function normalizeSubject(value) {
  if (typeof value !== 'string' || value.length > 1024 || /[\p{Cc}\p{Cs}\p{Zl}\p{Zp}\p{Bidi_Control}]/u.test(value)) {
    throw new TypeError('O assunto deve ocupar uma única linha, sem caracteres de controle.');
  }
  const subject = value.trim() || DEFAULT_SUBJECT;
  if (Array.from(subject).length > MAX_SUBJECT_LENGTH) throw new TypeError('O assunto pode ter até 120 caracteres.');
  return subject;
}

export function validateMessage(value) {
  if (typeof value !== 'string' || value.length > MAX_MESSAGE_LENGTH * 2
    || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\p{Cs}]/u.test(value)) {
    throw new TypeError('A carta contém caracteres que não podem ser usados.');
  }
  const message = value.replace(/\r\n?/g, '\n');
  if (Array.from(message).length > MAX_MESSAGE_LENGTH) throw new TypeError('A carta pode ter até 1.000 caracteres.');
  return message;
}

export function validateRecipient(value) {
  if (typeof value !== 'string' || value.length > 254 || /[\p{Cc}\p{Cs}\p{Zl}\p{Zp}]/u.test(value)) {
    throw new TypeError('Use um único endereço de e-mail válido.');
  }
  const recipient = value.trim();
  if (!recipient) return '';
  const [local, domain, extra] = recipient.split('@');
  if (extra !== undefined || !local || local.length > 64 || local.startsWith('.') || local.endsWith('.') || local.includes('..')
    || !/^[a-zA-Z0-9.!#$'*+\-=^_`{|}~]+$/.test(local) || !domain || domain.length > 253
    || !domain.includes('.') || !domain.split('.').every((part) => /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/.test(part))) {
    throw new TypeError('Use um único endereço de e-mail válido.');
  }
  return recipient;
}

export function createBouquet() {
  return { version: 1, stems: [], paper: 'kraft', ribbon: 'white', foliage: true, tag: false,
    letterPaper: 'cream', message: '', subject: DEFAULT_SUBJECT };
}

export function validateBouquet(value) {
  if (!exactBouquetKeys(value, ['version', 'stems', 'paper', 'ribbon', 'foliage', 'tag', 'letterPaper', 'message', 'subject'])
    || value.version !== 1 || !Array.isArray(value.stems) || value.stems.length > MAX_STEMS
    || !Array.from(value.stems).every((id) => typeof id === 'string' && species.has(id))
    || !hasOption(PAPERS, value.paper) || !hasOption(RIBBONS, value.ribbon) || !hasOption(LETTER_PAPERS, value.letterPaper)
    || typeof value.foliage !== 'boolean' || typeof value.tag !== 'boolean') throw new TypeError('Este arranjo não é válido.');
  return { ...value, stems: [...value.stems], subject: normalizeSubject(value.subject), message: validateMessage(value.message) };
}

export function prepareBouquetDraft(value, options = { includeLetter: false }) {
  if (!exactBouquetKeys(options, ['includeLetter']) || typeof options.includeLetter !== 'boolean') {
    throw new TypeError('Escolha se deseja guardar a carta.');
  }
  const bouquet = validateBouquet(value);
  return options.includeLetter ? bouquet : { ...bouquet, subject: DEFAULT_SUBJECT, message: '' };
}

export function validateBouquetEmail(value) {
  if (!exactBouquetKeys(value, ['recipient', 'subject', 'message'])) throw new TypeError('Esta mensagem não é válida.');
  return { recipient: validateRecipient(value.recipient), subject: normalizeSubject(value.subject), message: validateMessage(value.message) };
}

export function buildBouquetMailto(value) {
  const { recipient, subject, message } = validateBouquetEmail(value);
  // Each component is encoded independently; text cannot become a mail header.
  return `mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message.replace(/\n/g, '\r\n'))}`;
}

export function validateBouquetImage(value) {
  const html = value?.kind === 'card-html';
  if (!exactBouquetKeys(value, html ? ['dataUrl', 'kind', 'message', 'letterPaper'] : ['dataUrl', 'kind']) || !['bouquet', 'card', 'card-html'].includes(value.kind)
    || typeof value.dataUrl !== 'string' || value.dataUrl.length > Math.ceil(MAX_BOUQUET_IMAGE_BYTES / 3) * 4 + 22
    || !/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(value.dataUrl)) throw new TypeError('A imagem do presente não é um PNG válido.');
  if (html && !hasOption(LETTER_PAPERS, value.letterPaper)) throw new TypeError('Este papel não é válido.');
  return { dataUrl: value.dataUrl, kind: value.kind, ...(html ? { message: validateMessage(value.message), letterPaper: value.letterPaper } : {}) };
}

export function buildBouquetCardHtml({ dataUrl, message, letterPaper }) {
  const image = validateBouquetImage({ kind: 'card-html', dataUrl, message, letterPaper });
  const color = LETTER_PAPERS.find(({ id }) => id === image.letterPaper).color;
  const escape = (text) => text.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
  // Static document only: no scripts, links, network resources, or personal metadata.
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>Flores para você · Little Haven</title><style>body{margin:0;padding:32px 16px;background:#293f32;color:#493d33;font:20px/1.7 Georgia,serif}main{box-sizing:border-box;max-width:800px;margin:auto;padding:32px;background:${color};border:8px solid #b89b76}img{display:block;width:min(100%,480px);height:auto;margin:auto;image-rendering:pixelated}h1{text-align:center;font-size:28px;font-weight:normal}p{white-space:pre-wrap;overflow-wrap:anywhere}footer{text-align:center;margin-top:32px;font:14px/1.6 system-ui,sans-serif;color:#665744}@media print{body{padding:0;background:white}main{border-width:2px}}</style></head><body><main><h1>Flores para você</h1><img src="${image.dataUrl}" alt="Um buquê preparado com carinho"><p>${escape(image.message)}</p><footer>Little Haven · A Cozy Place to Breathe</footer></main></body></html>`;
}

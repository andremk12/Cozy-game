import {
  buildBouquetMailto, buildBouquetCardHtml, MAX_BOUQUET_BYTES, MAX_MAILTO_LENGTH, prepareBouquetDraft, validateBouquet,
  validateBouquetEmail, validateBouquetImage,
} from '../../shared/bouquets.js';

export const BOUQUET_STORAGE_KEY = 'little-haven-bouquet-v1';

export async function loadBouquetDraft() {
  if (window.haven) return window.haven.getBouquetDraft();
  const value = localStorage.getItem(BOUQUET_STORAGE_KEY);
  if (value === null) return null;
  if (value.length > MAX_BOUQUET_BYTES) throw new Error('Não foi possível ler o rascunho.');
  return validateBouquet(JSON.parse(value));
}

export async function saveBouquetDraft(bouquet, options = { includeLetter: false }) {
  const draft = prepareBouquetDraft(bouquet, options);
  if (window.haven) return window.haven.saveBouquetDraft({ bouquet: draft, includeLetter: options.includeLetter });
  // Preserve unrecognized/invalid saved content until the user deletes it.
  await loadBouquetDraft();
  localStorage.setItem(BOUQUET_STORAGE_KEY, JSON.stringify(draft));
  return draft;
}

export async function deleteBouquetDraft() {
  if (window.haven) return window.haven.deleteBouquetDraft();
  localStorage.removeItem(BOUQUET_STORAGE_KEY);
}

export async function saveBouquetImage(value) {
  const image = validateBouquetImage(value);
  if (window.haven) return window.haven.saveBouquetImage(image);
  const link = document.createElement('a');
  const htmlUrl = image.kind === 'card-html' ? URL.createObjectURL(new Blob([buildBouquetCardHtml(image)], { type: 'text/html;charset=utf-8' })) : null;
  link.href = htmlUrl || image.dataUrl;
  link.download = image.kind === 'card-html' ? 'Little-Haven-cartao.html' : image.kind === 'card' ? 'Little-Haven-cartao.png' : 'Little-Haven-buque.png';
  document.body.append(link);
  link.click();
  link.remove();
  if (htmlUrl) setTimeout(() => URL.revokeObjectURL(htmlUrl), 1000);
  return { canceled: false };
}

export async function openBouquetEmail(value) {
  const message = validateBouquetEmail(value);
  const destination = buildBouquetMailto(message);
  if (destination.length > MAX_MAILTO_LENGTH) throw new TypeError('Esta carta é longa para abrir no e-mail. Salve o cartão completo e use a opção de abrir o e-mail sem a carta no corpo.');
  if (window.haven) return window.haven.openBouquetEmail(message);
  window.location.href = destination;
  // This requests the configured handler; it cannot confirm opening or delivery.
  return true;
}

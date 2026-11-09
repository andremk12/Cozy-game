import { LETTER_PAPERS, validateBouquet } from '../../../shared/bouquets.js';

// Native canvas text stays crisp; only the floral illustration uses pixel scaling.
export function wrapCardText(context, text, width) {
  const lines = [];
  for (const paragraph of text.split('\n')) {
    if (!paragraph) { lines.push(''); continue; }
    let line = '';
    for (const word of paragraph.split(/(\s+)/u)) {
      if (context.measureText(line + word).width <= width) { line += word; continue; }
      if (line.trim()) lines.push(line.trimEnd());
      line = '';
      for (const character of Array.from(word.trimStart())) {
        if (line && context.measureText(line + character).width > width) { lines.push(line); line = ''; }
        line += character;
      }
    }
    lines.push(line.trimEnd());
  }
  return lines;
}

async function loadLocalIllustration(svg) {
  if (!svg) throw new Error('A pré-visualização ainda está sendo preparada.');
  const clone = svg.cloneNode(true);
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', '1200');
  clone.setAttribute('height', '1000');
  clone.removeAttribute('class');
  // data: images are already permitted by the desktop CSP. This SVG contains
  // only our artwork; letter text is drawn separately on the canvas.
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(clone))}`;
  const picture = new Image();
  await new Promise((resolve, reject) => {
    picture.onload = resolve;
    picture.onerror = () => reject(new Error('Não foi possível preparar a imagem do buquê.'));
    picture.src = url;
  });
  return picture;
}

export async function createBouquetPng(svg, bouquet, kind = 'card') {
  const safe = validateBouquet(bouquet);
  if (!safe.stems.length) throw new Error('Escolha ao menos uma flor para preparar o presente.');
  if (!['card', 'bouquet'].includes(kind)) throw new TypeError('Formato de presente inválido.');
  await document.fonts?.ready;
  const illustration = await loadLocalIllustration(svg);
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Não foi possível preparar a imagem neste dispositivo.');
  context.font = '32px "DM Sans", "Segoe UI", sans-serif';
  const lines = wrapCardText(context, safe.message, 1000);
  const height = kind === 'bouquet' ? 1000 : Math.max(1310, 1080 + lines.length * 48 + 130);
  if (height > 8192) throw new Error('Esta carta tem muitas linhas para um único PNG legível. Use Salvar cartão HTML para preservar toda a mensagem.');
  canvas.height = height;
  if (kind === 'card') {
    context.fillStyle = LETTER_PAPERS.find(({ id }) => id === safe.letterPaper)?.color || '#f1e5cb';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = '#bfa984';
    context.lineWidth = 2;
    context.strokeRect(34, 34, canvas.width - 68, canvas.height - 68);
    context.font = '30px "Fraunces", Georgia, serif';
    context.textAlign = 'center';
    context.fillStyle = '#6b684e';
    context.fillText('Flores para você', 600, 101);
  }
  context.imageSmoothingEnabled = false;
  context.drawImage(illustration, 0, kind === 'card' ? 90 : 0, 1200, 1000);
  if (kind === 'card') {
    context.imageSmoothingEnabled = true;
    context.fillStyle = '#483e36';
    context.font = '32px "DM Sans", "Segoe UI", sans-serif';
    context.textAlign = 'left';
    context.textBaseline = 'top';
    for (let index = 0; index < lines.length; index++) context.fillText(lines[index], 100, 1080 + index * 48);
    context.fillStyle = '#756e57';
    context.font = '21px "DM Sans", sans-serif';
    context.textAlign = 'center';
    context.fillText('Little Haven · Little Bouquets', 600, canvas.height - 76);
  }
  return canvas.toDataURL('image/png');
}

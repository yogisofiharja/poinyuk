type ShareCardInput = {
  backgroundDataUrl?: string;
  title: string;
  matchup: string;
  gameScore: string;
};

export async function pickImageDataUrlWeb(source: 'gallery' | 'camera' = 'gallery'): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    if (source === 'camera') {
      input.setAttribute('capture', 'environment');
    }

    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        resolve(typeof reader.result === 'string' ? reader.result : null);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    };

    input.click();
  });
}

export async function composeShareCardDataUrlWeb(input: ShareCardInput): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1920;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas context not available');
  }

  if (input.backgroundDataUrl) {
    const image = await loadImage(input.backgroundDataUrl);
    drawCoverImage(ctx, image, canvas.width, canvas.height);
  } else {
    drawDefaultBackground(ctx, canvas.width, canvas.height);
  }

  const overlay = ctx.createLinearGradient(0, 0, 0, canvas.height);
  overlay.addColorStop(0, 'rgba(0, 0, 0, 0.2)');
  overlay.addColorStop(0.5, 'rgba(0, 0, 0, 0.45)');
  overlay.addColorStop(1, 'rgba(0, 0, 0, 0.82)');
  ctx.fillStyle = overlay;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const textBaseY = 1300;

  // Extra local fade behind text for consistent readability over bright photos.
  const textGlow = ctx.createLinearGradient(0, textBaseY - 220, 0, canvas.height);
  textGlow.addColorStop(0, 'rgba(0, 0, 0, 0)');
  textGlow.addColorStop(0.4, 'rgba(0, 0, 0, 0.28)');
  textGlow.addColorStop(1, 'rgba(0, 0, 0, 0.78)');
  ctx.fillStyle = textGlow;
  ctx.fillRect(0, textBaseY - 240, canvas.width, canvas.height - (textBaseY - 240));

  const bottomShadow = ctx.createLinearGradient(0, canvas.height - 700, 0, canvas.height);
  bottomShadow.addColorStop(0, 'rgba(0, 0, 0, 0)');
  bottomShadow.addColorStop(1, 'rgba(0, 0, 0, 0.85)');
  ctx.fillStyle = bottomShadow;
  ctx.fillRect(0, canvas.height - 700, canvas.width, 700);

  ctx.textAlign = 'center';

  if (input.title) {
    ctx.fillStyle = '#f8fafc';
    ctx.font = "700 52px 'Trebuchet MS', 'Arial Black', sans-serif";
    ctx.fillText(input.title, canvas.width / 2, textBaseY - 130);
  }

  ctx.fillStyle = '#e2e8f0';
  ctx.font = "800 46px 'Trebuchet MS', 'Arial Black', sans-serif";
  ctx.fillText(input.matchup, canvas.width / 2, input.title ? textBaseY - 25 : textBaseY - 85);

  const scoreY = input.title ? textBaseY + 180 : textBaseY + 120;
  const brandY = scoreY + 78;

  ctx.fillStyle = '#ffffff';
  ctx.font = "900 170px 'Arial Black', Impact, sans-serif";
  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
  ctx.shadowBlur = 20;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 8;
  ctx.fillText(input.gameScore, canvas.width / 2, scoreY);
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  ctx.fillStyle = '#cbd5e1';
  ctx.font = "500 34px 'Trebuchet MS', Arial, sans-serif";
  ctx.fillText('PoinYuk', canvas.width / 2, brandY);
  ctx.textAlign = 'start';

  return canvas.toDataURL('image/png');
}

export async function shareImageWeb(dataUrl: string, text: string): Promise<boolean> {
  const nav = navigator as Navigator & {
    canShare?: (data: { files?: File[] }) => boolean;
  };

  if (!nav.share) {
    return false;
  }

  try {
    const blob = await dataUrlToBlob(dataUrl);
    const file = new File([blob], 'poinyuk-score.png', { type: 'image/png' });

    if (nav.canShare && nav.canShare({ files: [file] })) {
      await nav.share({
        title: 'PoinYuk',
        text,
        files: [file],
      });
      return true;
    }

    await nav.share({
      title: 'PoinYuk',
      text,
    });
    return true;
  } catch {
    return false;
  }
}

export function downloadDataUrlWeb(dataUrl: string, filename: string) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  a.click();
}

function drawDefaultBackground(ctx: CanvasRenderingContext2D, w: number, h: number) {
  // Base gradient
  const base = ctx.createLinearGradient(0, 0, w, h);
  base.addColorStop(0, '#0f172a');
  base.addColorStop(0.5, '#1e1b4b');
  base.addColorStop(1, '#0c0a1e');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);

  // Subtle badminton court lines
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.lineWidth = 4;
  const courtX = 100;
  const courtY = 180;
  const courtW = w - 200;
  const courtH = h - 360;
  ctx.strokeRect(courtX, courtY, courtW, courtH);
  // net
  ctx.beginPath();
  ctx.moveTo(courtX, courtY + courtH / 2);
  ctx.lineTo(courtX + courtW, courtY + courtH / 2);
  ctx.stroke();
  // service lines top half
  ctx.beginPath();
  ctx.moveTo(courtX, courtY + courtH / 2 - courtH * 0.22);
  ctx.lineTo(courtX + courtW, courtY + courtH / 2 - courtH * 0.22);
  ctx.stroke();
  // service lines bottom half
  ctx.beginPath();
  ctx.moveTo(courtX, courtY + courtH / 2 + courtH * 0.22);
  ctx.lineTo(courtX + courtW, courtY + courtH / 2 + courtH * 0.22);
  ctx.stroke();
  // center line
  ctx.beginPath();
  ctx.moveTo(w / 2, courtY);
  ctx.lineTo(w / 2, courtY + courtH);
  ctx.stroke();
  ctx.restore();

  // Orange glow at top
  const glowTop = ctx.createRadialGradient(w / 2, 200, 0, w / 2, 200, 600);
  glowTop.addColorStop(0, 'rgba(249, 115, 22, 0.28)');
  glowTop.addColorStop(1, 'rgba(249, 115, 22, 0)');
  ctx.fillStyle = glowTop;
  ctx.fillRect(0, 0, w, h);

  // Blue glow at bottom
  const glowBottom = ctx.createRadialGradient(w / 2, h - 300, 0, w / 2, h - 300, 700);
  glowBottom.addColorStop(0, 'rgba(37, 99, 235, 0.22)');
  glowBottom.addColorStop(1, 'rgba(37, 99, 235, 0)');
  ctx.fillStyle = glowBottom;
  ctx.fillRect(0, 0, w, h);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Unable to load image'));
    image.src = src;
  });
}

function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  canvasWidth: number,
  canvasHeight: number,
) {
  const scale = Math.max(canvasWidth / image.width, canvasHeight / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  const x = (canvasWidth - drawWidth) / 2;
  const y = (canvasHeight - drawHeight) / 2;

  ctx.drawImage(image, x, y, drawWidth, drawHeight);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl);
  return response.blob();
}
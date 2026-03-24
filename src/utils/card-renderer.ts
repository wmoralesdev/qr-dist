import type { ExportLayoutMetrics } from "./card-layout";
import { svgToPngDataUrl } from "./svg-to-png";

/**
 * Supersampling factor for PNG export. The noticeable “soft” export vs browser was mostly the
 * **background card image** (and any typography baked into it) being resampled by html2canvas;
 * the on-screen QR is vector SVG and did not drive that perception.
 */
export const CARD_HTML_CAPTURE_SCALE = 2;

export interface CardCompositeRenderOptions {
  backgroundImage: string;
  qrCodeDataUrl: string;
  metrics: ExportLayoutMetrics;
  backgroundColor?: string;
  scale?: number;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // data: / blob: must not use crossOrigin — browsers often fail the load (breaks SVG QR export).
    if (
      src.startsWith("http://") ||
      src.startsWith("https://") ||
      src.startsWith("/")
    ) {
      img.crossOrigin = "anonymous";
    }
    img.onload = () => resolve(img);
    img.onerror = () =>
      reject(new Error(`Failed to load image: ${src.slice(0, 80)}`));
    img.src = src;
  });
}

/**
 * `generateQRCodeDataUrl` returns a utf-8 SVG data URL; many browsers won't use that as `<img>.src`
 * for canvas compositing — rasterize for the pipeline, not because the QR “lost quality”.
 */
function isSvgQrSource(qrCodeDataUrl: string): boolean {
  const s = qrCodeDataUrl.trimStart();
  return (
    s.startsWith("data:image/svg+xml") ||
    s.startsWith("<svg") ||
    s.startsWith("<?xml")
  );
}

async function loadQrImageForComposite(
  qrCodeDataUrl: string,
  qrSizeCssPx: number,
  scale: number
): Promise<HTMLImageElement> {
  const pixelSize = Math.max(1, Math.round(qrSizeCssPx * scale));
  if (isSvgQrSource(qrCodeDataUrl)) {
    const pngDataUrl = await svgToPngDataUrl(qrCodeDataUrl, {
      width: pixelSize,
      height: pixelSize,
    });
    return loadImage(pngDataUrl);
  }
  return loadImage(qrCodeDataUrl);
}

/**
 * Single-card export: draw the **full-resolution background** once with high-quality smoothing, then
 * the QR on top. Avoids re-rasterizing the whole card (where the BG/art looked worst).
 */
export const renderCardCompositeToPng = async (
  options: CardCompositeRenderOptions
): Promise<string> => {
  const {
    backgroundImage,
    qrCodeDataUrl,
    metrics,
    backgroundColor = "#14120B",
    scale = CARD_HTML_CAPTURE_SCALE,
  } = options;

  const [bgImage, qrImage] = await Promise.all([
    loadImage(backgroundImage),
    loadQrImageForComposite(qrCodeDataUrl, metrics.qr.size, scale),
  ]);

  const canvas = document.createElement("canvas");
  canvas.width = metrics.cardWidth * scale;
  canvas.height = metrics.cardHeight * scale;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not get canvas context");
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, metrics.cardWidth, metrics.cardHeight);
  ctx.drawImage(bgImage, 0, 0, metrics.cardWidth, metrics.cardHeight);

  const drawX = metrics.padding + metrics.qr.left;
  const drawY = metrics.padding + metrics.qr.top;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(qrImage, drawX, drawY, metrics.qr.size, metrics.qr.size);

  const dataUrl = canvas.toDataURL("image/png", 1.0);

  if (dataUrl.length < 1000) {
    throw new Error("Generated image is empty");
  }

  return dataUrl;
};

export const downloadCanvasAsPNG = (
  dataUrl: string,
  fileName: string
): void => {
  const link = document.createElement("a");
  link.download = fileName;
  link.href = dataUrl;
  link.click();
};

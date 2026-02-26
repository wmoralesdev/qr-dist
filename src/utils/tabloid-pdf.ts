/**
 * Generate print-ready tabloid PDFs:
 * - tabloid-logo-back.pdf: 1 page with branding in every card slot
 * - tabloid-qr-front.pdf: N pages with unique QR codes matching the same slot layout
 */

import { jsPDF } from "jspdf";
import {
  computeTabloidLayout,
  computePageCount,
  type TabloidLayout,
  type SlotRect,
} from "./tabloid-layout";
import { svgToPngDataUrl } from "./svg-to-png";
import { generateQRCodeDataUrl } from "./qr-generator";

const DPI = 300; // print resolution (300 DPI for high quality printing)
const BACK_DPI = 600; // higher DPI for back side image to preserve logo quality
const DEFAULT_LOGO_PATH = "/logo.svg";

/**
 * Load an image (PNG/JPG/etc) and return as data URL at specified dimensions.
 * Optionally rotate 90° CCW (for placing portrait cards into landscape slots).
 */
async function loadImageAsDataUrl(
  src: string,
  width: number,
  height: number,
  rotate90CCW = false
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }

      if (rotate90CCW) {
        canvas.width = height;
        canvas.height = width;
        ctx.translate(0, width);
        ctx.rotate(-Math.PI / 2);
        ctx.drawImage(img, 0, 0, width, height);
      } else {
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
      }
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => reject(new Error(`Failed to load image: ${src.slice(0, 50)}`));
    img.src = src;
  });
}

/**
 * Load an image and composite a centered overlay on top, then optionally rotate 90° CCW.
 * Used for rendering card background + QR/logo as a single rotated image.
 * Preserves overlay aspect ratio when overlayWidth/overlayHeight differ.
 */
async function compositeCardImage(
  bgSrc: string,
  overlaySrc: string,
  cardWidthPx: number,
  cardHeightPx: number,
  overlayWidth: number,
  overlayHeight: number,
  rotate90CCW = true
): Promise<string> {
  const [bgImg, overlayImg] = await Promise.all([
    loadImage(bgSrc),
    loadImage(overlaySrc),
  ]);

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas context");
  
  // Enable high-quality image scaling
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  if (rotate90CCW) {
    canvas.width = cardHeightPx;
    canvas.height = cardWidthPx;
    ctx.translate(0, cardWidthPx);
    ctx.rotate(-Math.PI / 2);
  } else {
    canvas.width = cardWidthPx;
    canvas.height = cardHeightPx;
  }

  ctx.drawImage(bgImg, 0, 0, cardWidthPx, cardHeightPx);
  const ox = (cardWidthPx - overlayWidth) / 2;
  const oy = (cardHeightPx - overlayHeight) / 2;
  ctx.drawImage(overlayImg, ox, oy, overlayWidth, overlayHeight);

  return canvas.toDataURL("image/png");
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src.slice(0, 50)}`));
    img.src = src;
  });
}

/**
 * Get the natural dimensions of an image from its data URL.
 */
async function getImageDimensions(src: string): Promise<{ width: number; height: number }> {
  const img = await loadImage(src);
  return { width: img.naturalWidth, height: img.naturalHeight };
}

/**
 * Calculate scaled dimensions that fit within maxSize while preserving aspect ratio.
 */
function fitToSize(
  naturalWidth: number,
  naturalHeight: number,
  maxSize: number
): { width: number; height: number } {
  const aspectRatio = naturalWidth / naturalHeight;
  if (naturalWidth >= naturalHeight) {
    return { width: maxSize, height: Math.round(maxSize / aspectRatio) };
  } else {
    return { width: Math.round(maxSize * aspectRatio), height: maxSize };
  }
}

export interface TabloidPdfOptions {
  brandingSvg: string | null; // data URL or path
  backgroundImage: string; // data URL or path for card background
  backSideImage: string | null; // data URL for logo-like image centered on back
  backSideSizePercent?: number; // size as % of card width (default 18)
  qrColor: string;
  urls: string[]; // one URL per card
  onProgress?: (percent: number) => void;
}

export interface TabloidPdfResult {
  combinedBlob: Blob;
  pageCount: number; // total pages (back + QR fronts)
  qrPageCount: number; // just QR front pages
  slotsPerPage: number;
}

/**
 * Build both PDFs and return their Blobs.
 * Cards are rendered at original portrait dimensions (2" × 3.5") then rotated 90° CCW
 * to fit into landscape slots (3.5" × 2") on the tabloid page.
 */
export async function generateTabloidPdfs(
  options: TabloidPdfOptions
): Promise<TabloidPdfResult> {
  const { brandingSvg, backgroundImage, backSideImage, backSideSizePercent = 18, qrColor, urls, onProgress } = options;

  const layout = computeTabloidLayout();
  const { slotsPerPage, slots } = layout;
  const pageCount = computePageCount(urls.length, slotsPerPage);

  const brandingSource = brandingSvg || DEFAULT_LOGO_PATH;

  // Original card dimensions (portrait) at 300 DPI - these get rotated into landscape slots
  const originalCardWidthIn = 2;
  const originalCardHeightIn = 3.5;
  const cardWidthPx = Math.round(originalCardWidthIn * DPI);   // 600px
  const cardHeightPx = Math.round(originalCardHeightIn * DPI); // 1050px

  // Prepare background image at original portrait dimensions
  const bgPng = await loadImageAsDataUrl(backgroundImage, cardWidthPx, cardHeightPx);

  // Back-side card uses higher DPI for better logo quality
  const backCardWidthPx = Math.round(originalCardWidthIn * BACK_DPI);
  const backCardHeightPx = Math.round(originalCardHeightIn * BACK_DPI);
  const bgPngHighRes = await loadImageAsDataUrl(backgroundImage, backCardWidthPx, backCardHeightPx);

  // Back-side card for logo-back PDF: composite (bg + centered logo/back image)
  // Use backCardWidthPx as reference (percentage of card width as labeled in UI)
  const backLogoMaxSize = Math.round(backCardWidthPx * (backSideSizePercent / 100));
  let logoCardPng: string;
  if (backSideImage) {
    // Get natural dimensions and calculate scaled size preserving aspect ratio
    const naturalDims = await getImageDimensions(backSideImage);
    const scaledDims = fitToSize(naturalDims.width, naturalDims.height, backLogoMaxSize);
    // Use the original image directly (don't resize through loadImageAsDataUrl to preserve quality)
    logoCardPng = await compositeCardImage(
      bgPngHighRes,
      backSideImage, // Use original data URL directly
      backCardWidthPx,
      backCardHeightPx,
      scaledDims.width,
      scaledDims.height,
      true
    );
  } else {
    const logoPng = await svgToPngDataUrl(brandingSource, {
      width: backLogoMaxSize,
      height: backLogoMaxSize,
      backgroundColor: undefined,
    });
    logoCardPng = await compositeCardImage(
      bgPngHighRes,
      logoPng,
      backCardWidthPx,
      backCardHeightPx,
      backLogoMaxSize,
      backLogoMaxSize,
      true
    );
  }

  // Generate all QR card images (background + centered QR, rotated 90° CCW)
  const qrCardPngs: string[] = [];
  const qrSizePx = Math.round(cardWidthPx * 0.85);

  for (let i = 0; i < urls.length; i++) {
    const qrSvgDataUrl = await generateQRCodeDataUrl(urls[i], {
      colors: { dark: qrColor, light: "transparent" },
      size: 400,
      margin: 2,
      errorCorrectionLevel: "H",
    });

    const qrPng = await svgToPngDataUrl(qrSvgDataUrl, {
      width: qrSizePx,
      height: qrSizePx,
      backgroundColor: undefined,
    });

    const qrCardPng = await compositeCardImage(
      bgPng,
      qrPng,
      cardWidthPx,
      cardHeightPx,
      qrSizePx,
      qrSizePx, // QR codes are square
      true
    );
    qrCardPngs.push(qrCardPng);

    if (onProgress) {
      onProgress(Math.round(((i + 1) / urls.length) * 50));
    }
  }

  // Build combined PDF: first page is logo-back, remaining pages are QR fronts
  const combinedPdf = createPdf();

  // Page 1: Logo-back (24 copies of back image)
  for (const slot of slots) {
    drawSlotImage(combinedPdf, logoCardPng, slot);
  }
  drawCutLines(combinedPdf, layout, qrColor);

  if (onProgress) onProgress(60);

  // Pages 2+: QR-front pages
  for (let page = 0; page < pageCount; page++) {
    combinedPdf.addPage([11, 17], "portrait");

    const startIdx = page * slotsPerPage;
    const endIdx = Math.min(startIdx + slotsPerPage, urls.length);

    for (let i = startIdx; i < endIdx; i++) {
      const slotIndex = i - startIdx;
      const slot = slots[slotIndex];
      drawSlotImage(combinedPdf, qrCardPngs[i], slot);
    }

    drawCutLines(combinedPdf, layout, qrColor);

    if (onProgress) {
      onProgress(60 + Math.round(((page + 1) / pageCount) * 40));
    }
  }
  
  const combinedBlob = combinedPdf.output("blob");

  return {
    combinedBlob,
    pageCount: pageCount + 1, // total pages including back page
    qrPageCount: pageCount,
    slotsPerPage,
  };
}

function createPdf(): jsPDF {
  // Page dimensions: 11x17 tabloid portrait
  return new jsPDF({
    orientation: "portrait",
    unit: "in",
    format: [11, 17],
  });
}

/**
 * Draw visible cut lines between card slots (internal only, not on page edges).
 * Uses the same color as the QR code for consistency.
 */
function drawCutLines(pdf: jsPDF, layout: TabloidLayout, hexColor: string): void {
  const rgb = hexToRgb(hexColor);
  pdf.setDrawColor(rgb.r, rgb.g, rgb.b);
  pdf.setLineWidth(0.02); // ~0.6pt - visible but still thin

  const { cols, rows, slots } = layout;
  if (slots.length === 0) return;

  const slotWidth = slots[0].width;
  const slotHeight = slots[0].height;
  const pageWidth = cols * slotWidth;
  const pageHeight = rows * slotHeight;

  // Vertical lines between columns (skip left and right page edges)
  for (let c = 1; c < cols; c++) {
    const x = c * slotWidth;
    pdf.line(x, 0, x, pageHeight);
  }

  // Horizontal lines between rows (skip top and bottom page edges)
  for (let r = 1; r < rows; r++) {
    const y = r * slotHeight;
    pdf.line(0, y, pageWidth, y);
  }
}

/**
 * Convert hex color to RGB.
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 200, g: 200, b: 200 }; // fallback gray
}

/**
 * Draw a pre-rendered (and rotated) card image filling the entire slot.
 */
function drawSlotImage(
  pdf: jsPDF,
  imageDataUrl: string,
  slot: SlotRect
): void {
  pdf.addImage(imageDataUrl, "JPEG", slot.x, slot.y, slot.width, slot.height);
}

/**
 * Trigger browser download for a Blob.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

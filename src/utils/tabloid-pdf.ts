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
import type { CardOrientation, FrontCardLayout } from "./card-layout";
import {
  DEFAULT_FRONT_CARD_LAYOUT,
  getContentPaddingPx,
  layoutToQrPixels,
} from "./card-layout";

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
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.translate(0, width);
        ctx.rotate(-Math.PI / 2);
        ctx.drawImage(img, 0, 0, width, height);
      } else {
        canvas.width = width;
        canvas.height = height;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);
      }
      resolve(canvas.toDataURL("image/png", 1.0));
    };
    img.onerror = () => reject(new Error(`Failed to load image: ${src.slice(0, 50)}`));
    img.src = src;
  });
}

/**
 * Load an image and composite an overlay at (overlayLeft, overlayTop) in card space,
 * then optionally rotate 90° CCW for portrait cards placed in landscape slots.
 */
async function compositeCardImage(
  bgSrc: string,
  overlaySrc: string,
  cardWidthPx: number,
  cardHeightPx: number,
  overlayWidth: number,
  overlayHeight: number,
  overlayLeft: number,
  overlayTop: number,
  rotate90CCW: boolean
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
  ctx.drawImage(overlayImg, overlayLeft, overlayTop, overlayWidth, overlayHeight);

  return canvas.toDataURL("image/png", 1.0);
}

function tabloidCardPixels(
  orientation: CardOrientation,
  dpi: number
): { width: number; height: number } {
  if (orientation === "vertical") {
    return {
      width: Math.round(2 * dpi),
      height: Math.round(3.5 * dpi),
    };
  }
  return {
    width: Math.round(3.5 * dpi),
    height: Math.round(2 * dpi),
  };
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
  /** Front (QR) face background */
  backgroundImage: string;
  /** Back face background; pass resolved URL (front, custom art, or solid fill) */
  backBackgroundImage?: string;
  backSideImage: string | null; // data URL for logo-like image centered on back
  backSideSizePercent?: number; // size as % of card width (default 18)
  qrColor: string;
  urls: string[]; // one URL per card
  onProgress?: (percent: number) => void;
  /** Shared with PNG export / preview */
  frontCardLayout?: FrontCardLayout;
}

export interface TabloidPdfResult {
  combinedBlob: Blob;
  pageCount: number; // total pages (back + QR fronts)
  qrPageCount: number; // just QR front pages
  slotsPerPage: number;
}

/**
 * Build both PDFs and return their Blobs.
 * Vertical cards are rendered at 2" × 3.5" then rotated 90° CCW into landscape slots.
 * Horizontal cards are rendered at 3.5" × 2" without rotation.
 */
export async function generateTabloidPdfs(
  options: TabloidPdfOptions
): Promise<TabloidPdfResult> {
  const {
    brandingSvg,
    backgroundImage,
    backBackgroundImage,
    backSideImage,
    backSideSizePercent = 18,
    qrColor,
    urls,
    onProgress,
    frontCardLayout = DEFAULT_FRONT_CARD_LAYOUT,
  } = options;

  const backBgSrc = backBackgroundImage ?? backgroundImage;

  const layout = computeTabloidLayout();
  const { slotsPerPage, slots } = layout;
  const pageCount = computePageCount(urls.length, slotsPerPage);

  const brandingSource = brandingSvg || DEFAULT_LOGO_PATH;

  const { width: cardWidthPx, height: cardHeightPx } = tabloidCardPixels(
    frontCardLayout.orientation,
    DPI
  );
  const rotateForSlot = frontCardLayout.orientation === "vertical";

  // Prepare background at print card dimensions
  const bgPng = await loadImageAsDataUrl(
    backgroundImage,
    cardWidthPx,
    cardHeightPx
  );

  const { width: backCardWidthPx, height: backCardHeightPx } = tabloidCardPixels(
    frontCardLayout.orientation,
    BACK_DPI
  );
  const bgPngHighRes = await loadImageAsDataUrl(
    backBgSrc,
    backCardWidthPx,
    backCardHeightPx
  );

  // Back-side card for logo-back PDF: composite (bg + centered logo/back image)
  // Use backCardWidthPx as reference (percentage of card width as labeled in UI)
  const backLogoMaxSize = Math.round(backCardWidthPx * (backSideSizePercent / 100));
  let logoCardPng: string;
  if (backSideImage) {
    // Get natural dimensions and calculate scaled size preserving aspect ratio
    const naturalDims = await getImageDimensions(backSideImage);
    const scaledDims = fitToSize(naturalDims.width, naturalDims.height, backLogoMaxSize);
    // Use the original image directly (don't resize through loadImageAsDataUrl to preserve quality)
    const ox = (backCardWidthPx - scaledDims.width) / 2;
    const oy = (backCardHeightPx - scaledDims.height) / 2;
    logoCardPng = await compositeCardImage(
      bgPngHighRes,
      backSideImage, // Use original data URL directly
      backCardWidthPx,
      backCardHeightPx,
      scaledDims.width,
      scaledDims.height,
      ox,
      oy,
      rotateForSlot
    );
  } else {
    const logoPng = await svgToPngDataUrl(brandingSource, {
      width: backLogoMaxSize,
      height: backLogoMaxSize,
      backgroundColor: undefined,
    });
    const ox = (backCardWidthPx - backLogoMaxSize) / 2;
    const oy = (backCardHeightPx - backLogoMaxSize) / 2;
    logoCardPng = await compositeCardImage(
      bgPngHighRes,
      logoPng,
      backCardWidthPx,
      backCardHeightPx,
      backLogoMaxSize,
      backLogoMaxSize,
      ox,
      oy,
      rotateForSlot
    );
  }

  const qrCardPngs: string[] = [];
  const padPx = getContentPaddingPx(cardWidthPx);
  const contentW = cardWidthPx - 2 * padPx;
  const contentH = cardHeightPx - 2 * padPx;
  const qrRect = layoutToQrPixels(frontCardLayout.qr, contentW, contentH);
  const qrRasterSize = Math.max(1, Math.round(qrRect.size));

  for (let i = 0; i < urls.length; i++) {
    const qrSvgDataUrl = await generateQRCodeDataUrl(urls[i], {
      colors: { dark: qrColor, light: "transparent" },
      size: 400,
      margin: 2,
      errorCorrectionLevel: "H",
    });

    const qrPng = await svgToPngDataUrl(qrSvgDataUrl, {
      width: qrRasterSize,
      height: qrRasterSize,
      backgroundColor: undefined,
    });

    const qrCardPng = await compositeCardImage(
      bgPng,
      qrPng,
      cardWidthPx,
      cardHeightPx,
      qrRasterSize,
      qrRasterSize,
      padPx + qrRect.left,
      padPx + qrRect.top,
      rotateForSlot
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
  // PNG keeps card art lossless; JPEG was washing out colors on dark backgrounds.
  pdf.addImage(imageDataUrl, "PNG", slot.x, slot.y, slot.width, slot.height);
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

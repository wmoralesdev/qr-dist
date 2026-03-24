/**
 * Shared front-card layout: orientation + QR position/size as percentages
 * of the inner content box (card minus padding).
 */

export type CardOrientation = "vertical" | "horizontal";

/** Top-left of QR in content box; size as % of min(contentWidth, contentHeight). */
export interface FrontCardQrLayout {
  xPercent: number;
  yPercent: number;
  sizePercent: number;
}

export interface FrontCardLayout {
  orientation: CardOrientation;
  qr: FrontCardQrLayout;
}

/** Matches legacy centered QR on vertical 480×840 with 48px padding (inner 384×744). */
export const DEFAULT_FRONT_CARD_LAYOUT: FrontCardLayout = {
  orientation: "vertical",
  qr: {
    xPercent: (32 / 384) * 100,
    yPercent: (212 / 744) * 100,
    sizePercent: (320 / 384) * 100,
  },
};

/** Single-card / bulk PNG export (96 DPI reference). */
export function getExportCardPixelSize(
  orientation: CardOrientation
): { width: number; height: number } {
  return orientation === "vertical"
    ? { width: 576, height: 1008 }
    : { width: 1008, height: 576 };
}

/** Padding scales with card width so preview and export stay proportional. */
export function getContentPaddingPx(cardWidthPx: number): number {
  return Math.round((60 / 576) * cardWidthPx);
}

export function getPreviewCardPixelSize(
  orientation: CardOrientation,
  previewSize: "small" | "large"
): { width: number; height: number } {
  if (orientation === "vertical") {
    return previewSize === "large"
      ? { width: 480, height: 840 }
      : { width: 240, height: 420 };
  }
  return previewSize === "large"
    ? { width: 840, height: 480 }
    : { width: 420, height: 240 };
}

export interface QrPixelRect {
  left: number;
  top: number;
  size: number;
}

const MIN_QR_PX = 48;

/**
 * Convert stored percentages to pixel rect inside the content box.
 */
export function layoutToQrPixels(
  qr: FrontCardQrLayout,
  contentWidth: number,
  contentHeight: number
): QrPixelRect {
  const minDim = Math.min(contentWidth, contentHeight);
  let size = (minDim * qr.sizePercent) / 100;
  let left = (contentWidth * qr.xPercent) / 100;
  let top = (contentHeight * qr.yPercent) / 100;

  size = Math.max(MIN_QR_PX, Math.min(size, minDim, contentWidth, contentHeight));
  left = Math.max(0, Math.min(left, contentWidth - size));
  top = Math.max(0, Math.min(top, contentHeight - size));

  return { left, top, size };
}

/**
 * Persist pixel rect back to normalized layout.
 */
export function qrPixelsToLayout(
  left: number,
  top: number,
  size: number,
  contentWidth: number,
  contentHeight: number
): FrontCardQrLayout {
  const minDim = Math.min(contentWidth, contentHeight);
  const clampedSize = Math.max(
    MIN_QR_PX,
    Math.min(size, minDim, contentWidth, contentHeight)
  );
  const clampedLeft = Math.max(0, Math.min(left, contentWidth - clampedSize));
  const clampedTop = Math.max(0, Math.min(top, contentHeight - clampedSize));

  return {
    xPercent: (clampedLeft / contentWidth) * 100,
    yPercent: (clampedTop / contentHeight) * 100,
    sizePercent: (clampedSize / minDim) * 100,
  };
}

export function clampFrontCardQrLayout(
  qr: FrontCardQrLayout,
  contentWidth: number,
  contentHeight: number
): FrontCardQrLayout {
  const { left, top, size } = layoutToQrPixels(qr, contentWidth, contentHeight);
  return qrPixelsToLayout(left, top, size, contentWidth, contentHeight);
}

/**
 * When orientation flips, map QR center in normalized coords to the new content box and clamp.
 */
export function remapQrLayoutForOrientation(
  qr: FrontCardQrLayout,
  fromOrientation: CardOrientation,
  toOrientation: CardOrientation,
  previewSize: "small" | "large"
): FrontCardQrLayout {
  if (fromOrientation === toOrientation) return qr;

  const fromCard = getPreviewCardPixelSize(fromOrientation, previewSize);
  const toCard = getPreviewCardPixelSize(toOrientation, previewSize);
  const fromPad = getContentPaddingPx(fromCard.width);
  const toPad = getContentPaddingPx(toCard.width);

  const fromCw = fromCard.width - 2 * fromPad;
  const fromCh = fromCard.height - 2 * fromPad;
  const toCw = toCard.width - 2 * toPad;
  const toCh = toCard.height - 2 * toPad;

  const { left, top, size } = layoutToQrPixels(qr, fromCw, fromCh);
  const cx = left + size / 2;
  const cy = top + size / 2;
  const nx = cx / fromCw;
  const ny = cy / fromCh;

  const newLeft = nx * toCw - size / 2;
  const newTop = ny * toCh - size / 2;
  return qrPixelsToLayout(newLeft, newTop, size, toCw, toCh);
}

export interface ExportLayoutMetrics {
  cardWidth: number;
  cardHeight: number;
  padding: number;
  contentWidth: number;
  contentHeight: number;
  qr: QrPixelRect;
}

/** Pixel layout for PNG export and tabloid compositing (same math as preview). */
export function getExportLayoutMetrics(
  layout: FrontCardLayout
): ExportLayoutMetrics {
  const { width: cardWidth, height: cardHeight } = getExportCardPixelSize(
    layout.orientation
  );
  const padding = getContentPaddingPx(cardWidth);
  const contentWidth = cardWidth - 2 * padding;
  const contentHeight = cardHeight - 2 * padding;
  const qr = layoutToQrPixels(layout.qr, contentWidth, contentHeight);
  return {
    cardWidth,
    cardHeight,
    padding,
    contentWidth,
    contentHeight,
    qr,
  };
}

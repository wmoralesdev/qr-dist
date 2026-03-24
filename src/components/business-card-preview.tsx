import { useCallback, useRef, type Ref } from "react";
import { QRCodeSVG } from "qrcode.react";
import type { FrontCardLayout, FrontCardQrLayout } from "../utils/card-layout";
import {
  getContentPaddingPx,
  getPreviewCardPixelSize,
  layoutToQrPixels,
  qrPixelsToLayout,
} from "../utils/card-layout";

interface BusinessCardPreviewProps {
  qrCodeDataUrl?: string;
  url?: string;
  qrColor?: string;
  brandingSvg?: string | null;
  backgroundImage: string;
  name?: string;
  previewSize?: "small" | "large";
  layout: FrontCardLayout;
  /** When set, user can drag/resize QR; updates go to onQrLayoutChange */
  interactive?: boolean;
  onQrLayoutChange?: (qr: FrontCardQrLayout) => void;
  /** Fixed pixel card for PNG export / tooling */
  variant?: "preview" | "export";
  exportWidth?: number;
  exportHeight?: number;
  /** Optional ref on the printed card box */
  cardRef?: Ref<HTMLDivElement>;
  /** When false, name/URL are omitted so the parent can render them (cleaner preview layout). */
  showDetailsBelowCard?: boolean;
}

export const BusinessCardPreview = ({
  qrCodeDataUrl,
  url,
  qrColor = "#F7F7F4",
  brandingSvg,
  backgroundImage,
  name,
  previewSize = "large",
  layout,
  interactive = false,
  onQrLayoutChange,
  variant = "preview",
  exportWidth,
  exportHeight,
  cardRef,
  showDetailsBelowCard = true,
}: BusinessCardPreviewProps) => {
  const contentRef = useRef<HTMLDivElement>(null);

  const cardDims =
    variant === "export" && exportWidth != null && exportHeight != null
      ? { width: exportWidth, height: exportHeight }
      : getPreviewCardPixelSize(layout.orientation, previewSize);

  /** Same rule as export (`getExportLayoutMetrics`) so WYSIWYG drag preview. */
  const padPx = getContentPaddingPx(cardDims.width);

  const contentW = cardDims.width - 2 * padPx;
  const contentH = cardDims.height - 2 * padPx;

  const { left, top, size } = layoutToQrPixels(layout.qr, contentW, contentH);

  const logoSize = size * 0.2;
  const imageSettings = brandingSvg
    ? {
        src: brandingSvg,
        width: logoSize * (38 / 44),
        height: logoSize,
        excavate: true,
      }
    : undefined;

  const dragRef = useRef<{
    pointerId: number;
    mode: "move" | "resize";
    startClientX: number;
    startClientY: number;
    startLeft: number;
    startTop: number;
    startSize: number;
  } | null>(null);

  const commitLayout = useCallback(
    (nextLeft: number, nextTop: number, nextSize: number) => {
      if (!onQrLayoutChange) return;
      onQrLayoutChange(
        qrPixelsToLayout(nextLeft, nextTop, nextSize, contentW, contentH)
      );
    },
    [contentW, contentH, onQrLayoutChange]
  );

  const onPointerDownMove = (e: React.PointerEvent) => {
    if (!interactive || !onQrLayoutChange || !contentRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = {
      pointerId: e.pointerId,
      mode: "move",
      startClientX: e.clientX,
      startClientY: e.clientY,
      startLeft: left,
      startTop: top,
      startSize: size,
    };
    contentRef.current.setPointerCapture(e.pointerId);
  };

  const centerQrHorizontally = () => {
    commitLayout((contentW - size) / 2, top, size);
  };

  const centerQrVertically = () => {
    commitLayout(left, (contentH - size) / 2, size);
  };

  const onPointerDownResize = (e: React.PointerEvent) => {
    if (!interactive || !onQrLayoutChange || !contentRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = {
      pointerId: e.pointerId,
      mode: "resize",
      startClientX: e.clientX,
      startClientY: e.clientY,
      startLeft: left,
      startTop: top,
      startSize: size,
    };
    contentRef.current.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current || !contentRef.current) return;
    if (e.pointerId !== dragRef.current.pointerId) return;

    const rect = contentRef.current.getBoundingClientRect();
    const scaleX = contentW / rect.width;
    const scaleY = contentH / rect.height;
    const dx = (e.clientX - dragRef.current.startClientX) * scaleX;
    const dy = (e.clientY - dragRef.current.startClientY) * scaleY;

    if (dragRef.current.mode === "move") {
      const nl = dragRef.current.startLeft + dx;
      const nt = dragRef.current.startTop + dy;
      commitLayout(nl, nt, dragRef.current.startSize);
    } else {
      const delta = Math.max(dx, dy);
      const ns = dragRef.current.startSize + delta;
      commitLayout(
        dragRef.current.startLeft,
        dragRef.current.startTop,
        ns
      );
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (dragRef.current && e.pointerId === dragRef.current.pointerId) {
      try {
        contentRef.current?.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      dragRef.current = null;
    }
  };

  const showChrome = interactive && Boolean(onQrLayoutChange);

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        ref={cardRef}
        className={interactive ? "" : "transition-transform hover:scale-[1.02]"}
        style={{
          width: `${cardDims.width}px`,
          height: `${cardDims.height}px`,
          backgroundImage: `url(${backgroundImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          padding: `${padPx}px`,
          boxSizing: "border-box",
          boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          outline: "1px solid rgba(255,255,255,0.18)",
          outlineOffset: "0px",
        }}
      >
        <div
          ref={contentRef}
          className="relative h-full w-full overflow-visible"
          style={{ touchAction: interactive ? "none" : undefined }}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <div
            className="absolute"
            style={{
              left: `${left}px`,
              top: `${top}px`,
              width: `${size}px`,
              height: `${size}px`,
              cursor: interactive ? "move" : undefined,
              outline: showChrome ? "2px dashed rgba(255,255,255,0.85)" : undefined,
              boxSizing: "border-box",
            }}
            onPointerDown={onPointerDownMove}
          >
            {qrCodeDataUrl ? (
              <img
                src={qrCodeDataUrl}
                alt="QR Code"
                className="block h-full w-full"
                style={{
                  backgroundColor: "transparent",
                  pointerEvents: interactive ? "none" : undefined,
                }}
                draggable={false}
              />
            ) : url ? (
              <div className="pointer-events-none h-full w-full [&_svg]:h-full [&_svg]:w-full [&_svg]:block">
                <QRCodeSVG
                  value={url}
                  size={Math.max(1, Math.round(size))}
                  level="H"
                  marginSize={2}
                  fgColor={qrColor}
                  bgColor="transparent"
                  imageSettings={imageSettings}
                />
              </div>
            ) : null}
            {showChrome && (
              <div
                className={
                  layout.orientation === "vertical"
                    ? "pointer-events-auto absolute top-1/2 left-full z-20 ml-1 flex -translate-y-1/2 flex-col gap-0.5"
                    : "pointer-events-auto absolute top-full left-1/2 z-20 mt-1 flex -translate-x-1/2 flex-row gap-0.5"
                }
                style={{
                  // Scale chrome with QR so controls stay proportional to the box
                  fontSize: `${Math.round(Math.min(12, Math.max(8, size * 0.035)))}px`,
                }}
              >
                <button
                  type="button"
                  aria-label="Center QR on horizontal axis"
                  title="Center on X (horizontal)"
                  className="flex cursor-pointer items-center justify-center border border-white bg-cursor-accent font-bold leading-none text-white tabular-nums hover:bg-cursor-accent-hover"
                  style={{
                    minWidth: `${Math.round(Math.max(14, size * 0.045))}px`,
                    height: `${Math.round(Math.max(14, size * 0.045))}px`,
                    padding: "0 2px",
                  }}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    centerQrHorizontally();
                  }}
                >
                  X
                </button>
                <button
                  type="button"
                  aria-label="Center QR on vertical axis"
                  title="Center on Y (vertical)"
                  className="flex cursor-pointer items-center justify-center border border-white bg-cursor-accent font-bold leading-none text-white tabular-nums hover:bg-cursor-accent-hover"
                  style={{
                    minWidth: `${Math.round(Math.max(14, size * 0.045))}px`,
                    height: `${Math.round(Math.max(14, size * 0.045))}px`,
                    padding: "0 2px",
                  }}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    centerQrVertically();
                  }}
                >
                  Y
                </button>
                <button
                  type="button"
                  aria-label="Resize QR code"
                  title="Resize QR code"
                  className={`shrink-0 border border-white bg-cursor-accent hover:bg-cursor-accent-hover ${
                    layout.orientation === "vertical"
                      ? "cursor-ew-resize"
                      : "cursor-ns-resize"
                  }`}
                  style={{
                    touchAction: "none",
                    width: `${Math.round(Math.max(14, size * 0.045))}px`,
                    height: `${Math.round(Math.max(14, size * 0.045))}px`,
                  }}
                  onPointerDown={onPointerDownResize}
                />
              </div>
            )}
          </div>
        </div>
      </div>
      {showDetailsBelowCard && (name || url) && variant === "preview" && (
        <div className="max-w-[480px] text-center">
          {name && (
            <div className="mb-1 text-base font-semibold text-cursor-text">
              {name}
            </div>
          )}
          {url && (
            <div className="break-all text-xs text-cursor-muted">{url}</div>
          )}
        </div>
      )}
    </div>
  );
};

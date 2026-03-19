import { useEffect, useState } from "react";
import { BusinessCardPreview } from "./business-card-preview";
import { BackCardPreview } from "./back-card-preview";
import type { FrontCardLayout, FrontCardQrLayout } from "../utils/card-layout";

interface GeneratedCard {
  data: {
    URL: string;
    Name: string;
  };
  qrCodeDataUrl: string;
}

interface PreviewPanelProps {
  generatedCards: GeneratedCard[];
  frontBackgroundImage: string;
  backBackgroundImage: string | null;
  qrColor: string;
  brandingSvg: string | null;
  backSideImage: string | null;
  backSideSizePercent: number;
  frontCardLayout: FrontCardLayout;
  onFrontQrLayoutChange: (qr: FrontCardQrLayout) => void;
  onDownloadCard: (card: GeneratedCard) => void;
}

export const PreviewPanel = ({
  generatedCards,
  frontBackgroundImage,
  backBackgroundImage,
  qrColor,
  brandingSvg,
  backSideImage,
  backSideSizePercent,
  frontCardLayout,
  onFrontQrLayoutChange,
  onDownloadCard,
}: PreviewPanelProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const len = generatedCards.length;

  useEffect(() => {
    if (currentIndex >= len && len > 0) {
      setCurrentIndex(len - 1);
    }
  }, [currentIndex, len]);

  if (len === 0) {
    return (
      <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col bg-cursor-bg p-6">
        <div className="flex h-full items-center justify-center text-base text-cursor-muted">
          <p>Upload a CSV to generate previews</p>
        </div>
      </div>
    );
  }

  const currentCard = generatedCards[currentIndex];
  const canGoPrevious = currentIndex > 0;
  const canGoNext = currentIndex < len - 1;

  const handlePrevious = () => {
    if (canGoPrevious) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (canGoNext) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col bg-cursor-bg p-6">
      <div className="mb-6 flex shrink-0 flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <button
            type="button"
            className="cursor-pointer border border-cursor-border bg-cursor-card px-4 py-2 text-sm text-cursor-text transition-all hover:border-cursor-highlight hover:bg-cursor-hover disabled:cursor-not-allowed disabled:opacity-50"
            onClick={handlePrevious}
            disabled={!canGoPrevious}
          >
            ← Previous
          </button>
          <span className="text-sm font-medium text-cursor-text">
            Card {currentIndex + 1} of {len}
          </span>
          <button
            type="button"
            className="cursor-pointer border border-cursor-border bg-cursor-card px-4 py-2 text-sm text-cursor-text transition-all hover:border-cursor-highlight hover:bg-cursor-hover disabled:cursor-not-allowed disabled:opacity-50"
            onClick={handleNext}
            disabled={!canGoNext}
          >
            Next →
          </button>
        </div>
        <button
          type="button"
          className="w-full cursor-pointer border-none bg-cursor-accent px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-cursor-accent-hover"
          onClick={() => onDownloadCard(currentCard)}
        >
          Download This Card
        </button>
        <p className="m-0 text-xs text-cursor-muted">
          Drag the QR to move it. X / Y center it on the card; use the edge handle
          to resize (portrait: right, landscape: bottom).
        </p>
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden">
        <div className="flex min-h-min flex-shrink-0 flex-row flex-wrap items-start justify-center gap-8 pb-4">
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs text-cursor-muted">Front</span>
            <BusinessCardPreview
              url={currentCard.data.URL}
              qrColor={qrColor}
              brandingSvg={brandingSvg}
              backgroundImage={frontBackgroundImage}
              name={currentCard.data.Name}
              previewSize="large"
              layout={frontCardLayout}
              interactive
              onQrLayoutChange={onFrontQrLayoutChange}
              showDetailsBelowCard={false}
            />
          </div>
          <BackCardPreview
            backgroundImage={backBackgroundImage}
            backImage={backSideImage}
            brandingSvg={brandingSvg}
            sizePercent={backSideSizePercent}
            previewSize="large"
            orientation={frontCardLayout.orientation}
          />
        </div>
        <div className="mx-auto w-full max-w-3xl shrink-0 px-2 pb-6 text-center">
          {currentCard.data.Name && (
            <div className="mb-1 text-base font-semibold text-cursor-text">
              {currentCard.data.Name}
            </div>
          )}
          {currentCard.data.URL && (
            <div className="break-all text-xs text-cursor-muted">
              {currentCard.data.URL}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

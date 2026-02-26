import { useState } from "react";
import { BusinessCardPreview } from "./business-card-preview";
import { BackCardPreview } from "./back-card-preview";

interface GeneratedCard {
  data: {
    URL: string;
    Name: string;
  };
  qrCodeDataUrl: string;
}

interface PreviewPanelProps {
  generatedCards: GeneratedCard[];
  backgroundImage: string;
  qrColor: string;
  brandingSvg: string | null;
  backSideImage: string | null;
  backSideSizePercent: number;
  onDownloadCard: (card: GeneratedCard) => void;
}

export const PreviewPanel = ({
  generatedCards,
  backgroundImage,
  qrColor,
  brandingSvg,
  backSideImage,
  backSideSizePercent,
  onDownloadCard,
}: PreviewPanelProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (generatedCards.length === 0) {
    return (
      <div className="flex flex-col h-full min-h-0 bg-cursor-bg p-6 flex-1 min-w-0">
        <div className="flex items-center justify-center h-full text-cursor-muted text-base">
          <p>Generate business cards to see preview</p>
        </div>
      </div>
    );
  }

  const currentCard = generatedCards[currentIndex];
  const canGoPrevious = currentIndex > 0;
  const canGoNext = currentIndex < generatedCards.length - 1;

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
    <div className="flex flex-col h-full min-h-0 bg-cursor-bg p-6 flex-1 min-w-0">
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-center justify-between gap-4">
          <button
            type="button"
            className="px-4 py-2 bg-cursor-card text-cursor-text border border-cursor-border text-sm cursor-pointer transition-all hover:bg-cursor-hover hover:border-cursor-highlight disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handlePrevious}
            disabled={!canGoPrevious}
          >
            ← Previous
          </button>
          <span className="text-sm font-medium text-cursor-text">
            Card {currentIndex + 1} of {generatedCards.length}
          </span>
          <button
            type="button"
            className="px-4 py-2 bg-cursor-card text-cursor-text border border-cursor-border text-sm cursor-pointer transition-all hover:bg-cursor-hover hover:border-cursor-highlight disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleNext}
            disabled={!canGoNext}
          >
            Next →
          </button>
        </div>
        <button
          type="button"
          className="w-full px-6 py-3 bg-cursor-accent text-white border-none text-sm font-medium cursor-pointer transition-colors hover:bg-cursor-accent-hover"
          onClick={() => onDownloadCard(currentCard)}
        >
          Download This Card
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center overflow-auto">
        <div className="flex flex-row flex-wrap gap-8 items-start justify-center">
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs text-cursor-muted">Front</span>
            <BusinessCardPreview
              url={currentCard.data.URL}
              qrColor={qrColor}
              brandingSvg={brandingSvg}
              backgroundImage={backgroundImage}
              name={currentCard.data.Name}
              previewSize="large"
            />
          </div>
          <BackCardPreview
            backgroundImage={backgroundImage}
            backImage={backSideImage}
            brandingSvg={brandingSvg}
            sizePercent={backSideSizePercent}
            previewSize="large"
          />
        </div>
      </div>
    </div>
  );
};

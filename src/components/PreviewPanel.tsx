import { useState } from "react";
import { BusinessCardPreview } from "./BusinessCardPreview";

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
  onDownloadCard: (card: GeneratedCard) => void;
}

export const PreviewPanel = ({
  generatedCards,
  backgroundImage,
  qrColor,
  brandingSvg,
  onDownloadCard,
}: PreviewPanelProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (generatedCards.length === 0) {
    return (
      <div className="flex flex-col h-screen bg-[#1a1a1a] p-6 flex-1 min-w-0">
        <div className="flex items-center justify-center h-full text-[#a0a0a0] text-base">
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
    <div className="flex flex-col h-screen bg-[#1a1a1a] p-6 flex-1 min-w-0">
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-center justify-between gap-4">
          <button
            type="button"
            className="px-4 py-2 bg-[#2a2a2a] text-[#e0e0e0] border border-[#404040] rounded-md text-sm cursor-pointer transition-all hover:bg-[#333333] hover:border-[#3b82f6] disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handlePrevious}
            disabled={!canGoPrevious}
          >
            ← Previous
          </button>
          <span className="text-sm font-medium text-[#e0e0e0]">
            Card {currentIndex + 1} of {generatedCards.length}
          </span>
          <button
            type="button"
            className="px-4 py-2 bg-[#2a2a2a] text-[#e0e0e0] border border-[#404040] rounded-md text-sm cursor-pointer transition-all hover:bg-[#333333] hover:border-[#3b82f6] disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleNext}
            disabled={!canGoNext}
          >
            Next →
          </button>
        </div>
        <button
          type="button"
          className="w-full px-6 py-3 bg-[#8b5cf6] text-white border-none rounded-md text-sm font-medium cursor-pointer transition-colors hover:bg-[#7c3aed]"
          onClick={() => onDownloadCard(currentCard)}
        >
          Download This Card
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center overflow-y-auto">
        <BusinessCardPreview
          url={currentCard.data.URL}
          qrColor={qrColor}
          brandingSvg={brandingSvg}
          backgroundImage={backgroundImage}
          name={currentCard.data.Name}
          previewSize="large"
        />
      </div>
    </div>
  );
};

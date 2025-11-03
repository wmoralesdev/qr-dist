import { useState, useRef } from "react";
import { generateQRCodeDataUrl } from "./utils/qrGenerator";
import type { BusinessCardData } from "./utils/csvParser";
import { renderCardToCanvas, downloadCanvasAsPNG } from "./utils/cardRenderer";
import { createZipFromDataUrls } from "./utils/zipGenerator";
import { sanitizeFileName } from "./utils/imageUtils";
import { ConfigurationPanel } from "./components/ConfigurationPanel";
import { PreviewPanel } from "./components/PreviewPanel";

interface GeneratedCard {
  data: BusinessCardData;
  qrCodeDataUrl: string;
}

interface AppConfig {
  backgroundImage: string | null; // Data URL or path
  qrCodeColor: string; // Hex color
  csvData: BusinessCardData[];
  generatedCards: GeneratedCard[];
}

const DEFAULT_BACKGROUND = "/bn.png";
const DEFAULT_QR_COLOR = "#F7F7F4";

function App() {
  const [config, setConfig] = useState<AppConfig>({
    backgroundImage: null,
    qrCodeColor: DEFAULT_QR_COLOR,
    csvData: [],
    generatedCards: [],
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [cardToDownload, setCardToDownload] = useState<GeneratedCard | null>(
    null
  );
  const hiddenCardRef = useRef<HTMLDivElement>(null);

  const handleCSVUpload = (data: BusinessCardData[]) => {
    setConfig((prev) => ({
      ...prev,
      csvData: data,
      generatedCards: [], // Clear generated cards when new CSV is uploaded
    }));
  };

  const handleBackgroundImageChange = (dataUrl: string | null) => {
    setConfig((prev) => ({
      ...prev,
      backgroundImage: dataUrl,
    }));
  };

  const handleQRCodeColorChange = (color: string) => {
    setConfig((prev) => ({
      ...prev,
      qrCodeColor: color,
    }));
  };

  const generateCards = async () => {
    if (config.csvData.length === 0) return;

    setIsGenerating(true);
    const cards: GeneratedCard[] = [];

    try {
      for (const data of config.csvData) {
        const qrCodeDataUrl = await generateQRCodeDataUrl(data.URL, {
          colors: { dark: config.qrCodeColor, light: "none" },
          size: 400,
          margin: 2,
          errorCorrectionLevel: "H",
          roundedCorners: true,
          centerImage: "/center.svg",
          centerImageSize: 20,
        });
        cards.push({
          data,
          qrCodeDataUrl,
        });
      }
      setConfig((prev) => ({
        ...prev,
        generatedCards: cards,
      }));
    } catch (error) {
      console.error("Error generating cards:", error);
      alert("Error generating QR codes. Please check your URLs.");
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadCard = async (card: GeneratedCard) => {
    setCardToDownload(card);

    // Wait for React to update the DOM
    await new Promise((resolve) => setTimeout(resolve, 200));

    if (!hiddenCardRef.current) {
      console.error("Hidden card element not found after rendering");
      setCardToDownload(null);
      return;
    }

    try {
      const dataUrl = await renderCardToCanvas(hiddenCardRef.current, {
        width: 576,
        height: 1008,
        backgroundColor: "#14120B",
      });

      const fileName = `${sanitizeFileName(card.data.Name)}_business_card.png`;
      downloadCanvasAsPNG(dataUrl, fileName);
    } catch (error) {
      console.error("Error downloading card:", error);
      alert("Error downloading card");
    } finally {
      setCardToDownload(null);
    }
  };

  const downloadAllCards = async () => {
    if (config.generatedCards.length === 0) return;

    setIsProcessing(true);
    setDownloadProgress(0);

    try {
      const entries: Array<{ dataUrl: string; fileName: string }> = [];

      for (let i = 0; i < config.generatedCards.length; i++) {
        const card = config.generatedCards[i];
        setCardToDownload(card);

        // Update progress (80% for processing cards)
        const progress = Math.round(
          ((i + 1) / config.generatedCards.length) * 80
        );
        setDownloadProgress(progress);

        // Wait for React to update the DOM
        await new Promise((resolve) => setTimeout(resolve, 200));

        if (!hiddenCardRef.current) {
          console.error("Hidden card element not found after rendering");
          continue;
        }

        try {
          const dataUrl = await renderCardToCanvas(hiddenCardRef.current, {
            width: 576,
            height: 1008,
            backgroundColor: "#14120B",
          });

          const fileName = `${sanitizeFileName(card.data.Name)}_business_card.png`;
          entries.push({ dataUrl, fileName });
        } catch (error) {
          console.error(`Error processing card ${i + 1}:`, error);
        }
      }

      // Update progress to 90% for ZIP generation
      setDownloadProgress(90);

      // Generate and download the zip file
      await createZipFromDataUrls(entries, "business_cards.zip");

      // Update progress to 100%
      setDownloadProgress(100);
    } catch (error) {
      console.error("Error downloading cards:", error);
      alert("Error downloading cards");
    } finally {
      setIsProcessing(false);
      setCardToDownload(null);
      setDownloadProgress(0);
    }
  };

  const backgroundImageUrl = config.backgroundImage || DEFAULT_BACKGROUND;

  return (
    <div className="flex h-screen overflow-hidden bg-[#1a1a1a] text-[#e0e0e0] md:flex-row flex-col">
      <ConfigurationPanel
        csvData={config.csvData}
        backgroundImage={config.backgroundImage}
        qrCodeColor={config.qrCodeColor}
        isGenerating={isGenerating}
        isProcessing={isProcessing}
        downloadProgress={downloadProgress}
        generatedCardsCount={config.generatedCards.length}
        onCSVUpload={handleCSVUpload}
        onBackgroundImageChange={handleBackgroundImageChange}
        onQRCodeColorChange={handleQRCodeColorChange}
        onGenerate={generateCards}
        onDownloadAll={downloadAllCards}
      />

      <PreviewPanel
        generatedCards={config.generatedCards}
        backgroundImage={backgroundImageUrl}
        onDownloadCard={downloadCard}
      />

      {/* Hidden card for html2canvas */}
      {cardToDownload && (
        <div
          ref={hiddenCardRef}
          style={{
            position: "absolute",
            left: "-9999px",
            top: "-9999px",
            width: "576px",
            height: "1008px",
            backgroundImage: `url(${backgroundImageUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "60px",
            boxSizing: "border-box",
          }}
        >
          <img
            src={cardToDownload.qrCodeDataUrl}
            alt="QR Code"
            style={{
              width: "400px",
              height: "400px",
              backgroundColor: "transparent",
              padding: "0px",
              borderRadius: "0px",
            }}
          />
        </div>
      )}
    </div>
  );
}

export default App;

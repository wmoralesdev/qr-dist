import { useState, useRef } from "react";
import ReactDOM from "react-dom/client";
import { QRCodeSVG } from "qrcode.react";
import { generateQRCodeDataUrl } from "./utils/qr-generator";
import type { BusinessCardData } from "./utils/csv-parser";
import { renderCardToCanvas, downloadCanvasAsPNG } from "./utils/card-renderer";
import { sanitizeFileName } from "./utils/image-utils";
import { ConfigurationPanel } from "./components/configuration-panel";
import { Navbar } from "./components/navbar";
import { PreviewPanel } from "./components/preview-panel";
import {
  generateTabloidPdfs,
  downloadBlob,
} from "./utils/tabloid-pdf";
import { computeTabloidLayout } from "./utils/tabloid-layout";

interface GeneratedCard {
  data: BusinessCardData;
  qrCodeDataUrl: string;
}

interface AppConfig {
  backgroundImage: string | null; // Data URL or path
  qrCodeColor: string; // Hex color
  brandingSvg: string | null; // Data URL or path for branding SVG
  backSideImage: string | null; // Data URL for logo-like back image
  backSideSizePercent: number; // size as % of card width
  csvData: BusinessCardData[];
  generatedCards: GeneratedCard[];
}

const DEFAULT_BACKGROUND = "/bn.png";
const DEFAULT_QR_COLOR = "#14120B";

function App() {
  const [config, setConfig] = useState<AppConfig>({
    backgroundImage: null,
    qrCodeColor: DEFAULT_QR_COLOR,
    brandingSvg: null,
    backSideImage: null,
    backSideSizePercent: 18,
    csvData: [],
    generatedCards: [],
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [cardToDownload, setCardToDownload] = useState<GeneratedCard | null>(
    null
  );
  const [isTabloidProcessing, setIsTabloidProcessing] = useState(false);
  const [tabloidProgress, setTabloidProgress] = useState(0);
  const hiddenCardRef = useRef<HTMLDivElement>(null);

  // Compute tabloid layout info
  const tabloidLayout = computeTabloidLayout();

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

  const handleBrandingSvgChange = (dataUrl: string | null) => {
    setConfig((prev) => ({
      ...prev,
      brandingSvg: dataUrl,
    }));
  };

  const handleBackSideImageChange = (dataUrl: string | null) => {
    setConfig((prev) => ({
      ...prev,
      backSideImage: dataUrl,
    }));
  };

  const handleBackSideSizeChange = (percent: number) => {
    setConfig((prev) => ({
      ...prev,
      backSideSizePercent: percent,
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
          centerImage: config.brandingSvg ?? undefined,
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

      const fileName = `001_${sanitizeFileName(card.data.Name)}_business_card.png`;
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

    // Check if File System Access API is available
    const useFileSystemAPI = 'showDirectoryPicker' in window;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let dirHandle: any = null;

    // Prompt user to select directory FIRST
    if (useFileSystemAPI) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        dirHandle = await (window as any).showDirectoryPicker({
          mode: 'readwrite',
        });
      } catch (error) {
        console.error("Directory selection cancelled:", error);
        return; // User cancelled
      }
    } else {
      // Warn user about multiple downloads
      const confirmed = confirm(
        `Your browser doesn't support directory selection. ${config.generatedCards.length} files will be downloaded individually to your Downloads folder. Continue?`
      );
      if (!confirmed) return;
    }

    setIsProcessing(true);
    setDownloadProgress(0);

    try {
      let successCount = 0;

      // Load background image once
      const bgImage = new Image();
      bgImage.crossOrigin = "anonymous";
      await new Promise<void>((resolve, reject) => {
        bgImage.onload = () => resolve();
        bgImage.onerror = reject;
        bgImage.src = backgroundImageUrl;
      });

      // Process and save each card one by one
      for (let i = 0; i < config.generatedCards.length; i++) {
        const card = config.generatedCards[i];

        // Update progress
        const progress = Math.round(
          ((i + 1) / config.generatedCards.length) * 100
        );
        setDownloadProgress(progress);

        try {
          // Create a temporary container for rendering the QR code
          const tempContainer = document.createElement("div");
          tempContainer.style.position = "absolute";
          tempContainer.style.left = "-9999px";
          tempContainer.style.width = "400px";
          tempContainer.style.height = "400px";
          document.body.appendChild(tempContainer);

          // Use React to render QR code into temp container
          const imageSettings = config.brandingSvg
            ? {
                src: config.brandingSvg,
                width: 80 * (38 / 44),
                height: 80,
                excavate: true,
              }
            : undefined;

          const legacyRoot = ReactDOM.createRoot(tempContainer);
          
          await new Promise<void>((resolve) => {
            legacyRoot.render(
              <QRCodeSVG
                value={card.data.URL}
                size={400}
                level="H"
                marginSize={2}
                fgColor={config.qrCodeColor}
                bgColor="transparent"
                imageSettings={imageSettings}
              />
            );
            setTimeout(() => resolve(), 300);
          });

          // Get the SVG element
          const svgElement = tempContainer.querySelector("svg");
          if (!svgElement) {
            throw new Error("QR code SVG not found");
          }

          // Wait for any images inside the SVG to load (branding)
          const images = svgElement.querySelectorAll("image");
          if (images.length > 0) {
            await Promise.all(
              Array.from(images).map(() => {
                return new Promise<void>((resolve) => {
                  setTimeout(() => resolve(), 100);
                });
              })
            );
          }

          // Convert SVG to data URL
          const svgData = new XMLSerializer().serializeToString(svgElement);
          const svgDataUrl = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgData)))}`;

          // Load QR code image
          const qrImage = new Image();
          await new Promise<void>((resolve, reject) => {
            qrImage.onload = () => resolve();
            qrImage.onerror = reject;
            qrImage.src = svgDataUrl;
          });

          // Create canvas and render card
          const canvas = document.createElement("canvas");
          canvas.width = 576;
          canvas.height = 1008;
          const ctx = canvas.getContext("2d");
          
          if (!ctx) {
            throw new Error("Could not get canvas context");
          }

          // Draw background
          ctx.fillStyle = "#14120B";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);

          // Draw QR code (centered)
          const qrSize = 400;
          const x = (canvas.width - qrSize) / 2;
          const y = (canvas.height - qrSize) / 2;
          ctx.drawImage(qrImage, x, y, qrSize, qrSize);

          // Convert to data URL
          const dataUrl = canvas.toDataURL("image/png", 1.0);
          
          if (dataUrl.length < 1000) {
            throw new Error("Generated image is too small/empty");
          }

          const fileName = `${String(i + 1).padStart(3, '0')}_${sanitizeFileName(card.data.Name)}_business_card.png`;

          // Save file immediately after generation
          if (useFileSystemAPI && dirHandle) {
            // Convert data URL to blob
            const response = await fetch(dataUrl);
            const blob = await response.blob();
            
            // Create file in the directory
            const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(blob);
            await writable.close();
            
            console.log(`💾 Saved ${i + 1}/${config.generatedCards.length}: ${fileName} (${Math.round(dataUrl.length / 1024)}KB)`);
          } else {
            // Fallback: download using browser
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = fileName;
            link.click();
            
            console.log(`⬇️ Downloaded ${i + 1}/${config.generatedCards.length}: ${fileName} (${Math.round(dataUrl.length / 1024)}KB)`);
            
            // Small delay between downloads to avoid browser blocking
            await new Promise(resolve => setTimeout(resolve, 150));
          }

          successCount++;

          // Clean up temp container
          legacyRoot.unmount();
          document.body.removeChild(tempContainer);
        } catch (error) {
          console.error(`✗ Error processing card ${i + 1}:`, error);
        }
      }

      console.log(`\n✅ Complete: ${successCount}/${config.generatedCards.length} cards saved successfully`);
      
      if (successCount > 0) {
        alert(`Successfully saved ${successCount} out of ${config.generatedCards.length} cards!`);
      } else {
        alert("No cards were generated. Please check the console for errors.");
      }

      setDownloadProgress(100);
    } catch (error) {
      console.error("Error downloading cards:", error);
      alert("Error downloading cards");
    } finally {
      setIsProcessing(false);
      setDownloadProgress(0);
    }
  };

  const downloadTabloidPdfs = async () => {
    if (config.generatedCards.length === 0) return;

    setIsTabloidProcessing(true);
    setTabloidProgress(0);

    try {
      const urls = config.generatedCards.map((card) => card.data.URL);

      const result = await generateTabloidPdfs({
        brandingSvg: config.brandingSvg,
        backgroundImage: backgroundImageUrl,
        backSideImage: config.backSideImage,
        backSideSizePercent: config.backSideSizePercent,
        qrColor: config.qrCodeColor,
        urls,
        onProgress: (percent) => setTabloidProgress(percent),
      });

      // Download combined PDF (back page + QR front pages)
      downloadBlob(result.combinedBlob, "tabloid-cards.pdf");

      alert(
        `Successfully generated tabloid PDF!\n` +
          `- Total pages: ${result.pageCount}\n` +
          `- Page 1: Back side (24 cards)\n` +
          `- Pages 2-${result.pageCount}: QR fronts (${result.qrPageCount} pages)\n` +
          `- ${result.slotsPerPage} cards per page`
      );
    } catch (error) {
      console.error("Error generating tabloid PDFs:", error);
      alert("Error generating tabloid PDFs. Check console for details.");
    } finally {
      setIsTabloidProcessing(false);
      setTabloidProgress(0);
    }
  };

  const backgroundImageUrl = config.backgroundImage || DEFAULT_BACKGROUND;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-cursor-bg text-cursor-text">
      <Navbar />
      <div className="flex flex-1 overflow-hidden md:flex-row flex-col">
        <ConfigurationPanel
        csvData={config.csvData}
        backgroundImage={config.backgroundImage}
        qrCodeColor={config.qrCodeColor}
        brandingSvg={config.brandingSvg}
        backSideImage={config.backSideImage}
        backSideSizePercent={config.backSideSizePercent}
        onBackSideImageChange={handleBackSideImageChange}
        onBackSideSizeChange={handleBackSideSizeChange}
        isGenerating={isGenerating}
        isProcessing={isProcessing}
        downloadProgress={downloadProgress}
        generatedCardsCount={config.generatedCards.length}
        slotsPerTabloid={tabloidLayout.slotsPerPage}
        isTabloidProcessing={isTabloidProcessing}
        tabloidProgress={tabloidProgress}
        onCSVUpload={handleCSVUpload}
        onBackgroundImageChange={handleBackgroundImageChange}
        onQRCodeColorChange={handleQRCodeColorChange}
        onBrandingSvgChange={handleBrandingSvgChange}
        onGenerate={generateCards}
        onDownloadAll={downloadAllCards}
        onDownloadTabloid={downloadTabloidPdfs}
      />

      <PreviewPanel
        generatedCards={config.generatedCards}
        backgroundImage={backgroundImageUrl}
        qrColor={config.qrCodeColor}
        brandingSvg={config.brandingSvg}
        backSideImage={config.backSideImage}
        backSideSizePercent={config.backSideSizePercent}
        onDownloadCard={downloadCard}
        />
      </div>

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
          <QRCodeSVG
            value={cardToDownload.data.URL}
            size={400}
            level="H"
            marginSize={2}
            fgColor={config.qrCodeColor}
            bgColor="transparent"
            imageSettings={
              config.brandingSvg
                ? {
                    src: config.brandingSvg,
                    width: 80 * (38 / 44), // Width scaled to maintain 38:44 aspect ratio
                    height: 80, // Height at target size
                    excavate: true,
                  }
                : undefined
            }
          />
        </div>
      )}
    </div>
  );
}

export default App;


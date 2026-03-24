import { startTransition, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { generateQRCodeDataUrl } from "./utils/qr-generator";
import type { BusinessCardData } from "./utils/csv-parser";
import {
  renderCardCompositeToPng,
  downloadCanvasAsPNG,
  CARD_HTML_CAPTURE_SCALE,
} from "./utils/card-renderer";
import {
  createSolidColorDataUrl,
  sanitizeFileName,
} from "./utils/image-utils";
import { ConfigurationPanel } from "./components/configuration-panel";
import { Navbar } from "./components/navbar";
import { PreviewPanel } from "./components/preview-panel";
import {
  generateTabloidPdfs,
  downloadBlob,
} from "./utils/tabloid-pdf";
import { computeTabloidLayout } from "./utils/tabloid-layout";
import type {
  CardOrientation,
  FrontCardLayout,
  FrontCardQrLayout,
} from "./utils/card-layout";
import {
  DEFAULT_FRONT_CARD_LAYOUT,
  clampFrontCardQrLayout,
  getContentPaddingPx,
  getExportLayoutMetrics,
  getPreviewCardPixelSize,
  remapQrLayoutForOrientation,
} from "./utils/card-layout";

interface GeneratedCard {
  data: BusinessCardData;
  qrCodeDataUrl: string;
}

const EMPTY_BACK_COLOR = "#14120B";

interface AppConfig {
  backgroundImage: string | null;
  backBackgroundImage: string | null;
  backBackgroundSameAsFront: boolean;
  qrCodeColor: string;
  brandingSvg: string | null;
  backSideImage: string | null;
  backSideSizePercent: number;
  csvData: BusinessCardData[];
  generatedCards: GeneratedCard[];
  frontCardLayout: FrontCardLayout;
}

const DEFAULT_BACKGROUND = "/bn.png";
const DEFAULT_QR_COLOR = "#14120B";

async function buildGeneratedCardsFromRows(
  rows: BusinessCardData[],
  qrCodeColor: string,
  brandingSvg: string | null
): Promise<GeneratedCard[]> {
  const opts = {
    colors: { dark: qrCodeColor, light: "none" as const },
    size: 400,
    margin: 2,
    errorCorrectionLevel: "H" as const,
    roundedCorners: true,
    centerImage: brandingSvg ?? undefined,
    centerImageSize: 20,
  };
  const qrCodeDataUrls = await Promise.all(
    rows.map((data) => generateQRCodeDataUrl(data.URL, opts))
  );
  return rows.map((data, i) => ({
    data,
    qrCodeDataUrl: qrCodeDataUrls[i],
  }));
}

function App() {
  const [config, setConfig] = useState<AppConfig>({
    backgroundImage: null,
    backBackgroundImage: null,
    backBackgroundSameAsFront: false,
    qrCodeColor: DEFAULT_QR_COLOR,
    brandingSvg: null,
    backSideImage: null,
    backSideSizePercent: 18,
    csvData: [],
    generatedCards: [],
    frontCardLayout: DEFAULT_FRONT_CARD_LAYOUT,
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isTabloidProcessing, setIsTabloidProcessing] = useState(false);
  const [tabloidProgress, setTabloidProgress] = useState(0);

  const qrStyleRef = useRef({
    qrCodeColor: config.qrCodeColor,
    brandingSvg: config.brandingSvg,
  });
  qrStyleRef.current = {
    qrCodeColor: config.qrCodeColor,
    brandingSvg: config.brandingSvg,
  };

  const tabloidLayout = computeTabloidLayout();

  useEffect(() => {
    if (config.csvData.length === 0) return;

    let cancelled = false;
    const rows = config.csvData;
    const { qrCodeColor, brandingSvg } = qrStyleRef.current;

    void (async () => {
      setIsGenerating(true);
      try {
        const cards = await buildGeneratedCardsFromRows(
          rows,
          qrCodeColor,
          brandingSvg
        );
        if (!cancelled) {
          setConfig((prev) => ({
            ...prev,
            generatedCards: cards,
          }));
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Error generating QR codes:", error);
          toast.error("Couldn’t generate QR codes. Check your URLs.");
        }
      } finally {
        if (!cancelled) {
          setIsGenerating(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [config.csvData]);

  const handleCSVUpload = (data: BusinessCardData[]) => {
    setConfig((prev) => ({
      ...prev,
      csvData: data,
      generatedCards: [],
    }));
  };

  const handleBackgroundImageChange = (dataUrl: string | null) => {
    setConfig((prev) => ({
      ...prev,
      backgroundImage: dataUrl,
    }));
  };

  const handleBackBackgroundImageChange = (dataUrl: string | null) => {
    setConfig((prev) => ({
      ...prev,
      backBackgroundImage: dataUrl,
      ...(dataUrl ? { backBackgroundSameAsFront: false } : {}),
    }));
  };

  const handleBackBackgroundSameAsFrontChange = (sameAsFront: boolean) => {
    setConfig((prev) => ({
      ...prev,
      backBackgroundSameAsFront: sameAsFront,
      ...(sameAsFront ? { backBackgroundImage: null } : {}),
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

  const handleCardOrientationChange = (orientation: CardOrientation) => {
    setConfig((prev) => {
      if (prev.frontCardLayout.orientation === orientation) return prev;
      const nextQr = remapQrLayoutForOrientation(
        prev.frontCardLayout.qr,
        prev.frontCardLayout.orientation,
        orientation,
        "large"
      );
      return {
        ...prev,
        frontCardLayout: { orientation, qr: nextQr },
      };
    });
  };

  const handleFrontQrLayoutChange = (qr: FrontCardQrLayout) => {
    setConfig((prev) => {
      const { width, height } = getPreviewCardPixelSize(
        prev.frontCardLayout.orientation,
        "large"
      );
      const pad = getContentPaddingPx(width);
      const contentW = width - 2 * pad;
      const contentH = height - 2 * pad;
      const clamped = clampFrontCardQrLayout(qr, contentW, contentH);
      return {
        ...prev,
        frontCardLayout: { ...prev.frontCardLayout, qr: clamped },
      };
    });
  };

  const generateCards = async () => {
    if (config.csvData.length === 0) return;

    setIsGenerating(true);
    try {
      const cards = await buildGeneratedCardsFromRows(
        config.csvData,
        config.qrCodeColor,
        config.brandingSvg
      );
      setConfig((prev) => ({
        ...prev,
        generatedCards: cards,
      }));
      toast.success(
        cards.length === 1
          ? "QR image updated"
          : `${cards.length} QR images updated`
      );
    } catch (error) {
      console.error("Error generating cards:", error);
      toast.error("Couldn’t generate QR codes. Check your URLs.");
    } finally {
      setIsGenerating(false);
    }
  };

  const exportMetrics = getExportLayoutMetrics(config.frontCardLayout);

  const downloadCard = async (card: GeneratedCard) => {
    try {
      const qrCodeDataUrlFresh = await generateQRCodeDataUrl(card.data.URL, {
        colors: { dark: config.qrCodeColor, light: "none" },
        size: 400,
        margin: 2,
        errorCorrectionLevel: "H",
        roundedCorners: true,
        centerImage: config.brandingSvg ?? undefined,
        centerImageSize: 20,
      });

      const dataUrl = await renderCardCompositeToPng({
        backgroundImage: backgroundImageUrl,
        qrCodeDataUrl: qrCodeDataUrlFresh,
        metrics: exportMetrics,
        backgroundColor: "#14120B",
        scale: CARD_HTML_CAPTURE_SCALE,
      });

      const fileName = `001_${sanitizeFileName(card.data.Name)}_business_card.png`;
      downloadCanvasAsPNG(dataUrl, fileName);
    } catch (error) {
      console.error("Error downloading card:", error);
      toast.error("Couldn’t download this card.");
    }
  };

  const downloadAllCards = async () => {
    if (config.generatedCards.length === 0) return;

    const useFileSystemAPI = "showDirectoryPicker" in window;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let dirHandle: any = null;

    if (useFileSystemAPI) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        dirHandle = await (window as any).showDirectoryPicker({
          mode: "readwrite",
        });
      } catch (error) {
        console.error("Directory selection cancelled:", error);
        return;
      }
    } else {
      const confirmed = confirm(
        `Your browser doesn't support directory selection. ${config.generatedCards.length} files will be downloaded individually to your Downloads folder. Continue?`
      );
      if (!confirmed) return;
    }

    setIsProcessing(true);
    setDownloadProgress(0);

    const metrics = getExportLayoutMetrics(config.frontCardLayout);
    const { qrCodeColor, brandingSvg, generatedCards } = config;

    const reportProgress = (percent: number) => {
      startTransition(() => setDownloadProgress(percent));
    };

    try {
      let successCount = 0;

      for (let i = 0; i < generatedCards.length; i++) {
        const card = generatedCards[i];
        reportProgress(
          Math.round(((i + 1) / generatedCards.length) * 100)
        );

        try {
          const qrCodeDataUrlFresh = await generateQRCodeDataUrl(
            card.data.URL,
            {
              colors: { dark: qrCodeColor, light: "none" },
              size: 400,
              margin: 2,
              errorCorrectionLevel: "H",
              roundedCorners: true,
              centerImage: brandingSvg ?? undefined,
              centerImageSize: 20,
            }
          );

          const dataUrl = await renderCardCompositeToPng({
            backgroundImage: backgroundImageUrl,
            qrCodeDataUrl: qrCodeDataUrlFresh,
            metrics,
            backgroundColor: "#14120B",
            scale: CARD_HTML_CAPTURE_SCALE,
          });

          const fileName = `${String(i + 1).padStart(3, "0")}_${sanitizeFileName(card.data.Name)}_business_card.png`;

          if (useFileSystemAPI && dirHandle) {
            const response = await fetch(dataUrl);
            const blob = await response.blob();
            const fileHandle = await dirHandle.getFileHandle(fileName, {
              create: true,
            });
            const writable = await fileHandle.createWritable();
            await writable.write(blob);
            await writable.close();
          } else {
            const link = document.createElement("a");
            link.href = dataUrl;
            link.download = fileName;
            link.click();
            await new Promise((resolve) => setTimeout(resolve, 150));
          }

          successCount++;
        } catch (error) {
          console.error(`✗ Error processing card ${i + 1}:`, error);
        }
      }

      if (successCount > 0) {
        if (successCount === generatedCards.length) {
          toast.success(`Saved ${successCount} cards.`);
        } else {
          toast.warning(
            `Saved ${successCount} of ${generatedCards.length} cards.`
          );
        }
      } else {
        toast.error("No cards were saved. Check the console for details.");
      }

      setDownloadProgress(100);
    } catch (error) {
      console.error("Error downloading cards:", error);
      toast.error("Bulk download failed.");
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
        backBackgroundImage: backBackgroundForTabloidUrl,
        backSideImage: config.backSideImage,
        backSideSizePercent: config.backSideSizePercent,
        qrColor: config.qrCodeColor,
        urls,
        frontCardLayout: config.frontCardLayout,
        onProgress: (percent) => setTabloidProgress(percent),
      });

      downloadBlob(result.combinedBlob, "tabloid-cards.pdf");

      toast.success(
        `Tabloid PDF ready — ${result.pageCount} pages (${result.qrPageCount} QR pages).`
      );
    } catch (error) {
      console.error("Error generating tabloid PDFs:", error);
      toast.error("Couldn’t generate tabloid PDF. Check the console.");
    } finally {
      setIsTabloidProcessing(false);
      setTabloidProgress(0);
    }
  };

  const backgroundImageUrl = config.backgroundImage || DEFAULT_BACKGROUND;
  const backBackgroundForPreview =
    config.backBackgroundSameAsFront || config.backBackgroundImage
      ? config.backBackgroundSameAsFront
        ? backgroundImageUrl
        : config.backBackgroundImage
      : null;
  const backBackgroundForTabloidUrl = config.backBackgroundSameAsFront
    ? backgroundImageUrl
    : config.backBackgroundImage ?? createSolidColorDataUrl(EMPTY_BACK_COLOR);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-cursor-bg text-cursor-text">
      <Navbar />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
        <ConfigurationPanel
          csvData={config.csvData}
          backgroundImage={config.backgroundImage}
          resolvedFrontBackgroundUrl={backgroundImageUrl}
          backBackgroundImage={config.backBackgroundImage}
          backBackgroundSameAsFront={config.backBackgroundSameAsFront}
          qrCodeColor={config.qrCodeColor}
          brandingSvg={config.brandingSvg}
          backSideImage={config.backSideImage}
          backSideSizePercent={config.backSideSizePercent}
          cardOrientation={config.frontCardLayout.orientation}
          onCardOrientationChange={handleCardOrientationChange}
          onBackBackgroundSameAsFrontChange={
            handleBackBackgroundSameAsFrontChange
          }
          onBackBackgroundImageChange={handleBackBackgroundImageChange}
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
          frontBackgroundImage={backgroundImageUrl}
          backBackgroundImage={backBackgroundForPreview}
          qrColor={config.qrCodeColor}
          brandingSvg={config.brandingSvg}
          backSideImage={config.backSideImage}
          backSideSizePercent={config.backSideSizePercent}
          frontCardLayout={config.frontCardLayout}
          onFrontQrLayoutChange={handleFrontQrLayoutChange}
          onDownloadCard={downloadCard}
        />
      </div>
    </div>
  );
}

export default App;

import { useState, useRef } from "react";
import Papa from "papaparse";
import html2canvas from "html2canvas";
import JSZip from "jszip";
import { generateQRCodeDataUrl } from "./components/QRCode";
import type { QRCodeColors } from "./components/QRCode";
import "./App.css";

interface BusinessCardData {
  URL: string;
  Name: string;
}

interface GeneratedCard {
  data: BusinessCardData;
  qrCodeDataUrl: string;
}

function App() {
  const [csvData, setCsvData] = useState<BusinessCardData[]>([]);
  const [generatedCards, setGeneratedCards] = useState<GeneratedCard[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [cardToDownload, setCardToDownload] = useState<GeneratedCard | null>(
    null
  );
  const [downloadProgress, setDownloadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cardsContainerRef = useRef<HTMLDivElement>(null);
  const hiddenCardRef = useRef<HTMLDivElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    console.log("📁 File selected:", file.name, "Size:", file.size);

    Papa.parse(file, {
      header: true,
      complete: (results) => {
        const data = results.data as BusinessCardData[];

        setCsvData(data);
        setGeneratedCards([]);
      },
      error: (error) => {
        console.error("❌ Error parsing CSV:", error);
        alert("Error parsing CSV file. Please check the format.");
      },
    });
  };

  const generateQRCode = async (
    url: string,
    colors?: QRCodeColors,
    withCenterImage?: boolean
  ): Promise<string> => {
    console.log("🔍 Starting QR code generation for URL:", url);

    try {
      return await generateQRCodeDataUrl(url, {
        colors: colors || { dark: "#F7F7F4", light: "none" },
        size: 200,
        margin: 2,
        // Use higher error correction when center image is present
        errorCorrectionLevel: withCenterImage ? "H" : "M",
        roundedCorners: true,
        // Add center image if specified (you can change the path as needed)
        centerImage: withCenterImage ? "/center.svg" : undefined,
        centerImageSize: 20, // 20% of QR code size
      });
    } catch (error) {
      console.error("❌ Error generating QR code for URL:", url);
      console.error("❌ Error details:", error);
      throw error;
    }
  };

  const generateCards = async () => {
    if (csvData.length === 0) return;

    setIsGenerating(true);
    const cards: GeneratedCard[] = [];

    try {
      for (const data of csvData) {
        const qrCodeDataUrl = await generateQRCode(data.URL);
        cards.push({
          data,
          qrCodeDataUrl,
        });
      }
      setGeneratedCards(cards);
    } catch (error) {
      console.error("Error generating cards:", error);
      alert("Error generating QR codes. Please check your URLs.");
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadCard = async (card: GeneratedCard) => {
    setCardToDownload(card);

    // Wait for React to update the DOM and ensure the element is rendered
    await new Promise((resolve) => setTimeout(resolve, 200));

    if (!hiddenCardRef.current) {
      console.error("Hidden card element not found after rendering");
      setCardToDownload(null);
      return;
    }

    // Preload the background image to ensure it's ready
    await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(undefined);
      img.onerror = () => resolve(undefined); // Continue even if image fails to load
      img.src = "/bn.png";
    });

    // Additional wait to ensure background image is applied
    await new Promise((resolve) => setTimeout(resolve, 100));

    try {
      const canvas = await html2canvas(hiddenCardRef.current, {
        width: 576, // 6in at 96 DPI
        height: 1008, // 10.5in at 96 DPI
        scale: 1, // No additional scaling since we're already at high resolution
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#14120B", // Black background as fallback
        logging: true, // Enable logging to debug
        imageTimeout: 5000, // Reduced timeout
        removeContainer: false, // Keep container for stability
        foreignObjectRendering: false, // Disable for stability
      });

      console.log("Canvas created successfully:", canvas);
      console.log("Canvas dimensions:", canvas.width, "x", canvas.height);

      const dataUrl = canvas.toDataURL("image/png", 1.0); // Highest quality
      console.log("Data URL length:", dataUrl.length);
      console.log("Data URL preview:", dataUrl.substring(0, 100));

      if (dataUrl.length < 1000) {
        console.error("Data URL is too short, canvas might be empty");
        alert("Error: Generated image is empty. Please try again.");
        return;
      }

      const link = document.createElement("a");
      const fileName = card.data.Name.replace(/[^a-z0-9]/gi, "_");
      link.download = `${fileName}_business_card.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error("Error downloading card:", error);
      alert("Error downloading card");
    } finally {
      setCardToDownload(null);
    }
  };

  const downloadAllCards = async () => {
    if (generatedCards.length === 0) return;

    setIsProcessing(true);
    setDownloadProgress(0);

    try {
      const zip = new JSZip();

      for (let i = 0; i < generatedCards.length; i++) {
        const card = generatedCards[i];
        setCardToDownload(card);

        // Update progress
        const progress = Math.round(((i + 1) / generatedCards.length) * 80); // 80% for processing
        setDownloadProgress(progress);

        // Wait for React to update the DOM and ensure the element is rendered
        await new Promise((resolve) => setTimeout(resolve, 200));

        if (!hiddenCardRef.current) {
          console.error("Hidden card element not found after rendering");
          continue;
        }

        // Preload the background image to ensure it's ready
        await new Promise((resolve) => {
          const img = new Image();
          img.onload = () => resolve(undefined);
          img.onerror = () => resolve(undefined);
          img.src = "/bn.png";
        });

        // Additional wait to ensure background image is applied
        await new Promise((resolve) => setTimeout(resolve, 100));

        const canvas = await html2canvas(hiddenCardRef.current, {
          width: 576, // 6in at 96 DPI
          height: 1008, // 10.5in at 96 DPI
          scale: 1, // No additional scaling since we're already at high resolution
          useCORS: true,
          allowTaint: true,
          backgroundColor: "#14120B", // Black background as fallback
          logging: false, // Disable logging for batch processing
          imageTimeout: 5000, // Reduced timeout
          removeContainer: false, // Keep container for stability
          foreignObjectRendering: false, // Disable for stability
        });

        const dataUrl = canvas.toDataURL("image/png", 1.0);
        const fileName = card.data.Name.replace(/[^a-z0-9]/gi, "_");

        // Convert data URL to blob and add to zip
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        zip.file(`${fileName}_business_card.png`, blob);
      }

      // Update progress to 90% for ZIP generation
      setDownloadProgress(90);

      // Generate and download the zip file
      const zipBlob = await zip.generateAsync({ type: "blob" });

      // Update progress to 100% for download
      setDownloadProgress(100);

      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "business_cards.zip";
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading cards:", error);
      alert("Error downloading cards");
    } finally {
      setIsProcessing(false);
      setCardToDownload(null);
      setDownloadProgress(0);
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Business Card Generator</h1>
        <p>
          Upload a CSV file with URL and Name columns to generate QR code
          business cards
        </p>
      </header>

      <main className="app-main">
        <div className="upload-section">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            style={{ display: "none" }}
          />
          <button
            type="button"
            className="upload-button"
            onClick={() => fileInputRef.current?.click()}
          >
            Upload CSV File
          </button>
          {csvData.length > 0 && (
            <p className="file-info">
              Loaded {csvData.length} entries from CSV
            </p>
          )}
        </div>

        {csvData.length > 0 && (
          <div className="actions-section">
            <button
              type="button"
              className="generate-button"
              onClick={generateCards}
              disabled={isGenerating}
            >
              {isGenerating
                ? "Generating QR Codes..."
                : "Generate Business Cards"}
            </button>
          </div>
        )}

        {generatedCards.length > 0 && (
          <div className="cards-section">
            <div className="cards-header">
              <h2>Generated Cards ({generatedCards.length})</h2>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                <button
                  type="button"
                  className="download-all-button"
                  onClick={downloadAllCards}
                  disabled={isProcessing}
                >
                  {isProcessing ? "Downloading..." : "Download All Cards"}
                </button>
                {isProcessing && (
                  <div style={{ width: "100%" }}>
                    <div
                      style={{
                        width: "100%",
                        height: "8px",
                        backgroundColor: "#e0e0e0",
                        borderRadius: "4px",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${downloadProgress}%`,
                          height: "100%",
                          backgroundColor: "#ff9800",
                          borderRadius: "4px",
                          transition: "width 0.3s ease",
                        }}
                      />
                    </div>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#666",
                        textAlign: "center",
                        marginTop: "4px",
                      }}
                    >
                      {downloadProgress}% complete
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="cards-grid" ref={cardsContainerRef}>
              {generatedCards.map((card, index) => (
                <div key={`${card.data.URL}-${index}`} className="card-preview">
                  <div className="card-preview-content">
                    <div
                      className="business-card-preview"
                      style={{
                        width: "480px", // 6in scaled down for preview
                        height: "840px", // 10.5in scaled down for preview
                        backgroundImage: "url(/bn.png)",
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        backgroundRepeat: "no-repeat",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "48px",
                        boxSizing: "border-box",
                        borderRadius: "24px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                      }}
                    >
                      <img
                        src={card.qrCodeDataUrl}
                        alt="QR Code"
                        style={{
                          width: "320px", // Increased QR code size
                          height: "320px",
                          backgroundColor: "transparent",
                          padding: "0px",
                          borderRadius: "0px",
                        }}
                      />
                    </div>
                    <div className="card-info">
                      <div className="card-name">{card.data.Name}</div>
                      <div className="card-url">{card.data.URL}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="download-single-button"
                    onClick={() => downloadCard(card)}
                  >
                    Download
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Hidden card for html2canvas */}
      {cardToDownload && (
        <div
          ref={hiddenCardRef}
          style={{
            position: "absolute",
            left: "-9999px",
            top: "-9999px",
            width: "576px", // 6in at 96 DPI
            height: "1008px", // 10.5in at 96 DPI
            backgroundImage: "url(/bn.png)",
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
              width: "400px", // Increased QR code size
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

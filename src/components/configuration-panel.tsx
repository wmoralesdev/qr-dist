import { useRef } from "react";
import { parseCSV, type BusinessCardData } from "../utils/csv-parser";
import { ColorInput } from "./color-input";
import { ImageUploader } from "./image-uploader";

interface ConfigurationPanelProps {
  csvData: BusinessCardData[];
  backgroundImage: string | null;
  qrCodeColor: string;
  brandingSvg: string | null;
  backSideImage: string | null;
  backSideSizePercent: number;
  onBackSideImageChange: (dataUrl: string | null) => void;
  onBackSideSizeChange: (percent: number) => void;
  isGenerating: boolean;
  isProcessing: boolean;
  downloadProgress: number;
  generatedCardsCount: number;
  slotsPerTabloid: number;
  isTabloidProcessing: boolean;
  tabloidProgress: number;
  onCSVUpload: (data: BusinessCardData[]) => void;
  onBackgroundImageChange: (dataUrl: string | null) => void;
  onQRCodeColorChange: (color: string) => void;
  onBrandingSvgChange: (dataUrl: string | null) => void;
  onGenerate: () => void;
  onDownloadAll: () => void;
  onDownloadTabloid: () => void;
}

export const ConfigurationPanel = ({
  csvData,
  backgroundImage,
  qrCodeColor,
  brandingSvg,
  backSideImage,
  backSideSizePercent,
  onBackSideImageChange,
  onBackSideSizeChange,
  isGenerating,
  isProcessing,
  downloadProgress,
  generatedCardsCount,
  slotsPerTabloid,
  isTabloidProcessing,
  tabloidProgress,
  onCSVUpload,
  onBackgroundImageChange,
  onQRCodeColorChange,
  onBrandingSvgChange,
  onGenerate,
  onDownloadAll,
  onDownloadTabloid,
}: ConfigurationPanelProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    parseCSV(file)
      .then((result) => {
        if (result.errors.length > 0) {
          console.warn("CSV parsing errors:", result.errors);
        }
        onCSVUpload(result.data);
      })
      .catch((error) => {
        console.error("Error parsing CSV:", error);
        alert("Error parsing CSV. Ensure your file has a URL column (required) and valid URLs.");
      });
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-cursor-card overflow-y-auto p-6 flex-[0_0_40%] min-w-[400px] max-w-[500px] md:flex-[0_0_40%]">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-cursor-text m-0 mb-2">Business Card Generator</h1>
        <p className="text-sm text-cursor-muted m-0">
          Upload a CSV with a <strong className="text-cursor-text">URL</strong> column (required) and optional <strong className="text-cursor-text">Name</strong> column. Each URL becomes a scannable QR code.
        </p>
      </div>

      <div className="flex flex-col gap-8">
        <section className="flex flex-col gap-4">
          <h2 className="text-base font-semibold text-cursor-text m-0 pb-2 border-b border-cursor-border">CSV File</h2>
          <p className="text-xs text-cursor-muted m-0 mb-1">
            Required: <code className="px-1 py-0.5 bg-cursor-input text-cursor-text">URL</code>. Optional: <code className="px-1 py-0.5 bg-cursor-input text-cursor-text">Name</code>
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            type="button"
            className="w-full px-6 py-3 border-none text-sm font-medium cursor-pointer transition-colors bg-cursor-accent text-white hover:bg-cursor-accent-hover"
            onClick={() => fileInputRef.current?.click()}
          >
            Upload CSV File
          </button>
          {csvData.length > 0 && (
            <p className="text-sm text-cursor-muted m-0">
              Loaded {csvData.length} entries (URLs ready for QR codes)
            </p>
          )}
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-base font-semibold text-cursor-text m-0 pb-2 border-b border-cursor-border">Card Design</h2>
          <ImageUploader
            value={backgroundImage}
            onChange={onBackgroundImageChange}
            label="Background Image"
            defaultImage="/bn.png"
          />
          <ColorInput
            value={qrCodeColor}
            onChange={onQRCodeColorChange}
            label="QR Code Color"
            defaultColor="#F7F7F4"
          />
          <p className="text-xs text-cursor-muted m-0 -mt-2">
            Also used for cutting lines on the tabloid PDF.
          </p>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-base font-semibold text-cursor-text m-0 pb-2 border-b border-cursor-border">Branding</h2>
          <ImageUploader
            value={brandingSvg}
            onChange={onBrandingSvgChange}
            label="Branding SVG (Optional)"
            accept="image/svg+xml"
            defaultImage={undefined}
          />
          <p className="text-xs text-cursor-muted m-0 mt-[-8px]">
            Upload a square SVG logo. It will be placed in the center of each QR code. Recommended size: 200×200px or similar.
          </p>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-base font-semibold text-cursor-text m-0 pb-2 border-b border-cursor-border">Tabloid Back Side</h2>
          <ImageUploader
            value={backSideImage}
            onChange={onBackSideImageChange}
            label="Back logo (tabloid only)"
            accept="image/*"
            defaultImage={undefined}
          />
          <p className="text-xs text-cursor-muted m-0 mt-[-8px]">
            Logo-like image centered on the back. Falls back to branding SVG if empty.
          </p>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-cursor-text">Back logo size (%)</label>
            <input
              type="number"
              min={5}
              max={50}
              value={backSideSizePercent}
              onChange={(e) => onBackSideSizeChange?.(Math.min(50, Math.max(5, Number(e.target.value) || 18)))}
              className="px-3 py-2.5 bg-cursor-input border border-cursor-border text-sm text-cursor-text focus:outline-none focus:border-cursor-highlight"
            />
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-base font-semibold text-cursor-text m-0 pb-2 border-b border-cursor-border">Actions</h2>
          <button
            type="button"
            className="w-full px-6 py-3 border-none text-sm font-medium cursor-pointer transition-colors bg-cursor-accent text-white hover:bg-cursor-accent-hover disabled:bg-cursor-disabled disabled:text-cursor-disabled-text disabled:cursor-not-allowed"
            onClick={onGenerate}
            disabled={isGenerating || csvData.length === 0}
          >
            {isGenerating ? "Generating QR Codes..." : "Generate Business Cards"}
          </button>

          {generatedCardsCount > 0 && (
            <div className="p-3 bg-cursor-input border border-cursor-border">
              <p className="text-sm text-cursor-text m-0 font-medium">
                {generatedCardsCount} card{generatedCardsCount !== 1 ? "s" : ""} generated
              </p>
            </div>
          )}

          {generatedCardsCount > 0 && (
            <>
              <button
                type="button"
                className="w-full px-6 py-3 border-none text-sm font-medium cursor-pointer transition-colors bg-cursor-accent text-white hover:bg-cursor-accent-hover disabled:bg-cursor-disabled disabled:text-cursor-disabled-text disabled:cursor-not-allowed"
                onClick={onDownloadAll}
                disabled={isProcessing || isTabloidProcessing}
              >
                {isProcessing ? "Downloading..." : "Download All Cards"}
              </button>
              {isProcessing && (
                <div className="flex flex-col gap-2">
                  <div className="w-full h-2 bg-cursor-disabled overflow-hidden">
                    <div
                      className="h-full bg-cursor-accent transition-all duration-300"
                      style={{ width: `${downloadProgress}%` }}
                    />
                  </div>
                  <div className="text-xs text-cursor-muted text-center">{downloadProgress}% complete</div>
                </div>
              )}

              {/* Tabloid PDF section */}
              <div className="mt-4 pt-4 border-t border-cursor-border">
                <p className="text-xs text-cursor-muted m-0 mb-2">
                  Tabloid: 11×17" page, {slotsPerTabloid} cards per page (~3.67×2.125" each). {Math.ceil(generatedCardsCount / slotsPerTabloid)} QR page{Math.ceil(generatedCardsCount / slotsPerTabloid) !== 1 ? "s" : ""} needed.
                </p>
                <button
                  type="button"
                  className="w-full px-6 py-3 border-none text-sm font-medium cursor-pointer transition-colors bg-cursor-highlight text-white hover:opacity-90 disabled:bg-cursor-disabled disabled:text-cursor-disabled-text disabled:cursor-not-allowed"
                  onClick={onDownloadTabloid}
                  disabled={isProcessing || isTabloidProcessing}
                >
                  {isTabloidProcessing ? "Generating PDFs..." : "Download Tabloid PDFs"}
                </button>
                {isTabloidProcessing && (
                  <div className="flex flex-col gap-2 mt-2">
                    <div className="w-full h-2 bg-cursor-disabled overflow-hidden">
                      <div
                        className="h-full bg-cursor-highlight transition-all duration-300"
                        style={{ width: `${tabloidProgress}%` }}
                      />
                    </div>
                    <div className="text-xs text-cursor-muted text-center">{tabloidProgress}% complete</div>
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
};

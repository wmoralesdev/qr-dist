import { useRef } from "react";
import { parseCSV, type BusinessCardData } from "../utils/csvParser";
import { ColorInput } from "./ColorInput";
import { ImageUploader } from "./ImageUploader";

interface ConfigurationPanelProps {
  csvData: BusinessCardData[];
  backgroundImage: string | null;
  qrCodeColor: string;
  isGenerating: boolean;
  isProcessing: boolean;
  downloadProgress: number;
  generatedCardsCount: number;
  onCSVUpload: (data: BusinessCardData[]) => void;
  onBackgroundImageChange: (dataUrl: string | null) => void;
  onQRCodeColorChange: (color: string) => void;
  onGenerate: () => void;
  onDownloadAll: () => void;
}

export const ConfigurationPanel = ({
  csvData,
  backgroundImage,
  qrCodeColor,
  isGenerating,
  isProcessing,
  downloadProgress,
  generatedCardsCount,
  onCSVUpload,
  onBackgroundImageChange,
  onQRCodeColorChange,
  onGenerate,
  onDownloadAll,
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
        alert("Error parsing CSV file. Please check the format.");
      });
  };

  return (
    <div className="flex flex-col h-screen bg-[#2a2a2a] overflow-y-auto p-6 flex-[0_0_40%] min-w-[400px] max-w-[500px] md:flex-[0_0_40%] md:max-h-none md:min-h-0">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#e0e0e0] m-0 mb-2">Business Card Generator</h1>
        <p className="text-sm text-[#a0a0a0] m-0">Upload a CSV file with URL and Name columns to generate QR code business cards</p>
      </div>

      <div className="flex flex-col gap-8">
        <section className="flex flex-col gap-4">
          <h2 className="text-base font-semibold text-[#e0e0e0] m-0 pb-2 border-b border-[#404040]">CSV File</h2>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            type="button"
            className="w-full px-6 py-3 border-none rounded-md text-sm font-medium cursor-pointer transition-colors bg-[#22c55e] text-white hover:bg-[#16a34a]"
            onClick={() => fileInputRef.current?.click()}
          >
            Upload CSV File
          </button>
          {csvData.length > 0 && (
            <p className="text-sm text-[#a0a0a0] m-0">
              Loaded {csvData.length} entries from CSV
            </p>
          )}
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-base font-semibold text-[#e0e0e0] m-0 pb-2 border-b border-[#404040]">Card Design</h2>
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
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-base font-semibold text-[#e0e0e0] m-0 pb-2 border-b border-[#404040]">Actions</h2>
          <button
            type="button"
            className="w-full px-6 py-3 border-none rounded-md text-sm font-medium cursor-pointer transition-colors bg-[#3b82f6] text-white hover:bg-[#2563eb] disabled:bg-[#404040] disabled:text-[#666] disabled:cursor-not-allowed"
            onClick={onGenerate}
            disabled={isGenerating || csvData.length === 0}
          >
            {isGenerating ? "Generating QR Codes..." : "Generate Business Cards"}
          </button>

          {generatedCardsCount > 0 && (
            <div className="p-3 bg-[#333333] rounded-md border border-[#404040]">
              <p className="text-sm text-[#e0e0e0] m-0 font-medium">
                {generatedCardsCount} card{generatedCardsCount !== 1 ? "s" : ""} generated
              </p>
            </div>
          )}

          {generatedCardsCount > 0 && (
            <>
              <button
                type="button"
                className="w-full px-6 py-3 border-none rounded-md text-sm font-medium cursor-pointer transition-colors bg-[#f59e0b] text-white hover:bg-[#d97706] disabled:bg-[#404040] disabled:text-[#666] disabled:cursor-not-allowed"
                onClick={onDownloadAll}
                disabled={isProcessing}
              >
                {isProcessing ? "Downloading..." : "Download All Cards"}
              </button>
              {isProcessing && (
                <div className="flex flex-col gap-2">
                  <div className="w-full h-2 bg-[#404040] rounded overflow-hidden">
                    <div
                      className="h-full bg-[#f59e0b] rounded transition-all duration-300"
                      style={{ width: `${downloadProgress}%` }}
                    />
                  </div>
                  <div className="text-xs text-[#a0a0a0] text-center">{downloadProgress}% complete</div>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
};

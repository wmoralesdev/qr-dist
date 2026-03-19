import { useRef, type ReactNode } from "react";
import { toast } from "sonner";
import { parseCSV, type BusinessCardData } from "../utils/csv-parser";
import type { CardOrientation } from "../utils/card-layout";
import { ColorInput } from "./color-input";
import { ImageUploader } from "./image-uploader";

interface ConfigurationPanelProps {
  csvData: BusinessCardData[];
  backgroundImage: string | null;
  /** Resolved front URL (includes default asset when front is empty) */
  resolvedFrontBackgroundUrl: string;
  backBackgroundImage: string | null;
  backBackgroundSameAsFront: boolean;
  qrCodeColor: string;
  brandingSvg: string | null;
  backSideImage: string | null;
  backSideSizePercent: number;
  cardOrientation: CardOrientation;
  onCardOrientationChange: (orientation: CardOrientation) => void;
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
  onBackBackgroundImageChange: (dataUrl: string | null) => void;
  onBackBackgroundSameAsFrontChange: (sameAsFront: boolean) => void;
  onQRCodeColorChange: (color: string) => void;
  onBrandingSvgChange: (dataUrl: string | null) => void;
  onGenerate: () => void;
  onDownloadAll: () => void;
  onDownloadTabloid: () => void;
}

function PanelGroup({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="border-b border-cursor-border pb-6 last:border-b-0">
      <header className="mb-4">
        <h2 className="m-0 text-base font-semibold text-balance text-cursor-text">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 mb-0 text-pretty text-xs leading-relaxed text-cursor-muted">
            {description}
          </p>
        ) : null}
      </header>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

export const ConfigurationPanel = ({
  csvData,
  backgroundImage,
  resolvedFrontBackgroundUrl,
  backBackgroundImage,
  backBackgroundSameAsFront,
  qrCodeColor,
  brandingSvg,
  backSideImage,
  backSideSizePercent,
  cardOrientation,
  onCardOrientationChange,
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
  onBackBackgroundImageChange,
  onBackBackgroundSameAsFrontChange,
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
        toast.error(
          "Couldn’t read that CSV. Add a URL column (Name is optional)."
        );
      });
  };

  const tabloidPages =
    generatedCardsCount > 0
      ? Math.ceil(generatedCardsCount / slotsPerTabloid)
      : 0;

  const orientationBtn = (o: CardOrientation, label: string) => {
    const on = cardOrientation === o;
    return (
      <button
        key={o}
        type="button"
        className={`flex-1 cursor-pointer border px-3 py-2.5 text-sm font-medium transition-colors ${
          on
            ? "border-cursor-accent bg-cursor-accent text-white"
            : "border-cursor-border bg-cursor-input text-cursor-muted hover:border-cursor-accent/50 hover:text-cursor-text"
        }`}
        onClick={() => onCardOrientationChange(o)}
      >
        {label}
      </button>
    );
  };

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-y-auto overflow-x-hidden bg-cursor-card p-5">
      <header className="mb-5 shrink-0 border-b border-cursor-border pb-4">
        <h1 className="m-0 text-xl font-bold text-balance text-cursor-text">
          Business cards
        </h1>
        <p className="mt-2 mb-0 text-pretty text-sm leading-relaxed text-cursor-muted">
          Add your list, tweak the layout, then export PNGs or a print-ready
          tabloid PDF.
        </p>
      </header>

      <div className="flex flex-col pb-2">
        <PanelGroup
          title="1 · Your list"
          description="CSV with a URL column for each QR code. Optional Name column for filenames."
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            type="button"
            className="w-full cursor-pointer border-none bg-cursor-accent px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-cursor-accent-hover"
            onClick={() => fileInputRef.current?.click()}
          >
            Choose CSV…
          </button>
          {csvData.length > 0 ? (
            <p className="m-0 text-sm tabular-nums text-cursor-text">
              <span className="font-medium">{csvData.length}</span> rows loaded
              — previews update automatically.
            </p>
          ) : (
            <p className="m-0 text-xs text-cursor-muted">
              No file yet. Exported cards use each row’s URL as the QR target.
            </p>
          )}
        </PanelGroup>

        <PanelGroup
          title="2 · Card layout"
          description="Backgrounds apply to the physical front and back. Orientation matches exports and the tabloid sheet."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:items-stretch">
            <div className="flex min-h-[288px] flex-col justify-between gap-3">
              <div className="shrink-0">
                <div className="text-sm font-medium text-cursor-text">Front</div>
                <p className="mt-0.5 mb-0 text-pretty text-xs text-cursor-muted">
                  QR side
                </p>
              </div>
              <ImageUploader
                value={backgroundImage}
                onChange={onBackgroundImageChange}
                label="Front"
                accessibilityLabel="Front background"
                hideLabel
                compact
              />
            </div>
            <div className="flex min-h-[288px] flex-col justify-between gap-3">
              <div className="shrink-0 flex flex-col gap-2">
                <div className="text-sm font-medium text-cursor-text">Back</div>
                <label className="flex cursor-pointer items-start gap-2.5">
                  <input
                    type="checkbox"
                    checked={backBackgroundSameAsFront}
                    onChange={(e) =>
                      onBackBackgroundSameAsFrontChange(e.target.checked)
                    }
                    className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-cursor-accent"
                  />
                  <span className="text-sm leading-snug text-cursor-text">
                    Use same as front
                  </span>
                </label>
                {backBackgroundSameAsFront ? (
                  <p className="mb-0 text-pretty text-xs text-cursor-muted">
                    Back uses the front background.
                  </p>
                ) : (
                  <div>
                    <div className="text-sm font-medium text-cursor-text">
                      Custom image
                    </div>
                    <p className="mt-0.5 mb-0 text-pretty text-xs text-cursor-muted">
                      Leave empty for a solid back (no image).
                    </p>
                  </div>
                )}
              </div>
              {backBackgroundSameAsFront ? (
                <div className="flex shrink-0 flex-col gap-2">
                  <div
                    className="aspect-[8/5] max-h-[112px] min-h-[88px] w-full cursor-default overflow-hidden border-2 border-dashed border-cursor-border bg-cursor-input/50"
                    aria-hidden
                  >
                    <img
                      src={resolvedFrontBackgroundUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </div>
                  {/* Match compact ImageUploader button row height so drop zones line up */}
                  <div className="min-h-[42px] shrink-0" aria-hidden />
                </div>
              ) : (
                <ImageUploader
                  value={backBackgroundImage}
                  onChange={onBackBackgroundImageChange}
                  label="Back background"
                  accessibilityLabel="Back background"
                  hideLabel
                  compact
                  useDefaultWhenEmpty={false}
                />
              )}
            </div>
          </div>

          <div>
            <span className="text-sm font-medium text-cursor-text">
              Orientation
            </span>
            <div className="mt-2 flex gap-2">
              {orientationBtn("vertical", "Portrait")}
              {orientationBtn("horizontal", "Landscape")}
            </div>
          </div>

          <ColorInput
            value={qrCodeColor}
            onChange={onQRCodeColorChange}
            label="QR & cut lines"
            defaultColor="#F7F7F4"
            hint="Used for the QR modules and tabloid cut guides."
          />
        </PanelGroup>

        <PanelGroup
          title="3 · QR center (optional)"
          description="Square SVG sits in the middle of each code (high error correction)."
        >
          <ImageUploader
            value={brandingSvg}
            onChange={onBrandingSvgChange}
            label="Logo"
            accept="image/svg+xml"
            compact
            useDefaultWhenEmpty={false}
            hint="SVG recommended (~200×200)."
          />
        </PanelGroup>

        <section className="border-b border-cursor-border pb-6 last:border-b-0">
          <details className="group">
            <summary className="cursor-pointer list-none marker:hidden [&::-webkit-details-marker]:hidden">
              <span className="flex items-baseline justify-between gap-2">
                <span className="text-base font-semibold text-cursor-text">
                  Tabloid back (print sheet)
                </span>
                <span className="shrink-0 text-xs font-normal text-cursor-muted">
                  Optional
                </span>
              </span>
            </summary>
            <div className="mt-4 flex flex-col gap-4">
            <p className="m-0 text-xs text-pretty text-cursor-muted">
              First PDF page repeats this logo on every back slot; QR fronts
              follow. If empty, your branding SVG is used.
            </p>
            <ImageUploader
              value={backSideImage}
              onChange={onBackSideImageChange}
              label="Back-of-sheet logo"
              accept="image/*"
              compact
              useDefaultWhenEmpty={false}
            />
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-cursor-text">
                Logo size on card (% width)
              </label>
              <input
                type="number"
                min={5}
                max={50}
                value={backSideSizePercent}
                onChange={(e) =>
                  onBackSideSizeChange?.(
                    Math.min(50, Math.max(5, Number(e.target.value) || 18))
                  )
                }
                className="w-full border border-cursor-border bg-cursor-input px-3 py-2.5 text-sm tabular-nums text-cursor-text focus:border-cursor-accent focus:outline-none"
              />
            </div>
          </div>
        </details>
        </section>

        <PanelGroup
          title="Export"
          description={
            generatedCardsCount > 0
              ? "Refresh QR bitmaps after you change color or logo."
              : "Generate previews by loading a CSV, then download here."
          }
        >
          <button
            type="button"
            className="w-full cursor-pointer border border-cursor-border bg-transparent px-4 py-2.5 text-sm font-medium text-cursor-text transition-colors hover:bg-cursor-hover disabled:cursor-not-allowed disabled:opacity-50"
            onClick={onGenerate}
            disabled={isGenerating || csvData.length === 0}
          >
            {csvData.length === 0
              ? "Load a CSV first"
              : isGenerating
                ? "Refreshing…"
                : generatedCardsCount > 0
                  ? "Refresh all QR images"
                  : "Build QR previews"}
          </button>

          {generatedCardsCount > 0 ? (
            <div className="flex flex-col gap-3 border-t border-cursor-border pt-3">
              <p className="m-0 text-sm font-medium tabular-nums text-cursor-text">
                {generatedCardsCount} card
                {generatedCardsCount !== 1 ? "s" : ""} ready
              </p>
              <button
                type="button"
                className="w-full cursor-pointer border-none bg-cursor-accent px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-cursor-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
                onClick={onDownloadAll}
                disabled={isProcessing || isTabloidProcessing}
              >
                {isProcessing ? "Saving…" : "Download all as PNG"}
              </button>
              {isProcessing ? (
                <div className="flex flex-col gap-1.5">
                  <div className="h-1.5 overflow-hidden bg-cursor-disabled">
                    <div
                      className="h-full bg-cursor-accent transition-all duration-300"
                      style={{ width: `${downloadProgress}%` }}
                    />
                  </div>
                  <p className="m-0 text-center text-xs tabular-nums text-cursor-muted">
                    {downloadProgress}%
                  </p>
                </div>
              ) : null}

              <div className="flex flex-col gap-2">
                <p className="m-0 text-xs text-pretty text-cursor-muted">
                  11×17″ tabloid · {slotsPerTabloid} per page
                  {tabloidPages > 0
                    ? ` · ${tabloidPages} QR page${tabloidPages !== 1 ? "s" : ""}`
                    : ""}
                </p>
                <button
                  type="button"
                  className="w-full cursor-pointer border border-cursor-accent bg-transparent px-4 py-2.5 text-sm font-medium text-cursor-accent transition-colors hover:bg-cursor-accent/10 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={onDownloadTabloid}
                  disabled={isProcessing || isTabloidProcessing}
                >
                  {isTabloidProcessing ? "Building PDF…" : "Download tabloid PDF"}
                </button>
                {isTabloidProcessing ? (
                  <div className="flex flex-col gap-1.5">
                    <div className="h-1.5 overflow-hidden bg-cursor-disabled">
                      <div
                        className="h-full bg-cursor-accent transition-all duration-300"
                        style={{ width: `${tabloidProgress}%` }}
                      />
                    </div>
                    <p className="m-0 text-center text-xs tabular-nums text-cursor-muted">
                      {tabloidProgress}%
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </PanelGroup>
      </div>
    </div>
  );
};

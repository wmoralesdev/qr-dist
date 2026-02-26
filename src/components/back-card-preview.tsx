const DEFAULT_LOGO_PATH = "/logo.svg";

interface BackCardPreviewProps {
  backgroundImage: string;
  backImage: string | null; // data URL or path for logo-like image
  brandingSvg: string | null; // fallback when backImage is empty
  sizePercent: number;
  previewSize?: "small" | "large";
}

export const BackCardPreview = ({
  backgroundImage,
  backImage,
  brandingSvg,
  sizePercent,
  previewSize = "large",
}: BackCardPreviewProps) => {
  const cardWidth = previewSize === "large" ? 480 : 240;
  const cardHeight = previewSize === "large" ? 840 : 420;
  const overlaySize = Math.round(cardWidth * (sizePercent / 100));
  const src = backImage || brandingSvg || DEFAULT_LOGO_PATH;

  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-xs text-cursor-muted">Back</span>
      <div
        className="transition-transform hover:scale-[1.02]"
        style={{
          width: `${cardWidth}px`,
          height: `${cardHeight}px`,
          backgroundImage: `url(${backgroundImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxSizing: "border-box",
          boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
        }}
      >
        <img
          src={src}
          alt="Back logo"
          style={{
            width: overlaySize,
            height: overlaySize,
            objectFit: "contain",
          }}
        />
      </div>
    </div>
  );
};

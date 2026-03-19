import type { CardOrientation } from "../utils/card-layout";
import { getPreviewCardPixelSize } from "../utils/card-layout";

const DEFAULT_LOGO_PATH = "/logo.svg";
const EMPTY_BACK_FILL = "#14120B";

interface BackCardPreviewProps {
  /** When null, a solid fill is used (matches PDF export for empty back). */
  backgroundImage: string | null;
  backImage: string | null; // data URL or path for logo-like image
  brandingSvg: string | null; // fallback when backImage is empty
  sizePercent: number;
  previewSize?: "small" | "large";
  orientation?: CardOrientation;
}

export const BackCardPreview = ({
  backgroundImage,
  backImage,
  brandingSvg,
  sizePercent,
  previewSize = "large",
  orientation = "vertical",
}: BackCardPreviewProps) => {
  const { width: cardWidth, height: cardHeight } = getPreviewCardPixelSize(
    orientation,
    previewSize
  );
  // Match tabloid: % of full card width
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
          ...(backgroundImage
            ? {
                backgroundImage: `url(${backgroundImage})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
              }
            : { backgroundColor: EMPTY_BACK_FILL }),
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxSizing: "border-box",
          boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          outline: "1px solid rgba(255,255,255,0.18)",
          outlineOffset: "0px",
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

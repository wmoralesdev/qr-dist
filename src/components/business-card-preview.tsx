import { QRCodeSVG } from "qrcode.react";

interface BusinessCardPreviewProps {
  qrCodeDataUrl?: string;
  url?: string;
  qrColor?: string;
  brandingSvg?: string | null;
  backgroundImage: string;
  name?: string;
  previewSize?: "small" | "large";
}

export const BusinessCardPreview = ({
  qrCodeDataUrl,
  url,
  qrColor = "#F7F7F4",
  brandingSvg,
  backgroundImage,
  name,
  previewSize = "large",
}: BusinessCardPreviewProps) => {
  const cardWidth = previewSize === "large" ? "480px" : "240px";
  const cardHeight = previewSize === "large" ? "840px" : "420px";
  const qrSize = previewSize === "large" ? 320 : 160;
  const cardPadding = previewSize === "large" ? "48px" : "24px";

  // Calculate image settings for the logo
  // The excavate area is determined by width/height, so we need to calculate
  // dimensions that maintain aspect ratio while fitting in the desired square area
  const logoSize = qrSize * 0.2; // Target square size
  // For aspect ratio 38:44 (width:height), height is larger
  // So we constrain by height and calculate width proportionally
  const imageSettings = brandingSvg
    ? {
        src: brandingSvg,
        width: logoSize * (38 / 44), // Width scaled to maintain aspect ratio
        height: logoSize, // Height at full square size
        excavate: true,
      }
    : undefined;

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        className="transition-transform hover:scale-[1.02]"
        style={{
          width: cardWidth,
          height: cardHeight,
          backgroundImage: `url(${backgroundImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: cardPadding,
          boxSizing: "border-box",
          boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
        }}
      >
        {qrCodeDataUrl ? (
          <img
            src={qrCodeDataUrl}
            alt="QR Code"
            style={{
              width: `${qrSize}px`,
              height: `${qrSize}px`,
              backgroundColor: "transparent",
              padding: "0px",
              borderRadius: "0px",
            }}
          />
        ) : url ? (
          <QRCodeSVG
            value={url}
            size={qrSize}
            level="H"
            marginSize={2}
            fgColor={qrColor}
            bgColor="transparent"
            imageSettings={imageSettings}
          />
        ) : null}
      </div>
      {(name || url) && (
        <div className="text-center max-w-[480px]">
          {name && <div className="text-base font-semibold text-cursor-text mb-1">{name}</div>}
          {url && <div className="text-xs text-cursor-muted break-all">{url}</div>}
        </div>
      )}
    </div>
  );
};

interface BusinessCardPreviewProps {
  qrCodeDataUrl: string;
  backgroundImage: string;
  name?: string;
  url?: string;
  previewSize?: "small" | "large";
}

export const BusinessCardPreview = ({
  qrCodeDataUrl,
  backgroundImage,
  name,
  url,
  previewSize = "large",
}: BusinessCardPreviewProps) => {
  const cardWidth = previewSize === "large" ? "480px" : "240px";
  const cardHeight = previewSize === "large" ? "840px" : "420px";
  const qrSize = previewSize === "large" ? "320px" : "160px";
  const cardPadding = previewSize === "large" ? "48px" : "24px";

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
          borderRadius: "24px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
        }}
      >
        <img
          src={qrCodeDataUrl}
          alt="QR Code"
          style={{
            width: qrSize,
            height: qrSize,
            backgroundColor: "transparent",
            padding: "0px",
            borderRadius: "0px",
          }}
        />
      </div>
      {(name || url) && (
        <div className="text-center max-w-[480px]">
          {name && <div className="text-base font-semibold text-[#e0e0e0] mb-1">{name}</div>}
          {url && <div className="text-xs text-[#a0a0a0] break-all">{url}</div>}
        </div>
      )}
    </div>
  );
};

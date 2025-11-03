import { useEffect, useState } from "react";
import { generateQRCodeDataUrl as generateQRCodeUtil, type QRCodeColors, type QRCodeOptions } from "../utils/qrGenerator";

export type { QRCodeColors };

export interface QRCodeProps {
  url: string;
  width?: number;
  height?: number;
  colors?: QRCodeColors;
  size?: number; // Size in pixels for the QR code
  margin?: number;
  errorCorrectionLevel?: "L" | "M" | "Q" | "H";
  roundedCorners?: boolean;
  centerImage?: string; // Path to center image (SVG or PNG)
  centerImageSize?: number; // Size of center image as percentage of QR code (default 20)
  className?: string;
  style?: React.CSSProperties;
}

export const QRCode: React.FC<QRCodeProps> = ({
  url,
  width,
  height,
  colors = { dark: "#FFFFFF", light: "#14120B" },
  size = 200,
  margin = 2,
  errorCorrectionLevel = "M",
  roundedCorners = true,
  centerImage,
  centerImageSize = 20,
  className,
  style,
}) => {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");

  useEffect(() => {
    const generateQRCode = async () => {
      try {
        const options: QRCodeOptions = {
          colors,
          size,
          margin,
          errorCorrectionLevel,
          roundedCorners,
          centerImage,
          centerImageSize,
        };
        const dataUrl = await generateQRCodeUtil(url, options);
        setQrCodeDataUrl(dataUrl);
      } catch (error) {
        console.error("Error generating QR code:", error);
      }
    };

    generateQRCode();
  }, [url, colors, size, margin, errorCorrectionLevel, roundedCorners, centerImage, centerImageSize]);

  if (!qrCodeDataUrl) {
    return null;
  }

  return (
    <img
      src={qrCodeDataUrl}
      alt="QR Code"
      width={width}
      height={height}
      className={className}
      style={style}
    />
  );
};

// Re-export utility function for backward compatibility
export { generateQRCodeDataUrl } from "../utils/qrGenerator";


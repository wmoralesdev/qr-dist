import { QRCodeSVG } from "qrcode.react";
import type { QRCodeColors } from "../utils/qr-generator";

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
  centerImage,
  centerImageSize = 20,
  className,
  style,
}) => {
  // Handle transparent background
  const bgColor =
    colors.light === "none" || colors.light === "transparent" || !colors.light
      ? "transparent"
      : colors.light;

  // Calculate image settings for the logo
  const imageSettings = centerImage
    ? {
        src: centerImage,
        height: (size * centerImageSize) / 100,
        width: (size * centerImageSize) / 100,
        excavate: true, // This will clear the QR code area behind the logo
      }
    : undefined;

  return (
    <div style={{ width: width || size, height: height || size, ...style }} className={className}>
      <QRCodeSVG
        value={url}
        size={size}
        level={errorCorrectionLevel}
        marginSize={margin}
        fgColor={colors.dark || "#FFFFFF"}
        bgColor={bgColor}
        imageSettings={imageSettings}
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
};


import { QRCodeSVG } from "qrcode.react";
import { renderToStaticMarkup } from "react-dom/server";

export interface QRCodeColors {
  dark?: string; // Color of QR code modules
  light?: string; // Background color
}

export interface QRCodeOptions {
  colors?: QRCodeColors;
  size?: number;
  margin?: number;
  errorCorrectionLevel?: "L" | "M" | "Q" | "H";
  roundedCorners?: boolean;
  centerImage?: string;
  centerImageSize?: number;
}

export const generateQRCodeDataUrl = async (
  url: string,
  options?: QRCodeOptions
): Promise<string> => {
  const {
    colors = { dark: "#FFFFFF", light: "#14120B" },
    size = 400,
    margin = 2,
    errorCorrectionLevel = "M",
    centerImage,
    centerImageSize = 20,
  } = options || {};

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

  // Render QRCodeSVG component to string
  const qrCodeElement = (
    <QRCodeSVG
      value={url}
      size={size}
      level={errorCorrectionLevel}
      marginSize={margin}
      fgColor={colors.dark || "#FFFFFF"}
      bgColor={bgColor}
      imageSettings={imageSettings}
    />
  );

  const svgString = renderToStaticMarkup(qrCodeElement);

  // Convert SVG string to data URL
  const encodedSvg = encodeURIComponent(svgString);
  return `data:image/svg+xml;charset=utf-8,${encodedSvg}`;
};


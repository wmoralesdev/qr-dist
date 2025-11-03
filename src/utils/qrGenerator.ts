import QRCodeLib from "qrcode";

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
    size = 200,
    margin = 2,
    errorCorrectionLevel = "M",
    roundedCorners = true,
    centerImage,
    centerImageSize = 20,
  } = options || {};

  // Use a temporary color for light if transparent is requested
  const lightColor =
    colors.light === "none" ||
    colors.light === "transparent" ||
    !colors.light
      ? "#000000" // Temporary color, will be made transparent
      : colors.light || "#14120B";

  const svgString = await QRCodeLib.toString(url, {
    type: "svg",
    width: size,
    margin,
    color: {
      dark: colors.dark || "#FFFFFF",
      light: lightColor,
    },
    errorCorrectionLevel,
  });

  // Handle transparent background
  let processedSvg = svgString;
  if (
    colors.light === "none" ||
    colors.light === "transparent" ||
    !colors.light
  ) {
    // Replace the background color with transparency
    processedSvg = svgString
      // First, remove any existing style attribute from svg tag
      .replace(/<svg([^>]*)style="[^"]*"([^>]*)>/, "<svg$1$2>")
      // Add transparent background style to svg
      .replace(/<svg([^>]*)>/, '<svg$1 style="background: transparent;">')
      // Replace the light color (black) with transparent in all rect elements
      .replace(/fill="#000000"/g, 'fill="transparent"')
      .replace(/fill="rgb\(0,0,0\)"/g, 'fill="transparent"')
      .replace(/fill="black"/g, 'fill="transparent"');
  }

  let svgWithRoundedCorners = roundedCorners
    ? processedSvg.replace(/<rect[^>]*>/g, (match) => {
        // Skip background rects (transparent fills)
        if (
          match.includes('fill="transparent"') ||
          match.includes('fill="none"')
        ) {
          return match;
        }

        const xMatch = match.match(/x="([^"]*)"/);
        const yMatch = match.match(/y="([^"]*)"/);
        const widthMatch = match.match(/width="([^"]*)"/);
        const heightMatch = match.match(/height="([^"]*)"/);

        if (xMatch && yMatch && widthMatch && heightMatch) {
          const x = xMatch[1];
          const y = yMatch[1];
          const width = widthMatch[1];
          const height = heightMatch[1];
          const radius = Math.min(parseFloat(width), parseFloat(height)) * 0.2;

          return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${radius}" ry="${radius}"/>`;
        }
        return match;
      })
    : processedSvg;

  // Add center image if provided
  let finalSvgString = svgWithRoundedCorners;
  if (centerImage) {
    // Calculate center image dimensions
    const imgSize = (size * centerImageSize) / 100;
    const imgX = (size - imgSize) / 2;
    const imgY = (size - imgSize) / 2;
    const padding = imgSize * 0.1; // 10% padding around image
    const bgSize = imgSize + padding * 2;
    const bgX = imgX - padding;
    const bgY = imgY - padding;

    // Insert center image just before closing </svg> tag
    const centerImageElement = `
      <!-- Center Image Background -->
      <rect x="${bgX}" y="${bgY}" width="${bgSize}" height="${bgSize}" 
            fill="white" fill-opacity="0.9" 
            rx="${bgSize * 0.15}" ry="${bgSize * 0.15}"/>
      <!-- Center Image -->
      <image x="${imgX}" y="${imgY}" width="${imgSize}" height="${imgSize}" 
             href="${centerImage}" preserveAspectRatio="xMidYMid meet"/>`;

    finalSvgString = finalSvgString.replace(
      "</svg>",
      centerImageElement + "</svg>"
    );
  }

  const encodedSvg = encodeURIComponent(finalSvgString);
  return `data:image/svg+xml;charset=utf-8,${encodedSvg}`;
};


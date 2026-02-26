/**
 * Utilities for converting SVG content to PNG data URLs via an offscreen canvas.
 */

/**
 * Ensure SVG has xmlns attribute required for Image() rasterization.
 */
function ensureXmlns(svgText: string): string {
  if (svgText.includes("xmlns=")) {
    return svgText;
  }
  return svgText.replace(/<svg(\s|>)/i, '<svg xmlns="http://www.w3.org/2000/svg"$1');
}

export interface SvgToPngOptions {
  width: number;
  height: number;
  backgroundColor?: string;
}

/**
 * Convert an SVG data URL (or a raw SVG string) to a PNG data URL.
 */
export async function svgToPngDataUrl(
  svgSource: string,
  options: SvgToPngOptions
): Promise<string> {
  const { width, height, backgroundColor } = options;

  let svgDataUrl: string;
  let svgTextForBlob: string | null = null;

  if (svgSource.startsWith("data:image/svg+xml")) {
    if (svgSource.includes(";base64,")) {
      svgDataUrl = svgSource;
    } else {
      const commaIndex = svgSource.indexOf(",");
      const encodedPayload = commaIndex >= 0 ? svgSource.slice(commaIndex + 1) : "";
      const decodedSvgText = ensureXmlns(decodeURIComponent(encodedPayload));
      svgTextForBlob = decodedSvgText;
      svgDataUrl = `data:image/svg+xml;base64,${btoa(
        unescape(encodeURIComponent(decodedSvgText))
      )}`;
    }
  } else if (svgSource.startsWith("<svg") || svgSource.startsWith("<?xml")) {
    const normalizedSvg = ensureXmlns(svgSource);
    svgTextForBlob = normalizedSvg;
    svgDataUrl = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(normalizedSvg)))}`;
  } else {
    const response = await fetch(svgSource);
    const svgText = ensureXmlns(await response.text());
    svgTextForBlob = svgText;
    svgDataUrl = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgText)))}`;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    let triedBlobFallback = false;
    let blobUrlToRevoke: string | null = null;

    const finish = () => {
      if (blobUrlToRevoke) {
        URL.revokeObjectURL(blobUrlToRevoke);
        blobUrlToRevoke = null;
      }
    };

    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        finish();
        reject(new Error("Could not get canvas 2D context"));
        return;
      }

      if (backgroundColor) {
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, width, height);
      }

      ctx.drawImage(img, 0, 0, width, height);

      finish();
      resolve(canvas.toDataURL("image/png", 1.0));
    };

    img.onerror = () => {
      if (!triedBlobFallback && svgTextForBlob) {
        triedBlobFallback = true;
        const blob = new Blob([svgTextForBlob], { type: "image/svg+xml" });
        const blobUrl = URL.createObjectURL(blob);
        blobUrlToRevoke = blobUrl;
        img.src = blobUrl;
        return;
      }

      finish();
      reject(new Error("Failed to load SVG image"));
    };

    img.src = svgDataUrl;
  });
}

/**
 * Fetch an SVG from a URL and return its text content.
 */
export async function fetchSvgText(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch SVG: ${response.statusText}`);
  }
  return response.text();
}

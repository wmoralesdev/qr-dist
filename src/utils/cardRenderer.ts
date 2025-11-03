import html2canvas from "html2canvas";

export interface CardRenderOptions {
  width?: number;
  height?: number;
  backgroundColor?: string;
  scale?: number;
}

const DEFAULT_OPTIONS: CardRenderOptions = {
  width: 576, // 6in at 96 DPI
  height: 1008, // 10.5in at 96 DPI
  scale: 1,
  backgroundColor: "#14120B",
};

export const renderCardToCanvas = async (
  element: HTMLElement,
  options?: CardRenderOptions
): Promise<string> => {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Wait for React to update the DOM and ensure the element is rendered
  await new Promise((resolve) => setTimeout(resolve, 200));

  // Preload any background images to ensure they're ready
  const bgImage = window.getComputedStyle(element).backgroundImage;
  if (bgImage && bgImage !== "none") {
    const urlMatch = bgImage.match(/url\(["']?([^"')]+)["']?\)/);
    if (urlMatch && urlMatch[1]) {
      await new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(undefined);
        img.onerror = () => resolve(undefined); // Continue even if image fails to load
        img.src = urlMatch[1];
      });
    }
  }

  // Additional wait to ensure background image is applied
  await new Promise((resolve) => setTimeout(resolve, 100));

  const canvas = await html2canvas(element, {
    width: opts.width,
    height: opts.height,
    scale: opts.scale,
    useCORS: true,
    allowTaint: true,
    backgroundColor: opts.backgroundColor,
    logging: false,
    imageTimeout: 5000,
    removeContainer: false,
    foreignObjectRendering: false,
  });

  const dataUrl = canvas.toDataURL("image/png", 1.0); // Highest quality

  if (dataUrl.length < 1000) {
    throw new Error("Generated image is empty");
  }

  return dataUrl;
};

export const downloadCanvasAsPNG = (
  dataUrl: string,
  fileName: string
): void => {
  const link = document.createElement("a");
  link.download = fileName;
  link.href = dataUrl;
  link.click();
};


export const fileToDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const validateHexColor = (color: string): boolean => {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
};

export const sanitizeFileName = (name: string | undefined): string => {
  if (!name) {
    return "card";
  }
  return name.replace(/[^a-z0-9]/gi, "_");
};

/** 1×1 PNG data URL for use as a scalable solid fill (e.g. empty card back). */
export function createSolidColorDataUrl(hexColor: string): string {
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not get canvas context");
  }
  ctx.fillStyle = hexColor;
  ctx.fillRect(0, 0, 1, 1);
  return canvas.toDataURL("image/png");
}


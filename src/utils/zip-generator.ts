import JSZip from "jszip";

export const createZipFromDataUrls = async (
  entries: Array<{ dataUrl: string; fileName: string }>,
  zipFileName: string = "business_cards.zip"
): Promise<void> => {
  const zip = new JSZip();

  for (const entry of entries) {
    const response = await fetch(entry.dataUrl);
    const blob = await response.blob();
    zip.file(entry.fileName, blob);
  }

  const zipBlob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(zipBlob);
  const link = document.createElement("a");
  link.href = url;
  link.download = zipFileName;
  link.click();
  URL.revokeObjectURL(url);
};


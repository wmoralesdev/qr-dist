import Papa from "papaparse";

export interface BusinessCardData {
  URL: string;
  Name: string;
}

export interface ParseResult {
  data: BusinessCardData[];
  errors: Papa.ParseError[];
}

export const parseCSV = (
  file: File
): Promise<ParseResult> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
      complete: (results) => {
        const cleanedData = (results.data as Record<string, unknown>[])
          .map((row) => {
            const rawUrl = String(
              row.URL ?? row.Url ?? row.url ?? ""
            ).trim();
            const rawName = String(
              row.Name ?? row.name ?? row.NAME ?? ""
            ).trim();

            let url = rawUrl.replace(/[;,]+$/, ""); // drop trailing delimiters
            let name = rawName;

            // If name missing but URL still contains delimiters, split it out
            if (!name && /[,;]/.test(url)) {
              const parts = url.split(/[,;]/);
              url = parts[0].trim();
              name = parts.slice(1).join(" ").trim();
            }

            return {
              URL: url,
              Name: name,
            };
          })
          .filter((row) => row.URL.length > 0);

        resolve({
          data: cleanedData as BusinessCardData[],
          errors: results.errors,
        });
      },
      error: (error) => {
        reject(error);
      },
    });
  });
};


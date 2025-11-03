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
      complete: (results) => {
        resolve({
          data: results.data as BusinessCardData[],
          errors: results.errors,
        });
      },
      error: (error) => {
        reject(error);
      },
    });
  });
};


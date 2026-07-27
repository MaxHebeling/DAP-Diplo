declare module "pdf-parse-fork" {
  interface PDFParseResult {
    text: string;
    numpages: number;
    numrender: number;
    info: Record<string, unknown>;
    metadata: unknown;
    version: string;
  }
  function pdfParse(data: Buffer | Uint8Array, options?: unknown): Promise<PDFParseResult>;
  export default pdfParse;
}

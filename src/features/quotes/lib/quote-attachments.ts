export const QUOTE_FILES_BUCKET = "quote-files";

export const MAX_QUOTE_FILE_BYTES = 50 * 1024 * 1024;

export function quoteFileStoragePath(
  organizationId: string,
  quoteId: string,
  fileId: string,
  fileName: string,
) {
  const safe = fileName.replace(/[^\w.\-()+ ]+/g, "_").slice(0, 180);
  return `${organizationId}/${quoteId}/${fileId}/${safe}`;
}

export type QuoteAttachmentRow = {
  id: string;
  quoteId: string;
  name: string;
  mimeType: string | null;
  sizeBytes: number;
  createdAt: string;
};

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

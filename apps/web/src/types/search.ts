export interface SearchPreviewRow {
  rowIndex: number;
  matchedColumns: string[];
  row: Record<string, string | number | null>;
}

export interface SearchResult {
  tableId: string;
  sheetId: string;
  sheetName: string;
  matchCount: number;
  matchedColumns: string[];
  snippet: string;
  previewRows: SearchPreviewRow[];
}

export interface PreviewSearchResponse {
  query: string;
  resultCount: number;
  limit: number;
  truncated: boolean;
  tookMs: number;
  results: SearchResult[];
}

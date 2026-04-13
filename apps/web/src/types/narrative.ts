export type NarrativeScopeMode = "table" | "scopedResult";
export type NarrativeStatus = "ready" | "unavailable" | "invalid" | "timeout";

export interface NarrativePreviewRow {
  rowIndex: number;
  matchedColumns: string[];
  row: Record<string, string | number | null>;
}

export interface NarrativeSummaryRequest {
  mode: NarrativeScopeMode;
  tableId: string;
  query?: string | null;
  matchedColumns?: string[];
  previewRows?: NarrativePreviewRow[];
}

export interface NarrativeSummaryContent {
  description: string;
  insights: string[];
  caveat: string | null;
}

export interface NarrativeSummaryScope {
  mode: NarrativeScopeMode;
  uploadId: string;
  tableId: string;
  query: string | null;
}

export interface NarrativeSummaryBasis {
  sheetName: string;
  rowCount: number;
  columnCount: number;
  confidence: number;
  reviewRequired: boolean;
  defaultChartType: string;
  primaryMode: string;
}

export interface NarrativeSummaryPayload {
  status: NarrativeStatus;
  scope: NarrativeSummaryScope;
  narrative: NarrativeSummaryContent | null;
  basis: NarrativeSummaryBasis;
  fallbackMessage: string | null;
}

export type UploadStatus = "processing" | "ready" | "failed" | "cancelled";
export type ChartType = "bar" | "column" | "line" | "area" | "pie" | "table";
export type ChartSourceType = "reused" | "reconstructed" | "generated";

export interface ChartPoint {
  label: string;
  value: number;
}

export interface ChartRecommendation {
  chartType: ChartType;
  title: string;
  description: string;
  dimensionLabel: string | null;
  measureLabel: string | null;
  points: ChartPoint[];
  truncated: boolean;
}

export interface UploadManifest {
  uploadId: string;
  status: UploadStatus;
  source: {
    fileName: string;
    fileType: "xlsx" | "csv";
    sizeBytes: number;
  };
  workbook: {
    sheetCount: number;
    tableCount: number;
    warnings: string[];
  };
  presentation: {
    defaultMode: "analysis";
    presenterModeAvailable: boolean;
  };
  defaultView: {
    sheetId: string | null;
    tableId: string | null;
    viewType: string;
  };
  sheets: SheetSummary[];
  tables: TableSummary[];
}

export interface SheetSummary {
  sheetId: string;
  name: string;
  order: number;
  rowCount: number;
  columnCount: number;
  isEmpty: boolean;
}

export interface TableSummary {
  tableId: string;
  sheetId: string;
  confidence: number;
  reviewRequired: boolean;
  orientation: string | null;
  detectionReasons: string[];
  normalization: {
    status: string;
    reason: string;
  };
  availableChartTypes: ChartType[];
  defaultChartType: ChartType;
  chartSourceType: ChartSourceType;
  chartSourceReason: string;
  chartRecommendations: ChartRecommendation[];
  stats: {
    rowCount: number;
    columnCount: number;
    chartFriendly: boolean;
    primaryMode: "chart" | "summary" | "table";
    reason: string;
  };
}

export interface PreviewPayload {
  tableId: string;
  sheetId: string;
  columns: string[];
  rows: Array<Record<string, string | number | null>>;
  rowCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface ArtifactSummary {
  tableArtifacts: number;
  previewArtifacts: number;
}

export interface UploadRuntime {
  uploadId: string;
  status: UploadStatus;
  createdAt: string;
  updatedAt: string;
  processingStartedAt: string | null;
  processingFinishedAt: string | null;
  cancellationRequestedAt: string | null;
  cancelledAt: string | null;
  failureMessage: string | null;
  recoveryHint: string;
  artifactSummary: ArtifactSummary;
  logFiles: string[];
}

import type {
  ChartRecommendation,
  ChartSourceType,
  ChartType,
  TableSummary,
} from "../types/manifest";

const chartLabels: Record<ChartType, string> = {
  area: "Area",
  bar: "Bar",
  column: "Column",
  line: "Line",
  pie: "Pie",
  table: "Table",
};

const sourceLabels: Record<ChartSourceType, string> = {
  generated: "Generated",
  reconstructed: "Reconstructed",
  reused: "Reused",
};

export function formatChartTypeLabel(chartType: ChartType) {
  return chartLabels[chartType];
}

export function formatChartSourceLabel(chartSourceType: ChartSourceType) {
  return sourceLabels[chartSourceType];
}

export function getSafeChartType(
  table: TableSummary,
  requestedChartType: ChartType | null,
): ChartType {
  if (requestedChartType && table.availableChartTypes.includes(requestedChartType)) {
    return requestedChartType;
  }

  if (table.availableChartTypes.includes(table.defaultChartType)) {
    return table.defaultChartType;
  }

  return table.availableChartTypes[0] ?? "table";
}

export function getChartRecommendation(
  table: TableSummary,
  chartType: ChartType,
): ChartRecommendation {
  return (
    table.chartRecommendations.find((recommendation) => recommendation.chartType === chartType) ??
    table.chartRecommendations[0] ?? {
      chartType: "table",
      title: "Readable table view",
      description: table.chartSourceReason,
      dimensionLabel: null,
      measureLabel: null,
      points: [],
      truncated: false,
    }
  );
}
